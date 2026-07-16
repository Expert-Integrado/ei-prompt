---
phase: 02-three-step-gated-client-scaffolding
plan: 02
subsystem: infra
tags: [manifest, npx-distribution, claude-code-hooks, subagentstop]

# Dependency graph
requires:
  - phase: 02-three-step-gated-client-scaffolding
    provides: "client-scaffold-structure.md, client-scaffold-collect.md, client-scaffold-fill.md subagent files (Plan 02-01)"
provides:
  - "manifest.json ships the 3 new scaffolding subagents and actively retires client-project-scaffolder.md on existing npx installs"
  - "post-scaffolder-review.sh's SubagentStop audit trigger retargeted from client-project-scaffolder to client-scaffold-fill"
affects: [02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "deprecated_files[] is the only mechanism that actively deletes a file from an existing user's project on next npx run — dropping an entry from files[] alone leaves it on disk forever"
    - "post-scaffolder-review.sh case branches are keyed by exact subagent `name:` frontmatter value; a label mismatch silently produces zero audits rather than an error"

key-files:
  created: []
  modified:
    - manifest.json
    - .claude/hooks/post-scaffolder-review.sh

key-decisions:
  - "No new case branches added for client-scaffold-structure or client-scaffold-collect — only the fill step produces content worth auditing, matching RESEARCH.md's anti-pattern guidance against auditing after every one of the 3 subagents"
  - "Kept the existing anti-reinjection sentinel guard and 2000-line tail window inside the renamed client-scaffold-fill) branch unchanged, per RESEARCH.md Assumption A2 (unconfirmed until Plan 05's live smoke test)"

requirements-completed: [SCAF-01]

coverage:
  - id: D1
    description: "manifest.json ships the 3 new subagent files and actively deprecates the old monolithic client-project-scaffolder.md"
    requirement: "SCAF-01"
    verification:
      - kind: unit
        ref: "node -e membership check (files[] contains 3 new paths, excludes old path; deprecated_files[] contains old path; recepcionista-scaffolder.md untouched) — inline in PLAN.md Task 1 <verify>"
        status: pass
    human_judgment: false
  - id: D2
    description: "post-scaffolder-review.sh's SubagentStop case statement retargeted to fire docs-reviewer audits on client-scaffold-fill instead of the retired subagent name"
    requirement: "SCAF-01"
    verification:
      - kind: unit
        ref: "bash -n .claude/hooks/post-scaffolder-review.sh + grep for 'client-scaffold-fill)' branch label and preserved 'scaffolder-review-triggered' sentinel — inline in PLAN.md Task 2 <verify>"
        status: pass
    human_judgment: true
    rationale: "Static syntax/label checks confirm the branch exists and parses, but actual firing of docs-reviewer against a live client-scaffold-fill run is explicitly deferred to Plan 05's live smoke-test checkpoint per this plan's own <verification> section."

duration: 5min
completed: 2026-07-05
status: complete
---

# Phase 02 Plan 02: Manifest + Hook Retargeting for 3-Step Scaffolding Summary

**manifest.json now ships client-scaffold-structure/-collect/-fill and actively retires client-project-scaffolder.md; post-scaffolder-review.sh's SubagentStop audit now fires on client-scaffold-fill instead of the retired agent name**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-05T21:20:34Z
- **Completed:** 2026-07-05T21:23:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `manifest.json` `files[]` now lists `.claude/agents/client-scaffold-structure.md`, `.claude/agents/client-scaffold-collect.md`, and `.claude/agents/client-scaffold-fill.md` in place of the retired `client-project-scaffolder.md`
- `.claude/agents/client-project-scaffolder.md` added to `deprecated_files[]` so existing `npx` installs get it actively deleted, not just stop receiving updates to it
- `.claude/hooks/post-scaffolder-review.sh`'s `case` branch renamed from `client-project-scaffolder)` to `client-scaffold-fill)`, with header comment and injected `additionalContext` wording updated to describe "preenchimento de template" (Passo 3) rather than "criação de novo projeto de cliente"
- Anti-reinjection sentinel guard (`<scaffolder-review-triggered/>`) and the `docs-editor-conciso)` branch left untouched, per plan instructions and Assumption A2

## Task Commits

Each task was committed atomically:

1. **Task 1: Ship the 3 new subagents and retire the monolithic scaffolder in manifest.json** - `b8d0dc1` (feat)
2. **Task 2: Retarget post-scaffolder-review.sh's audit trigger to the Passo 3 (fill) subagent** - `0da89e3` (fix)

**Plan metadata:** _pending — see final commit below_

## Files Created/Modified
- `manifest.json` - Moved 3 new subagent paths into `files[]`, moved `client-project-scaffolder.md` into `deprecated_files[]`
- `.claude/hooks/post-scaffolder-review.sh` - Renamed `case` branch to `client-scaffold-fill)`, updated header comment and injected instruction text, fixed a stray inline comment reference to the old subagent name

## Decisions Made
- Confirmed `client-scaffold-fill`'s exact `name:` frontmatter value directly from the file (`.claude/agents/client-scaffold-fill.md` line 1: `name: client-scaffold-fill`) before editing the hook's `case` label, closing the exact-match requirement called out in this plan's `key_links`.
- No new `case` branches were added for `client-scaffold-structure` or `client-scaffold-collect` — falling through the `case` with no match remains the correct silent no-op for those two steps, since neither writes client-facing content worth auditing.

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed stray comment reference to old subagent name near the docs-editor-conciso guard**
- **Found during:** Task 2
- **Issue:** A comment inside the untouched `docs-editor-conciso)` branch (line ~80) referenced `client-project-scaffolder)` by name when explaining why that branch's anti-loop guard is scoped only to `docs-editor-conciso)`. Left as-is, this comment would have become stale/misleading immediately after the rename in the same file, contradicting the actual code above it.
- **Fix:** Updated the comment to reference `client-scaffold-fill)` instead, matching the renamed branch it describes.
- **Files modified:** `.claude/hooks/post-scaffolder-review.sh`
- **Verification:** `bash -n .claude/hooks/post-scaffolder-review.sh` still passes; `grep -n client-project-scaffolder` on the file now returns no matches.
- **Committed in:** `0da89e3` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — stale comment)
**Impact on plan:** Purely a documentation/comment consistency fix inside the file already being edited by Task 2. No behavioral or scope change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02-03 and 02-04 (the `ei-cria-cliente.md` command rewrite for the gate and Passo 3 dispatch) can now reference `client-scaffold-fill` by name knowing the manifest and audit hook are already aligned to it.
- Plan 05's live smoke-test checkpoint remains the confirmation point for whether the retargeted `docs-reviewer` trigger actually fires end-to-end against a real `client-scaffold-fill` run (RESEARCH.md Assumption A2, still open).
- No blockers.

---
*Phase: 02-three-step-gated-client-scaffolding*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: manifest.json
- FOUND: .claude/hooks/post-scaffolder-review.sh
- FOUND: commit b8d0dc1
- FOUND: commit 0da89e3
- FOUND: .planning/phases/02-three-step-gated-client-scaffolding/02-02-SUMMARY.md
