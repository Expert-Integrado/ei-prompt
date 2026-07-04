# Phase 1: XML Validation Hook - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 7 (new) + 3 (modified)
**Analogs found:** 7 / 7 (role-match or better)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `.claude/hooks/validate-xml-casca.sh` | middleware (hook wrapper) | event-driven (Stop/SubagentStop) | `.claude/hooks/post-ajustes-fanout.sh` | role-match (stdin/transcript plumbing identical; blocking-behavior semantics differ — see deviations) |
| `.claude/hooks/validate-xml-casca.js` | service/utility (validator + CLI) | transform (read file → validate → emit JSON) | `bin/cli.js` | role-match (only existing Node.js module in repo; CommonJS style, `fs`/`path` usage, no deps) |
| `.claude/hooks/validate-xml-casca.test.js` | test | transform (pure function assertions) | none exists in repo | no analog — first test file in project; use `node:test`/`node:assert` per RESEARCH.md |
| `.claude/hooks/__fixtures__/xml-casca/*.md` | config/fixture | file-I/O | `modelo/*.md` (the 6 canonical templates) | exact (fixtures are deliberately modeled on these files' line-1/line-2 shape) |
| `.claude/settings.json` (modified) | config | event-driven (hook registration) | itself (existing `Stop`/`SubagentStop` arrays) | exact — same file, append pattern |
| `manifest.json` (modified) | config | batch (file list) | itself (existing `files` array) | exact — same file, append pattern |
| `docs/regras-validacao.md` (optional doc update) | config/doc | n/a | itself | exact — not required by CONTEXT decisions, planner's discretion per RESEARCH "State of the Art" note |

## Pattern Assignments

### `.claude/hooks/validate-xml-casca.sh` (middleware/hook wrapper, event-driven)

**Analog:** `.claude/hooks/post-ajustes-fanout.sh` (Stop-event hook) and `.claude/hooks/post-scaffolder-review.sh` (SubagentStop-event hook, for the transcript_path extraction idiom)

**Shebang + safety flags** (post-ajustes-fanout.sh lines 1, 19):
```bash
#!/bin/bash
set -uo pipefail
```
Use `set -uo pipefail`, NOT `set -e` — the project convention explicitly avoids `set -e` because `grep`/pipeline "no match" returns exit 1, which is an expected, not-exceptional case, handled via explicit `[ -z "$VAR" ]` checks (see both analogs' header comments).

**Stdin capture + transcript_path extraction** (post-ajustes-fanout.sh lines 21, 29-34; identical in post-scaffolder-review.sh lines 23-32):
```bash
INPUT=$(cat)

# Extrair transcript_path do JSON de entrada (sem jq)
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0
[ ! -r "$TRANSCRIPT" ] && exit 0
```
Copy this exact idiom (no `jq` dependency; zero-dependency convention) for capturing stdin and locating the transcript file, then fail-open (silent `exit 0`) on missing/unreadable transcript.

**DEVIATION FROM ANALOG — do NOT copy the `stop_hook_active` early-exit guard.** Both analogs check `stop_hook_active` and exit silently as their very first step (post-ajustes-fanout.sh lines 23-27, post-scaffolder-review.sh has no such guard because it's SubagentStop not Stop — but the Stop-side convention is the one that matters here). Per RESEARCH.md D-07/Pitfall 4: the new hook's job is a stateless re-checkable fact ("is this file valid right now"), and copying that guard would silently skip validation on the very retry cycle where a broken file is most likely still broken. **Do not include this guard in `validate-xml-casca.sh` at all.**

**Handoff to Node (new pattern, no direct analog — first Node usage inside `.claude/hooks/`):**
```bash
node "$CLAUDE_PROJECT_DIR/.claude/hooks/validate-xml-casca.js" --transcript "$TRANSCRIPT"
```
Bash wrapper passes stdout through verbatim from Node, then always `exit 0` regardless of block/no-block (Pitfall 5 — both analogs terminate `exit 0` unconditionally, even in the branch that emits `decision:block`; do the same here).

**Output schema — use `decision`/`reason`, NOT `additionalContext`** (post-ajustes-fanout.sh lines 70-75):
```bash
cat <<JSON
{
  "decision": "block",
  "reason": "..."
}
JSON
exit 0
```
This is the correct schema for BOTH `Stop` and `SubagentStop` per RESEARCH.md Pitfall 6 (confirmed against official docs + this repo's working Stop hook). Do NOT use `hookSpecificOutput.additionalContext` (that's `post-scaffolder-review.sh`'s SubagentStop-only informational pattern — non-blocking, wrong semantics for an "always blocks" validator).

**Registration:** register the SAME script under both `hooks.Stop[]` and `hooks.SubagentStop[]` in `.claude/settings.json` (single wrapper, two event bindings) — see settings.json pattern below.

---

### `.claude/hooks/validate-xml-casca.js` (service/utility, transform)

**Analog:** `bin/cli.js` — the only existing Node.js module in the repo; establishes the project's CommonJS/style conventions.

**Module header / imports pattern** (`bin/cli.js` lines 1-6):
```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
```
Core Node builtins first, no path aliases, no bundler — mirror exactly.

**Style conventions to match** (confirmed via `.claude/CLAUDE.md` "Code Style" + observed in `bin/cli.js`):
- 2-space indent, double quotes, semicolons, template literals for interpolation, trailing commas in multiline objects.
- `camelCase` verb-first function names (`fetchFile`, `writeFile`, `removeFile` → for this file: `parseAgenteLine`, `countAgenteTags`, `validateFile`, `discoverTouchedFiles`).
- `UPPER_SNAKE_CASE` for module-level constants (`RAW_BASE`, `COLORS` → for this file: `TIPO_MAP`).
- Small, single-purpose functions; no classes.

**Path-safety idiom to mirror for discovered file paths** (`bin/cli.js` lines 59-66, `removeFile()`):
```javascript
function removeFile(relPath) {
  const cwd = process.cwd();
  const dest = path.resolve(cwd, relPath);
  // Defense-in-depth: bloqueia path traversal via '..' em manifest comprometido
  if (!dest.startsWith(cwd + path.sep) && dest !== cwd) {
    log("yellow", "warn  ", `path fora do CWD ignorado: ${relPath} ${COLORS.dim}(continuando)${COLORS.reset}`);
    return "warn";
  }
  ...
}
```
Per RESEARCH.md "Don't Hand-Roll" table and Security Domain (V5 Input Validation / path traversal threat): before reading any file path discovered from the transcript, verify existence + regular-file-ness (`fs.statSync(...).isFile()`), following this exact `path.resolve` + boundary-check pattern rather than inventing a new one.

**Dual-mode export + CLI pattern (new to this repo, no direct analog — but explicitly locked by D-02/RESEARCH Pattern 1):**
```javascript
const TIPO_MAP = {
  "Orquestrador.md": { tipo: "orchestrator" },
  "Qualifier.md":    { tipo: "qualifier" },
  "Scheduler.md":    { tipo: "scheduler" },
  "Protractor.md":   { tipo: "protractor" },
  "Follow-Up.md":    { tipo: "followup" },
  "Recepcionista.md": { tipo: "orchestrator", origem: "recepcionista" },
};

function parseAgenteLine(line) { /* ... */ }
function countAgenteTags(content) { /* ... */ }

module.exports = { TIPO_MAP, parseAgenteLine, countAgenteTags, validateFile, discoverTouchedFiles };

if (require.main === module) {
  // CLI entry point invoked by validate-xml-casca.sh
}
```

**Error surfacing convention** (`bin/cli.js` lines 98-101, per-item try/catch, never swallowed):
```javascript
} catch (err) {
  log("red", "fail  ", `${file} — ${err.message}`);
  results.failed++;
}
```
Adapt this "never swallow, always surface message" discipline for per-JSONL-line `JSON.parse` failures during transcript discovery (tolerate/skip malformed lines individually, per RESEARCH Pattern 2, but never silently ignore a validation failure on an actual target file).

**Critical correctness patterns to copy from RESEARCH.md code examples (not from existing repo code, since this is greenfield logic) — included here because they are load-bearing and non-obvious:**
- Word-boundary-safe tag counting (avoids false-positive on `<agentes_disponiveis>` in `modelo/Recepcionista.md`): `/<agente(?=[\s>])/g` for opens, `/<\/agente>/g` for closes.
- BOM detection before line-1 check: `content.charCodeAt(0) === 0xFEFF`.
- CRLF-safe splitting: `content.split(/\r\n|\n/)`.
- Attribute-order-tolerant line-2 parser: `/^<agente\b([^>]*)>$/` then `/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g` over the captured group.

---

### `.claude/hooks/validate-xml-casca.test.js` (test)

**Analog:** none in repo — first test file. Use `node:test` + `node:assert` per RESEARCH.md Validation Architecture (confirmed working, zero install, Node v24.12.0 in sandbox). Import via `require("./validate-xml-casca.js")` and exercise the exported pure functions (`parseAgenteLine`, `countAgenteTags`, `validateFile`) directly — do not spawn the CLI subprocess for unit tests (reserve subprocess/stdin invocation for the one manual end-to-end smoke test described in RESEARCH.md "Sampling Rate").

---

### `.claude/hooks/__fixtures__/xml-casca/*.md` (fixture files)

**Analog:** the 6 real `modelo/*.md` templates — use their exact line-1/line-2 shape as the baseline for `valid-orquestrador.md` and `valid-recepcionista.md`, then deliberately corrupt copies for each negative case (`missing-declaration.md`, `wrong-declaration.md`, `wrong-tipo.md`, `missing-xmlns.md`, `missing-origem-recepcionista.md`, `nested-root.md`, `duplicate-root.md`, `raw-ampersand-in-content.md`). Exact line-1 baseline confirmed via RESEARCH.md Code Example 3: `'<?xml version="1.0" encoding="UTF-8"?>'`. Exact line-2 baseline for Recepcionista confirmed via RESEARCH.md Example 1 output: `xmlns="https://expertintegrado.com.br/super-sdr/prompt" versao="1.0" tipo="orchestrator" origem="recepcionista"`.

---

## Shared Patterns

### Hook stdin/transcript plumbing
**Source:** `.claude/hooks/post-ajustes-fanout.sh` lines 1-34 (header comments + `set -uo pipefail` + stdin/transcript extraction), cross-checked against `.claude/hooks/post-scaffolder-review.sh` lines 18-32 (identical extraction idiom).
**Apply to:** `.claude/hooks/validate-xml-casca.sh` — copy verbatim except the `stop_hook_active` guard (deliberately omitted, see deviation note above).

### Blocking output schema
**Source:** `.claude/hooks/post-ajustes-fanout.sh` lines 70-75 (`{"decision":"block","reason":"..."}`, `exit 0` unconditional).
**Apply to:** `.claude/hooks/validate-xml-casca.sh` for BOTH Stop and SubagentStop registrations — same schema for both events, no branching needed (RESEARCH Pitfall 6).

### Zero-dependency, no-jq JSON field extraction (bash layer only)
**Source:** both existing `.sh` hooks' `grep -o '"field"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/'` idiom.
**Apply to:** only the flat top-level `transcript_path` field extraction in the bash wrapper. Do NOT use this idiom for nested fields (`tool_use.input.file_path`) — delegate that to Node's `JSON.parse` per JSONL line (RESEARCH.md Pattern 2, "Don't Hand-Roll" table).

### Path-safety before reading discovered files
**Source:** `bin/cli.js` lines 59-66 (`removeFile()`'s `path.resolve` + `cwd` boundary check).
**Apply to:** `.claude/hooks/validate-xml-casca.js`'s file-discovery/read step, before `fs.readFileSync` on any transcript-discovered path.

### `.claude/settings.json` registration (config)
**Current shape** (full file, lines 1-26):
```json
{
  "hooks": {
    "_disabled_note": "...",
    "SubagentStop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-scaffolder-review.sh" } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-ajustes-fanout.sh" } ] }
    ]
  }
}
```
**Modification:** append a new entry object to BOTH the `SubagentStop` array and the `Stop` array (D-09 — existing entries run in sequence, unmodified):
```json
    "SubagentStop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-scaffolder-review.sh" } ] },
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-xml-casca.sh" } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-ajustes-fanout.sh" } ] },
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-xml-casca.sh" } ] }
    ]
```
Do not touch the `_disabled_note` key or existing entries.

### `manifest.json` distribution registration (config)
**Current shape** (`files` array, lines 4-30, hooks subsection lines 22-26):
```json
    ".claude/settings.json",
    ".claude/hooks/inject-ei-context.sh",
    ".claude/hooks/prompt-matches-agent.sh",
    ".claude/hooks/post-scaffolder-review.sh",
    ".claude/hooks/post-ajustes-fanout.sh",
```
**Modification:** append the new hook file(s) to this same list (D-10), keeping the existing `.claude/hooks/*` grouping convention:
```json
    ".claude/hooks/post-ajustes-fanout.sh",
    ".claude/hooks/validate-xml-casca.sh",
    ".claude/hooks/validate-xml-casca.js",
```
Note: `.claude/hooks/validate-xml-casca.test.js` and `__fixtures__/**` are dev-only (not needed at runtime by end users) — planner should decide whether to include them in `manifest.json` or leave them repo-only; RESEARCH.md does not mandate shipping tests/fixtures to end users, only the `.sh`/`.js` runtime pair (D-10 says "new hook file(s)", singular concern is the executable pair).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.claude/hooks/validate-xml-casca.test.js` | test | transform | No test file exists anywhere in this repo (confirmed: no test framework, no `test` script in `package.json`). Use RESEARCH.md's `node:test`/`node:assert` recommendation directly rather than an in-repo analog. |

## Metadata

**Analog search scope:** `.claude/hooks/*.sh`, `bin/cli.js`, `.claude/settings.json`, `manifest.json`, `modelo/*.md`
**Files scanned:** 6 (`post-ajustes-fanout.sh`, `post-scaffolder-review.sh`, `bin/cli.js`, `.claude/settings.json`, `manifest.json`, plus prior read of `modelo/*.md` reflected in CONTEXT/RESEARCH)
**Pattern extraction date:** 2026-07-04
