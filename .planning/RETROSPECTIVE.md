# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Validação XML e Scaffolding em 3 Passos

**Shipped:** 2026-07-16
**Phases:** 4 (1, 2, 3, 03.1) | **Plans:** 17 | **Tasks:** 36

### What Was Built
- Deterministic Node-based XML "casca" validator wired into `Stop`/`SubagentStop` hooks, replacing a manual LLM checklist for catching broken/malformed client agent files.
- Client creation split from one monolithic subagent into three tool-scoped, auditable steps (`client-scaffold-structure` → `client-scaffold-collect` → `client-scaffold-fill`) with a hard human confirmation gate between collection and fill, for both single-agent and multi-agent modes.
- The npm-distributed client `CLAUDE.md` physically separated from this repo's internal maintainer `.claude/CLAUDE.md`, guarded by a repo-local-only regression hook (`check-claude-md-audience.sh`).
- Follow-up phase (03.1) swept the repo for stale references to the retired `client-project-scaffolder` subagent, closing a gap the milestone audit found.

### What Worked
- Tool-scoped `tools:` frontmatter allowlists on the 3 scaffolding subagents enforced step boundaries structurally, not just by prompt wording — this pattern is worth reusing whenever a workflow needs a hard boundary between "gather" and "write" responsibilities.
- Live-session human checkpoints (not just automated tests) caught a requirement (SCAF-06) whose contract had drifted after approval, and a fresh live re-test closed it same-day.
- Code review run before phase completion (not skipped) caught 2 real critical bugs (hook blocking on `Read`, missing `normalizeEntry()` on `deprecated_files`) that the phase's own SUMMARY had missed.

### What Was Inefficient
- The milestone audit found integration-level gaps (stale scaffolder references, missing CLAUDE.md fallback in a disabled hook) that individual phases' own verification scope didn't catch — repo-wide consistency checks need to be part of phase verification, not deferred entirely to a milestone-level audit.
- A repo-wide grep without well-scoped exclusions produced a false "0 remaining references" result in Phase 03.1's first verification pass; the gap wasn't caught until re-verification.

### Patterns Established
- Structural trust boundaries via subagent `tools:` allowlists, not prompt-only instructions, for any future multi-step pipeline needing hard separation of concerns.
- Dual-context fallback pattern (`client/CLAUDE.md`-first, fallback to `CLAUDE.md`) for any subagent/hook that needs to work correctly both in the repo-fonte and in distributed client projects.

### Key Lessons
1. A phase's own verification scope can miss cross-phase/repo-wide drift — always run a milestone-level integration audit before closing, even when every individual phase passed its own verification.
2. Grep-based "zero remaining references" checks need explicit, reviewed exclusion scopes — an overly broad exclusion (e.g., excluding all of `.planning/`) can silently hide real matches.
3. Live-session human checkpoints remain the only reliable proof for conversational/gate-driven flows (AskUserQuestion gates, multi-turn subagent handoffs) — automated tests alone didn't cover this milestone's SCAF-04/SCAF-06 requirements.

### Cost Observations
- Sessions: multiple, spanning 2026-07-04 to 2026-07-16.
- Notable: zero-dependency constraint held throughout — the XML validator uses only Node built-ins, no new npm packages added.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 4 | First milestone tracked under GSD; established structural tool-boundary pattern and milestone-level integration audit as a required closing step. |

### Top Lessons (Verified Across Milestones)

1. Milestone-level integration audits catch drift that per-phase verification misses (v1.0).
