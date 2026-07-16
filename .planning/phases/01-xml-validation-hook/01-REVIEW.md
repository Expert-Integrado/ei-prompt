---
phase: 01-xml-validation-hook
reviewed: 2026-07-05T01:01:29Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .claude/hooks/__fixtures__/xml-casca/duplicate-root.md
  - .claude/hooks/__fixtures__/xml-casca/missing-declaration.md
  - .claude/hooks/__fixtures__/xml-casca/missing-origem-recepcionista.md
  - .claude/hooks/__fixtures__/xml-casca/missing-xmlns.md
  - .claude/hooks/__fixtures__/xml-casca/nested-root.md
  - .claude/hooks/__fixtures__/xml-casca/raw-ampersand-in-content.md
  - .claude/hooks/__fixtures__/xml-casca/valid-orquestrador.md
  - .claude/hooks/__fixtures__/xml-casca/valid-recepcionista.md
  - .claude/hooks/__fixtures__/xml-casca/wrong-declaration.md
  - .claude/hooks/__fixtures__/xml-casca/wrong-tipo.md
  - .claude/hooks/validate-xml-casca.js
  - .claude/hooks/validate-xml-casca.sh
  - .claude/hooks/validate-xml-casca.test.js
  - .claude/settings.json
  - manifest.json
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-07-05T01:01:29Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This is a fresh, independent review of the phase's final state across all 4 plans (01-01 through 01-04), superseding the earlier review round previously recorded in this file. All 27 unit tests in `validate-xml-casca.test.js` pass when run from repo root, the module is well-organized, and the turn-scoping fix for the previously-flagged discovery gap (`isGenuineUserTurnStart`, closed by Plan 01-04) checks out both against the synthetic regression tests and against a sample of real session transcripts pulled from this machine.

However, cross-referencing the validator's `TIPO_MAP` basename-keyed design against the project's own documented multi-agent Recepcionista architecture (root `CLAUDE.md`, `docs/multi-agente-recepcionista.md`, `.claude/agents/recepcionista-scaffolder.md`) surfaces a fundamental gap: the hook validates files purely by `path.basename()`, but the real, generated multi-agent client files it is supposed to protect are deliberately renamed/re-shaped in ways the basename-only lookup cannot see. This produces two distinct classes of incorrect behavior in production, neither of which is exercised by the test suite (which only ever touches `modelo/*.md` and synthetic fixtures at a bare temp-dir root): (1) the `origem="recepcionista"` protection this phase's own research explicitly set out to build (`01-RESEARCH.md` "Pitfall 7") never actually applies to a real generated client file, and (2) the hook will unconditionally block legitimate, spec'd scaffolding output (the neutralized `Qualifier.md`/`Scheduler.md` stubs inside a `Recepcionista/` folder) that intentionally has no XML casca at all. A third, independently-provable bug in `countAgenteTags` causes false positives on ordinary client prose that happens to contain the substring `<agente ...>`, directly contradicting this phase's own D-08 design decision that "generic client `<`/`&` in prose won't spuriously trip it anyway."

Two reliability bugs already flagged in the previous review round (CRLF offset desync, cwd-dependent test) were re-verified against the current code and are confirmed still present — they were not in scope of Plan 01-04's turn-scoping gap closure and remain unresolved; they are carried forward below (WR-02, WR-03) rather than dropped, since this review evaluates the phase's actual final state, not just the delta.

## Critical Issues

### CR-01: `TIPO_MAP` basename lookup never enforces `origem="recepcionista"` on the actual generated client file

**File:** `.claude/hooks/validate-xml-casca.js:10-17` (TIPO_MAP), `:139-154` (origem check), `:184-212` (validateFile)

**Issue:** `TIPO_MAP` is keyed strictly by `path.basename(filePath)` (`validateFile` at line 202: `path.basename(filePath)`; `discoverTouchedFiles` at line 285 also filters purely on basename). The only entry that requires the `origem="recepcionista"` attribute is `TIPO_MAP["Recepcionista.md"]`.

But per this repo's own documentation, no real client file is ever named `Recepcionista.md`:
- Root `CLAUDE.md`'s multi-agent folder structure shows the router lives at `Recepcionista/Orquestrador.md` — "`Orquestrador.md` ← gerado a partir de `modelo/Recepcionista.md`".
- `.claude/agents/recepcionista-scaffolder.md:97` confirms this explicitly: "Copie `modelo/Recepcionista.md` → `<cliente>/Recepcionista/Orquestrador.md` (renomeado para uniformidade com as outras pastas)."
- `docs/multi-agente-recepcionista.md:20` again: "Editar **`<Recepcionista>/Orquestrador.md`**".

So the only file on disk that literally matches the `Recepcionista.md` basename is the read-only template in `modelo/` itself — which is never edited by the pipeline (`modelo/*` is a hard read-only rule). Every *real* generated Recepcionista router file is named `Orquestrador.md`, which resolves to `TIPO_MAP["Orquestrador.md"] = { tipo: "orchestrator" }` (no `origem` requirement). This means:
- `01-RESEARCH.md`'s "Pitfall 7" (keying by filename so a Recepcionista file missing `origem` is caught) is solved only for a file that is never actually produced by the scaffolding flow it's meant to protect.
- If `docs-editor-conciso` or `recepcionista-scaffolder` ever strips/mangles the `origem="recepcionista"` attribute on a live `<cliente>/Recepcionista/Orquestrador.md`, this hook will silently accept it as a valid plain single-agent orchestrator — exactly the "XML casca quebrado sem que isso seja pego automaticamente" scenario the phase's Core Value statement says must never happen.

Verified: no fixture or test in this phase (`validate-xml-casca.test.js`, `__fixtures__/xml-casca/*`) exercises a file living under a `Recepcionista/` directory — only bare basenames at temp-dir root or `modelo/` are used, so this gap has zero test coverage in either direction.

**Fix:** Make type resolution path-aware, not basename-only. E.g. in `validateFile`/`discoverTouchedFiles`, detect the Recepcionista-router case via `path.basename(path.dirname(filePath)) === "Recepcionista"` and, when the basename is `Orquestrador.md` under such a directory, validate against the Recepcionista profile instead of the plain Orquestrador profile:
```js
function resolveTipoProfile(filePath, basename) {
  const parentDir = path.basename(path.dirname(filePath));
  if (basename === "Orquestrador.md" && parentDir === "Recepcionista") {
    return { tipo: "orchestrator", origem: "recepcionista" };
  }
  return TIPO_MAP[basename];
}
```
Add fixtures/tests for `<tempdir>/Recepcionista/Orquestrador.md` missing `origem`, and for a plain `<tempdir>/SomeCliente/Orquestrador.md` correctly NOT requiring it.

---

### CR-02: Hook unconditionally blocks the intentionally casca-less `Recepcionista/Qualifier.md` and `Recepcionista/Scheduler.md` stub files, breaking the multi-agent scaffolding flow

**File:** `.claude/hooks/validate-xml-casca.js:10-17` (TIPO_MAP), `.claude/agents/recepcionista-scaffolder.md:117-128` (Fase 3 stub spec)

**Issue:** `recepcionista-scaffolder.md`'s Fase 3 explicitly specifies that `<cliente>/Recepcionista/Qualifier.md` and `<cliente>/Recepcionista/Scheduler.md` must be created with **exactly** this content — a bare `<objetivo>` block, with no XML declaration and no `<agente>` root at all:

```
<objetivo>
Este agente está em uma pasta de **Recepcionista** (router multi-agente).
...
</objetivo>
```

`TIPO_MAP` unconditionally requires the full casca for any file named `Qualifier.md` or `Scheduler.md`, regardless of directory. Verified programmatically against the exact stub content from `recepcionista-scaffolder.md`:

```
validateCasca(<stub content above>, "Qualifier.md")
=> { valid: false, errors: [
     "linha 1 não contém a declaração XML esperada",
     "linha 2 não é uma tag <agente ...> de linha única",
     "raiz agente encontrada 0 vez(es) aberta e 0 vez(es) fechada — esperado exatamente 1 abertura e 1 fechamento"
   ] }
```

Because this hook is registered on **both** `SubagentStop` and `Stop` in `.claude/settings.json` with no subagent-type or path-based exemption (unlike `post-scaffolder-review.sh`, which switches behavior per `subagent_type`), every `Edit`/`Write` of these two spec'd stub files during `/ei-cria-cliente`'s multi-agent flow will produce `{"decision":"block", "reason": ...}` and halt the scaffolder mid-flow. This is a direct regression of the multi-agent client-creation pipeline — this milestone's own `CLAUDE.md` constraint says the new hook must not regress `/ei-ajustes`, and by the same logic must not regress `/ei-cria-cliente`, which this breaks outright for every multi-agent client.

**Fix:** Exempt files under a `Recepcionista/` directory whose basename is `Qualifier.md`/`Scheduler.md` from the full-casca requirement (they are inert stubs by design), e.g.:
```js
function resolveTipoProfile(filePath, basename) {
  const parentDir = path.basename(path.dirname(filePath));
  if (parentDir === "Recepcionista" && (basename === "Qualifier.md" || basename === "Scheduler.md")) {
    return null; // no casca expected — skip XMLV checks entirely for these
  }
  ...
}
```
and short-circuit `validateCasca`/`validateFile` to `{valid: true, errors: []}` when the resolved profile is `null`.

---

### CR-03: `countAgenteTags` false-positives on ordinary prose containing a literal `<agente ...>`-shaped substring, contradicting the phase's own D-08 design decision

**File:** `.claude/hooks/validate-xml-casca.js:51-56` (`countAgenteTags`), `:158-179` (XMLV-04 check)

**Issue:** `01-CONTEXT.md` (D-08) explicitly states: "the validator only tracks literal `<agente>`/`</agente>` boundaries, so generic client `<`/`&` in prose won't spuriously trip it anyway." This is false. `countAgenteTags`'s open-tag regex, `/<agente(?=[\s>])/g`, matches **any** occurrence of the literal substring `<agente` followed by whitespace or `>` anywhere in the document — including inside ordinary body/prose content, not just the structural root tag.

Reproduced directly against the existing fixture `.claude/hooks/__fixtures__/xml-casca/raw-ampersand-in-content.md`, which contains this line inside a `<conhecimento>` body block: `O cliente perguntou sobre <agente especialista> mas não oferecemos isso no momento.`

```
validateCasca(fixtureContent, "Qualifier.md")
=> { valid: false, errors: [{
     line: 9, col: 27,
     message: "raiz agente encontrada 2 vez(es) aberta e 1 vez(es) fechada — esperado exatamente 1 abertura e 1 fechamento"
   }] }
```

Confirmed by isolating the two triggers: with only the raw ampersand (`M&A`) present and the `<agente especialista>` phrase removed, `validateCasca` returns `{valid:true, errors:[]}` — i.e. the fixture's actual invalidity has **nothing to do with the raw-ampersand/XMLV-07 blind spot it's named for**; it is entirely caused by the unrelated false-positive root-tag match. The existing test (`validate-xml-casca.test.js:138-148`, "blocks on raw ampersand/content-triggered break WITHOUT escape/CDATA wording") only asserts `valid === false` and the absence of escape/CDATA wording in the message — it does not verify the error is actually about the ampersand, so it passes for the wrong reason and gives false confidence that raw ampersands are the only accepted blind spot.

In production this means: any client-facing prose an editor writes that happens to contain a bracketed phrase shaped like `<agente algumacoisa>` (e.g., discussing tag syntax, or a placeholder someone typed with a stray `<`) will cause a legitimate, structurally-valid edit to be blocked with a confusing "duplicate root" error that has nothing to do with the real content.

**Fix:** Restrict root-tag counting to line-anchored, structural positions — the code already assumes line 2 is the root open tag; extend that same "must be its own line" constraint to the open/close scan instead of matching the substring anywhere in the document body, e.g. scan line-by-line for lines matching `/^\s*<agente(?:[\s>])/` and `/^\s*<\/agente>\s*$/` rather than running the regex across the full raw content. Add a regression test asserting that prose containing `<agente ...>`-shaped text inside a body tag does NOT trigger XMLV-04.

## Warnings

### WR-01: `validate-xml-casca.sh` has no fallback for an unset `$CLAUDE_PROJECT_DIR`, causing a silent fail-open of the entire hook

**File:** `.claude/hooks/validate-xml-casca.sh:52`

**Issue:** `set -uo pipefail` is active (line 37), but line 52 references `$CLAUDE_PROJECT_DIR` directly with no fallback:
```bash
RESULT=$(node "$CLAUDE_PROJECT_DIR/.claude/hooks/validate-xml-casca.js" --transcript "$TRANSCRIPT")
```
Reproduced directly: with `CLAUDE_PROJECT_DIR` unset, this line raises "unbound variable" inside the `$(...)` subshell. Because `set -e` is deliberately NOT used (documented rationale for the grep/sed pipeline), the parent script does not abort — it just gets an empty `$RESULT`, which then falls into the `[ -z "$RESULT" ] ... exit 0` branch. Net effect: the hook exits 0, prints nothing, and silently fails to validate or block anything, with only a terse stderr message that nothing in the visible pipeline surfaces to the user.

This project already has an established pattern for exactly this defensive guard — `.claude/hooks/inject-ei-context.sh:12`: `PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"`. `validate-xml-casca.sh` is the only one of the three hooks that needs `$CLAUDE_PROJECT_DIR` inside its own body (the other two only appear as the `command` value in `settings.json`, not referenced again inside the script), so it is also the only one exposed to this failure mode, and it doesn't follow the established fallback convention.

**Fix:**
```bash
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
RESULT=$(node "$CLAUDE_PROJECT_DIR/.claude/hooks/validate-xml-casca.js" --transcript "$TRANSCRIPT")
```

---

### WR-02: CRLF line endings desync the offset-to-line/col math for the XMLV-04 (root-count) error _(carried forward — still present)_

**File:** `.claude/hooks/validate-xml-casca.js:159-179`
**Issue:** `countAgenteTags`/the duplicate-open-tag offset search run against `working` (the raw, un-normalized content, still containing `\r\n` if present), but the resulting numeric offset is then fed into `offsetToLineCol(normalizeContent(working), fallbackOffset)` — i.e. the *offset* is computed against the CRLF string while the *line/col conversion* walks the LF-normalized string. Every `\r` stripped before the offset shifts the reported column by one per removed `\r`. The file-level comment on line 20 claims "CRLF-safe splitting (Pitfall 3)" is handled, but this is only true for the line-1/line-2 checks — the XMLV-04 path is not.

Re-confirmed against the current code:
```
node -e '
const { validateCasca } = require("./.claude/hooks/validate-xml-casca.js");
const fs = require("fs");
const lf = fs.readFileSync(".claude/hooks/__fixtures__/xml-casca/duplicate-root.md","utf8");
const crlf = lf.replace(/\n/g,"\r\n");
console.log(validateCasca(crlf, "Follow-Up.md").errors); // {line:10, col:10}
console.log(validateCasca(lf,   "Follow-Up.md").errors); // {line:10, col:1}
'
```
Same logical position reports `col: 10` on the CRLF variant vs. `col: 1` on the LF variant — a 9-character discrepancy matching the 9 stripped `\r`s.

**Fix:** Compute the duplicate-open-tag offset against the same normalized string used for line/col conversion:
```js
const normalizedWorking = normalizeContent(working);
const openRegex = /<agente(?=[\s>])/g;
// run openRegex.exec(normalizedWorking) instead of working
const { line, col } = offsetToLineCol(normalizedWorking, fallbackOffset);
```
(`countAgenteTags`'s open/close *counts* are newline-agnostic so they don't need to change — only the offset search that feeds `offsetToLineCol` does.)

---

### WR-03: `validateFile()` real-file test is cwd-dependent and fails when the suite isn't run from repo root _(carried forward — still present)_

**File:** `.claude/hooks/validate-xml-casca.test.js:158-177`
**Issue:** `path.join(process.cwd(), "modelo", basename)` assumes the test process's current working directory is the repo root. Re-confirmed against the current code: running the exact same suite from `.claude/hooks/` (`cd .claude/hooks && node --test validate-xml-casca.test.js`) fails this test with `arquivo inacessível: /root/EiPrompt/.claude/hooks/modelo/Orquestrador.md`, even though every other test in the file (which use `__dirname`-relative fixture paths) still passes. There is no `package.json` `test` script and no CI config pinning the invocation cwd, so this test's correctness silently depends on whoever runs it invoking it from the right directory.
**Fix:** Anchor the path to the repo root the same way the file already anchors fixtures, e.g. `path.resolve(__dirname, "..", "..", "modelo", basename)`, removing the `process.cwd()` dependency.

---

### WR-04: `isGenuineUserTurnStart` does not distinguish sidechain (subagent-internal) `"user"` messages from top-level human turns

**File:** `.claude/hooks/validate-xml-casca.js:218-226`

**Issue:** Per `post-scaffolder-review.sh`'s own comments, subagent ("sidechain") messages live in the *same* transcript JSONL as the main session, marked with `"isSidechain":true`. `isGenuineUserTurnStart` inspects only `parsed.type` and `parsed.message.content` — it never checks `parsed.isSidechain`. When this hook runs on `SubagentStop`, the initial task-injection message that starts a subagent's own sidechain conversation is itself a `"type":"user"` message and, if it's a plain string or a non-tool_result content block (typical for a task prompt), will satisfy `isGenuineUserTurnStart` just like a real top-level human turn. This may be the intended scoping boundary for a subagent's own turn, but it is not verified anywhere in the test suite (`validate-xml-casca.test.js` only constructs non-sidechain synthetic transcripts) or documented as an intentional equivalence, so it's unclear whether an interleaving of top-level and sidechain `"user"` lines within the 400-line tail window could cause the boundary scan to land on the wrong one in either direction.

**Fix:** Either explicitly document why sidechain-vs-main-chain doesn't matter for this scan (and add a synthetic test with `isSidechain: true` lines interleaved with main-chain lines to prove the boundary lands correctly), or filter out `isSidechain` messages from the turn-boundary scan so only true top-level human turns are considered a boundary.

## Info

### IN-01: `raw-ampersand-in-content.md` test/fixture name and assertions don't verify what they claim to verify

**File:** `.claude/hooks/validate-xml-casca.test.js:138-148`, `.claude/hooks/__fixtures__/xml-casca/raw-ampersand-in-content.md:9`

**Issue:** As detailed in CR-03, this test's fixture is invalid for a reason unrelated to its name/purpose (raw ampersand handling). The test would pass identically even if ampersand-in-content handling were completely removed from the validator, since the actual failure trigger is the unrelated `<agente especialista>` substring match. This gives false confidence that XMLV-07 (raw ampersand tolerance) is under active regression protection when it currently is not meaningfully exercised.

**Fix:** Once CR-03 is fixed (so the `<agente especialista>` phrase no longer trips a false positive), keep a dedicated ampersand-only fixture/test, and separately add the `<agente especialista>`-in-prose case as its own explicit non-regression test (asserting `valid: true`) rather than relying on incidental fixture content.

---

### IN-02: `parseAgenteLine`'s single-line strictness rejects a syntactically-fine line-2 tag with trailing whitespace _(carried forward)_

**File:** `.claude/hooks/validate-xml-casca.js:37-49`
**Issue:** `^<agente\b([^>]*)>$` requires the tag's closing `>` to be the very last character of line 2. A trailing space or stray character after `>` (e.g. from an editor auto-format) reports the generic "linha 2 não é uma tag `<agente ...>` de linha única" error rather than a more specific/actionable message. Low impact given the project's own "casca" format is meant to be machine-generated and exact.
**Fix:** `.trimEnd()` the line before matching, if trailing-whitespace false positives turn out to be common in practice.

### IN-03: Duplicate attributes on the line-2 tag are silently coalesced, not flagged _(carried forward)_

**File:** `.claude/hooks/validate-xml-casca.js:42-48`
**Issue:** The `attrRegex` loop overwrites `attrs[key]` on each match, so `<agente xmlns="a" xmlns="b" ...>` silently resolves to `xmlns="b"` with no error about the duplicate attribute (which would itself make the tag invalid XML). Consistent with this hook's explicitly narrow, non-full-XML-parser scope, so this is informational only, not a regression against any stated requirement.

---

_Reviewed: 2026-07-05T01:01:29Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
