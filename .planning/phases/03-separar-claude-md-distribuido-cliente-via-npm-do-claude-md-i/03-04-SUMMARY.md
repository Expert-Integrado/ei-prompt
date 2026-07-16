---
phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
plan: 04
subsystem: docs
tags: [claude-md, project-instructions, docs-migration]

# Dependency graph
requires:
  - phase: 03-01
    provides: "client/CLAUDE.md verified as the real client-facing source, root CLAUDE.md content mirrored/superseded there"
  - phase: 03-02
    provides: "manifest.json schema updates enabling distribution of client/CLAUDE.md"
  - phase: 03-03
    provides: "dual-context fallback pattern (Glob-check client/CLAUDE.md, fall back to CLAUDE.md) applied across 9 files/11 edit points"
provides:
  - "Root CLAUDE.md removed from the repository entirely (D-07 full-removal)"
  - ".claude/CLAUDE.md established as the sole functional 'Project instructions' file for this repo"
  - "Stale cross-reference in .claude/CLAUDE.md's commits rule corrected to no longer cite the now-removed root CLAUDE.md (D-08)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Irreversible-step precondition re-verification: before a destructive git operation gated by depends_on, directly re-check (not just trust) that upstream deliverables exist in the current working tree"

key-files:
  created: []
  modified:
    - CLAUDE.md (deleted)
    - .claude/CLAUDE.md

key-decisions:
  - "D-07: full removal of root CLAUDE.md (not a stub/pointer file) — per RESEARCH.md's State of the Art citation confirming this is an official, supported Claude Code configuration"
  - "D-08: only the single Agent-Editing Conventions commits-rule line in .claude/CLAUDE.md needed a fix; other auto-generated Architecture-block mentions of root CLAUDE.md left untouched as descriptively stale but non-leaking (T-03-09, accepted risk)"

patterns-established: []

requirements-completed: [CLMD-04, CLMD-05]

coverage:
  - id: D1
    description: "Root CLAUDE.md deleted from the repository, with preconditions (client/CLAUDE.md present+non-empty, 3 spot-checked fallback files reference it) re-verified in the working tree immediately before deletion"
    requirement: CLMD-04
    verification:
      - kind: other
        ref: "shell: [ -f client/CLAUDE.md ] && [ -s client/CLAUDE.md ] && grep -q 'client/CLAUDE.md' .claude/agents/docs-analyzer.md && grep -q 'client/CLAUDE.md' .claude/agents/docs-editor-conciso.md && grep -q 'client/CLAUDE.md' .claude/commands/ei-cria-cliente.md && [ ! -f CLAUDE.md ]"
        status: pass
    human_judgment: false
  - id: D2
    description: ".claude/CLAUDE.md's commits-rule line no longer cites root CLAUDE.md as a source (now cites only docs/proibido-fazer.md), and the file contains zero migrated H2 headings"
    requirement: CLMD-05
    verification:
      - kind: other
        ref: "shell: grep -c 'explicit project rule in .CLAUDE\\.md' .claude/CLAUDE.md == 0 && grep -q 'explicit project rule — see .docs/proibido-fazer\\.md' .claude/CLAUDE.md && ! grep -E '^## (Mapa de Regras|Arquitetura Padrão de Agentes|Arquitetura Multi-Agente|Slash Commands|Regras Básicas)' .claude/CLAUDE.md"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase 03 Plan 04: Remove Root CLAUDE.md and Fix Stale Cross-Reference Summary

**Root `CLAUDE.md` deleted entirely (D-07); `.claude/CLAUDE.md`'s commits-rule line no longer cites the removed file as a source (D-08).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-16
- **Completed:** 2026-07-16
- **Tasks:** 2
- **Files modified:** 2 (1 deleted, 1 edited)

## Accomplishments
- Verified both preconditions in the live working tree (not just trusted `depends_on`) before deleting: `client/CLAUDE.md` exists and is non-empty (80 lines), and the 3 spot-checked Plan 03-03 fallback files (`docs-analyzer.md`, `docs-editor-conciso.md`, `ei-cria-cliente.md`) all contain `client/CLAUDE.md` references
- Removed root `CLAUDE.md` from the repository via `git rm` — full removal per D-07, not a stub/pointer
- Fixed the sole stale cross-reference in `.claude/CLAUDE.md`'s Agent-Editing Conventions section: the commits-no-signature rule now cites only `docs/proibido-fazer.md` instead of the now-deleted root `CLAUDE.md`
- `.claude/CLAUDE.md` is now the sole functional "Project instructions" file for this repo, confirmed to contain zero of the 5 migrated client-facing H2 headings (Mapa de Regras, Arquitetura Padrão de Agentes, Arquitetura Multi-Agente, Slash Commands, Regras Básicas)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove root CLAUDE.md** - `3c1ceaa` (chore)
2. **Task 2: Fix .claude/CLAUDE.md's commits-rule cross-reference and confirm no migrated headings leaked in** - `60fd96e` (docs)

**Plan metadata:** committed separately after this SUMMARY

## Files Created/Modified
- `CLAUDE.md` - Deleted (D-07 full removal)
- `.claude/CLAUDE.md` - One line in "Agent-Editing Conventions" updated to drop the stale cross-reference to root `CLAUDE.md`

## Decisions Made
- D-07 (full removal, per RESEARCH.md): confirmed correct — no pointer/stub file left behind, matching the official Claude Code documented pattern of `.claude/CLAUDE.md` as the sole project-instructions location.
- D-08 (narrow single-line fix): confirmed correct — the plan explicitly scoped the fix to the one rule-citation line and left the auto-generated Architecture-block prose (Component Responsibilities "Rule docs" row, Layers section "root CLAUDE.md" mentions) untouched as accepted, non-leaking staleness (T-03-09 in the plan's threat register).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- This was the final gated plan of Phase 03's additive-first sequence (Wave 2, depends on all three Wave 1 plans). Root `CLAUDE.md` is now fully removed, `client/CLAUDE.md` is the sole distributed client-facing payload, and `.claude/CLAUDE.md` is the sole repo-internal "Project instructions" source.
- No blockers for phase completion. Remaining stale "root CLAUDE.md" mentions in `.claude/CLAUDE.md`'s auto-generated Architecture block (Component Responsibilities, Layers) are accepted as out-of-scope descriptive prose per the plan's threat register (T-03-09) and CONTEXT.md's explicit domain boundary — a future GSD documentation regeneration pass would naturally refresh them.

---
*Phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: CLAUDE.md absent (expected — deleted by Task 1)
- FOUND: .claude/CLAUDE.md
- FOUND: 3c1ceaa (Task 1 commit)
- FOUND: 60fd96e (Task 2 commit)
