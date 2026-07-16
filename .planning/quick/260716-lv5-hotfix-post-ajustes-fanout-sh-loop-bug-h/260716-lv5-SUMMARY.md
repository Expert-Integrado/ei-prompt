---
phase: quick-260716-lv5
plan: 01
subsystem: hooks
tags: [post-ajustes-fanout, idempotency, loop-bug, hotfix, regression-test]
status: complete
dependency-graph:
  requires: []
  provides: [POST-AJUSTES-FANOUT-IDEMPOTENCY-01]
  affects: [/ei-ajustes pipeline, Stop hook loop protocol]
tech-stack:
  added: []
  patterns:
    - "Full-transcript grep (FULL_ASSISTANT) for idempotency checks, distinct from the windowed tail used only for latest-sentinel extraction"
    - "node:test + execFileSync subprocess testing of bash hooks (mirrors check-claude-md-audience.test.js)"
key-files:
  created:
    - .claude/hooks/post-ajustes-fanout.test.js
  modified:
    - .claude/hooks/post-ajustes-fanout.sh
decisions:
  - "Scoped the fix to Passo 5 only — Passos 1-4 and 6 remain byte-for-byte identical to the pre-fix content, per plan constraint."
  - "New comment block documents WHY the idempotency check must scan the full transcript while ROUND_ID extraction stays windowed, to prevent future regression via 'reverting to $TAIL for consistency'."
metrics:
  duration: ~15min
  completed: 2026-07-16
---

# Phase quick-260716-lv5 Plan 01: Hotfix post-ajustes-fanout.sh idempotency loop bug Summary

Widened the idempotency check in `post-ajustes-fanout.sh` Passo 5 from the 400-line `$TAIL` window to a full-transcript scan (`$FULL_ASSISTANT`), closing a false re-block loop that could occur when the `/ei-ajustes` Passo 6 parallel M-reviewer fan-out pushes hundreds of non-assistant JSONL lines between the emission of `<ei-ajustes-round-consumed>` and the next Stop event.

## What Was Built

**Task 1 — `.claude/hooks/post-ajustes-fanout.sh`:**
Passo 5's idempotency check now filters the entire `$TRANSCRIPT` file (via `grep '"type":"assistant"' "$TRANSCRIPT" | sed 's/\\"/"/g'`, no `tail -n 400` cap) into a new `$FULL_ASSISTANT` variable, and the `grep -qF "<ei-ajustes-round-consumed id=\"$ROUND_ID\""` search now runs against `$FULL_ASSISTANT` instead of `$TAIL`. Passo 4's `$ROUND_ID` extraction deliberately continues to use the windowed `$TAIL` — it only needs to answer "is a round currently open?", not "was it ever consumed?". A new PT-BR comment block (mirroring the file's existing numbered/verbose comment style) explains this asymmetry and warns that reverting Passo 5 to use `$TAIL` reintroduces the bug. Passos 1, 2, 3, 4, and 6 — including the `stop_hook_active` guard, `transcript_path` extraction, the canonical-only `ROUND_ID` regex (REGRA INVIOLÁVEL HOOK-02), and the literal PT-BR `reason` text — are untouched.

**Task 2 — `.claude/hooks/post-ajustes-fanout.test.js`:**
New regression suite following `check-claude-md-audience.test.js` conventions (`node:test`, `execFileSync` subprocess invocation of the real hook, `mkdtempSync`/`t.after` cleanup). A `buildFanoutTranscript()` fixture constructs a synthetic JSONL transcript with the consumed marker positioned 452 lines before EOF (outside the `tail -n 400` window) and a re-opened sentinel at the very end (so `$ROUND_ID` extraction still succeeds within the window) — reproducing the exact scope of the bug. Four tests:
1. Hotfix regression: consumed-but-outside-window round does not re-block (`stdout === ""`).
2. Genuine unconsumed round still blocks with `decision: "block"` and `reason` containing the round id.
3. `stop_hook_active: true` still short-circuits before any transcript read.
4. Small transcript with consumed marker inside the normal window still works (happy path unaffected).

## Manual Pre-fix/Post-fix Confirmation (Task 2 requirement)

1. Backed up the fixed `.claude/hooks/post-ajustes-fanout.sh` to a scratchpad file.
2. Overwrote the hook with `git show HEAD~1:.claude/hooks/post-ajustes-fanout.sh` (the pre-fix content, since Task 1's commit was already made at this point — `HEAD~1` pointed to the pre-fix state).
3. Ran `node --test .claude/hooks/post-ajustes-fanout.test.js`: **exactly test (a) failed** (`AssertionError: expected '' but got the block JSON with decision:"block"`), while tests (b), (c), and (d) continued to pass — confirming the regression test catches precisely the reported bug and nothing else.
4. Restored the fixed content from the scratchpad backup.
5. Re-ran `node --test .claude/hooks/post-ajustes-fanout.test.js`: all 4 tests passed again.
6. Ran the full `npm test` (47 tests across `bin/*.test.js` and `.claude/hooks/*.test.js`): 47/47 passing, no regressions in any other suite (CLAUDE.md audience hook, XML casca validator, manifest normalizer).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion assumed single-line JSON stdout; hook emits multi-line heredoc JSON**
- **Found during:** Task 2, first `node --test` run
- **Issue:** The plan's test spec (mirroring `check-claude-md-audience.test.js`'s single-line-`printf` pattern) initially split `stdout` by `\n` and parsed `lines[0]` as JSON. `post-ajustes-fanout.sh` Passo 6 emits its JSON via a pretty-printed `cat <<JSON` heredoc (3 lines: `{`, `"decision"...`, `}`), not a single-line `printf`. This caused `JSON.parse("{")` to throw a `SyntaxError` in test (b).
- **Fix:** Changed the assertion to `JSON.parse(stdout.trim())` — parsing the entire stdout block at once instead of assuming one line — with a comment explaining the heredoc-vs-printf format difference from other project hooks.
- **Files modified:** `.claude/hooks/post-ajustes-fanout.test.js`
- **Commit:** 75c3946 (included in the same commit that created the file — caught before first commit of Task 2, not a separate fix commit)

No other deviations — Task 1's edit followed the plan's exact scope (Passo 5 only) verbatim.

## Self-Check: PASSED

- `.claude/hooks/post-ajustes-fanout.sh` contains `FULL_ASSISTANT=` — FOUND
- `.claude/hooks/post-ajustes-fanout.test.js` exists — FOUND
- `bash -n .claude/hooks/post-ajustes-fanout.sh` — clean (syntax OK)
- Commit `eb97594` (Task 1: hook fix) — FOUND in `git log --oneline`
- Commit `75c3946` (Task 2: regression test) — FOUND in `git log --oneline`
- `npm test` — 47/47 passing
- `git diff --stat` since parent (008d33c) restricted to exactly `.claude/hooks/post-ajustes-fanout.sh` and `.claude/hooks/post-ajustes-fanout.test.js` — confirmed, no changes to `.claude/commands/ei-ajustes.md`, `docs/*.md`, `manifest.json`, `package.json`, or `CHANGELOG.md`
