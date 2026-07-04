# ei-prompt — Validação de XML + Scaffolding em 3 Passos

## What This Is

CLI npm (`@expertzinhointegrado/ei-prompt`) que distribui um conjunto de agentes Claude Code (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up) para pastas de clientes de atendimento automatizado. Os 6 templates em `modelo/` têm uma "casca" XML (`<?xml version="1.0" encoding="UTF-8"?>` + `<agente tipo="...">`) desde o commit `994b16f`. Este milestone endurece essa casca com validação de código (não só regra em prompt) e conserta o fluxo de criação de cliente, que hoje deixa campos incompletos porque tudo acontece numa única tacada.

## Core Value

Um `docs-editor-conciso` ou `client-project-scaffolder` nunca deve conseguir gerar/deixar um arquivo de cliente com XML quebrado (casca removida, invertida ou malformada) sem que isso seja pego automaticamente — hoje isso só é "pego" se o `docs-reviewer` (LLM) lembrar de checar a checklist manual do `docs/regras-validacao.md`.

## Requirements

### Validated

- ✓ Distribuição via npx com `manifest.files` + `deprecated_files` (cleanup de `/ei-ctx`, `/ei-edit`, `/ei-review` legados) — `bin/cli.js:86-91` já loga cada remoção e conta no resumo final. Confirmado funcionando, sem trabalho pendente.
- ✓ Pipeline `/ei-ajustes` com gate humano (`AskUserQuestion`) + fan-out paralelo de editores/reviewers — já em produção.
- ✓ Casca XML (`<?xml ...?>` + `<agente xmlns="…/super-sdr/prompt" versao="1.0" tipo="…">`) presente nos 6 templates de `modelo/` (commit `994b16f`).

### Active

- [ ] Hook determinístico de validação de XML que roda no pipeline de review (junto ao `docs-reviewer` / hooks `Stop`/`SubagentStop`), substituindo a checklist manual de `docs/regras-validacao.md` (seção "Validação da Casca XML") por checagem de código real.
  - Valida: linha 1 = declaração `<?xml version="1.0" encoding="UTF-8"?>`; linha 2 = `<agente xmlns="…/super-sdr/prompt" versao="1.0" tipo="…">`; raiz única sem aninhamento; `tipo` correto por arquivo (`orchestrator`/`qualifier`/`protractor`/`scheduler`/`followup`; Recepcionista = `orchestrator` + `origem="recepcionista"`).
  - Regra por tipo de template: a validação estrutural é a mesma casca para os 6, mas o `tipo` esperado difere por arquivo — o hook precisa mapear nome de arquivo → `tipo` esperado.
  - Ponto cego aceito e preservado: conteúdo variável do cliente com `<`/`&` cru pode quebrar o parse — isso é esperado, não deve gerar "correção" via escaping/CDATA.
- [ ] Refatorar a criação de cliente (`client-project-scaffolder`, hoje Fase 3→4→4.5→5 num único agente) em 3 passos distintos e auditáveis:
  1. **Passo 1** — criar pastas + copiar arquivos + compor o template (scaffold puro, sem coletar dado nenhum do cliente).
  2. **Passo 2** — levantar as informações do cliente (todos os campos obrigatórios dos templates).
  3. **Passo 3** — preencher de fato o template com os dados coletados no Passo 2.
  - **Gate duro entre Passo 2 e Passo 3**: só avança pro preenchimento com confirmação explícita de que todo campo obrigatório foi coletado (ou marcado conscientemente como pendente) — mesmo padrão do gate humano já usado em `/ei-ajustes` (Passo 3.5).
  - Aplica-se aos dois modos existentes do scaffolder (`single-agent` e `multi-agente-especialidade-unica`).

### Out of Scope

- Cleanup adicional de comandos legados (`/ei-ctx`/`/ei-edit`/`/ei-review`) — mecanismo `deprecated_files` já cobre isso, confirmado em código.
- Escaping/CDATA para "consertar" conteúdo variável do cliente que quebra o parser XML — é um ponto cego aceito por design.

## Context

- Repo é o **source** do ei-prompt (mantenedor), não um projeto-cliente instanciado — mudanças aqui afetam o que é distribuído via `npx @expertzinhointegrado/ei-prompt@latest` a todos os usuários.
- Zero dependências de runtime, zero testes automatizados (`package.json` sem `dependencies`/`devDependencies`, sem test runner) — qualquer novo hook de validação deve rodar com Node built-in ou `xmllint` (já sugerido em `docs/regras-validacao.md:47`), sem introduzir dependência nova sem necessidade.
- Hooks existentes como referência de padrão: `.claude/hooks/post-ajustes-fanout.sh` (Stop, protocolo sentinela idempotente) e `.claude/hooks/post-scaffolder-review.sh` (SubagentStop, dispara `docs-reviewer`).
- `docs/regras-validacao.md` já documenta a checklist manual da casca XML (linhas 37-49) que o novo hook deve substituir/automatizar, preservando as mesmas regras.
- Sistema de injeção automática de contexto (`inject-ei-context.sh`) está desativado desde v1.8.9 para manutenção — leitura de `CLAUDE.md`/`docs/*` é manual via `Read` em todos os agentes atualmente.

## Constraints

- **Sem dependências novas**: projeto é intencionalmente zero-dependency; preferir Node built-ins ou binário já mencionado nos docs (`xmllint`) a bibliotecas npm.
- **Compatibilidade com manifest**: qualquer novo hook/agente precisa ser adicionado a `manifest.json` (`files`) para ser distribuído aos usuários via npx.
- **Não regredir o pipeline `/ei-ajustes`**: o novo hook de XML deve coexistir com `post-ajustes-fanout.sh` e `post-scaffolder-review.sh` sem quebrar o protocolo sentinela existente.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Validação de XML vira hook determinístico, não regra em prompt | Regra em prompt (commit `994b16f`) não impede um editor de IA remover a casca; código sempre checa | — Pending |
| Criação de cliente vira 3 passos com gate duro entre levantamento e preenchimento | Fluxo atual (1 agente, 1 tacada) deixa campos incompletos porque a pessoa não fornece tudo de uma vez | — Pending |
| Cleanup de comandos legados fica fora do roadmap | `deprecated_files` já funciona e foi confirmado em código (`bin/cli.js:86-91`) | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-04 after initialization*
