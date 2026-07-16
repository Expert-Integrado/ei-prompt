# ei-prompt — Validação de XML + Scaffolding em 3 Passos

## What This Is

CLI npm (`@expertzinhointegrado/ei-prompt`) que distribui um conjunto de agentes Claude Code (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up) para pastas de clientes de atendimento automatizado. Os 6 templates em `modelo/` têm uma "casca" XML (`<?xml version="1.0" encoding="UTF-8"?>` + `<agente tipo="...">`) desde o commit `994b16f`. Este milestone endurece essa casca com validação de código (não só regra em prompt), conserta o fluxo de criação de cliente (que deixava campos incompletos porque tudo acontecia numa única tacada), e separa fisicamente o `CLAUDE.md` distribuído ao cliente via npm do `CLAUDE.md`/`.claude/CLAUDE.md` interno do próprio repo-fonte.

## Core Value

Um `docs-editor-conciso` ou `client-scaffold-fill` nunca deve conseguir gerar/deixar um arquivo de cliente com XML quebrado (casca removida, invertida ou malformada) sem que isso seja pego automaticamente — hoje isso só é "pego" se o `docs-reviewer` (LLM) lembrar de checar a checklist manual do `docs/regras-validacao.md`.

## Requirements

### Validated

- ✓ Distribuição via npx com `manifest.files` + `deprecated_files` (cleanup de `/ei-ctx`, `/ei-edit`, `/ei-review` legados) — `bin/cli.js:86-91` já loga cada remoção e conta no resumo final. Confirmado funcionando, sem trabalho pendente.
- ✓ Pipeline `/ei-ajustes` com gate humano (`AskUserQuestion`) + fan-out paralelo de editores/reviewers — já em produção.
- ✓ Casca XML (`<?xml ...?>` + `<agente xmlns="…/super-sdr/prompt" versao="1.0" tipo="…">`) presente nos 6 templates de `modelo/` (commit `994b16f`).
- ✓ Hook determinístico de validação de XML roda no pipeline de review (`Stop`/`SubagentStop`), substituindo a checklist manual de `docs/regras-validacao.md` por checagem de código real — valida declaração `<?xml?>` (linha 1), atributos de `<agente>` (linha 2), `tipo` correto por arquivo, raiz única sem aninhamento, e preserva o ponto cego de `<`/`&` cru sem "corrigir" via escaping/CDATA. Inclui escopo de descoberta por turno (`discoverTouchedFiles`) e tolerância a arquivo apagado (ENOENT) sem bloquear. Validated in Phase 1: XML Validation Hook.
- ✓ Criação de cliente refatorada em 3 passos distintos e auditáveis (`client-scaffold-structure` → `client-scaffold-collect` → `client-scaffold-fill`), substituindo o antigo `client-project-scaffolder` monolítico (aposentado via `deprecated_files`), com gate humano (`AskUserQuestion`, mesmo padrão de `/ei-ajustes` Passo 3.5) entre coleta e preenchimento — fail-closed contra Cancelar/vazio/ambíguo. Aplica-se aos dois modos (single-agent e multi-agente), com o loop multi-agente permitindo Cancelar uma especialidade sem abortar as demais. Confirmado em sessões live (single-agent e multi-agente com Cancel deliberado). Validated in Phase 2: Three-Step Gated Client Scaffolding.
- ✓ `CLAUDE.md` distribuído ao cliente (`client/CLAUDE.md`) fisicamente separado do `CLAUDE.md`/`.claude/CLAUDE.md` interno do repo-fonte — `manifest.json` usa o novo shape `{from,to}` (`bin/cli.js`'s `normalizeEntry()`/`formatManifestEntry()`, cobrindo tanto o loop de install quanto `deprecated_files` quanto `help()`) para apontar o entry de `CLAUDE.md` a `client/CLAUDE.md`; os 9 arquivos distribuídos (subagentes/comandos) preferem `client/CLAUDE.md` com fallback para `CLAUDE.md`; a raiz `CLAUDE.md` foi removida; `check-claude-md-audience.sh` (hook `Stop`/`SubagentStop`, repo-local-only via `.claude/settings.local.json`, nunca listado em `manifest.json`) bloqueia deterministicamente a reintrodução de conteúdo de cliente em `CLAUDE.md`/`.claude/CLAUDE.md`, restrito a operações `Edit`/`Write` (não dispara em `Read`). Verificado por `gsd-verifier` independentemente do SUMMARY (8/8 must-haves). Validated in Phase 3: Separar CLAUDE.md distribuído do CLAUDE.md interno.
- ✓ Toda referência à arquitetura de scaffolding retirada (`client-project-scaffolder`) corrigida para os 3 subagents atuais em toda a documentação e prompts correntes do repositório, incluindo `client/CLAUDE.md` (payload distribuído via npm — maior materialidade, alcança repos de cliente reais), `.planning/PROJECT.md`/`STATE.md`, e os 4 docs `.planning/codebase/*.md`; `inject-ei-context.sh` ganhou o mesmo fallback dual-context CLAUDE.md dos demais consumidores. Verificação inicial reportou 6/7 must-haves (gap na cobertura repo-wide); plano de fechamento de gap (03.1-03) corrigiu os 7 arquivos remanescentes e re-verificação confirmou 7/7. Validated in Phase 03.1: Corrigir referências obsoletas a client-project-scaffolder.

### Active

None no momento — milestone v1.0 concluído e arquivado (`.planning/milestones/v1.0-*`); próximo passo é iniciar um novo milestone com `/gsd-new-milestone`.

### Out of Scope

- Cleanup adicional de comandos legados (`/ei-ctx`/`/ei-edit`/`/ei-review`) — mecanismo `deprecated_files` já cobre isso, confirmado em código.
- Escaping/CDATA para "consertar" conteúdo variável do cliente que quebra o parser XML — é um ponto cego aceito por design.
- Corrigir `bin/cli.js` `writeFile()` para ter o mesmo guard de CWD-boundary que `removeFile()` já tem — gap pré-existente (T-2-02, aceito em `02-SECURITY.md`), fora do escopo da Fase 2 que só adicionou paths relativos comuns sob `.claude/agents/`.

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
| Validação de XML vira hook determinístico, não regra em prompt | Regra em prompt (commit `994b16f`) não impede um editor de IA remover a casca; código sempre checa | ✓ Good — Phase 1 |
| Criação de cliente vira 3 passos com gate duro entre levantamento e preenchimento | Fluxo atual (1 agente, 1 tacada) deixa campos incompletos porque a pessoa não fornece tudo de uma vez | ✓ Good — Phase 2, confirmado em sessões live (single-agent e multi-agente) |
| Cleanup de comandos legados fica fora do roadmap | `deprecated_files` já funciona e foi confirmado em código (`bin/cli.js:86-91`) | ✓ Good |
| `client-project-scaffolder` monolítico aposentado via `deprecated_files`, substituído por 3 subagentes (`client-scaffold-structure/-collect/-fill`) com `tools:` restritos por passo | Boundary de confiança precisa ser estrutural (allowlist de tools), não só prosa — um subagente sem `Write`/`Edit`/`Bash` é estruturalmente incapaz de preencher template mesmo se induzido | ✓ Good — Phase 2 |
| `post-scaffolder-review.sh` retargetado de `client-project-scaffolder` para `client-scaffold-fill` (único passo que produz conteúdo auditável) | Auditar após os 3 passos seria ruído; só o preenchimento (Passo 3) escreve conteúdo específico do cliente que vale auditoria | ✓ Good — Phase 2, disparo confirmado live em 02-05-SUMMARY |
| `client/CLAUDE.md` isolado num folder próprio (não um arquivo solto na raiz de um subdiretório) | Evita que o autoload de "Project instructions" do Claude Code capture o payload de cliente como se fosse instrução de como trabalhar neste repo — a separação física é o mecanismo, não um comentário/aviso | ✓ Good — Phase 3 |
| `check-claude-md-audience.sh` distribuído SOMENTE via `.claude/settings.local.json` (nunca `manifest.json`/`.claude/settings.json`) | O guard é uma proteção interna deste repo-fonte contra regressão; se fosse distribuído, viraria um hook rodando (e potencialmente bloqueando) em todo projeto-cliente sem motivo | ✓ Good — Phase 3, confirmado ausente de `manifest.json` por `gsd-verifier` |
| Code review pego ANTES da conclusão da fase encontrou 2 bugs críticos reais (hook bloqueando em `Read`, `deprecated_files` sem `normalizeEntry()`) que o SUMMARY não capturou | Reforça que o gate de code-review/verificação não pode ser pulado mesmo quando a execução "parece" ter ido bem — um executor marcou a fase como completa prematuramente antes desses gates rodarem, e ambos os bugs eram reais e reproduzíveis | ✓ Good — Phase 3, fixes em `fix(03): CR-01`/`CR-02` |
| Verificação da Fase 03.1 reportou gap (6/7) por escopo de grep incompleto (excluiu `.planning/` inteiro, não recapturou `client/CLAUDE.md` criado depois); plano de fechamento (03.1-03) fechou o gap remanescente | Um repo-wide grep sem escopo bem definido de exclusões produz falsos negativos silenciosos — a correção principal (`client/CLAUDE.md`) tinha a maior materialidade por ser o payload distribuído a clientes reais | ✓ Good — Phase 03.1, re-verificação confirmou 7/7 |
| Code review da Fase 03.1 encontrou 1 bug real não coberto pelos must_haves da própria fase: a Fase 5 de `recepcionista-scaffolder.md` (reescrita pela Plan 03.1-01) afirma incondicionalmente que nenhum scaffolding está pendente, o que é falso em cancelamento de especialidade ou modo bypass | O rename em si estava correto (bate com o must_have da Plan 03.1-01); a alegação de completude é uma regressão de correção separada, fora do escopo do objetivo desta fase (renomear referências obsoletas) | ⚠ Follow-up pendente — `03.1-REVIEW.md` CR-01, não corrigido nesta fase |
| Pós-milestone (2026-07-16): reintroduzido um `CLAUDE.md` na raiz do repo, amendando D-07 (que havia removido o arquivo por completo) | Dono do projeto pediu explicitamente para não deixar a raiz sem nenhum `CLAUDE.md`; conteúdo é cópia integral de `.claude/CLAUDE.md` (mantida em sincronia manual entre os dois arquivos), preservando `client/CLAUDE.md` como o único arquivo com conteúdo de cliente | ⚠ Reversão parcial deliberada de D-07 — os dois arquivos de conteúdo interno (raiz e `.claude/CLAUDE.md`) precisam ser atualizados juntos; nenhuma automação de sincronia foi criada |

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
*Last updated: 2026-07-16 after v1.0 milestone (Validação XML e Scaffolding em 3 Passos) completion*
