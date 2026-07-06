---
phase: 03
slug: separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 03-TBD | TBD | TBD | CLMD-03 | — | `normalizeEntry()` converts string→`{from,to}`, passes object through unchanged | unit | `node --test bin/cli.test.js` | ❌ W0 | ⬜ pending |
| 03-TBD | TBD | TBD | CLMD-03 | — | `help()` never prints `[object Object]` with a mixed manifest | unit/manual | `node bin/cli.js --help \| grep -qv '\[object Object\]'` | ❌ W0 (inline script) | ⬜ pending |
| 03-TBD | TBD | TBD | CLMD-08 | — | End-to-end install fetches `client/CLAUDE.md`, writes `CLAUDE.md`, content identical to pre-migration | manual | throwaway-install diff in scratch dir (no network mock in this zero-dep project) | manual — no new automation | ⬜ pending |
| 03-TBD | TBD | TBD | CLMD-04 / CLMD-06 | — | None of the 5 migrated headings appear in root `CLAUDE.md` or `.claude/CLAUDE.md` post-phase | automated (grep) | `! grep -E '^## (Mapa de Regras\|Arquitetura Padrão de Agentes\|Arquitetura Multi-Agente\|Slash Commands\|Regras Básicas)' CLAUDE.md .claude/CLAUDE.md` | ❌ W0 (inline verify step) | ⬜ pending |
| 03-TBD | TBD | TBD | CLMD-07 | T-3-01 | Guard blocks when a migrated heading is reintroduced into `CLAUDE.md`/`.claude/CLAUDE.md` | manual (transcript fixture) | fixture JSONL with an `Edit` tool_use inserting "## Slash Commands", confirm script emits `decision:block` | ❌ W0 | ⬜ pending |

*Task IDs are placeholders — the planner fills in real plan/task IDs when PLAN.md files are created.*

---

## Wave 0 Requirements

- [ ] `bin/cli.test.js` (new) — covers `normalizeEntry()`/equivalent and `help()` with a mixed manifest (CLMD-03)
- [ ] Transcript JSONL fixture for the guard (CLMD-07) — same pattern as fixtures already used in `validate-xml-casca.test.js`
- [ ] `package.json` has no `"test"` script — consider adding `"test": "node --test bin/*.test.js .claude/hooks/*.test.js"` in this phase to consolidate the regression command (non-blocking, but avoids each plan reinventing the full command)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| End-to-end install produces identical `CLAUDE.md` content in a client project | CLMD-08 | No network mock in this zero-dependency project; `npx`/GitHub raw fetch is the real distribution path | Point `manifest.branch` at the phase branch (or run `npx github:Expert-Integrado/ei-prompt#<branch>`) in a scratch dir, diff the resulting `CLAUDE.md` against the pre-phase root `CLAUDE.md` saved beforehand — same "throwaway test client" pattern already used in `02-05-SUMMARY.md` |
| Scaffolding subagents (client-scaffold-*, docs-analyzer, docs-editor-conciso, docs-reviewer, recepcionista-scaffolder) still resolve agent-architecture content correctly when run inside this source repo (`client/CLAUDE.md` present) vs. inside an installed client project (`client/CLAUDE.md` absent) | CLMD-06 | Depends on live agent behavior across two different cwd contexts — not a pure code assertion | Run `/ei-cria-cliente` once inside this repo (throwaway client, cleaned up after) and confirm the scaffolder correctly reflects multi-agente/Recepcionista rules despite root `CLAUDE.md` being empty/removed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
