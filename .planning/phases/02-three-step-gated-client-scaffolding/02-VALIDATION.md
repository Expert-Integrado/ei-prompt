---
phase: 02
slug: three-step-gated-client-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-05
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None applicable to prompt/subagent conversational behavior. `node:test` exists in this repo (Phase 1) but covers only the deterministic XML-casca validator, not orchestration/dialogue logic. |
| **Config file** | none — see Wave 0 |
| **Quick run command** | N/A — this phase adds/edits no JS |
| **Full suite command** | `node --test .claude/hooks/validate-xml-casca.test.js` (Phase 1's suite; unaffected by this phase, but generated client files must still pass it) |
| **Estimated runtime** | ~1 second (regression guard only) |

---

## Sampling Rate

- **After every task commit:** N/A (no automated quick-run exists for this domain)
- **After every plan wave:** `node --test .claude/hooks/validate-xml-casca.test.js` if the wave touches generated client file content, to confirm the XML casca still validates
- **Before `/gsd-verify-work`:** live-session `checkpoint:human-verify` walkthrough of both `single-agent` and `multi-agente-especialidade-unica` flows end-to-end, including a deliberate Cancel-at-gate attempt
- **Max feedback latency:** N/A for the conversational surface (manual-only by design, see justification below)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (assigned at planning) | TBD | TBD | SCAF-01 | — | 3 distinct subagent files exist, each scoped to its own step | manual-only | file existence + frontmatter review | N/A — no test framework for `.md` subagent structure | ⬜ pending |
| (assigned at planning) | TBD | TBD | SCAF-02 | — | Passo 1 subagent's tool/prompt scope contains no question-asking capability | manual-only | live session transcript review | N/A | ⬜ pending |
| (assigned at planning) | TBD | TBD | SCAF-03 | — | Passo 2 collects every required field incl. mídia; pending fields explicitly marked | manual-only | live session, compare collected fields against template placeholder scan | N/A | ⬜ pending |
| (assigned at planning) | TBD | TBD | SCAF-04 | T-2-01 | Hard gate in main-command context blocks Passo 2→3 without unambiguous explicit approval | manual-only | live session: attempt Cancelar, empty response, "Outro"; confirm Passo 3 never dispatches | N/A | ⬜ pending |
| (assigned at planning) | TBD | TBD | SCAF-05 | — | Behavior identical for `single-agent` and `multi-agente-especialidade-unica` | manual-only | run both modes end-to-end | N/A | ⬜ pending |
| (assigned at planning) | TBD | TBD | SCAF-06 | — | Passo 3 preserves `{{variavel}}` and `[PENDENTE - informação não fornecida]` markers | manual-only | diff filled output against expected placeholder preservation | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Threat Refs** (Security Domain — see 02-RESEARCH.md "Security Domain"):
- **T-2-01** — Ambiguous/empty/"Outro" response at the Passo 2→3 gate must resolve fail-closed (treated as Cancelar), matching `/ei-ajustes.md` Passo 3.5's existing fail-closed contract. A permissive default here would let Passo 3 fill templates from incomplete data.

---

## Wave 0 Requirements

None — this phase's verification surface is inherently manual/agentic per this project's established testing model (`.planning/codebase/TESTING.md`); there is no automated test infrastructure to stand up for conversational subagent behavior, and none is being invented here. Existing infrastructure (Phase 1's `node:test` suite) already covers the one automatable regression surface this phase touches (generated client files must remain valid XML casca).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Passo 1 asks zero client-specific questions and collects zero client data | SCAF-02 | No harness exists for conversational/prompt behavior; this is the project's established quality gate for this class of change (`docs/regras-validacao.md`, Phase 1 precedent) | Run `/ei-cria-cliente` for a throwaway test client in a live session; confirm Passo 1 completes with only structural output (folder tree), no client-data prompts |
| Hard gate is unambiguous and fail-closed (Cancelar / empty / "Outro" all block Passo 3) | SCAF-04 | Requires a live `AskUserQuestion` interaction and observing the actual next dispatch — not reproducible from static fixtures | In the same live session, reach the Passo 2→3 gate and try each of: explicit "Cancelar", an empty/ambiguous response, and "Outro" with free text; confirm Passo 3 is never invoked in any of the three cases, only on explicit "Aprovar e preencher" |
| Split behaves identically across `single-agent` and `multi-agente-especialidade-unica`, including the per-specialty loop (D-03) and the consolidated final summary (D-04) | SCAF-05 | End-to-end mode parity can only be observed by actually running both flows | Run `/ei-cria-cliente` once in single-agent mode and once in multi-agent mode (2+ specialties); confirm each specialty completes its own Passo1→2→gate→3 cycle sequentially and the final consolidated summary lists all specialties |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies, or are explicitly `checkpoint:human-verify` (exempt by design — see Phase 1 precedent, `01-03-PLAN.md` Task 3)
- [x] Sampling continuity: N/A — no automated verify exists for this domain; every task's verification is either the Phase 1 regression suite (mechanical) or a manual checkpoint (declared above), not a silent gap
- [x] Wave 0 covers all MISSING references (none — no Wave 0 gaps to close)
- [x] No watch-mode flags
- [ ] Feedback latency < N/A (manual-only surface)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
