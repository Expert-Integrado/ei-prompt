---
phase: 01-xml-validation-hook
verified: 2026-07-05T00:15:00Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "discoverTouchedFiles(transcriptPath) is scoped to files touched in the current turn only (D-06 — no whole-client-folder scan)"
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 1: XML Validation Hook Verification Report

**Phase Goal:** As a developer maintaining the ei-prompt AI editing pipeline (docs-editor-conciso, client-project-scaffolder), I want to have every client agent file's XML casca checked automatically by deterministic code, so that a broken casca (missing/incorrect declaration, wrong `tipo`, nested/duplicate roots) is always caught with an actionable file+line/column error — without ever auto-"fixing" the accepted raw `<`/`&` blind spot.
**Verified:** 2026-07-05T00:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (Plan 01-04 closed the single WR-02/D-06 gap found in the prior round dated 2026-07-04)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Missing/incorrect XML declaration (line 1) reports file+line/col and blocks | ✓ VERIFIED | `node --test` (independently re-run, this session): `validateCasca reports missing XML declaration at line 1, col 1` and `...wrong/incomplete declaration with a column at the divergence point` both pass; live `.sh` invocation this session against a synthetic broken file returned `"linha 1 coluna 1: linha 1 não contém a declaração XML esperada"` |
| 2 | Wrong `tipo` / missing `xmlns`/`versao`/`origem` (incl. Recepcionista) reported with specific mismatch, blocks | ✓ VERIFIED | 3 passing tests re-confirmed: XMLV-03 tipo mismatch, XMLV-02 missing xmlns, XMLV-03 missing origem for Recepcionista (Pitfall 7) — unchanged since prior round, code untouched by Plan 04 |
| 3 | Nested or duplicate `<agente>` roots reported as structural violation, blocks | ✓ VERIFIED (LF-only caveat, unchanged) | 2 passing tests (nested-root, duplicate-root). Code review WR-01 (CRLF column-offset desync, non-blocking) remains open but non-material — real `modelo/*.md` files are all LF; Plan 04 did not touch this code path |
| 4 | Hook runs automatically on Stop/SubagentStop; existing sentinel/anti-loop protocols (post-ajustes-fanout.sh, post-scaffolder-review.sh) continue unchanged | ✓ VERIFIED | `.claude/settings.json` Stop[]/SubagentStop[] each show 2 entries unchanged (pre-existing hook first, `validate-xml-casca.sh` appended). Plan 04 modified only `.claude/hooks/validate-xml-casca.js`/`.test.js` — `git diff --stat` since the prior verification's baseline commit confirms `.claude/settings.json`, `manifest.json`, and `validate-xml-casca.sh` are byte-identical (0 changes) |
| 5 | Raw `<`/`&` in client content breaking the parse reports failure without any auto-escape/CDATA "correction"; blind spot preserved | ✓ VERIFIED | Passing test `validateCasca blocks on raw ampersand/content-triggered break WITHOUT escape/CDATA wording (XMLV-07)`; module-wide regex scan for escape/CDATA vocabulary confirmed absent (unchanged) |
| 6 | `validateFile()` returns `valid:true, errors:[]` for all 6 real `modelo/*.md` files | ✓ VERIFIED | Passing test, independently re-run this session — full suite 27/27 green |
| 7 | `countAgenteTags` does not false-positive on Recepcionista's `agentes_disponiveis` body tag (Pitfall 1) | ✓ VERIFIED | Passing test, word-boundary lookahead regex confirmed unchanged in source |
| 8 | `discoverTouchedFiles` is scoped to files touched in the **current turn only** (D-06) — **the gap closed by this round** | ✓ VERIFIED | **Independently re-derived, not trusted from SUMMARY.** Read `isGenuineUserTurnStart` + the backward turn-boundary scan in `.claude/hooks/validate-xml-casca.js` (lines 214-258). Ran `node --test .claude/hooks/validate-xml-casca.test.js` myself: 27/27 pass, including the WR-02 regression test, the same-turn-multi-tool-call test, and the ENOENT-isolation test. Additionally wrote and ran an independent standalone repro script (outside the test file, mirroring but not copying the test/plan code) reproducing 01-REVIEW.md's exact scenario (turn-1 edit, 50 filler turns, delete file, invoke against an unrelated later Stop event): `discoverTouchedFiles` no longer includes the stale file and `runCli` returns `{}` (previously `{"decision":"block","reason":"arquivo inacessível: ..."}`). Gap confirmed closed by direct observation, not by re-reading the SUMMARY's claim |
| 9 | `runCli(argv)` returns the exact `{decision:'block',reason}` / `{}` contract | ✓ VERIFIED | 4+ passing unit tests + subprocess CLI test, re-run this session; manually re-invoked `.sh` wrapper twice (first + `stop_hook_active:true` retry) against a broken-file synthetic transcript — both returned identical `{"decision":"block",...}` |
| 10 | Real transcript shape (`message.content[].type==="tool_use"` / `.name` / `.input.file_path`) empirically holds | ✓ VERIFIED | Unchanged from prior round; code path for shape extraction untouched by Plan 04 |
| 11 | Bash wrapper blocks on both a first invocation AND a `stop_hook_active=true` retry (no early-exit guard, D-07/Pitfall 4) | ✓ VERIFIED | Independently re-invoked `.claude/hooks/validate-xml-casca.sh` twice this session against the same broken-file transcript, second call with `stop_hook_active:true` — both returned identical `"decision":"block"` JSON, confirming no regression from Plan 04's changes to the upstream `.js` module |
| 12 | `manifest.json` distributes the `.sh`/`.js` runtime pair to end users, excluding `.test.js`/`__fixtures__/` | ✓ VERIFIED | `manifest.json` files[] confirmed unchanged (still exactly `.claude/hooks/validate-xml-casca.sh` and `.claude/hooks/validate-xml-casca.js`); `.test.js`/fixtures absent |

**Score:** 12/12 truths verified (0 failed, 0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/hooks/validate-xml-casca.js` | Exports TIPO_MAP, normalizeContent, offsetToLineCol, parseAgenteLine, countAgenteTags, validateCasca, validateFile, discoverTouchedFiles, runCli; discoverTouchedFiles now turn-scoped, validateFile's error objects carry `code`, runCli skips pure-ENOENT files | ✓ VERIFIED | All 9 exports present (`module.exports` inspected directly). `isGenuineUserTurnStart` helper present (lines 218-226), turn-boundary backward scan present (lines 244-258), `code: err.code` present in both `validateFile` catch branches (lines 189, 200), `runCli`'s ENOENT-skip present (lines 304-309) |
| `.claude/hooks/validate-xml-casca.test.js` | node:test suite covering all behaviors, incl. 3 new WR-02-closure regression tests | ✓ VERIFIED | 27 tests total, all passing (independently re-run this session, not read from SUMMARY): rewritten "ignoring user lines" test, WR-02 stale-deleted-file regression test, same-turn-multi-tool-call test, ENOENT-isolation test all present and green |
| `.claude/hooks/__fixtures__/xml-casca/*.md` (10 files) | Synthetic valid/broken casca fixtures | ✓ VERIFIED | All 10 present on disk, unchanged |
| `.claude/hooks/validate-xml-casca.sh` | Thin bash wrapper, stdin JSON → stdout block JSON, always exits 0, no stop_hook_active guard | ✓ VERIFIED (wired, unchanged) | Byte-unchanged since Plan 03/prior verification (Plan 04's `files_modified` did not include this file); independently re-invoked twice this session (first + retry), both blocked correctly |
| `.claude/settings.json` (Stop[]/SubagentStop[] gain one entry each) | Existing entries untouched, one new entry appended each | ✓ VERIFIED | Confirmed via direct JSON parse this session — 2 entries each array, order preserved, unchanged since prior verification |
| `manifest.json` (files[] gains .sh/.js pair) | Runtime pair added, dev-only files excluded | ✓ VERIFIED | Confirmed via `require()` + `.includes()` check this session — unchanged |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `validateFile(filePath)` | `fs.statSync(...).isFile()` guard | T-1-02 mitigation | ✓ WIRED | Confirmed: non-existent path and directory path both return `{valid:false}` without throwing (regression tests pass) |
| `discoverTouchedFiles` output | `validateFile()` per file inside `runCli` | Path safety enforced once | ✓ WIRED | `discoverTouchedFiles` never calls `fs.statSync`/`readFileSync` itself (grep-confirmed); the only stat/read calls are inside `validateFile` |
| `discoverTouchedFiles` | current-turn scoping | turn-boundary backward scan via `isGenuineUserTurnStart` | ✓ WIRED (gap closed) | Was ⚠️ PARTIAL in the prior round — now confirmed fully wired: the backward scan restricts the extraction loop to `lines.slice(turnStart)`, verified both via the 27/27 test suite and an independent standalone repro script run in this session |
| `runCli`'s ENOENT skip | `validateFile`'s new `error.code` field | machine-readable disposition, not string-matching | ✓ WIRED | Confirmed in source (`result.errors.every((e) => e.code === "ENOENT")`); ENOENT-isolation test confirms `validateFile`'s own direct contract (`valid:false`, `code:"ENOENT"`) is unchanged while only `runCli`'s aggregation treats it specially |
| `.claude/settings.json` Stop[]/SubagentStop[] | `validate-xml-casca.sh` | `node validate-xml-casca.js --transcript "$TRANSCRIPT"` | ✓ WIRED | Confirmed command string matches Plan 02's CLI contract exactly; unchanged |
| `manifest.json` files[] | `bin/cli.js` fetch/write mechanism | D-10 distribution | ✓ WIRED | Entries present, unchanged |

### Data-Flow Trace (Level 4)

Not applicable in the standard sense (no UI/dashboard rendering dynamic data). The equivalent trace for this phase — transcript JSONL → `discoverTouchedFiles` → `validateFile` → `runCli` → hook stdout JSON — was exercised end-to-end via live `.sh` invocation (see Behavioral Spot-Checks) and confirmed to carry real data (a genuinely broken fixture file's real validation errors) through every stage, not a static/stubbed value.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes (independently re-run, not trusted from SUMMARY) | `node --test .claude/hooks/validate-xml-casca.test.js` | 27/27 pass, 0 fail | ✓ PASS |
| WR-02 regression closed — independent standalone repro outside the test file | custom `node` script mirroring 01-REVIEW.md's exact scenario (turn-1 edit, 50 filler turns, delete file, invoke) | `discoverTouchedFiles` excludes stale file; `runCli` returns `{}` | ✓ PASS |
| Bash wrapper blocks on broken file (real end-to-end invocation, `CLAUDE_PROJECT_DIR` set) | synthetic transcript + broken fixture piped through `.sh` | `{"decision":"block","reason":"...linha 1 coluna 1:...\nlinha 2..."}`, exit 0 | ✓ PASS |
| Bash wrapper blocks again on `stop_hook_active=true` retry (no regression from Plan 04) | same, second invocation with the flag set | identical block JSON both times, exit 0 | ✓ PASS |
| `git diff --stat` confirms Plan 04 touched only the 2 declared files | `git diff --stat <prior-verification-baseline>..HEAD -- .claude/hooks/ manifest.json .claude/settings.json` | Only `validate-xml-casca.js` and `validate-xml-casca.test.js` changed | ✓ PASS — confirms no collateral regression risk to Plan 03's wiring |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` convention used or declared by this phase; verification is via `node:test` + direct manual invocation instead (unchanged from prior round).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| XMLV-01 | 01-01 | Declaration check on line 1 | ✓ SATISFIED | Test + manual confirmation, unchanged |
| XMLV-02 | 01-01 | Line 2 `<agente ...>` single-line attribute check | ✓ SATISFIED | Test + manual confirmation, unchanged |
| XMLV-03 | 01-01 | `tipo` correctness per TIPO_MAP, incl. Recepcionista `origem` | ✓ SATISFIED | Test + manual confirmation, unchanged |
| XMLV-04 | 01-01 | Single-root, no nesting/duplication | ✓ SATISFIED | Test + manual confirmation (CRLF column caveat remains, non-material — see WR-01, unresolved but not blocking, not in this phase's must_haves) |
| XMLV-05 | 01-02, 01-03, 01-04 | Runs automatically on Stop/SubagentStop, no manual invocation, scoped to the current turn only | ✓ SATISFIED (gap closed) | Wiring verified; automatic firing verified; the "current turn only" scoping (D-06) that was previously broken (WR-02) is now confirmed fixed by independent test re-run + standalone repro |
| XMLV-06 | 01-01, 01-02, 01-03 | Actionable file+line/col error message | ✓ SATISFIED | Test + manual confirmation; message format `<path> linha N coluna C: <text>` confirmed unchanged |
| XMLV-07 | 01-01, 01-03 | Blind spot preserved, no escape/CDATA auto-fix | ✓ SATISFIED | Test + module-wide vocabulary scan confirmed absent, unchanged |

No orphaned requirements — REQUIREMENTS.md lists exactly XMLV-01..07 for Phase 1, and all 7 are claimed across the four plans' `requirements:` frontmatter fields (01-01: 01,02,03,04,06,07; 01-02: 05,06; 01-03: 05,06,07; 01-04: 05).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.claude/hooks/validate-xml-casca.js` | ~159-179 | CRLF offset/line-col desync for XMLV-04 (WR-01, pre-existing code review finding, untouched by Plan 04) | ⚠️ Warning (non-blocking) | Wrong column reported under CRLF content only; real `modelo/*.md` files are all LF, so no current production impact. Not part of this phase's must_haves; carried forward as a known, accepted limitation |
| `.claude/hooks/validate-xml-casca.test.js` | ~158-177 | `process.cwd()`-dependent real-file test (WR-03, pre-existing code review finding, untouched by Plan 04) | ⚠️ Warning (non-blocking) | Test suite fragility if ever invoked from a different cwd; does not affect the shipped hook's runtime behavior |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any file modified by Plan 04 (confirmed via direct grep this session).

WR-01 and WR-03 were already known, non-blocking findings from the original code review (01-REVIEW.md) and are not part of this phase's must_haves truths; they are carried forward as accepted, non-material limitations rather than new gaps.

### Human Verification Required

None. Plan 03's Task 3 blocking human-verify checkpoint (live Stop/SubagentStop pipeline test) already occurred during Plan 03's execution and was accepted in the prior verification round. Plan 04's fix is fully covered by automated regression tests (independently re-run in this session) plus an independent standalone repro outside the test suite — no behavior-dependent truth in this round required a human to observe runtime state that grep/tests could not.

### Gaps Summary

None. The single gap identified in the prior verification round (2026-07-04) — `discoverTouchedFiles` not actually scoped to "the current turn," allowing a stale/deleted file from many turns earlier to spuriously block an unrelated later Stop event (WR-02/D-06) — has been closed by Plan 01-04.

This verification did not take the SUMMARY.md's claims at face value: the full test suite (27/27) was re-run independently in this session, and a standalone repro script — written fresh, not copied from the test file or plan text — reproduced 01-REVIEW.md's exact WR-02 scenario (turn-1 edit, 50 filler turns, delete file, invoke against an unrelated later event) and confirmed the printed result is now `{}` instead of the previously-reported block. `git diff --stat` against the prior verification's baseline commit confirmed Plan 04 touched only the two files it declared (`validate-xml-casca.js`, `validate-xml-casca.test.js`), so no regression risk exists to Plan 03's `.sh`/`settings.json`/`manifest.json` wiring — this was independently re-confirmed live (double-invocation retry test) rather than assumed from the unchanged diff alone.

All 7 requirement IDs (XMLV-01 through XMLV-07) are satisfied. All 12 must-have truths across the phase's four plans are verified. The phase goal — deterministic, automatic, actionable XML casca validation without ever auto-fixing the raw `<`/`&` blind spot — is achieved.

---

*Verified: 2026-07-05T00:15:00Z*
*Verifier: Claude (gsd-verifier)*
