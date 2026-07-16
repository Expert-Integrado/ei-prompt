---
phase: 01-xml-validation-hook
plan: 03
subsystem: infra
tags: [bash, claude-code-hooks, stop-hook, subagentstop-hook, manifest-distribution]

# Dependency graph
requires:
  - "runCli(argv) / node validate-xml-casca.js --transcript <path> CLI contract from Plan 02"
provides:
  - ".claude/hooks/validate-xml-casca.sh — thin bash wrapper shelling out to Plan 02's Node CLI, stateless (no stop_hook_active early-exit, deliberate per D-07/Pitfall 4), always exits 0"
  - ".claude/settings.json Stop[]/SubagentStop[] each registering validate-xml-casca.sh alongside the pre-existing post-ajustes-fanout.sh/post-scaffolder-review.sh entries"
  - "manifest.json files[] distributing the .sh/.js runtime pair to end-user client folders via npx (D-10), excluding .test.js and __fixtures__/"
  - "Live-session human confirmation that the real Stop/SubagentStop pipeline blocks a broken casca with actionable file+line/col detail, stops normally once fixed, and coexists with the existing /ei-ajustes and client-project-scaffolder hook flows"
affects: ["Phase 2 (3-Step Gated Client Scaffolding) — independent track, no direct dependency, but shares the same Stop/SubagentStop hook registration pattern if it ever needs its own hook"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stateless hook re-validation on every invocation instead of skipping on stop_hook_active — a deterministic, re-checkable fact (file validity) does not need one-shot instruction semantics like the existing sentinel-based hooks (D-07/Pitfall 4)"
    - "Bash wrapper as a thin stdin-JSON-to-CLI-argv adapter: capture stdin, extract one field via grep+sed (mirroring post-ajustes-fanout.sh's exact idiom), guard on missing/unreadable file, shell out, relay stdout verbatim, always exit 0"
    - "New hooks appended to the END of existing Stop[]/SubagentStop[] arrays, never replacing or reordering prior entries (D-09) — preserves independent hook coexistence"

key-files:
  created:
    - .claude/hooks/validate-xml-casca.sh
  modified:
    - .claude/settings.json
    - manifest.json

key-decisions:
  - "Confirmed via live human-verify session (not simulated) that the real Claude Code Stop/SubagentStop lifecycle blocks a broken casca with actionable file+line/col detail, stops normally once fixed, and that post-ajustes-fanout.sh's sentinel hand-off and post-scaffolder-review.sh's docs-reviewer trigger are unaffected by the new hook running alongside them."
  - "Deliberately omitted any stop_hook_active check in validate-xml-casca.sh, documented in the file's header comment, so a future maintainer does not 'fix' it by adding a skip-on-retry guard (D-07/Pitfall 4) — the hook's job is a stateless fact re-checked every cycle, not a one-shot instruction."

requirements-completed: [XMLV-05, XMLV-06, XMLV-07]

coverage:
  - id: D1
    description: "validate-xml-casca.sh is executable, always exits 0, silently no-ops on a missing/unreadable transcript, and relays the Node CLI's block JSON verbatim on both a first AND a stop_hook_active=true retry invocation (no early-exit guard, D-07/Pitfall 4)"
    requirement: "XMLV-05"
    verification:
      - kind: unit
        ref: "Task 1 synthetic stdin checks (missing-transcript no-op, broken-file block, double-invocation with stop_hook_active=true still blocking)"
        status: pass
    human_judgment: false
  - id: D2
    description: ".claude/settings.json Stop[]/SubagentStop[] each gain exactly one new validate-xml-casca.sh entry appended after the existing hook, and manifest.json files[] gains the .sh/.js runtime pair (excluding .test.js/__fixtures__), all remaining valid JSON"
    requirement: "XMLV-06"
    verification:
      - kind: unit
        ref: "Task 2 automated verify command (node -e JSON.parse + manifest.files.includes checks) printing 'ok'"
        status: pass
    human_judgment: false
  - id: D3
    description: "A real, live Claude Code Stop/SubagentStop event blocks a broken casca with actionable file+line/col detail without manual invocation, stops normally once fixed, and the existing /ei-ajustes and client-project-scaffolder hook-driven flows behave exactly as before"
    requirement: "XMLV-07"
    verification:
      - kind: manual_procedural
        ref: "Task 3 checkpoint:human-verify — 4-step live-session protocol (introduce broken casca and observe automatic block with file+line/col detail; fix and observe normal stop; confirm post-ajustes-fanout.sh sentinel hand-off and post-scaffolder-review.sh docs-reviewer trigger fire unaffected)"
        status: pass
    human_judgment: true
    rationale: "A real Stop/SubagentStop lifecycle event cannot be exercised by a unit test inside the same authoring session; only a live Claude Code session can prove the hook actually fires and coexists correctly with the pre-existing pipeline. User typed 'approved' confirming all 4 steps passed."

duration: ~35min
completed: 2026-07-04
status: complete
---

# Phase 1 Plan 3: Bash Wrapper, Hook Registration, Distribution Summary

**Wired the walking skeleton's final vertical slice: `validate-xml-casca.sh` shells out to Plan 02's CLI, registered under both `Stop` and `SubagentStop` in `.claude/settings.json` alongside the existing hooks, distributed to end users via `manifest.json`, and live-confirmed against a real Claude Code lifecycle event.**

## Performance

- **Duration:** ~35 min (including the human-verify checkpoint pause/resume cycle)
- **Started:** 2026-07-04 (per STATE.md prior activity)
- **Completed:** 2026-07-04
- **Tasks:** 3 (2 automated + 1 human checkpoint)
- **Files modified:** 3 (`.claude/hooks/validate-xml-casca.sh` new, `.claude/settings.json`, `manifest.json`)

## Accomplishments

- Created `.claude/hooks/validate-xml-casca.sh`: a thin, stateless bash wrapper mirroring `post-ajustes-fanout.sh`'s stdin/transcript-extraction idiom exactly (`grep -o` + `sed` unwrap of `"transcript_path"`), guarded against missing/unreadable transcript files, invoking `node .../validate-xml-casca.js --transcript "$TRANSCRIPT"` and relaying its stdout verbatim (or nothing, when the result is empty/`{}`). Deliberately carries no `stop_hook_active` early-exit — documented in the header comment as an intentional design choice (D-07/Pitfall 4), since the hook re-checks a stateless fact (file validity) every cycle rather than executing a one-shot instruction.
- Registered the wrapper in `.claude/settings.json`'s `Stop[]` and `SubagentStop[]` arrays, appended after the existing `post-ajustes-fanout.sh`/`post-scaffolder-review.sh` entries — no existing entries modified, reordered, or removed.
- Added `.claude/hooks/validate-xml-casca.sh` and `.claude/hooks/validate-xml-casca.js` to `manifest.json`'s `files[]` (D-10), so `npx @expertzinhointegrado/ei-prompt@latest` distributes the runtime pair to end-user client folders; `.test.js` and `__fixtures__/` deliberately excluded as dev-only artifacts.
- **Live human verification (Task 3, blocking checkpoint):** in a real Claude Code session, a broken casca introduced mid-turn was blocked automatically at Stop with an actionable file+line/col reason (no manual invocation); the file was then fixed and the turn stopped normally; `post-ajustes-fanout.sh`'s sentinel hand-off and `post-scaffolder-review.sh`'s `docs-reviewer` trigger were confirmed to fire exactly as before, unaffected by the new hook running alongside them. User confirmed with "approved".

## Task Commits

1. **Task 1: Bash wrapper mirroring post-ajustes-fanout.sh, without the stop_hook_active early-exit** - `6455f15` (feat)
2. **Task 2: Register the hook in settings.json and manifest.json** - `cf05978` (feat)
3. **Task 3: Confirm the real Stop/SubagentStop pipeline blocks correctly and coexists with the existing hooks** - human checkpoint, no code commit (verification-only task); pause state recorded in `7288c16` (docs), resolved by user typing "approved"

**Plan metadata:** (this commit) `docs(01-03): complete plan`

## Files Created/Modified

- `.claude/hooks/validate-xml-casca.sh` - New thin bash wrapper: stdin JSON in, `{"decision":"block","reason":"..."}` or nothing out, always exits 0, no stop_hook_active guard by design.
- `.claude/settings.json` - `Stop[]` and `SubagentStop[]` each gained one new `validate-xml-casca.sh` command entry, appended after the pre-existing hooks.
- `manifest.json` - `files[]` gained `.claude/hooks/validate-xml-casca.sh` and `.claude/hooks/validate-xml-casca.js` for end-user distribution.

## Decisions Made

- Confirmed real Stop/SubagentStop pipeline behavior against a live Claude Code session rather than only unit/synthetic tests, since the lifecycle event itself cannot be simulated from within the authoring session — this was the entire purpose of Task 3's blocking human-verify checkpoint.
- Kept the deliberate absence of a `stop_hook_active` check, with an explanatory header comment in the script, so a future maintainer does not "fix" it into a skip-on-retry guard (D-07/Pitfall 4) — the hook's correctness depends on re-checking file validity every single cycle.

## Deviations from Plan

None - plan executed exactly as written. Both automated tasks (bash wrapper, settings/manifest registration) matched their `<action>` specifications literally, and the Task 3 human checkpoint was verified live and approved without any check failing.

## Issues Encountered

None. All 24 pre-existing tests in `.claude/hooks/validate-xml-casca.test.js` remained green after this plan (which touches no `.js`/`.test.js` files), and the live-session checkpoint passed all 4 steps on the first attempt.

## User Setup Required

None - no external service configuration required. The hook is purely local (bash + node, no new dependencies) and distributes via the existing `manifest.json`/`npx` mechanism already used by every other file in this repo.

## Next Phase Readiness

**Phase 1 (XML Validation Hook) is now fully executed — all 3 plans complete, all 7 requirements (XMLV-01 through XMLV-07) satisfied.** The deterministic validator engine (Plan 01), transcript discovery + CLI wiring (Plan 02), and the live-wired Stop/SubagentStop hook with end-user distribution (Plan 03) together deliver the phase's core value: a broken client-file XML casca is now always caught by code, automatically, without relying on `docs-reviewer` remembering a manual checklist item.

- Phase 2 (3-Step Gated Client Scaffolding) is an independent track with no dependency on Phase 1's artifacts and can proceed on its own schedule.
- No blockers or concerns carried forward from this phase.

## Self-Check: PASSED

`.claude/hooks/validate-xml-casca.sh` exists on disk and is executable. Commits `6455f15` and `cf05978` are present in `git log`. `node --test .claude/hooks/validate-xml-casca.test.js` re-run at the start of this continuation shows 24/24 tests passing, confirming no regression from Tasks 1-2. No missing items.

---
*Phase: 01-xml-validation-hook*
*Completed: 2026-07-04*
</content>
