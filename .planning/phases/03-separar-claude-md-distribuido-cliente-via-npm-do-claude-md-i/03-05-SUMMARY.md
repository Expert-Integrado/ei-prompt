---
phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
plan: 05
subsystem: infra
tags: [bash, node-test, claude-code-hooks, settings-local-json, regression-guard]

# Dependency graph
requires:
  - phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i (Plan 03-04)
    provides: client/CLAUDE.md as final client payload, root CLAUDE.md removed, .claude/CLAUDE.md as sole internal doc
provides:
  - check-claude-md-audience.sh — repo-local-only Stop/SubagentStop guard blocking migrated headings from leaking back into CLAUDE.md/.claude/CLAUDE.md
  - check-claude-md-audience.test.js — 6 node:test cases covering the guard's behavior
  - .claude/settings.local.json hooks.Stop/hooks.SubagentStop registration (never in distributed settings.json or manifest.json)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deterministic Stop/SubagentStop regression guard mirroring validate-xml-casca.sh's stdin/transcript-extraction idiom, with no stop_hook_active guard by design"
    - "Repo-local-only hook registration: settings.local.json (gitignored) vs settings.json (distributed) as the trust boundary"

key-files:
  created:
    - .claude/hooks/check-claude-md-audience.sh
    - .claude/hooks/check-claude-md-audience.test.js
  modified:
    - .claude/settings.local.json (not committed to git — intentionally local-only)
    - .gitignore

key-decisions:
  - "Kept the exact BANNED_HEADINGS regex from the plan (5 migrated H2 headings only, never generic keywords)"
  - "Dropped the plan's literal 'grep confirms zero occurrences of stop_hook_active' acceptance check in favor of a functional guard-absence check, because the plan's own <action> instructs mirroring validate-xml-casca.sh's header prose verbatim, which itself contains the string 4 times in comments explaining the deliberate omission — a literal zero-occurrence grep would fail against the very reference file the plan says to mirror"

requirements-completed: [CLMD-07, CLMD-08]

coverage:
  - id: D1
    description: "check-claude-md-audience.sh blocks a touched CLAUDE.md (excluding client/CLAUDE.md) containing a migrated H2 heading"
    requirement: "CLMD-07"
    verification:
      - kind: unit
        ref: ".claude/hooks/check-claude-md-audience.test.js#blocks when a touched CLAUDE.md (not under /client/) contains a banned heading"
        status: pass
    human_judgment: false
  - id: D2
    description: "Guard registered exclusively in .claude/settings.local.json; zero references in .claude/settings.json or manifest.json"
    requirement: "CLMD-07"
    verification:
      - kind: other
        ref: "node -e verify script (Task 2 <verify><automated>) — PASS/PASS2"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full end-to-end distribution (bin/cli.js against updated manifest.json) still produces a correct CLAUDE.md in an installed client project, plus live guard sanity check"
    requirement: "CLMD-08"
    verification:
      - kind: manual
        ref: "Task 3 checkpoint how-to-verify steps 1-5 (npm test 41/41, --help sanity, content-diff/install check, guard live sanity trigger+revert)"
        status: pass
    human_judgment: true
    rationale: "RESEARCH.md/03-VALIDATION.md explicitly mark CLMD-08 as manual-only in this zero-dependency project (no network-fetch mock exists or should be built). Human ran the checkpoint's how-to-verify steps and responded 'approved', confirming end-to-end distribution content-correctness and the live guard sanity check."

# Metrics
duration: ~20min
completed: 2026-07-16
status: complete
---

# Phase 03 Plan 05: Repo-Local Regression Guard + End-to-End Verification

**check-claude-md-audience.sh: deterministic Stop/SubagentStop guard blocking migrated headings from leaking back into CLAUDE.md/.claude/CLAUDE.md, wired only into gitignored settings.local.json — human-approved end-to-end distribution checkpoint closes the phase**

## Performance

- **Started:** 2026-07-16 (session start)
- **Completed:** 2026-07-16
- **Tasks completed:** 3 of 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created `.claude/hooks/check-claude-md-audience.sh`, mirroring `validate-xml-casca.sh`'s established idiom exactly: no `jq`, `set -uo pipefail`, transcript-path extraction via grep+sed, no `stop_hook_active` guard by deliberate design (documented in header).
- Created `.claude/hooks/check-claude-md-audience.test.js` with 6 `node:test` cases: the 5 behavior bullets from the plan (block on banned heading, silent on clean content, exclude `client/CLAUDE.md`, silent when no CLAUDE.md touched, exit 0 on missing/unreadable transcript) plus a functional (not textual) `stop_hook_active` guard-absence check.
- Registered the guard in `.claude/settings.local.json` only (`hooks.Stop`/`hooks.SubagentStop`), preserving the existing `permissions` block byte-for-byte. Confirmed zero references in `.claude/settings.json` and `manifest.json`.
- Added `.claude/settings.local.json` to `.gitignore` for defense-in-depth (the file was already untracked in this environment, but now a fresh clone/CI is also protected).
- Full regression suite (`npm test`) green at 41/41, including the pre-existing 27 `validate-xml-casca.test.js` cases (0 regressions) plus this plan's 6 new tests plus Plan 03-02's manifest-schema tests.
- Pre-checkpoint automation (steps 1-2 of Task 3's how-to-verify, run ahead of presenting the checkpoint): `npm test` green, `node bin/cli.js --help` shows `- CLAUDE.md` (never `[object Object]`), `manifest.json` maps `{from:"client/CLAUDE.md", to:"CLAUDE.md"}` correctly, and `check-claude-md-audience.sh`/`.test.js` are confirmed absent from both `manifest.files` and `manifest.deprecated_files`.

## Task Commits

1. **Task 1: Create check-claude-md-audience.sh + check-claude-md-audience.test.js** - `9d09822` (feat)
2. **Task 2: Register the guard in .claude/settings.local.json only, add .gitignore defense-in-depth** - `71b4648` (chore)
3. **Task 3: Confirm the full separation pipeline and end-to-end distribution (CLMD-08)** - human checkpoint, no code changes to commit; human responded "approved" after running the how-to-verify steps

**Plan metadata commit:** created after checkpoint approval (this SUMMARY.md finalization, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Files Created/Modified

- `.claude/hooks/check-claude-md-audience.sh` - new Stop/SubagentStop guard, repo-local-only
- `.claude/hooks/check-claude-md-audience.test.js` - 6 node:test cases
- `.claude/settings.local.json` - new `hooks.Stop`/`hooks.SubagentStop` block (not git-tracked, intentionally)
- `.gitignore` - added `.claude/settings.local.json` entry

## Decisions Made

- Kept the plan's exact `BANNED_HEADINGS` regex (5 migrated H2 headings, high-precision match, never generic keywords) — no deviation from RESEARCH.md Pitfall 4 guidance.
- Task 1's test suite implements the required functional intent of "never checks `stop_hook_active`" as a check for actual conditional-guard logic (extraction/branching on the field), not a literal string-absence grep — because the plan's own `<action>` instructs mirroring `validate-xml-casca.sh`'s header prose verbatim, and that reference file's header itself contains the string `stop_hook_active` 4 times (in the DESIGN DELIBERADO comment explaining why the guard is intentionally absent). A literal zero-occurrence grep, as worded in the plan's `<acceptance_criteria>`, would fail against the very reference file the plan instructs to mirror — this is an internal tension in the plan text, resolved in favor of the more specific, detailed `<action>` instruction (mirror the rationale) over the general `<acceptance_criteria>` bullet.
- `.claude/settings.local.json` was already untracked by git in this environment (not previously in `.gitignore`, and `git ls-files` confirms it was never committed) — only `.gitignore` itself was staged/committed for Task 2; the settings file's on-disk edit is intentionally not committed to git history, consistent with D-09 (repo-local-only, invisible to distribution).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4-adjacent, resolved without architectural change] Reworded Task 1's 6th (self-added) test to check guard logic functionally instead of textually**
- **Found during:** Task 1 (running `node --test`)
- **Issue:** The plan's `<acceptance_criteria>` for Task 1 states "Script never references `stop_hook_active` anywhere (grep confirms zero occurrences)", but the same task's `<action>` explicitly instructs mirroring `validate-xml-casca.sh`'s header rationale text verbatim, which itself references `stop_hook_active` 4 times in prose comments. A literal zero-occurrence test failed immediately after writing the header comment as instructed.
- **Fix:** Kept the header comment exactly as instructed (mirroring the rationale). Changed the supplementary test (not one of the 5 required `<behavior>` cases — this test was my own addition to satisfy the acceptance-criteria bullet) to assert there is no functional guard clause reading/branching on `stop_hook_active` as a JSON field or bash variable, rather than asserting the substring never appears in the file at all.
- **Files modified:** `.claude/hooks/check-claude-md-audience.test.js`
- **Verification:** `node --test .claude/hooks/check-claude-md-audience.test.js` — 6/6 pass.
- **Committed in:** `9d09822` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (plan-internal-tension resolution, no scope change)
**Impact on plan:** No functional or scope change — the guard script's actual behavior (no `stop_hook_active` check anywhere in its control flow) is exactly what the plan and its threat model (T-03-12) require. Only the test file's assertion mechanism was adjusted to avoid asserting something impossible given the mirrored header text.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Checkpoint Resolution (Task 3, CLMD-08)

Task 3's `checkpoint:human-verify` (`gate="blocking"`) required a human to run the 5 `how-to-verify` steps (full automated regression, `--help` sanity, end-to-end distribution content-diff/install check, optional `/ei-cria-cliente` throwaway scaffold test, and a live Stop-event guard sanity trigger+revert). The orchestrator independently spot-checked the automated portions ahead of presenting the checkpoint (`npm test` 41/41, clean `--help` output, `.claude/settings.local.json` hooks block present and git-ignored, zero `check-claude-md-audience.sh` references in `manifest.json`, clean working tree) before the human confirmed.

**Human response:** "approved" — all how-to-verify steps passed, including the end-to-end distribution content check and the live guard sanity check (banned heading insertion blocked, revert left the repo clean).

This closes CLMD-08, the last open requirement of Phase 3. The plan and the phase are both complete as of this finalization.

## Next Phase Readiness

Plan 03-05 is the final plan of Phase 3 (Wave 3, no downstream plans depend on it beyond phase completion). Phase 3's success criteria (all 5 in ROADMAP.md) are now fully met:
1. `bin/cli.js`/`manifest.json` distribute `client/CLAUDE.md` correctly — verified across Plans 03-01/03-02 and reconfirmed here.
2. Root `CLAUDE.md` removed (Plan 03-04); no client-facing rule autoloads in this repo's own Claude Code session.
3. All ~9 distributed subagents/commands correctly fall back to `client/CLAUDE.md` (Plan 03-03).
4. `bin/cli.js --help` and install loop handle mixed string/`{from,to}` manifest entries with no `[object Object]` (Plan 03-02, reconfirmed here).
5. `check-claude-md-audience.sh` deterministically blocks reintroduction of migrated headings and is invisible to every distributed client (this plan, Tasks 1-2, human-confirmed in Task 3).

No further work is queued for Phase 3. Milestone-level next steps (if any) are tracked outside this plan.

---
*Phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i*
*Status: complete*

## Self-Check: PASSED

- FOUND: `.claude/hooks/check-claude-md-audience.sh`
- FOUND: `.claude/hooks/check-claude-md-audience.test.js`
- FOUND: `.claude/settings.local.json`
- FOUND: `.gitignore` entry `.claude/settings.local.json`
- FOUND commit: `9d09822`
- FOUND commit: `71b4648`
- FOUND commit: `7fa973a`
- FOUND commit: `5e62941`
