---
phase: 03
slug: separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-06
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node >=18) — same as `.claude/hooks/validate-xml-casca.test.js` (Phase 1) |
| **Config file** | none — `package.json` has no `scripts`/`test` entry yet (Wave 0 may add one) |
| **Quick run command** | `node --test .claude/hooks/validate-xml-casca.test.js` (Phase 1 regression, must stay 27/27) |
| **Full suite command** | `node --test .claude/hooks/*.test.js bin/*.test.js` (includes new `bin/cli.test.js`) |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** `node --test .claude/hooks/validate-xml-casca.test.js` + `node bin/cli.js --help` (sanity manual check for `[object Object]`)
- **After every plan wave:** Full suite command above + grep for the 5 banned migrated headings in `CLAUDE.md`/`.claude/CLAUDE.md`
- **Before `/gsd-verify-work`:** Full suite must be green + Phase Requirements → Test Map table all green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1/T2 | 03-01 | 1 | CLMD-01 / CLMD-02 | T-03-01, T-03-02 | `client/CLAUDE.md` created verbatim minus Commits section; `manifest.json`'s `files[]` CLAUDE.md entry becomes `{from,to}`, 28 other entries stay plain strings | automated (grep + node -e) | Task 1: `grep -c` heading/Commits assertions; Task 2: `node -e "require('./manifest.json')..."` shape assertion | planned — delivered by 03-01 Task 1/Task 2 | 🔲 planned |
| 03-02-T1 | 03-02 | 1 | CLMD-03 | T-03-03, T-03-04 | `normalizeEntry()` converts string→`{from,to}`, passes object through unchanged, throws inside the existing per-file try/catch | unit | `node --test bin/cli.test.js` (behavior cases from Task 1) | planned — delivered by 03-02 Task 1/Task 2 (`bin/cli.test.js`) | 🔲 planned |
| 03-02-T2 | 03-02 | 1 | CLMD-03 | T-03-05 | `help()` never prints `[object Object]` with a mixed manifest | unit/manual | `node bin/cli.js --help \| grep -qv '\[object Object\]'` | planned — delivered by 03-02 Task 2 (inline script + `bin/cli.test.js`) | 🔲 planned |
| 03-04-T1/T2 | 03-04 | 2 | CLMD-04 / CLMD-05 | T-03-08, T-03-09 | Root `CLAUDE.md` removed; none of the 5 migrated headings appear in `.claude/CLAUDE.md` post-phase | automated (grep + file check) | `[ ! -f CLAUDE.md ] && ! grep -E '^## (Mapa de Regras\|Arquitetura Padrão de Agentes\|Arquitetura Multi-Agente\|Slash Commands\|Regras Básicas)' .claude/CLAUDE.md` | planned — delivered by 03-04 Task 1/Task 2 (inline verify steps) | 🔲 planned |
| 03-03-T1/T2/T3 | 03-03 | 1 | CLMD-06 | T-03-06, T-03-07 | All 9 distributed subagents/commands check `client/CLAUDE.md` via Glob before falling back to `CLAUDE.md` (structural proxy for dual-context resolution) | automated (grep, per-task) | Per-task `grep -q "client/CLAUDE.md" <file>` loops (Tasks 1-3) | planned — delivered by 03-03 Tasks 1-3 (inline verify steps) | 🔲 planned |
| 03-05-T1 | 03-05 | 3 | CLMD-07 | T-03-11, T-03-12 | Guard blocks when a migrated heading is reintroduced into `CLAUDE.md`/`.claude/CLAUDE.md`; excludes `client/CLAUDE.md`; never checks `stop_hook_active` | unit (transcript fixture) | `node --test .claude/hooks/check-claude-md-audience.test.js` (5 behavior cases incl. fixture JSONL with an `Edit` tool_use) | planned — delivered by 03-05 Task 1 (`check-claude-md-audience.test.js`) | 🔲 planned |
| 03-05-T3 | 03-05 | 3 | CLMD-08 | — | End-to-end install fetches `client/CLAUDE.md`, writes `CLAUDE.md`, content identical to pre-migration | manual (checkpoint:human-verify) | throwaway-install diff in scratch dir (no network mock in this zero-dep project) | manual — no new automation (by design, per RESEARCH.md) | 🔲 planned |

*Task IDs and plan/wave assignments above reflect the real 03-01 through 03-05 PLAN.md files created by the planner. "🔲 planned" means the automated/manual check is now specified inside a concrete PLAN.md task and will run at `/gsd-execute-phase` time — no row remains an unowned TBD gap.*

---

## Wave 0 Requirements

- [x] `bin/cli.test.js` (new) — covers `normalizeEntry()`/equivalent and `help()` with a mixed manifest (CLMD-03) — delivered by 03-02 Task 2
- [x] Transcript JSONL fixture for the guard (CLMD-07) — same pattern as fixtures already used in `validate-xml-casca.test.js` — delivered inline by 03-05 Task 1's `check-claude-md-audience.test.js` (local `makeTempDir()`/`jsonlLine()` helpers, not cross-imported)
- [x] `package.json` has no `"test"` script — adding `"test": "node --test bin/*.test.js .claude/hooks/*.test.js"` in this phase to consolidate the regression command — delivered by 03-02 Task 2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| End-to-end install produces identical `CLAUDE.md` content in a client project | CLMD-08 | No network mock in this zero-dependency project; `npx`/GitHub raw fetch is the real distribution path | Point `manifest.branch` at the phase branch (or run `npx github:Expert-Integrado/ei-prompt#<branch>`) in a scratch dir, diff the resulting `CLAUDE.md` against the pre-phase root `CLAUDE.md` saved beforehand — same "throwaway test client" pattern already used in `02-05-SUMMARY.md` |
| Scaffolding subagents (client-scaffold-*, docs-analyzer, docs-editor-conciso, docs-reviewer, recepcionista-scaffolder) still resolve agent-architecture content correctly when run inside this source repo (`client/CLAUDE.md` present) vs. inside an installed client project (`client/CLAUDE.md` absent) | CLMD-06 | Depends on live agent behavior across two different cwd contexts — not a pure code assertion | Run `/ei-cria-cliente` once inside this repo (throwaway client, cleaned up after) and confirm the scaffolder correctly reflects multi-agente/Recepcionista rules despite root `CLAUDE.md` being empty/removed |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — confirmed across 03-01 through 03-05; the sole exception (03-05 Task 3) is a `checkpoint:human-verify` with a `<human-check>` for CLMD-08, which RESEARCH.md explicitly scopes as manual-only (no network-fetch mock in this zero-dependency project)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — only the final task of the phase (03-05 Task 3) lacks `<automated>`, preceded by 03-05 Task 1/Task 2 which both have it
- [x] Wave 0 covers all MISSING references — see Wave 0 Requirements above, all 3 items now delivered by concrete plan tasks
- [x] No watch-mode flags — all commands are one-shot `node --test` invocations
- [x] Feedback latency < 5s — Test Infrastructure table above estimates ~2s per full suite run
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — plans exist and close all Wave 0 gaps; awaiting checker/human re-validation of this revision.
