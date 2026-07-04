---
phase: 01-xml-validation-hook
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .claude/hooks/validate-xml-casca.js
  - .claude/hooks/validate-xml-casca.test.js
  - .claude/hooks/validate-xml-casca.sh
  - .claude/settings.json
  - manifest.json
  - .claude/hooks/__fixtures__/xml-casca/valid-orquestrador.md
  - .claude/hooks/__fixtures__/xml-casca/valid-recepcionista.md
  - .claude/hooks/__fixtures__/xml-casca/missing-declaration.md
  - .claude/hooks/__fixtures__/xml-casca/wrong-declaration.md
  - .claude/hooks/__fixtures__/xml-casca/wrong-tipo.md
  - .claude/hooks/__fixtures__/xml-casca/missing-xmlns.md
  - .claude/hooks/__fixtures__/xml-casca/missing-origem-recepcionista.md
  - .claude/hooks/__fixtures__/xml-casca/nested-root.md
  - .claude/hooks/__fixtures__/xml-casca/duplicate-root.md
  - .claude/hooks/__fixtures__/xml-casca/raw-ampersand-in-content.md
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the deterministic XML "casca" validator (`validate-xml-casca.js`), its 24-case test suite (all passing — verified with `node --test`), the thin bash wrapper (`validate-xml-casca.sh`), the `settings.json` wiring under `Stop`/`SubagentStop`, `manifest.json` distribution entries, and all 10 fixtures.

Core validation logic (declaration check, line-2 attribute check, root-count check, BOM handling, ReDoS-safety, path-safety in `validateFile`) is solid and every claim in the test suite is empirically true. No security vulnerabilities, injections, or data-loss risks found. Three logic/reliability bugs were found and confirmed empirically (not just read-through speculation) — none block the "does it validate XML cascas correctly" core happy path, but each undermines a specific claim made in this phase's own planning docs or code comments. See Warnings below for repro details.

## Warnings

### WR-01: CRLF line endings desync the offset-to-line/col math for the XMLV-04 (root-count) error

**File:** `.claude/hooks/validate-xml-casca.js:159-179`
**Issue:** `countAgenteTags`/the duplicate-open-tag offset search run against `working` (the raw, un-normalized content, still containing `\r\n` if present), but the resulting numeric offset is then fed into `offsetToLineCol(normalizeContent(working), fallbackOffset)` — i.e. the *offset* is computed against the CRLF string while the *line/col conversion* walks the LF-normalized string. Every `\r` stripped before the offset shifts the reported column (and, in files with different newline density per line, potentially the line) by one per removed `\r`. The file-level comment on line 20 claims "CRLF-safe splitting (Pitfall 3)" is handled, but this is only true for the line-1/line-2 checks — the XMLV-04 path is not.

Confirmed empirically: taking `__fixtures__/xml-casca/duplicate-root.md` and converting its `\n` to `\r\n`, `validateCasca` reports `col: 10` for the exact same logical position that reports `col: 1` on the LF version (9 `\r` characters precede that offset — the discrepancy is exactly the removed-`\r` count).

```
node -e '
const { validateCasca } = require("./.claude/hooks/validate-xml-casca.js");
const fs = require("fs");
const lf = fs.readFileSync(".claude/hooks/__fixtures__/xml-casca/duplicate-root.md","utf8");
const crlf = lf.replace(/\n/g,"\r\n");
console.log(validateCasca(crlf, "Follow-Up.md").errors); // col: 10
console.log(validateCasca(lf,   "Follow-Up.md").errors); // col: 1
'
```

**Fix:** Compute the duplicate-open-tag offset against the same normalized string used for line/col conversion, e.g.:
```js
const normalizedWorking = normalizeContent(working);
const openRegex = /<agente(?=[\s>])/g;
// ...run openRegex.exec(normalizedWorking) instead of working...
const { line, col } = offsetToLineCol(normalizedWorking, fallbackOffset);
```
(`countAgenteTags`'s open/close *counts* are newline-agnostic so they don't need to change — only the offset search that feeds `offsetToLineCol` does.)

### WR-02: File discovery is not actually scoped to "the current turn" — stale/deleted files from earlier turns can spuriously block unrelated later Stop events

**File:** `.claude/hooks/validate-xml-casca.js:209-248` (`discoverTouchedFiles`)
**Issue:** `01-02-PLAN.md`/`01-02-SUMMARY.md` describe this function as extracting file paths "scoped to files touched in the current turn only (D-06...)". The actual implementation takes the last 400 raw lines of the *entire* transcript file and extracts every `Edit`/`Write` `file_path` found there — with no turn-boundary detection. In a live session, 400 JSONL lines commonly span many turns (each turn contributes several lines: tool_use, tool_result, thinking, text). This means a client-agent file edited several turns ago — and since deleted, renamed, or reverted (e.g. by a git checkout, or intentionally removed) — is re-validated on every subsequent Stop event until it ages out of the 400-line tail, blocking with a confusing `arquivo inacessível` message that has nothing to do with the current turn's work.

Confirmed empirically: built a transcript where turn 1 edits then-existing `Qualifier.md`, followed by 50 unrelated filler turns (still well inside the 400-line tail), then deleted `Qualifier.md` before invoking `runCli`. Result:
```json
{"decision":"block","reason":"arquivo inacessível: /tmp/.../Qualifier.md"}
```
— a Stop event with zero relation to `Qualifier.md` still gets blocked.

**Fix:** Either (a) scope discovery to lines after the most recent `"type":"user"` entry (a reasonable proxy for "current turn boundary", consistent with how the file already filters on `"type":"assistant"`), or (b) treat `arquivo inacessível` specially in `validateFile`/`runCli` — a file that no longer exists has no casca to validate, so a missing file should not itself produce a block (distinguish "file deleted since being touched" from "file's casca is malformed"). Given this hook is meant to catch a *malformed casca left behind*, silently skipping a file that is simply gone is more correct than blocking on it.

### WR-03: `validateFile()` real-file test is cwd-dependent and fails when the suite isn't run from repo root

**File:** `.claude/hooks/validate-xml-casca.test.js:158-177`
**Issue:** `path.join(process.cwd(), "modelo", basename)` assumes the test process's current working directory is the repo root. Confirmed empirically — running the exact same suite from `.claude/hooks/` (`cd .claude/hooks && node --test validate-xml-casca.test.js`) fails this test with `arquivo inacessível: /root/EiPrompt/.claude/hooks/modelo/Orquestrador.md`, even though every other test in the file (which use `__dirname`-relative fixture paths) still passes. This is a genuine reliability/flakiness issue, not a style nit: the test's correctness silently depends on the invoking shell's cwd, which isn't guaranteed by any test runner config in this repo (no `package.json` `test` script, no CI step exists yet for this suite).
**Fix:** Anchor the path to the repo root the same way the file already anchors fixtures, e.g. `path.join(__dirname, "..", "..", "modelo", basename)` (or `path.resolve(__dirname, "../../modelo", basename)`), removing the `process.cwd()` dependency.

## Info

### IN-01: `parseAgenteLine`'s single-line strictness rejects a syntactically-fine line-2 tag with trailing whitespace

**File:** `.claude/hooks/validate-xml-casca.js:37-49`
**Issue:** `^<agente\b([^>]*)>$` requires the tag's closing `>` to be the very last character of line 2. A trailing space or stray character after `>` (e.g. from an editor auto-format) reports the generic "linha 2 não é uma tag `<agente ...>` de linha única" error rather than a more specific/actionable message. Low impact given the project's own "casca" format is meant to be machine-generated and exact, but worth a `.trimEnd()` on the line before matching if false positives from trailing whitespace turn out to be common in practice.

### IN-02: Duplicate attributes on the line-2 tag are silently coalesced, not flagged

**File:** `.claude/hooks/validate-xml-casca.js:42-48`
**Issue:** The `attrRegex` loop overwrites `attrs[key]` on each match, so `<agente xmlns="a" xmlns="b" ...>` silently resolves to `xmlns="b"` with no error about the duplicate attribute (which would make the tag invalid XML). Consistent with this hook's explicitly narrow, non-full-XML-parser scope (documented elsewhere as an accepted blind spot for escaping/CDATA), so this is informational only, not a regression against any stated requirement.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
