---
phase: 01-xml-validation-hook
plan: 04
subsystem: testing
tags: [node-test, jsonl-transcript-parsing, hook, xml-validation]

# Dependency graph
requires:
  - phase: 01-xml-validation-hook (plan 02)
    provides: discoverTouchedFiles/validateFile/runCli implementation and its 01-VERIFICATION.md/01-REVIEW.md WR-02 gap
  - phase: 01-xml-validation-hook (plan 03)
    provides: Stop/SubagentStop hook wiring around validate-xml-casca.js confirmed working end-to-end
provides:
  - discoverTouchedFiles scoped to the current turn via genuine-user-turn-boundary detection, closing the D-06/WR-02 gap
  - validateFile error objects carry a `code` field (e.g. ENOENT) instead of only a message string
  - runCli treats a discovered-but-deleted file as a no-op instead of a block
  - 27/27 passing test suite including 3 new regression tests and 1 rewritten test
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Turn-boundary detection via backward scan for the most recent 'genuine' (non-tool-result-only) user line, fail-open to the full window when no boundary found"
    - "Error objects carry a machine-readable `code` field (mirroring Node's `err.code`) instead of encoding state only in a human message string"

key-files:
  created: []
  modified:
    - .claude/hooks/validate-xml-casca.js
    - .claude/hooks/validate-xml-casca.test.js

key-decisions:
  - "isGenuineUserTurnStart classifies a 'type':'user' line as a turn boundary unless its content is an array composed entirely of tool_result blocks — this is the load-bearing distinction between a real human/slash-command turn and Claude Code's synthetic tool_result relay messages"
  - "Turn-boundary scan fails open to turnStart=0 (the full tail window) when no genuine user line is found in the window, so detection is never silently narrower than before D-06 was implemented"
  - "runCli's ENOENT skip only fires when EVERY error for a file is ENOENT-coded — any other error shape (directory path, genuine casca violation) still blocks exactly as before, per D-07"

patterns-established:
  - "Machine-readable error codes (`err.code`) over string-matching Portuguese message text for control-flow decisions"

requirements-completed: [XMLV-05]

coverage:
  - id: D1
    description: "discoverTouchedFiles excludes a file whose only edit occurred before the most recent genuine user-turn boundary in the scanned window (D-06/WR-02 closed)"
    requirement: "XMLV-05"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#discoverTouchedFiles/runCli do not block on a file edited many turns ago and since deleted (WR-02 regression, 01-VERIFICATION.md/01-REVIEW.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An edit made earlier in the same turn, separated from a later assistant message by an intervening tool_result relay line, is still discovered (no under-scoping regression)"
    requirement: "XMLV-05"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#discoverTouchedFiles still finds an earlier same-turn edit across an intervening tool_result relay line"
        status: pass
    human_judgment: false
  - id: D3
    description: "runCli returns {} (no block) for a discovered file that no longer exists on disk, while still blocking on any other error shape"
    requirement: "XMLV-05"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#runCli treats a discovered-but-since-deleted current-turn file as a silent no-op, not a block"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual outside-the-suite reproduction of 01-REVIEW.md's exact WR-02 scenario (turn 1 edit, ~50 filler turns, delete file, invoke runCli) prints {} instead of a block decision"
    requirement: "XMLV-05"
    verification:
      - kind: manual_procedural
        ref: "node -e one-liner reproducing the exact WR-02 scenario, printed {}"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-04
status: complete
---

# Phase 01 Plan 04: Turn-scoped discoverTouchedFiles + ENOENT tolerance Summary

**Closed the D-06/WR-02 verification gap: `discoverTouchedFiles` now scopes Edit/Write discovery to the current transcript turn via genuine-user-turn-boundary detection, and `runCli` no longer blocks on a discovered file that has since been deleted.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `isGenuineUserTurnStart` helper distinguishing real user-turn boundaries (plain-string content, or array content with at least one non-`tool_result` block) from Claude Code's synthetic `tool_result`-relay `"type":"user"` messages
- `discoverTouchedFiles` restricts its Edit/Write extraction to the tail-window lines at/after the most recent genuine turn boundary, failing open to the full window when no boundary is found — closing the exact WR-02 repro (stale edited-then-deleted file, unrelated later Stop event blocking) while preserving discovery of edits made earlier in the same turn across intervening tool_result relays
- `validateFile`'s two failure branches (`statSync` catch, and a newly-added `readFileSync` catch closing a pre-existing TOCTOU crash risk) both carry `err.code` (e.g. `"ENOENT"`) so callers can distinguish "file no longer exists" from other access failures without string-matching the Portuguese message
- `runCli` skips a discovered file entirely (no block contribution) when every one of its errors is `ENOENT`-coded, while continuing to block on any other error shape (directory path, genuine casca violation) — D-07 ("hook always blocks on a broken casca") preserved for every file that still exists
- Full test suite: 27/27 passing (24 pre-existing + 1 rewritten + 3 new regression tests)
- Manually reproduced 01-REVIEW.md's exact WR-02 scenario outside the test suite (turn 1 edit, 50 filler turns, delete file, invoke `runCli` directly) — confirmed the printed result is now `{}`, not the previously-reported block

## Task Commits

Each task was committed atomically:

1. **Task 1: Scope discoverTouchedFiles to the current turn and harden file-existence handling** - `9839560` (feat)
2. **Task 2: Add regression tests closing the WR-02 gap and verify the full suite green** - `84a6fce` (test)

_Note: Task 1 was a TDD-style implementation task and Task 2 was the test-authoring task closing the gap — see Deviations below for the one expected transitional test failure between them._

## Files Created/Modified
- `.claude/hooks/validate-xml-casca.js` - `isGenuineUserTurnStart` helper, turn-scoped `discoverTouchedFiles`, `code`-carrying `validateFile` error objects, ENOENT-skip in `runCli`
- `.claude/hooks/validate-xml-casca.test.js` - rewrote the "ignoring user lines" test to a realistic transcript ordering, added 3 new regression tests (WR-02 stale-file, same-turn-multi-tool-call, ENOENT-isolation)

## Decisions Made
- Kept `isGenuineUserTurnStart` unexported/private per the plan's explicit instruction — it is an implementation detail of `discoverTouchedFiles`, not part of the module's public contract
- Applied the ENOENT skip only in `runCli`'s aggregation step, not inside `validateFile` itself — `validateFile`'s own direct contract (`valid:false`, `code:"ENOENT"`) is unchanged and independently testable, matching the plan's explicit "key_links" requirement

## Deviations from Plan

**1. [Expected transitional test failure between Task 1 and Task 2 — not a bug]**
- **Found during:** Task 1 verification (`node --test` run immediately after Task 1's code change, before Task 2's test rewrite)
- **Issue:** The plan's Task 1 `<done>` criterion states "All 24 pre-existing tests ... still pass after this change," but Task 1's own action (turn-boundary scoping) necessarily breaks the old "ignoring user lines" test, whose fixture placed a `"type":"user"` line containing a `tool_use` block AFTER the assistant's edit — a synthetic ordering that never occurs in real transcripts. Under the new `isGenuineUserTurnStart` logic this line correctly registers as a turn boundary (its content is not composed entirely of `tool_result` blocks), excluding the earlier edit. The plan's own Task 2 action text explicitly anticipates and describes this exact outcome ("the old ordering ... would now be — correctly — excluded as a prior turn's edit") and instructs rewriting the fixture.
- **Fix:** Verified 23/24 tests passed after Task 1 (only the anticipated test failed, for the anticipated reason), then proceeded to Task 2 as planned, which rewrites that one test with a realistic transcript ordering. Full suite (27/27) passes after Task 2.
- **Files modified:** `.claude/hooks/validate-xml-casca.js` (Task 1 commit `9839560`), `.claude/hooks/validate-xml-casca.test.js` (Task 2 commit `84a6fce`)
- **Verification:** `node --test .claude/hooks/validate-xml-casca.test.js` — 23/24 after Task 1 (1 known/anticipated failure), 27/27 after Task 2
- **Committed in:** `9839560`, `84a6fce`

---

**Total deviations:** 1 (transitional/anticipated, not a rule 1-4 auto-fix — explicitly described by the plan's own Task 2 action text)
**Impact on plan:** None on scope or correctness. No code beyond the plan's specified action was written; the plan's own two-task structure (implement, then rewrite the now-incompatible test) accounts for this transition.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The D-06/WR-02 gap recorded in 01-VERIFICATION.md/01-REVIEW.md is closed; Phase 01 (xml-validation-hook) has no other known open gaps.
- Full hook test suite (27/27) green; manual outside-the-suite WR-02 repro confirmed fixed.
- Ready to re-verify Phase 01 as a whole and advance to Phase 2 (client creation 3-step refactor).

---
*Phase: 01-xml-validation-hook*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: .claude/hooks/validate-xml-casca.js
- FOUND: .claude/hooks/validate-xml-casca.test.js
- FOUND commit: 9839560
- FOUND commit: 84a6fce
- `node --test .claude/hooks/validate-xml-casca.test.js` — 27/27 passing, 0 failing
