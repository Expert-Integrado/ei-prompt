#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const HOOK_PATH = path.join(__dirname, "check-claude-md-audience.sh");

// WR-03 fix: register cleanup on the test context so each temp dir created
// via mkdtempSync is removed after its test runs, instead of leaking into
// the OS temp directory across repeated `npm test` runs.
function makeTempDir(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-md-audience-test-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  return tempDir;
}

function jsonlLine(obj) {
  return JSON.stringify(obj);
}

function buildTranscript(tempDir, filePath, toolName = "Edit") {
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  const assistantLine = jsonlLine({
    type: "assistant",
    message: {
      content: [{ type: "tool_use", name: toolName, input: { file_path: filePath } }],
    },
  });
  fs.writeFileSync(transcriptPath, assistantLine);
  return transcriptPath;
}

function runHook(transcriptPath) {
  return execFileSync("bash", [HOOK_PATH], {
    input: JSON.stringify({ transcript_path: transcriptPath }),
    encoding: "utf8",
  });
}

const BANNED_HEADING = "## Slash Commands";

test("blocks when a touched CLAUDE.md (not under /client/) contains a banned heading", (t) => {
  const tempDir = makeTempDir(t);
  const filePath = path.join(tempDir, "CLAUDE.md");
  fs.writeFileSync(filePath, `# Preferências\n\n${BANNED_HEADING}\n\n| Comando | Uso |\n`);

  const transcriptPath = buildTranscript(tempDir, filePath);
  const stdout = runHook(transcriptPath);

  const lines = stdout.trim().split("\n").filter(Boolean);
  assert.strictEqual(lines.length, 1, `expected exactly one line of stdout, got: ${stdout}`);
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.decision, "block");
  assert.ok(typeof parsed.reason === "string" && parsed.reason.includes(filePath), `reason should mention ${filePath}, got: ${parsed.reason}`);
});

test("emits nothing when the touched CLAUDE.md content has no banned heading", (t) => {
  const tempDir = makeTempDir(t);
  const filePath = path.join(tempDir, "CLAUDE.md");
  fs.writeFileSync(filePath, "# Preferências\n\n## Commits\n\nNão incluir assinatura.\n");

  const transcriptPath = buildTranscript(tempDir, filePath);
  const stdout = runHook(transcriptPath);

  assert.strictEqual(stdout, "");
});

test("excludes client/CLAUDE.md from being flagged even when it contains a banned heading", (t) => {
  const tempDir = makeTempDir(t);
  const clientDir = path.join(tempDir, "client");
  fs.mkdirSync(clientDir);
  const filePath = path.join(clientDir, "CLAUDE.md");
  fs.writeFileSync(filePath, `# Preferências\n\n${BANNED_HEADING}\n`);

  const transcriptPath = buildTranscript(tempDir, filePath);
  const stdout = runHook(transcriptPath);

  assert.strictEqual(stdout, "");
});

test("CR-01 regression: a Read-only tool_use on a CLAUDE.md with a banned heading does NOT block", (t) => {
  const tempDir = makeTempDir(t);
  const filePath = path.join(tempDir, "CLAUDE.md");
  fs.writeFileSync(filePath, `# Preferências\n\n${BANNED_HEADING}\n\n| Comando | Uso |\n`);

  const transcriptPath = buildTranscript(tempDir, filePath, "Read");
  const stdout = runHook(transcriptPath);

  assert.strictEqual(stdout, "");
});

test("WR-02 regression: a CLAUDE.md nested under a directory merely containing '/client/' as a substring (e.g. api-client/) is NOT excluded and still blocks", (t) => {
  const tempDir = makeTempDir(t);
  const nestedDir = path.join(tempDir, "api-client");
  fs.mkdirSync(nestedDir);
  const filePath = path.join(nestedDir, "CLAUDE.md");
  fs.writeFileSync(filePath, `# Preferências\n\n${BANNED_HEADING}\n`);

  const transcriptPath = buildTranscript(tempDir, filePath);
  const stdout = runHook(transcriptPath);

  const lines = stdout.trim().split("\n").filter(Boolean);
  assert.strictEqual(lines.length, 1, `expected exactly one line of stdout, got: ${stdout}`);
  const parsed = JSON.parse(lines[0]);
  assert.strictEqual(parsed.decision, "block");
});

test("emits nothing when no CLAUDE.md-named file was touched at all", (t) => {
  const tempDir = makeTempDir(t);
  const filePath = path.join(tempDir, "README.md");
  fs.writeFileSync(filePath, `# README\n\n${BANNED_HEADING}\n`);

  const transcriptPath = buildTranscript(tempDir, filePath);
  const stdout = runHook(transcriptPath);

  assert.strictEqual(stdout, "");
});

test("exits 0 with no output when transcript_path is missing or unreadable", () => {
  const stdoutMissing = execFileSync("bash", [HOOK_PATH], {
    input: JSON.stringify({}),
    encoding: "utf8",
  });
  assert.strictEqual(stdoutMissing, "");

  const stdoutNonExistent = execFileSync("bash", [HOOK_PATH], {
    input: JSON.stringify({ transcript_path: "/tmp/does-not-exist-claude-md-audience.jsonl" }),
    encoding: "utf8",
  });
  assert.strictEqual(stdoutNonExistent, "");
});

test("script never checks stop_hook_active as a functional guard (DESIGN DELIBERADO) — no conditional logic branches on it", () => {
  const contents = fs.readFileSync(HOOK_PATH, "utf8");
  // The header comment intentionally documents WHY stop_hook_active is not
  // used (mirroring validate-xml-casca.sh's own header, which does the
  // same) — so the string appears in prose. What must never exist is an
  // actual functional guard clause that reads it from INPUT and branches.
  assert.ok(
    !/stop_hook_active"\s*:/.test(contents) && !/\$stop_hook_active\b/.test(contents),
    "script must never extract or branch on a stop_hook_active field",
  );
});
