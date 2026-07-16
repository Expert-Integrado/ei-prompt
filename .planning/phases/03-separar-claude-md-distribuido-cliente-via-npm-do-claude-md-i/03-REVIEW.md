---
phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
reviewed: 2026-07-16T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .claude/CLAUDE.md
  - .claude/agents/client-scaffold-collect.md
  - .claude/agents/client-scaffold-fill.md
  - .claude/agents/client-scaffold-structure.md
  - .claude/agents/docs-analyzer.md
  - .claude/agents/docs-editor-conciso.md
  - .claude/agents/docs-reviewer.md
  - .claude/agents/recepcionista-scaffolder.md
  - .claude/commands/ei-ajustes.md
  - .claude/commands/ei-cria-cliente.md
  - .claude/hooks/check-claude-md-audience.sh
  - .claude/hooks/check-claude-md-audience.test.js
  - .claude/settings.local.json
  - bin/cli.js
  - bin/cli.test.js
  - client/CLAUDE.md
  - manifest.json
  - package.json
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The phase's core mechanical goals are solidly implemented and independently verified: `manifest.json`'s `{from,to}` object shape for `client/CLAUDE.md → CLAUDE.md` round-trips correctly through `bin/cli.js` (`normalizeEntry`/`formatManifestEntry`), `--help` output never leaks `[object Object]`, `npm test` passes 41/41, and the dual-context fallback-read pattern (`client/CLAUDE.md` via Glob, else `CLAUDE.md`) is applied identically and correctly across all 9 distributed agent/command files. `check-claude-md-audience.sh` is correctly and verifiably excluded from both `manifest.json` and the distributed `.claude/settings.json`, and lives only in the gitignored, untracked `.claude/settings.local.json`.

Two real, reproducible defects were found by exercising the code directly (not just reading it):

1. `check-claude-md-audience.sh`'s "touched file" discovery does not actually restrict to Edit/Write tool calls, contradicting its own header comment and `03-05-PLAN.md`'s documented design — a bare `Read` of an unrelated `CLAUDE.md` containing a banned heading substring causes a false-positive `Stop` block. Reproduced live against the real script.
2. `bin/cli.js`'s `deprecated_files` cleanup loop calls `removeFile()` directly (no `normalizeEntry()`, no try/catch), so an object-shape `{from,to}` entry in `deprecated_files` — a shape this very phase made a first-class manifest concept — crashes the entire `run()` before any file is installed. Reproduced live against the real exported `removeFile()`.

Neither is triggered by the manifest/transcript data that exists in the repo today, but both represent shipped, demonstrable incorrect behavior in code delivered by this phase, with no test coverage exercising the failure mode.

## Critical Issues

### CR-01: `check-claude-md-audience.sh` triggers on read-only tool calls, not just Edit/Write, contradicting its own documented design

**File:** `.claude/hooks/check-claude-md-audience.sh:46-55`
**Issue:** The header comment explicitly claims the discovery step finds "arquivos CLAUDE.md tocados **(Edit/Write tool_use)**" and `03-05-PLAN.md:71` documents the same grep pattern as matching "any Edit/Write `tool_use.input.file_path` value". In reality, the grep (`grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*CLAUDE\.md"'`) matches the `file_path` key of **any** tool_use (`Read`, `NotebookEdit`, etc.) — there is no filter on the tool's `"name"` field, unlike the sibling hook `post-ajustes-fanout.sh`, which explicitly filters to `"type":"assistant"` lines specifically to avoid matching unrelated JSON content in the transcript.

Reproduced live:
```bash
$ echo '{"file with a banned heading}' # (see repro below)
$ cat transcript.jsonl
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":".../CLAUDE.md"}}]}}
$ echo '{"transcript_path":"..."}' | bash check-claude-md-audience.sh
{"decision":"block","reason":".../CLAUDE.md contém um cabeçalho migrado ..."}
```
A pure `Read` (which every one of the 9 distributed agents performs routinely in their Passo 0 context-loading step) is sufficient to trigger a `Stop`/`SubagentStop` block, as long as the on-disk file at that path happens to contain a banned heading — including an entirely unrelated `CLAUDE.md` from another project the session merely inspected (the repo's own `settings.local.json` grants `Read(//root/**)`, so cross-repo reads are a realistic occurrence in this environment). This is a false-positive block against code the session never wrote to.

**Fix:** Restrict the discovery to actual write operations, matching the documented intent, e.g. require the enclosing `tool_use` block's `"name"` to be `Edit` or `Write` before extracting `file_path` (mirror `post-ajustes-fanout.sh`'s more precise `"type":"assistant"` + tool-name filtering), for example:
```bash
mapfile -t TOUCHED < <(
  tail -n 400 "$TRANSCRIPT" \
    | grep -oE '"name"[[:space:]]*:[[:space:]]*"(Edit|Write)"[^}]*"file_path"[[:space:]]*:[[:space:]]*"[^"]*CLAUDE\.md"' \
    | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*CLAUDE\.md"' \
    | sed 's/.*"\([^"]*\)"$/\1/' \
    | sort -u \
    | grep -v '/client/'
)
```
Add a regression test asserting a `Read`-only tool_use on a file with a banned heading does **not** block (the current 6 tests only ever exercise `name: "Edit"`, so this gap shipped with green tests).

### CR-02: `bin/cli.js` crashes the entire install/update if `deprecated_files` ever contains an object-shape entry

**File:** `bin/cli.js:96-102` (loop), `bin/cli.js:70-89` (`removeFile`)
**Issue:** This phase introduced `normalizeEntry()` to safely accept both plain-string and `{from,to}` object entries, and used it in the `manifest.files` loop (wrapped in try/catch, so one bad entry doesn't abort the run). `help()` was also hardened to call `formatManifestEntry()` for **both** `manifest.files` and `manifest.deprecated_files` (commit `1dc3256`). However, the `deprecated_files` cleanup loop was never given the same treatment:
```js
for (const file of deprecated) {
  const status = removeFile(file);   // no normalizeEntry(), no try/catch
  if (status === "removed") results.removed++;
}
```
and `removeFile(relPath)` calls `path.resolve(cwd, relPath)` directly, which throws a `TypeError` if `relPath` is an object instead of a string. Reproduced live against the real exported function:
```
$ node -e "require('./bin/cli.js').removeFile({from:'a.md', to:'b.md'})"
TypeError: The "paths[1]" argument must be of type string. Received an instance of Object
```
Because this call is outside any try/catch, the exception propagates out of `run()`, is caught only by the top-level `.catch()` in `bin/cli.js`, and `process.exit(1)`s **before any `manifest.files` entry is fetched or written** — a single bad `deprecated_files` entry bricks the entire `npx @expertzinhointegrado/ei-prompt` run for every user, not just the one entry. This directly contradicts the project's own documented error-handling convention ("each `fetchFile`/`writeFile` call is wrapped per-file so one failed download does not abort the whole batch" — `.claude/CLAUDE.md` Error Handling section).

Current `manifest.json` only has plain strings in `deprecated_files`, so this is not triggered today, and `03-CONTEXT.md` (D-04) explicitly scoped `deprecated_files` out of the `{from,to}` treatment. But the phase's own `03-02-SUMMARY.md` flags this exact gap as a known future risk ("Any future manifest.json schema extension (files[] or deprecated_files[]) must route through normalizeEntry()/formatManifestEntry() to avoid re-introducing the loop-crash"), and `help()` was already defensively hardened for this exact array while the execution path was not — an inconsistency within the same commit, not a considered trade-off.

**Fix:** Either enforce the "always plain strings" invariant at load time (fail loudly and clearly if violated) or make execution match the display code's defensiveness:
```js
for (const rawEntry of deprecated) {
  try {
    const { to } = normalizeEntry(rawEntry);
    const status = removeFile(to);
    if (status === "removed") results.removed++;
  } catch (err) {
    log("red", "fail  ", `deprecated: ${JSON.stringify(rawEntry)} — ${err.message}`);
  }
}
```

## Warnings

### WR-01: `.gitignore`d `settings.local.json` accumulates a large, hard-to-audit `permissions.allow` list alongside the phase's hook wiring

**File:** `.claude/settings.local.json:24-165`
**Issue:** The file mixes the phase-relevant `hooks.Stop`/`hooks.SubagentStop` block (correct and verified) with ~140 unrelated `permissions.allow` entries accumulated across the project's history (git commands, gsd-tools invocations, arbitrary `node -e`/`awk` one-liners, etc.), several of which are broad (`Read(//root/**)`, `Bash(git reset *)`, `Bash(git revert *)`). This is local dev config, not shipped, and out of this phase's direct scope, but it is the same file this phase's plan explicitly modified — worth a note that CR-01's false-positive risk is amplified by `Read(//root/**)` already being granted, since it makes cross-repo `Read` of unrelated `CLAUDE.md` files a realistic occurrence in this environment.
**Fix:** No action required for this phase; flagging for awareness only given it directly interacts with CR-01's blast radius.

### WR-02: `check-claude-md-audience.sh`'s `/client/` exclusion is a raw substring match, not a path-segment match

**File:** `.claude/hooks/check-claude-md-audience.sh:54`
**Issue:** `grep -v '/client/'` excludes any touched path containing the literal substring `/client/` anywhere, not just the canonical `client/CLAUDE.md` at repo root. A legitimately-named client folder or nested directory containing `/client/` in its path (e.g. `.../api-client/CLAUDE.md`) would be silently excluded from the regression guard even though it isn't the intended `client/CLAUDE.md` source-of-truth file.
**Fix:** Anchor the exclusion more precisely, e.g. `grep -vE '(^|/)client/CLAUDE\.md$'`, or resolve to a path relative to the repo root and compare exactly.

### WR-03: `check-claude-md-audience.test.js` leaks temp directories

**File:** `.claude/hooks/check-claude-md-audience.test.js:12-14, 41-115`
**Issue:** `makeTempDir()` creates a new directory via `fs.mkdtempSync` in each of the 5 tests that call it, but nothing ever removes them (no `fs.rmSync`/`afterEach` cleanup). Over repeated `npm test` runs these accumulate in the OS temp directory.
**Fix:** Add cleanup (e.g. `t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }))` per test, or a module-level `after` hook tracking all created dirs).

## Info

### IN-01: `.claude/CLAUDE.md`'s GSD `<!-- GSD:project-start -->` block describes a different, earlier milestone

**File:** `.claude/CLAUDE.md:1-17`
**Issue:** The auto-generated Project section still describes the XML-casca-hardening milestone ("Este milestone endurece essa casca com validação de código... conserta o fluxo de criação de cliente") rather than the current CLAUDE.md-separation milestone this phase belongs to. Since this block is GSD-managed (`source:PROJECT.md`), it's likely stale relative to `.planning/PROJECT.md` rather than something this phase's authors hand-edited incorrectly.
**Fix:** Regenerate/refresh the GSD project block from current `PROJECT.md` when convenient; not blocking for this phase's own deliverables.

### IN-02: `check-claude-md-audience.sh`'s emitted JSON is not quote-escaped for `$f`

**File:** `.claude/hooks/check-claude-md-audience.sh:68`
**Issue:** `printf '{"decision":"block","reason":"%s ...'` interpolates the discovered file path `$f` directly into a JSON string with no escaping. A path containing a literal `"` (pathologically unlikely but not impossible on POSIX filesystems) would produce invalid JSON. Same pre-existing risk shared by `validate-xml-casca.sh`/`post-ajustes-fanout.sh`.
**Fix:** Low priority given practical unlikelihood; if hardened, use a minimal escape (`${f//\"/\\\"}`) before interpolation.

### IN-03: No handling documented for the case where neither `client/CLAUDE.md` nor `CLAUDE.md` exists

**File:** `.claude/agents/docs-analyzer.md:17-20` (and identically in the other 8 dual-context files)
**Issue:** All 9 dual-context Passo 0 blocks describe "Glob for `client/CLAUDE.md`, else Read `CLAUDE.md`" but none describes what to do if the fallback `Read` also fails (e.g. a client project on a very old install predating any `CLAUDE.md` distribution, or a workspace where install never ran). This is a narrow edge case unlikely to matter in practice since `CLAUDE.md` has been distributed since `manifest.json`'s inception, but it's an unhandled path in an otherwise carefully-specified fallback.
**Fix:** Optional — add one line noting graceful degradation (proceed with a warning) if both reads fail, for completeness.

---

_Reviewed: 2026-07-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
