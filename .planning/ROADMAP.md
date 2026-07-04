# Roadmap: ei-prompt — Validação de XML + Scaffolding em 3 Passos

## Overview

Two independent hardening tracks ship this milestone: a deterministic XML-casca validation hook that replaces the manual review checklist with real code checks, and a refactor of client creation into three auditable steps with a hard confirmation gate. Both tracks are already narrow and self-contained (7 and 6 requirements respectively), so the roadmap intentionally stays at 2 phases rather than padding to hit a target count — each phase is a single coherent, end-to-end MVP capability, not a technical layer split across phases.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: XML Validation Hook** - Deterministic hook catches broken/malformed XML casca in client files automatically, wired into the existing Stop/SubagentStop pipeline.
- [ ] **Phase 2: 3-Step Gated Client Scaffolding** - Client creation split into scaffold → gather → fill steps with a hard gate, applied to both single-agent and multi-agent modes.

## Phase Details

### Phase 1: XML Validation Hook

**Goal**: A client file with broken XML casca (missing/incorrect declaration, wrong `tipo`, nested/duplicate roots) is always caught by deterministic code — before or during review — with an actionable file+line/column error, without ever attempting to "fix" the accepted blind spot (raw `<`/`&` in client content).
**Mode:** mvp
**Depends on**: Nothing (first phase; independent track from Phase 2)
**Requirements**: XMLV-01, XMLV-02, XMLV-03, XMLV-04, XMLV-05, XMLV-06, XMLV-07
**Success Criteria** (what must be TRUE):

  1. Running the hook against a client file whose 1st line is missing or does not match `<?xml version="1.0" encoding="UTF-8"?>` reports the exact file and line/column and blocks.
  2. Running the hook against a file whose 2nd line `<agente ...>` has the wrong `tipo` for that filename (e.g. `Qualifier.md` with `tipo="orchestrator"`), or is missing required attributes (`xmlns`, `versao`), reports the specific mismatch and blocks — including the Recepcionista case (`tipo="orchestrator"` + `origem="recepcionista"`).
  3. Running the hook against a file with nested or duplicate `<agente>` roots reports the structural violation (not a single root) and blocks.
  4. The hook runs automatically when `post-ajustes-fanout.sh` (Stop) or `post-scaffolder-review.sh` (SubagentStop) fire — no manual invocation required — and the existing sentinel/anti-loop protocols in both hooks continue to work unchanged.
  5. Running the hook against a file whose valid casca wraps client content containing raw `<`/`&` that breaks the parse reports a parse failure without any auto-escaping/CDATA "correction" being applied — the blind spot is preserved, not silently patched.

**Plans**: TBD

### Phase 2: 3-Step Gated Client Scaffolding

**Goal**: Creating a client (single-agent or multi-agent specialty) never leaves required fields incomplete, because folder/template scaffolding, information gathering, and template filling are three distinct, auditable steps with a hard confirmation gate between gathering and filling.
**Mode:** mvp
**Depends on**: Nothing (independent track from Phase 1; sequenced 2nd by convention only — parallelizable with Phase 1 if desired)
**Requirements**: SCAF-01, SCAF-02, SCAF-03, SCAF-04, SCAF-05, SCAF-06
**Success Criteria** (what must be TRUE):

  1. Running Passo 1 for a new client produces the full folder + file structure (all templates copied/composed) with zero client-specific questions asked and zero client data collected.
  2. Running Passo 2 after Passo 1 walks through every required field identified across the templates — including media/mídia fields (the former Fase 4.5) — and records either an answer or an explicit "pending" marker for each one.
  3. Attempting to advance from Passo 2 to Passo 3 without an explicit confirmation that every required field was collected (or consciously marked pending) is blocked by a hard gate, mirroring the `/ei-ajustes` Passo 3.5 pattern — advancing only happens after explicit confirmation.
  4. Running Passo 3 fills the template files with the data collected in Passo 2, preserving `{{variavel}}` placeholder syntax for anything not yet substituted and the `[PENDENTE - informação não fornecida]` marker for consciously pending fields.
  5. The full Passo 1→2→3 flow, including the hard gate, behaves identically for both `single-agent` and `multi-agente-especialidade-unica` modes.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 (both are independent tracks; parallel execution is possible if desired)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. XML Validation Hook | 0/TBD | Not started | - |
| 2. 3-Step Gated Client Scaffolding | 0/TBD | Not started | - |
</content>

### Phase 3: Separar CLAUDE.md distribuido (cliente via npm) do CLAUDE.md interno do repo (padrao GSD para .planning e agentes)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 2
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 3 to break down)
