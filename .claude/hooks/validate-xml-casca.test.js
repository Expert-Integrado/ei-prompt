#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  TIPO_MAP,
  normalizeContent,
  offsetToLineCol,
  parseAgenteLine,
  countAgenteTags,
  validateCasca,
  validateFile,
  discoverTouchedFiles,
  runCli,
} = require("./validate-xml-casca.js");

const FIXTURES_DIR = path.join(__dirname, "__fixtures__", "xml-casca");
const HOOK_PATH = path.join(__dirname, "validate-xml-casca.js");

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "xml-casca-test-"));
}

function jsonlLine(obj) {
  return JSON.stringify(obj);
}

function hasEscapeOrCdataWording(errors) {
  const pattern = /escap|cdata/i;
  return errors.some((e) => pattern.test(e.message));
}

test("TIPO_MAP has exactly 6 keys, Recepcionista.md is the only entry with origem", () => {
  const keys = Object.keys(TIPO_MAP);
  assert.strictEqual(keys.length, 6);
  assert.deepStrictEqual(
    keys.sort(),
    ["Follow-Up.md", "Orquestrador.md", "Protractor.md", "Qualifier.md", "Recepcionista.md", "Scheduler.md"].sort(),
  );
  for (const key of keys) {
    if (key === "Recepcionista.md") {
      assert.strictEqual(TIPO_MAP[key].origem, "recepcionista");
    } else {
      assert.strictEqual(TIPO_MAP[key].origem, undefined);
    }
  }
});

test("parseAgenteLine parses a line-2 tag regardless of attribute order", () => {
  const line = '<agente tipo="orchestrator" xmlns="https://expertintegrado.com.br/super-sdr/prompt" origem="recepcionista" versao="1.0">';
  const result = parseAgenteLine(line);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.attrs, {
    xmlns: "https://expertintegrado.com.br/super-sdr/prompt",
    versao: "1.0",
    tipo: "orchestrator",
    origem: "recepcionista",
  });
});

test("countAgenteTags does not false-positive on Recepcionista's agentes_disponiveis body tag", () => {
  const content = readFixture("valid-recepcionista.md");
  const counts = countAgenteTags(content);
  assert.deepStrictEqual(counts, { opens: 1, closes: 1 });
});

test("validateCasca reports missing XML declaration at line 1, col 1", () => {
  const content = readFixture("missing-declaration.md");
  const result = validateCasca(content, "Qualifier.md");
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((e) => e.line === 1 && e.col === 1),
    `expected an error at line 1 col 1, got: ${JSON.stringify(result.errors)}`,
  );
});

test("validateCasca reports wrong/incomplete declaration with a column at the divergence point", () => {
  const content = readFixture("wrong-declaration.md");
  const result = validateCasca(content, "Scheduler.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => e.line === 1);
  assert.ok(err, `expected a line-1 error, got: ${JSON.stringify(result.errors)}`);
  // "<?xml version="1.0"?>" diverges from the expected declaration right after `"1.0"` (index 19, col 20)
  assert.strictEqual(err.col, 20);
});

test("validateCasca reports XMLV-03 tipo mismatch naming expected vs found", () => {
  const content = readFixture("wrong-tipo.md");
  const result = validateCasca(content, "Qualifier.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /tipo/i.test(e.message));
  assert.ok(err, `expected a tipo-mismatch error, got: ${JSON.stringify(result.errors)}`);
  assert.ok(/qualifier/i.test(err.message), "message should name the expected tipo");
  assert.ok(/orchestrator/i.test(err.message), "message should name the found tipo");
});

test("validateCasca reports XMLV-02 missing xmlns attribute", () => {
  const content = readFixture("missing-xmlns.md");
  const result = validateCasca(content, "Protractor.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /xmlns/i.test(e.message));
  assert.ok(err, `expected an xmlns error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca reports XMLV-03 missing origem attribute for Recepcionista (Pitfall 7)", () => {
  const content = readFixture("missing-origem-recepcionista.md");
  const result = validateCasca(content, "Recepcionista.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /origem/i.test(e.message));
  assert.ok(err, `expected an origem error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca reports XMLV-04 for nested root", () => {
  const content = readFixture("nested-root.md");
  const result = validateCasca(content, "Scheduler.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /raiz|root|abert|fech/i.test(e.message));
  assert.ok(err, `expected a nesting/root-count error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca reports XMLV-04 for duplicate root", () => {
  const content = readFixture("duplicate-root.md");
  const result = validateCasca(content, "Follow-Up.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /raiz|root|abert|fech/i.test(e.message));
  assert.ok(err, `expected a nesting/root-count error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca blocks on raw ampersand/content-triggered break WITHOUT escape/CDATA wording (XMLV-07)", () => {
  const content = readFixture("raw-ampersand-in-content.md");
  const result = validateCasca(content, "Qualifier.md");
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0, "expected at least one error");
  assert.strictEqual(
    hasEscapeOrCdataWording(result.errors),
    false,
    `no error message may mention escape/CDATA, got: ${JSON.stringify(result.errors)}`,
  );
});

test("validateFile() does not mutate the raw-ampersand-in-content.md fixture", () => {
  const fixturePath = path.join(FIXTURES_DIR, "raw-ampersand-in-content.md");
  const before = fs.readFileSync(fixturePath);
  validateFile(fixturePath);
  const after = fs.readFileSync(fixturePath);
  assert.ok(before.equals(after), "fixture bytes must be unchanged after validateFile()");
});

test("validateFile() returns valid:true for all 6 real modelo/*.md files", () => {
  const basenames = [
    "Orquestrador.md",
    "Qualifier.md",
    "Scheduler.md",
    "Protractor.md",
    "Follow-Up.md",
    "Recepcionista.md",
  ];
  for (const basename of basenames) {
    const filePath = path.join(process.cwd(), "modelo", basename);
    const result = validateFile(filePath);
    assert.strictEqual(
      result.valid,
      true,
      `expected modelo/${basename} to be valid, got errors: ${JSON.stringify(result.errors)}`,
    );
    assert.strictEqual(result.errors.length, 0);
  }
});

test("parseAgenteLine completes in under 50ms against a 50,000-char crafted attribute value (T-1-01 ReDoS regression)", () => {
  const longValue = "a".repeat(50000);
  const line = `<agente xmlns="https://expertintegrado.com.br/super-sdr/prompt" versao="1.0" tipo="${longValue}">`;
  const start = Date.now();
  const result = parseAgenteLine(line);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 50, `parseAgenteLine took ${elapsed}ms, expected < 50ms`);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.attrs.tipo, longValue);
});

test("countAgenteTags completes in under 50ms against a large body containing a 50,000-char string (T-1-01 ReDoS regression)", () => {
  const longBody = "x".repeat(50000);
  const content = `<agente xmlns="https://expertintegrado.com.br/super-sdr/prompt" versao="1.0" tipo="qualifier">\n${longBody}\n</agente>`;
  const start = Date.now();
  const counts = countAgenteTags(content);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 50, `countAgenteTags took ${elapsed}ms, expected < 50ms`);
  assert.deepStrictEqual(counts, { opens: 1, closes: 1 });
});

test("validateFile() with a non-existent path returns valid:false without throwing (T-1-02 regression)", () => {
  const bogusPath = path.join(FIXTURES_DIR, "does-not-exist-xyz.md");
  let result;
  assert.doesNotThrow(() => {
    result = validateFile(bogusPath);
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("validateFile() with a directory path returns valid:false without throwing (T-1-02 regression)", () => {
  let result;
  assert.doesNotThrow(() => {
    result = validateFile(FIXTURES_DIR);
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("discoverTouchedFiles extracts recognized Edit/Write file_path values from assistant lines, ignoring user lines, unrecognized basenames, and malformed lines", () => {
  const recognizedPath = path.join(process.cwd(), "modelo", "Qualifier.md");
  const unrecognizedPath = "/tmp/notes.md";

  // A realistic human turn-start message: plain string content, no tool_use/tool_result at
  // all. Placed FIRST so it establishes the turn boundary before the assistant's edits
  // (Task 1's corrected turn-boundary semantics — see 01-04-PLAN.md).
  const userLine = jsonlLine({
    type: "user",
    message: {
      content: "algum texto do usuário",
    },
  });

  const assistantLine = jsonlLine({
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", name: "Edit", input: { file_path: recognizedPath } },
        { type: "tool_use", name: "Write", input: { file_path: unrecognizedPath } },
        { type: "text", text: "some narration" },
      ],
    },
  });

  const malformedLine = "{not valid json at all";

  const tempDir = makeTempDir();
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  fs.writeFileSync(transcriptPath, [userLine, assistantLine, malformedLine].join("\n"));

  let result;
  assert.doesNotThrow(() => {
    result = discoverTouchedFiles(transcriptPath);
  });

  assert.deepStrictEqual(result, [recognizedPath]);
});

test("discoverTouchedFiles/runCli do not block on a file edited many turns ago and since deleted (WR-02 regression, 01-VERIFICATION.md/01-REVIEW.md)", () => {
  const tempDir = makeTempDir();
  const staleFilePath = path.join(tempDir, "Qualifier.md");
  fs.writeFileSync(staleFilePath, readFixture("missing-declaration.md"));

  const jsonlLines = [];
  // Turn 1: genuine user line, then the assistant edits the stale file.
  jsonlLines.push(jsonlLine({ type: "user", message: { content: "primeira mensagem do usuário" } }));
  jsonlLines.push(
    jsonlLine({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: staleFilePath } }] },
    }),
  );

  // ~50 filler turn pairs unrelated to the stale file.
  for (let i = 0; i < 50; i++) {
    jsonlLines.push(jsonlLine({ type: "user", message: { content: `mensagem de preenchimento ${i}` } }));
    if (i % 2 === 0) {
      jsonlLines.push(jsonlLine({ type: "assistant", message: { content: [{ type: "text", text: "ok" }] } }));
    } else {
      jsonlLines.push(
        jsonlLine({
          type: "assistant",
          message: {
            content: [{ type: "tool_use", name: "Edit", input: { file_path: "/tmp/unrelated-notes.md" } }],
          },
        }),
      );
    }
  }

  // Final current turn: genuine user line, assistant line with no Edit/Write at all.
  jsonlLines.push(jsonlLine({ type: "user", message: { content: "última mensagem do usuário" } }));
  jsonlLines.push(jsonlLine({ type: "assistant", message: { content: [{ type: "text", text: "sem edits" }] } }));

  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  fs.writeFileSync(transcriptPath, jsonlLines.join("\n"));

  // Delete the file from disk before invoking, mirroring the exact WR-02 repro.
  fs.unlinkSync(staleFilePath);

  const discovered = discoverTouchedFiles(transcriptPath);
  assert.ok(!discovered.includes(staleFilePath), `expected stale file excluded, got: ${JSON.stringify(discovered)}`);

  const result = runCli(["--transcript", transcriptPath]);
  assert.deepStrictEqual(result, {});
});

test("discoverTouchedFiles still finds an earlier same-turn edit across an intervening tool_result relay line", () => {
  const tempDirA = makeTempDir();
  const filePathA = path.join(tempDirA, "Orquestrador.md");
  fs.writeFileSync(filePathA, readFixture("valid-orquestrador.md"));

  const tempDirB = makeTempDir();
  const filePathB = path.join(tempDirB, "Scheduler.md");
  fs.writeFileSync(filePathB, readFixture("valid-orquestrador.md"));

  const userLine = jsonlLine({ type: "user", message: { content: "mensagem do usuário" } });
  const assistantLineA = jsonlLine({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: filePathA } }] },
  });
  // A realistic tool_result relay — content composed entirely of tool_result blocks — must
  // NOT be treated as a new turn boundary.
  const toolResultRelayLine = jsonlLine({
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "ok" }] },
  });
  const assistantLineB = jsonlLine({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: filePathB } }] },
  });

  const tempDir = makeTempDir();
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  fs.writeFileSync(
    transcriptPath,
    [userLine, assistantLineA, toolResultRelayLine, assistantLineB].join("\n"),
  );

  const result = discoverTouchedFiles(transcriptPath);
  assert.deepStrictEqual(result.slice().sort(), [filePathA, filePathB].sort());
});

test("runCli treats a discovered-but-since-deleted current-turn file as a silent no-op, not a block", () => {
  const tempDir = makeTempDir();
  const filePath = path.join(tempDir, "Protractor.md");
  fs.writeFileSync(filePath, readFixture("valid-orquestrador.md"));

  const userLine = jsonlLine({ type: "user", message: { content: "mensagem do usuário" } });
  const assistantLine = jsonlLine({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: filePath } }] },
  });
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  fs.writeFileSync(transcriptPath, [userLine, assistantLine].join("\n"));

  fs.unlinkSync(filePath);

  const cliResult = runCli(["--transcript", transcriptPath]);
  assert.deepStrictEqual(cliResult, {});

  const directResult = validateFile(filePath);
  assert.strictEqual(directResult.valid, false);
  assert.ok(directResult.errors.length > 0);
  assert.strictEqual(directResult.errors[0].code, "ENOENT");
});

test("discoverTouchedFiles dedupes multiple Edit calls against the same file_path", () => {
  const recognizedPath = path.join(process.cwd(), "modelo", "Orquestrador.md");

  const assistantLine = jsonlLine({
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", name: "Edit", input: { file_path: recognizedPath } },
        { type: "tool_use", name: "Edit", input: { file_path: recognizedPath } },
      ],
    },
  });

  const tempDir = makeTempDir();
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  fs.writeFileSync(transcriptPath, assistantLine);

  const result = discoverTouchedFiles(transcriptPath);
  assert.deepStrictEqual(result, [recognizedPath]);
});

function buildTranscriptForFile(filePath) {
  const tempDir = makeTempDir();
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  const assistantLine = jsonlLine({
    type: "assistant",
    message: {
      content: [{ type: "tool_use", name: "Edit", input: { file_path: filePath } }],
    },
  });
  fs.writeFileSync(transcriptPath, assistantLine);
  return transcriptPath;
}

test("runCli returns {decision:'block', reason} when the discovered file is broken", () => {
  const tempDir = makeTempDir();
  const brokenFilePath = path.join(tempDir, "Qualifier.md");
  fs.writeFileSync(brokenFilePath, readFixture("missing-declaration.md"));

  const transcriptPath = buildTranscriptForFile(brokenFilePath);
  const result = runCli(["--transcript", transcriptPath]);

  assert.strictEqual(result.decision, "block");
  assert.ok(typeof result.reason === "string" && result.reason.length > 0);
  assert.ok(result.reason.includes("Qualifier.md"), `reason should mention Qualifier.md, got: ${result.reason}`);
  assert.ok(result.reason.includes("linha 1"), `reason should mention "linha 1", got: ${result.reason}`);
});

test("runCli returns {} when the discovered file is valid", () => {
  const tempDir = makeTempDir();
  const validFilePath = path.join(tempDir, "Orquestrador.md");
  fs.writeFileSync(validFilePath, readFixture("valid-orquestrador.md"));

  const transcriptPath = buildTranscriptForFile(validFilePath);
  const result = runCli(["--transcript", transcriptPath]);

  assert.deepStrictEqual(result, {});
});

test("runCli returns {} when no recognized files are discovered", () => {
  const tempDir = makeTempDir();
  const unrecognizedFilePath = path.join(tempDir, "README.md");
  fs.writeFileSync(unrecognizedFilePath, "# not a client agent file");

  const transcriptPath = buildTranscriptForFile(unrecognizedFilePath);
  const result = runCli(["--transcript", transcriptPath]);

  assert.deepStrictEqual(result, {});
});

test("runCli returns {} without throwing when --transcript is absent", () => {
  let result;
  assert.doesNotThrow(() => {
    result = runCli([]);
  });
  assert.deepStrictEqual(result, {});
});

test("invoking validate-xml-casca.js directly as a CLI subprocess prints matching block JSON to stdout", () => {
  const tempDir = makeTempDir();
  const brokenFilePath = path.join(tempDir, "Qualifier.md");
  fs.writeFileSync(brokenFilePath, readFixture("missing-declaration.md"));

  const transcriptPath = buildTranscriptForFile(brokenFilePath);
  const expected = runCli(["--transcript", transcriptPath]);

  const stdout = execFileSync("node", [HOOK_PATH, "--transcript", transcriptPath], { encoding: "utf8" });
  const lines = stdout.trim().split("\n");
  assert.strictEqual(lines.length, 1, `expected exactly one line of stdout, got: ${stdout}`);

  const parsed = JSON.parse(lines[0]);
  assert.deepStrictEqual(parsed, expected);
});
