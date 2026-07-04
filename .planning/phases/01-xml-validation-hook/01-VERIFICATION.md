---
phase: 01-xml-validation-hook
verified: 2026-07-04T23:50:00Z
status: gaps_found
score: 11/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "discoverTouchedFiles(transcriptPath) is scoped to files touched in the current turn only (D-06 — no whole-client-folder scan)"
    status: failed
    reason: >
      The implementation reads the last 400 raw JSONL lines of the ENTIRE transcript file with no
      turn-boundary detection. It only filters on "type":"assistant" and tool name — it does not
      stop at the most recent "type":"user" line (the natural turn boundary). Confirmed empirically
      in this verification session (reproducing 01-REVIEW.md's WR-02): a file edited in turn 1,
      followed by 50 unrelated filler turns (well within the 400-line tail), then deleted before a
      later, completely unrelated Stop event, still causes runCli to return
      {"decision":"block","reason":"arquivo inacessível: <path>"} — a block with zero relation to
      the current turn's actual work, using a confusing "file inaccessible" message instead of a
      genuine casca violation.
    artifacts:
      - path: ".claude/hooks/validate-xml-casca.js"
        issue: "discoverTouchedFiles (~line 209-248) takes a fixed tailLines=400 window over the whole transcript with no turn-boundary cutoff, contradicting 01-02-PLAN.md's own must_haves.truths wording ('scoped to files touched in the current turn only') and RESEARCH.md/CONTEXT.md's D-06 decision ('Validate only the file(s) actually touched in that turn')."
    missing:
      - "Scope discovery to lines after the most recent \"type\":\"user\" entry (a reasonable turn-boundary proxy, consistent with the existing \"type\":\"assistant\" filter), OR"
      - "Treat 'arquivo inacessível' (file no longer exists) specially in validateFile/runCli so a file that has since been deleted does not itself produce a block — a missing file has no casca to validate, and blocking on it is not the deterministic-XML-check the phase promises."
deferred: []
---

# Phase 1: XML Validation Hook Verification Report

**Phase Goal:** As a developer maintaining the ei-prompt AI editing pipeline (docs-editor-conciso, client-project-scaffolder), I want to have every client agent file's XML casca checked automatically by deterministic code, so that a broken casca (missing/incorrect declaration, wrong `tipo`, nested/duplicate roots) is always caught with an actionable file+line/column error — without ever auto-"fixing" the accepted raw `<`/`&` blind spot.
**Verified:** 2026-07-04T23:50:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Missing/incorrect XML declaration (line 1) reports file+line/col and blocks | ✓ VERIFIED | `node --test` passes `validateCasca reports missing XML declaration at line 1, col 1` and `...wrong/incomplete declaration with a column at the divergence point`; live `.sh` invocation returned `"linha 1 coluna 1: linha 1 não contém a declaração XML esperada"` for a real synthetic broken file |
| 2 | Wrong `tipo` / missing `xmlns`/`versao`/`origem` (incl. Recepcionista) reported with specific mismatch, blocks | ✓ VERIFIED | 3 passing tests: XMLV-03 tipo mismatch, XMLV-02 missing xmlns, XMLV-03 missing origem for Recepcionista (Pitfall 7) |
| 3 | Nested or duplicate `<agente>` roots reported as structural violation, blocks | ✓ VERIFIED (LF-only caveat) | 2 passing tests (nested-root, duplicate-root fixtures) both return XMLV-04 errors. Code review WR-01 (non-blocking, LF-only real files confirmed by this verification — `modelo/*.md` all LF, no CRLF) notes the reported *column* can be off under CRLF content; the violation itself is still always detected and reported |
| 4 | Hook runs automatically on Stop/SubagentStop; existing sentinel/anti-loop protocols (post-ajustes-fanout.sh, post-scaffolder-review.sh) continue unchanged | ✓ VERIFIED | `.claude/settings.json` Stop[]/SubagentStop[] each show 2 entries — the pre-existing hook first, `validate-xml-casca.sh` appended after, verbatim; live human-verify checkpoint (Task 3, Plan 03) recorded a pause (STATE.md `7288c16`, "PAUSED at checkpoint") and later resolution ("Task 3 human-verify checkpoint approved") ~5 min later, consistent with a real live-session test having occurred |
| 5 | Raw `<`/`&` in client content breaking the parse reports failure without any auto-escape/CDATA "correction"; blind spot preserved | ✓ VERIFIED | Passing test `validateCasca blocks on raw ampersand/content-triggered break WITHOUT escape/CDATA wording (XMLV-07)`; module-wide regex scan for escape/CDATA vocabulary confirmed absent |
| 6 | `validateFile()` returns `valid:true, errors:[]` for all 6 real `modelo/*.md` files | ✓ VERIFIED | Passing test + independently re-run in this verification session — `node --test` 24/24 green |
| 7 | `countAgenteTags` does not false-positive on Recepcionista's `agentes_disponiveis` body tag (Pitfall 1) | ✓ VERIFIED | Passing test, word-boundary lookahead regex confirmed in source |
| 8 | `discoverTouchedFiles` is scoped to files touched in the **current turn only** (D-06) | ✗ FAILED | See Gaps below — reproduced empirically: a stale, since-deleted file edited 50 turns earlier still triggers `{"decision":"block","reason":"arquivo inacessível: ..."}` on an unrelated later Stop event |
| 9 | `runCli(argv)` returns the exact `{decision:'block',reason}` / `{}` contract | ✓ VERIFIED | 4 passing unit tests + subprocess CLI test; manually re-invoked `node validate-xml-casca.js --transcript ...` in this session, output matched |
| 10 | Real transcript shape (`message.content[].type==="tool_use"` / `.name` / `.input.file_path`) empirically holds | ✓ VERIFIED | Independently re-confirmed in this verification session via a fresh `python3` walk of a live `/root/.claude/projects/-root-EiPrompt/*.jsonl` file — `Edit`/`Write` tool_use blocks match the assumed shape exactly |
| 11 | Bash wrapper blocks on both a first invocation AND a `stop_hook_active=true` retry (no early-exit guard, D-07/Pitfall 4) | ✓ VERIFIED | Manually invoked `.claude/hooks/validate-xml-casca.sh` twice against the same broken-file transcript, second call with `stop_hook_active:true` — both returned identical `"decision":"block"` JSON |
| 12 | `manifest.json` distributes the `.sh`/`.js` runtime pair to end users, excluding `.test.js`/`__fixtures__/` | ✓ VERIFIED | `manifest.json` files[] includes exactly `.claude/hooks/validate-xml-casca.sh` and `.claude/hooks/validate-xml-casca.js`; `.test.js`/fixtures confirmed absent |

**Score:** 11/12 truths verified (1 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/hooks/validate-xml-casca.js` | Exports TIPO_MAP, normalizeContent, offsetToLineCol, parseAgenteLine, countAgenteTags, validateCasca, validateFile, discoverTouchedFiles, runCli | ✓ VERIFIED | All 9 present in `module.exports`; confirmed via `node --test` (24/24 pass) and direct `require()` inspection |
| `.claude/hooks/validate-xml-casca.test.js` | node:test suite covering all behaviors | ✓ VERIFIED | 24 tests, all passing, independently re-run in this session |
| `.claude/hooks/__fixtures__/xml-casca/*.md` (10 files) | Synthetic valid/broken casca fixtures | ✓ VERIFIED | All 10 present on disk |
| `.claude/hooks/validate-xml-casca.sh` | Thin bash wrapper, stdin JSON → stdout block JSON, always exits 0 | ✓ VERIFIED (wired) | Executable (755), correctly relays block/no-block JSON, always exits 0 in manual invocation with `CLAUDE_PROJECT_DIR` set (Claude Code sets this env var before invoking any hook command per the `"$CLAUDE_PROJECT_DIR"/...` syntax already used by the pre-existing hooks' settings.json entries) |
| `.claude/settings.json` (Stop[]/SubagentStop[] gain one entry each) | Existing entries untouched, one new entry appended each | ✓ VERIFIED | Confirmed via direct JSON parse — 2 entries each array, order preserved |
| `manifest.json` (files[] gains .sh/.js pair) | Runtime pair added, dev-only files excluded | ✓ VERIFIED | Confirmed via `require()` + `.includes()` check |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `validateFile(filePath)` | `fs.statSync(...).isFile()` guard | T-1-02 mitigation | ✓ WIRED | Confirmed: non-existent path and directory path both return `{valid:false}` without throwing (regression tests pass) |
| `discoverTouchedFiles` output | `validateFile()` per file inside `runCli` | Path safety enforced once | ✓ WIRED | `discoverTouchedFiles` never calls `fs.statSync`/`readFileSync` itself (grep-confirmed); the only stat/read call is inside `validateFile` |
| `.claude/settings.json` Stop[]/SubagentStop[] | `validate-xml-casca.sh` | `node validate-xml-casca.js --transcript "$TRANSCRIPT"` | ✓ WIRED | Confirmed command string matches Plan 02's CLI contract exactly |
| `manifest.json` files[] | `bin/cli.js` fetch/write mechanism | D-10 distribution | ✓ WIRED | Entries present; `bin/cli.js`'s existing fetch loop is unmodified and generic (iterates `manifest.files`), so the new entries are distributed the same way as every other file |
| `discoverTouchedFiles` | current-turn scoping | tail-window heuristic | ⚠️ PARTIAL | Wired to `validateFile`, but the "current turn only" scoping guarantee itself is broken — see Gaps |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `node --test .claude/hooks/validate-xml-casca.test.js` | 24/24 pass | ✓ PASS |
| Bash wrapper no-ops on missing transcript | `echo '{"transcript_path":"/nonexistent.jsonl"}' \| validate-xml-casca.sh` | exit=0, no stdout | ✓ PASS |
| Bash wrapper blocks on broken file (real transcript + `CLAUDE_PROJECT_DIR` set) | synthetic transcript + broken fixture, piped through `.sh` | `{"decision":"block","reason":"...linha 1 coluna 1:...\n...linha 2..."}`, exit=0 | ✓ PASS |
| Bash wrapper blocks again on `stop_hook_active=true` retry | same, second invocation with the flag set | identical block JSON both times | ✓ PASS |
| WR-02 regression (stale/deleted file spuriously blocks) | synthetic 50-filler-turn transcript + deleted file + `runCli` | `{"decision":"block","reason":"arquivo inacessível: ..."}` on an unrelated event | ✗ FAIL (confirms gap) |
| Real transcript shape assumption | fresh `python3` JSON walk of a live `.jsonl` in this repo | `Edit`/`Write` `tool_use` blocks match assumed shape | ✓ PASS |
| Real `modelo/*.md` files all LF (no CRLF column-offset risk in production) | `grep -P '\r'` over all 6 files | 0 matches — all LF | ✓ PASS (mitigates WR-01 materiality) |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` convention used or declared by this phase; verification is via `node:test` + direct manual invocation instead.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| XMLV-01 | 01-01 | Declaration check on line 1 | ✓ SATISFIED | Test + manual confirmation |
| XMLV-02 | 01-01 | Line 2 `<agente ...>` single-line attribute check | ✓ SATISFIED | Test + manual confirmation |
| XMLV-03 | 01-01 | `tipo` correctness per TIPO_MAP, incl. Recepcionista `origem` | ✓ SATISFIED | Test + manual confirmation |
| XMLV-04 | 01-01 | Single-root, no nesting/duplication | ✓ SATISFIED | Test + manual confirmation (CRLF column caveat, non-material — see WR-01) |
| XMLV-05 | 01-02, 01-03 | Runs automatically on Stop/SubagentStop, no manual invocation | ⚠️ SATISFIED WITH CAVEAT | Wiring verified; automatic firing verified; BUT the "only this turn" scoping this requirement's design (D-06) relies on is broken (WR-02) — the hook DOES run automatically, but can fire on stale, unrelated files |
| XMLV-06 | 01-01, 01-02, 01-03 | Actionable file+line/col error message | ✓ SATISFIED | Test + manual confirmation; message format `<path> linha N coluna C: <text>` confirmed |
| XMLV-07 | 01-01, 01-03 | Blind spot preserved, no escape/CDATA auto-fix | ✓ SATISFIED | Test + module-wide vocabulary scan confirmed absent |

No orphaned requirements — REQUIREMENTS.md lists exactly XMLV-01..07 for Phase 1, and all 7 are claimed across the three plans' `requirements:` frontmatter fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.claude/hooks/validate-xml-casca.js` | ~209-248 | `discoverTouchedFiles` tail-window has no turn-boundary cutoff (contradicts its own must-have wording) | 🛑 Gap (see above) | Spurious blocks on stale/deleted files unrelated to the current turn |
| `.claude/hooks/validate-xml-casca.js` | ~159-179 | CRLF offset/line-col desync for XMLV-04 (WR-01, code review) | ⚠️ Warning (non-blocking) | Wrong column reported under CRLF content only; real `modelo/*.md` files are all LF, so no current production impact |
| `.claude/hooks/validate-xml-casca.test.js` | ~158-177 | `process.cwd()`-dependent real-file test (WR-03, code review) | ⚠️ Warning (non-blocking) | Test suite fragility if ever invoked from a different cwd; does not affect the shipped hook's runtime behavior |
| `.claude/hooks/validate-xml-casca.js` | ~42-48 | Duplicate line-2 attributes silently coalesced (IN-02, code review) | ℹ️ Info | Consistent with the validator's deliberately narrow, non-full-XML-parser scope |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any file modified by this phase.

### Human Verification Required

None outstanding. Plan 03's Task 3 blocking human-verify checkpoint (live Stop/SubagentStop pipeline test) already occurred during execution — `.planning/STATE.md` shows a genuine pause-then-resume state transition (commit `7288c16`: "PAUSED at checkpoint... awaiting live verification" → later state: "Task 3 human-verify checkpoint approved"), consistent with a real live session having exercised the four `how-to-verify` steps and the user typing "approved". This is accepted as sufficient artifact evidence for that specific checkpoint; it is not re-requested here.

### Gaps Summary

The phase delivers a genuinely working, well-tested deterministic validator (Plan 01) and a correctly-wired Stop/SubagentStop bash hook with clean manifest distribution (Plan 03). 11 of 12 must-have truths are solidly verified, including live manual reproduction of the block/no-block contract, the escape/CDATA-free blind-spot preservation, and the human-approved live pipeline coexistence check.

However, one concrete, empirically-reproduced defect remains in Plan 02's transcript discovery (`discoverTouchedFiles`): it was designed and documented (D-06, RESEARCH.md/CONTEXT.md, and 01-02-PLAN.md's own `must_haves.truths`) to scope validation to "files touched in the current turn only," but the actual implementation is a raw 400-line tail window with no turn-boundary detection. This was already flagged as WR-02 in `01-REVIEW.md` and this verification independently reproduced it: a file edited many turns earlier, then deleted, still causes an unrelated later Stop event to block with a confusing "arquivo inacessível" message that has nothing to do with the triggering turn's actual work. This directly contradicts a stated must-have and creates a real risk of confusing, spurious blocks in normal day-to-day use — the exact kind of disruption the milestone's constraints ask this phase to avoid.

This does not undermine the phase's core detection logic (a genuinely broken casca IS always caught, XMLV-01/02/03/04/07 are all solid) but it does mean the "runs automatically... without disrupting the pipeline" promise (XMLV-05) is only partially met. Recommended fix (per 01-REVIEW.md's own suggestion): scope `discoverTouchedFiles` to lines after the most recent `"type":"user"` entry, and/or make `validateFile`/`runCli` treat "file no longer exists" as a non-blocking no-op rather than a validation failure.

---

*Verified: 2026-07-04T23:50:00Z*
*Verifier: Claude (gsd-verifier)*
