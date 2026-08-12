---
phase: quick-260812-k2h
plan: 01
subsystem: docs
tags: [prompt-engineering, docs-analyzer, docs-editor-conciso, docs-reviewer, xml-casca, ei-ajustes]

# Dependency graph
requires:
  - phase: quick-260729-stk
    provides: CLAUDE.md da raiz como referencia canonica nos agentes/comandos distribuidos
provides:
  - Mapa tag-por-tipo de formato de resposta (Orquestrador/Protractor/Recepcionista=<response_format>, Qualifier=<formato_resposta>, Scheduler=<contrato_resposta>, Follow-Up fora) codificado em docs/regras-edicao.md
  - Regra de <boas_praticas> obrigatoria (5 tipos, self-healing, sintetizada nunca inventada) em docs/regras-edicao.md
  - Checklist novo e distinto "Validacao de Secoes Obrigatorias por Tipo de Agente" em docs/regras-validacao.md
  - Campo <secoes_faltantes> no schema estruturado do docs-analyzer.md (Passo de fluxo, Regras do schema, <regras>, 2 exemplos)
  - Deteccao+correcao aditiva e autocontida no docs-editor-conciso.md (nao depende de /ei-ajustes propagar campo do analyzer)
  - Item de checklist novo e distinto (subsecao 6) no docs-reviewer.md
affects: [ei-ajustes, docs-analyzer, docs-editor-conciso, docs-reviewer, regras-edicao, regras-validacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fonte da verdade centralizada em docs/*.md, referenciada (nao duplicada) pelos 3 agentes do pipeline no Passo 0"
    - "Deteccao autocontida no editor (le arquivo completo, nao depende de campo propagado por outro agente/comando fora de escopo)"

key-files:
  created: []
  modified:
    - docs/regras-edicao.md
    - docs/regras-validacao.md
    - .claude/agents/docs-analyzer.md
    - .claude/agents/docs-editor-conciso.md
    - .claude/agents/docs-reviewer.md

key-decisions:
  - "Task 1 (tracer) provou a deteccao ponta-a-ponta no docs-analyzer (primeiro agente do pipeline) antes de replicar a mesma fonte da verdade no docs-editor-conciso e docs-reviewer (Task 2)."
  - "Gate do tracer: verify automatizado da Task 1 (TASK1-OK) passou; sem checkpoint interativo disparado neste modo (auto mode desativado, mas orquestrador da quick task instruiu execucao completa das duas tasks sem pausa)."
  - "Nenhuma regra pre-existente foi afrouxada: <formato_resposta> mantem apenas campos originais (regras-validacao.md), REGRA INVIOLAVEL de <response_format> (docs-editor-conciso.md) e checklist 'Campos do formato_resposta inalterados' (docs-reviewer.md) permanecem byte-identicos — confirmado pelo gate PRESERVACAO-OK."

requirements-completed: [QUICK-260812-k2h]

coverage:
  - id: D1
    description: "Mapa tag-por-tipo + regra de boas_praticas obrigatoria codificados em docs/regras-edicao.md e docs/regras-validacao.md"
    requirement: "QUICK-260812-k2h"
    verification:
      - kind: other
        ref: "grep MAPA-OK (verification bloco 1 do PLAN.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs-analyzer.md preenche <secoes_faltantes> em cada <arquivo> da saida estruturada"
    requirement: "QUICK-260812-k2h"
    verification:
      - kind: other
        ref: "grep ANALYZER-OK (verification bloco 2 do PLAN.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs-editor-conciso.md detecta e completa secoes minimas faltantes no mesmo despacho, de forma autocontida; REGRA INVIOLAVEL intocada"
    requirement: "QUICK-260812-k2h"
    verification:
      - kind: other
        ref: "grep PRESERVACAO-OK + TASK2-OK (verification bloco 3 do PLAN.md)"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs-reviewer.md tem item de checklist novo e distinto auditando as duas secoes; checklist existente intocado"
    requirement: "QUICK-260812-k2h"
    verification:
      - kind: other
        ref: "grep PRESERVACAO-OK + TASK2-OK (verification bloco 3 do PLAN.md)"
        status: pass
    human_judgment: false
  - id: D5
    description: "modelo/*.md, client-scaffold-fill.md e ei-ajustes.md fora de escopo (diff vazio); diff total confinado aos 5 arquivos esperados"
    requirement: "QUICK-260812-k2h"
    verification:
      - kind: other
        ref: "grep ESCOPO-OK + git diff --name-only HEAD~2 HEAD (verification blocos 4 e 5 do PLAN.md)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-12
status: complete
---

# Phase quick-260812-k2h Plan 01: Seções Obrigatórias por Tipo de Agente Summary

**Mapa tag-por-tipo de formato de resposta + regra `<boas_praticas>` obrigatória codificados em `docs/regras-edicao.md`/`docs/regras-validacao.md`, com detecção estrutural no `docs-analyzer` (`<secoes_faltantes>`), correção autocontida no `docs-editor-conciso`, e checklist de auditoria dedicado no `docs-reviewer`.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-12T14:39:26-03:00 (commit base 37cb2fe)
- **Completed:** 2026-08-12T14:43:54-03:00 (commit 4a3d91e)
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments
- Fechado o gap de auditoria automática: a checagem de "seção de formato de resposta correta por tipo" e "`<boas_praticas>` obrigatória" deixa de depender de um humano lembrar da checklist manual e passa a existir codificada na fonte da verdade (`docs/regras-edicao.md`, `docs/regras-validacao.md`), consumida pelos 3 agentes do pipeline `/ei-ajustes` (`docs-analyzer`, `docs-editor-conciso`, `docs-reviewer`).
- `docs-analyzer.md` (primeiro agente do pipeline, roda antes de qualquer edição) agora sinaliza `<secoes_faltantes>` por arquivo na sua saída estruturada, sem inventar tags e excluindo `Follow-Up.md` explicitamente.
- `docs-editor-conciso.md` completa a(s) seção(ões) mínima(s) faltante(s) no MESMO despacho do ajuste pedido, de forma autocontida (não depende do comando `/ei-ajustes`, fora de escopo, propagar o campo do analyzer).
- `docs-reviewer.md` ganhou uma subseção de checklist nova e distinta (não misturada ao item pré-existente "sem campos novos no `<formato_resposta>`") auditando as duas seções.
- Todas as regras pré-existentes (REGRA INVIOLÁVEL `<response_format>`, checklist "`<formato_resposta>` mantém apenas os campos originais", checklist "Campos do `<formato_resposta>` inalterados") permanecem byte-idênticas — confirmado pelos gates automatizados.

## Task Commits

Each task was committed atomically:

1. **Task 1: Codificar o mapa tag-por-tipo + regra de boas_praticas na fonte da verdade e ligar a detecção no docs-analyzer** - `7ee80af` (feat)
2. **Task 2: Ligar detecção+correção aditiva no docs-editor-conciso e checklist novo no docs-reviewer** - `4a3d91e` (feat)

**Plan metadata:** commit pending (docs: complete plan) — handled separately by the orchestrator per execution constraints.

## Files Created/Modified
- `docs/regras-edicao.md` - Nova seção "## Seções Obrigatórias por Tipo de Agente" com mapa de tag por tipo (tabela de 6 linhas, 5 tipos + Follow-Up fora), regra de `<boas_praticas>` obrigatória self-healing com regra de conteúdo mínimo, e regra de restauração quando a tag esperada estiver totalmente ausente.
- `docs/regras-validacao.md` - Novo checklist "## Validação de Seções Obrigatórias por Tipo de Agente" (2 checkboxes) + bullet novo em "## Auditoria Automática".
- `.claude/agents/docs-analyzer.md` - 7 pontos de edição aditivos: bullet em `<conhecimento_dos_papeis>`, novo step 6 "Checar seções obrigatórias" (step antigo "Multi-agente" renumerado para 7), campo `<secoes_faltantes>` no schema de exemplo, bullet novo em "Regras do schema", `<secoes_faltantes>` populado nos Exemplos 1 (vazio) e 3 (`<boas_praticas>`), bullet novo em `<regras>`.
- `.claude/agents/docs-editor-conciso.md` - Nova seção "## SEÇÕES OBRIGATÓRIAS POR TIPO (detectar e completar)" logo após a REGRA INVIOLÁVEL (intocada); passo 4 do "FLUXO DE TRABALHO" referencia a nova seção; checklist final ganhou bullet novo.
- `.claude/agents/docs-reviewer.md` - Nova subseção "### 6. Seções Obrigatórias por Tipo de Agente" (2 checkboxes, aditiva ao final da lista 1-5); item (e) adicionado à lista de prioridades em "## Regras".

## Decisions Made
- Task 1 (tracer) provou a detecção ponta-a-ponta no primeiro agente do pipeline (`docs-analyzer`) antes de replicar a mesma fonte da verdade nos 2 agentes restantes (Task 2) — evita descobrir inconsistência no mapa depois de já ter propagado para 3 arquivos.
- Auto mode (`workflow.auto_advance`/`workflow._auto_chain_active`) estava desativado nesta sessão, mas o prompt do orquestrador da quick task instruiu explicitamente "Execute all tasks in the plan (Task 1 tracer, Task 2 auto)" sem pausa interativa; o gate automatizado da Task 1 (`TASK1-OK`) confirmou a fatia tracer sã antes de prosseguir para a Task 2, seguindo o caminho de "autonomous run" da tracer feedback gate.
- Nenhuma edição tocou `modelo/*.md`, `.claude/agents/client-scaffold-fill.md` ou `.claude/commands/ei-ajustes.md` — confirmado por `git diff --name-only -- modelo/ .claude/agents/client-scaffold-fill.md .claude/commands/ei-ajustes.md` vazio.

## Deviations from Plan

None - plan executed exactly as written. Todos os 7 pontos de edição da Task 1 Parte C e os 5 pontos de edição da Task 2 (3 em docs-editor-conciso.md, 2 em docs-reviewer.md) foram aplicados nos exatos pontos de inserção especificados pelo `<action>` de cada task, ancorados no texto existente exato.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Mudanças são apenas em arquivos `.md` de prompt/documentação, sem impacto em runtime, dependências ou configuração de ambiente.

## Next Phase Readiness

O pipeline `/ei-ajustes` agora tem os 3 agentes (`docs-analyzer`, `docs-editor-conciso`, `docs-reviewer`) cientes do mapa tag-por-tipo e da regra `<boas_praticas>` obrigatória, lidos da mesma fonte da verdade no Passo 0 de cada um. Fora de escopo deste plano (documentado explicitamente): `.claude/commands/ei-ajustes.md` não foi alterado para propagar `<secoes_faltantes>` do analyzer via template de dispatch — isso é aceitável porque o `docs-editor-conciso` verifica de forma independente ao ler o arquivo completo (Passo 2 do próprio fluxo), então a cadeia funciona mesmo sem essa propagação. Não há blocker para o próximo trabalho.

---
*Phase: quick-260812-k2h*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 5 modified files + SUMMARY.md exist on disk; both task commits (`7ee80af`, `4a3d91e`) found in `git log --oneline --all`.
