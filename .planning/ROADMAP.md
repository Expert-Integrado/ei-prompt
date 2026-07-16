# Roadmap: ei-prompt — Validação de XML + Scaffolding em 3 Passos

## Overview

Two independent hardening tracks ship this milestone: a deterministic XML-casca validation hook that replaces the manual review checklist with real code checks, and a refactor of client creation into three auditable steps with a hard confirmation gate. Both tracks are already narrow and self-contained (7 and 6 requirements respectively), so the roadmap intentionally stays at 2 phases rather than padding to hit a target count — each phase is a single coherent, end-to-end MVP capability, not a technical layer split across phases.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: XML Validation Hook** - Deterministic hook catches broken/malformed XML casca in client files automatically, wired into the existing Stop/SubagentStop pipeline. (gaps found 2026-07-04 — see 01-VERIFICATION.md) (completed 2026-07-05)
- [x] **Phase 2: 3-Step Gated Client Scaffolding** - Client creation split into scaffold → gather → fill steps with a hard gate, applied to both single-agent and multi-agent modes. (completed 2026-07-05)
- [x] **Phase 3: Separar CLAUDE.md distribuído (cliente via npm) do CLAUDE.md interno do repo** - Physically split the npm-distributed client payload (`client/CLAUDE.md`) from this repo's internal maintainer doc (`.claude/CLAUDE.md`), with a deterministic regression guard preventing client rules from leaking back into the internal doc. (completed 2026-07-16)

## Phase Details

### Phase 1: XML Validation Hook

**Goal:** As a developer maintaining the ei-prompt AI editing pipeline (docs-editor-conciso, client-project-scaffolder), I want to have every client agent file's XML casca checked automatically by deterministic code, so that a broken casca (missing/incorrect declaration, wrong `tipo`, nested/duplicate roots) is always caught with an actionable file+line/column error — without ever auto-"fixing" the accepted raw `<`/`&` blind spot.
**Mode:** mvp
**Depends on**: Nothing (first phase; independent track from Phase 2)
**Requirements**: XMLV-01, XMLV-02, XMLV-03, XMLV-04, XMLV-05, XMLV-06, XMLV-07
**Success Criteria** (what must be TRUE):

  1. Running the hook against a client file whose 1st line is missing or does not match `<?xml version="1.0" encoding="UTF-8"?>` reports the exact file and line/column and blocks.
  2. Running the hook against a file whose 2nd line `<agente ...>` has the wrong `tipo` for that filename (e.g. `Qualifier.md` with `tipo="orchestrator"`), or is missing required attributes (`xmlns`, `versao`), reports the specific mismatch and blocks — including the Recepcionista case (`tipo="orchestrator"` + `origem="recepcionista"`).
  3. Running the hook against a file with nested or duplicate `<agente>` roots reports the structural violation (not a single root) and blocks.
  4. The hook runs automatically when `post-ajustes-fanout.sh` (Stop) or `post-scaffolder-review.sh` (SubagentStop) fire — no manual invocation required — and the existing sentinel/anti-loop protocols in both hooks continue to work unchanged.
  5. Running the hook against a file whose valid casca wraps client content containing raw `<`/`&` that breaks the parse reports a parse failure without any auto-escaping/CDATA "correction" being applied — the blind spot is preserved, not silently patched.

**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Core validator engine (validateCasca/validateFile, fixtures, node:test suite)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Transcript file discovery + CLI wiring (discoverTouchedFiles, runCli)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Bash wrapper, Stop/SubagentStop registration, manifest.json distribution, human checkpoint

**Wave 4** *(gap closure — blocked on Wave 2/3 completion)*

- [x] 01-04-PLAN.md — Scope discoverTouchedFiles to the current turn (WR-02/D-06 fix) + ENOENT-safe runCli, closing the 01-VERIFICATION.md gap

### Phase 2: 3-Step Gated Client Scaffolding

**Goal**: As a developer creating a client project via `/ei-cria-cliente`, I want to go through three auditable, gated steps (scaffold folders → collect all required fields incl. media → fill templates) with a hard confirmation gate before filling, so that no client is ever left with silently incomplete required fields.
**Mode:** mvp
**Depends on**: Nothing (independent track from Phase 1; sequenced 2nd by convention only — parallelizable with Phase 1 if desired)
**Requirements**: SCAF-01, SCAF-02, SCAF-03, SCAF-04, SCAF-05, SCAF-06
**Success Criteria** (what must be TRUE):

  1. Running Passo 1 for a new client produces the full folder + file structure (all templates copied/composed) with zero client-specific questions asked and zero client data collected.
  2. Running Passo 2 after Passo 1 walks through every required field identified across the templates — including media/mídia fields (the former Fase 4.5) — and records either an answer or an explicit "pending" marker for each one.
  3. Attempting to advance from Passo 2 to Passo 3 without an explicit confirmation that every required field was collected (or consciously marked pending) is blocked by a hard gate, mirroring the `/ei-ajustes` Passo 3.5 pattern — advancing only happens after explicit confirmation.
  4. Running Passo 3 fills the template files with the data collected in Passo 2, preserving `{{variavel}}` placeholder syntax for anything not yet substituted and the `[PENDENTE - informação não fornecida]` marker for consciously pending fields.
  5. The full Passo 1→2→3 flow, including the hard gate, behaves identically for both `single-agent` and `multi-agente-especialidade-unica` modes.

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Create the 3 scaffolding subagents (client-scaffold-structure, client-scaffold-collect, client-scaffold-fill)
- [x] 02-02-PLAN.md — manifest.json + post-scaffolder-review.sh bookkeeping (ship new subagents, retire the old one)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Single-agent mode: hard gate + Passo 4A wiring (first vertical slice)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Multi-agent mode: Passo 4B.1(b) loop wiring for SCAF-05 parity

**Wave 4** *(blocked on Wave 2/3 completion)*

- [x] 02-05-PLAN.md — Live-session verification checkpoint (both modes + deliberate Cancel test)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 (Phase 3 depends on Phase 2 by convention only)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. XML Validation Hook | 4/4 | Complete    | 2026-07-05 |
| 2. 3-Step Gated Client Scaffolding | 5/5 | Complete    | 2026-07-05 |
| 3. Separar CLAUDE.md distribuído (cliente via npm) do CLAUDE.md interno | 5/5 | Complete    | 2026-07-16 |
</content>

### Phase 3: Separar CLAUDE.md distribuido (cliente via npm) do CLAUDE.md interno do repo (padrao GSD para .planning e agentes)

**Goal:** Como mantenedor do ei-prompt, quero que o `CLAUDE.md` distribuído a cada cliente via `npx ei-prompt` e o `CLAUDE.md`/`.claude/CLAUDE.md` que carrego ao trabalhar neste repo sejam fisicamente separados — cada um só com conteúdo da audiência correta — para que uma regra de cliente (ex: "modelo/ é read-only") nunca mais apareça como se fosse regra de como eu mesmo devo editar `modelo/`, e para que essa separação seja garantida por código (hook determinístico), não por um aviso de texto.
**Mode:** standard
**Depends on**: Phase 2 (independent track, sequenced 3rd by convention only)
**Requirements**: CLMD-01, CLMD-02, CLMD-03, CLMD-04, CLMD-05, CLMD-06, CLMD-07, CLMD-08
**Success Criteria** (what must be TRUE):

  1. Running `npx @expertzinhointegrado/ei-prompt@latest` (or `bin/cli.js install`) in any project fetches `client/CLAUDE.md` from GitHub and writes it as `CLAUDE.md` — content identical to the pre-migration payload (minus the "Commits" section, which was never client content).
  2. Opening this repo in a Claude Code session no longer autoloads any client-facing rule (Mapa de Regras, Arquitetura Padrão de Agentes, Arquitetura Multi-Agente, Slash Commands, Regras Básicas) as "Project instructions" — only `.claude/CLAUDE.md`'s internal maintenance content loads, since root `CLAUDE.md` no longer exists.
  3. Running `/ei-cria-cliente` (or any of the ~9 other distributed subagents/commands) inside this repo-fonte still resolves the correct agent-architecture rules by preferring `client/CLAUDE.md` when present, exactly as before the migration.
  4. `bin/cli.js --help` and the install loop both handle `manifest.json`'s mixed string/`{from,to}` entries correctly — no `[object Object]`, no fetch/write failures for the CLAUDE.md entry.
  5. Manually reintroducing a migrated heading (e.g. `## Slash Commands`) into `CLAUDE.md` or `.claude/CLAUDE.md` in this repo is automatically blocked by `check-claude-md-audience.sh` on the next `Stop`/`SubagentStop` event — and this guard is never shipped to client projects (absent from `manifest.json` and `.claude/settings.json`).

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Create `client/CLAUDE.md` source (verbatim minus Commits) + point `manifest.json`'s CLAUDE.md entry at `{from,to}`
- [x] 03-02-PLAN.md — `bin/cli.js` manifest-entry normalization (`normalizeEntry`/`formatManifestEntry`) + `bin/cli.test.js`
- [x] 03-03-PLAN.md — Apply `client/CLAUDE.md`-first fallback-read pattern across the ~9 distributed subagents/commands

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-04-PLAN.md — Remove root `CLAUDE.md` + fix `.claude/CLAUDE.md`'s commits cross-reference

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-05-PLAN.md — Regression guard (`check-claude-md-audience.sh`) wired into `.claude/settings.local.json` only + end-to-end distribution checkpoint
