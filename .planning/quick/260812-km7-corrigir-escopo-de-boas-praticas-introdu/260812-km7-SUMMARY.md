---
phase: quick-260812-km7
plan: 01
subsystem: docs
tags: [prompt-engineering, docs-analyzer, docs-editor-conciso, docs-reviewer, boas-praticas, ei-ajustes]

# Dependency graph
requires:
  - phase: quick-260812-k2h
    provides: Mapa tag-por-tipo de formato de resposta + regra de <boas_praticas> obrigatoria (5 tipos, incorreta) codificados em docs/regras-edicao.md, docs/regras-validacao.md, docs-analyzer.md, docs-editor-conciso.md, docs-reviewer.md
provides:
  - Regra de <boas_praticas> obrigatoria corrigida para Scheduler-only (unico tipo cujo modelo/ realmente tem essa secao hoje) em docs/regras-edicao.md e docs/regras-validacao.md
  - docs-analyzer.md aplicando a checagem de boas_praticas apenas quando o arquivo e do tipo Scheduler (fluxo step 6, Regras do schema, <regras>), Exemplo 3 revertido para <secoes_faltantes></secoes_faltantes> vazia
  - docs-editor-conciso.md so exigindo/adicionando <boas_praticas> quando o arquivo e Scheduler.md (item a/b + checklist final)
  - docs-reviewer.md so auditando <boas_praticas> em Scheduler.md no checkbox 2 da subsecao 6
affects: [ei-ajustes, docs-analyzer, docs-editor-conciso, docs-reviewer, regras-edicao, regras-validacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Correcao de escopo por estreitamento cirurgico (old_string exato por ponto de edicao), nunca ampliando alem do que ja existia — mapa de tag de formato de resposta (decisao independente) permanece byte-identico"

key-files:
  created: []
  modified:
    - docs/regras-edicao.md
    - docs/regras-validacao.md
    - .claude/agents/docs-analyzer.md
    - .claude/agents/docs-editor-conciso.md
    - .claude/agents/docs-reviewer.md

key-decisions:
  - "Task 1 corrigiu a fonte da verdade (docs/regras-edicao.md, docs/regras-validacao.md) e o primeiro agente do pipeline (docs-analyzer.md, incl. reversao do Exemplo 3) antes de replicar a mesma correcao nos 2 agentes restantes (Task 2) — mesma ordem de dependencia usada em 260812-k2h."
  - "O mapa de tag de formato de resposta por tipo (decisao 1 de 260812-k2h) foi tratado como fora de escopo e intocado em todos os 5 arquivos — confirmado pelos gates de verificacao (presenca de <contrato_resposta>/<response_format>/<formato_resposta> intactos em todos os pontos de edicao)."
  - "Nenhuma edicao tocou modelo/*.md, .claude/agents/client-scaffold-fill.md ou .claude/commands/ei-ajustes.md — confirmado por git diff --name-only vazio para essas 3 zonas."

requirements-completed: [QUICK-260812-km7]

coverage:
  - id: D1
    description: "docs/regras-edicao.md e docs/regras-validacao.md declaram <boas_praticas> obrigatoria SOMENTE em Scheduler.md, nao mais nos 5 tipos"
    requirement: "QUICK-260812-km7"
    verification:
      - kind: other
        ref: "grep SCOPE-OK (verification bloco 1 do PLAN.md) + TASK1-OK (verify da Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs-analyzer.md aplica a checagem de boas_praticas apenas a arquivos do tipo Scheduler (fluxo step 6, Regras do schema, <regras>); Exemplo 3 revertido para <secoes_faltantes></secoes_faltantes> vazia"
    requirement: "QUICK-260812-km7"
    verification:
      - kind: other
        ref: "grep EXEMPLO3-OK (verification bloco 3 do PLAN.md) + TASK1-OK (verify da Task 1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs-editor-conciso.md so exige/adiciona <boas_praticas> quando o arquivo e Scheduler.md; REGRA INVIOLAVEL intocada"
    requirement: "QUICK-260812-km7"
    verification:
      - kind: other
        ref: "grep TASK2-OK (verify da Task 2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs-reviewer.md so audita <boas_praticas> em Scheduler.md no checkbox 2 da subsecao 6; checkbox 1 e checklist geral intocados"
    requirement: "QUICK-260812-km7"
    verification:
      - kind: other
        ref: "grep TASK2-OK (verify da Task 2)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Mapa de tag de formato de resposta por tipo (decisao 1 de 260812-k2h) byte-identico nos 5 arquivos; modelo/*.md, client-scaffold-fill.md e ei-ajustes.md com diff vazio; diff total confinado aos 5 arquivos esperados"
    requirement: "QUICK-260812-km7"
    verification:
      - kind: other
        ref: "grep MAPA-INTACTO-OK + ESCOPO-OK (verification blocos 4 e 5 do PLAN.md) + git diff --name-only HEAD~2 HEAD (verification bloco 6)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-12
status: complete
---

# Phase quick-260812-km7 Plan 01: Corrigir Escopo de `<boas_praticas>` Summary

**Regra de `<boas_praticas>` obrigatória estreitada de "5 tipos de agente" para "Scheduler-only" em `docs/regras-edicao.md`, `docs/regras-validacao.md` e nos 3 agentes do pipeline `/ei-ajustes` (`docs-analyzer`, `docs-editor-conciso`, `docs-reviewer`), corrigindo o falso positivo introduzido pela quick task 260812-k2h.**

## Performance

- **Duration:** 8 min
- **Started:** commit base 4cfa5cf
- **Completed:** commit dc3c68e
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments

- Corrigido o escopo errado de `<boas_praticas>` introduzido por 260812-k2h: a regra dizia "obrigatória em Orquestrador, Qualifier, Scheduler, Protractor e Recepcionista" quando na verdade `<boas_praticas>` só existe de fato em `modelo/Scheduler.md` hoje. A regra agora é explicitamente Scheduler-only nos 5 arquivos.
- `docs/regras-edicao.md` (fonte da verdade): primeiro parágrafo reescrito para declarar Scheduler-only e proibir self-healing nos outros 4 tipos; segundo parágrafo (conteúdo mínimo) manteve a regra de síntese a partir de outras seções do mesmo arquivo, trocando a proibição obsoleta ("não copiar conteúdo de agenda para outro tipo") por uma proibição relevante ao novo escopo ("não copiar literalmente de `modelo/Scheduler.md`").
- `docs/regras-validacao.md`: checkbox 2 reescrito para Scheduler-only, checkbox 1 (mapa de tag de formato de resposta) intocado.
- `docs-analyzer.md`: as 3 checagens de `<boas_praticas>` (fluxo step 6, bullet "Regras do schema", bullet `<regras>`) agora condicionadas a "SOMENTE quando o arquivo for do tipo Scheduler"; a checagem da tag de formato de resposta permanece incondicional para todos os tipos. O Exemplo 3 (Recepcionista/Orquestrador.md, que NÃO é Scheduler) teve `<secoes_faltantes><boas_praticas></secoes_faltantes>` revertido para `<secoes_faltantes></secoes_faltantes>` vazia, igual ao padrão do Exemplo 1.
- `docs-editor-conciso.md`: item (a) da seção "SEÇÕES OBRIGATÓRIAS POR TIPO" só exige `<boas_praticas>` quando o arquivo é Scheduler.md; item (b) trocou "alguma das duas" por "alguma das seções aplicáveis" (agora pode haver só uma checagem aplicável, não sempre duas); checklist final atualizado no mesmo sentido. REGRA INVIOLÁVEL (`<response_format>` intocável) permanece sem alteração.
- `docs-reviewer.md`: checkbox 2 da subseção "6. Seções Obrigatórias por Tipo de Agente" reescrito para Scheduler-only; checkbox 1 e o checklist geral (`Campos do <formato_resposta> inalterados`) permanecem intocados.

## Task Commits

Each task was committed atomically:

1. **Task 1: Estreitar a regra de boas_praticas para Scheduler-only na fonte da verdade e no docs-analyzer** - `960e455` (fix)
2. **Task 2: Estreitar a regra de boas_praticas para Scheduler-only no docs-editor-conciso e no docs-reviewer** - `dc3c68e` (fix)

**Plan metadata:** commit pending (docs: complete plan) — handled separately by the orchestrator per execution constraints.

## Files Created/Modified

- `docs/regras-edicao.md` - Subseção "### `<boas_praticas>` — seção obrigatória" reescrita: escopo Scheduler-only, proibição de cópia literal ajustada ao novo escopo.
- `docs/regras-validacao.md` - Checkbox 2 de "## Validação de Seções Obrigatórias por Tipo de Agente" reescrito para Scheduler-only.
- `.claude/agents/docs-analyzer.md` - 4 pontos de edição: fluxo step 6, bullet "Regras do schema", bullet `<regras>` (todos condicionados a Scheduler), e Exemplo 3 revertido para `<secoes_faltantes></secoes_faltantes>` vazia.
- `.claude/agents/docs-editor-conciso.md` - Item (a)/(b) da seção "SEÇÕES OBRIGATÓRIAS POR TIPO" e bullet do checklist final, todos condicionados a Scheduler.md.
- `.claude/agents/docs-reviewer.md` - Checkbox 2 da subseção "6. Seções Obrigatórias por Tipo de Agente" reescrito para Scheduler-only.

## Decisions Made

- Task 1 corrigiu a fonte da verdade e o primeiro agente do pipeline (`docs-analyzer.md`, incluindo reversão do Exemplo 3) antes de replicar a mesma correção nos 2 agentes restantes (Task 2), seguindo a mesma ordem de dependência de leitura usada em 260812-k2h.
- O mapa de tag de formato de resposta por tipo (decisão 1 de 260812-k2h, independente desta correção) foi mantido byte-idêntico em todos os 5 arquivos — verificado explicitamente pelos gates de cada task e pela verificação de nível de plano.
- Nenhuma edição tocou `modelo/*.md`, `.claude/agents/client-scaffold-fill.md` ou `.claude/commands/ei-ajustes.md` — confirmado por `git diff --name-only -- modelo/ .claude/agents/client-scaffold-fill.md .claude/commands/ei-ajustes.md` vazio.

## Deviations from Plan

None - plan executado exatamente como escrito. Todos os 6 pontos de edição da Task 1 (2 em `docs/regras-edicao.md`/`docs/regras-validacao.md` juntos + 4 em `docs-analyzer.md`) e os 3 pontos de edição da Task 2 (2 em `docs-editor-conciso.md`, 1 em `docs-reviewer.md`) foram aplicados exatamente nos pontos de inserção especificados pelo `<action>` de cada task, ancorados no texto existente exato lido nesta sessão.

## Issues Encountered

None.

## User Setup Required

None - mudanças são apenas em arquivos `.md` de prompt/documentação, sem impacto em runtime, dependências ou configuração de ambiente.

## Next Phase Readiness

O pipeline `/ei-ajustes` agora tem os 3 agentes (`docs-analyzer`, `docs-editor-conciso`, `docs-reviewer`) e a fonte da verdade (`docs/regras-edicao.md`, `docs/regras-validacao.md`) alinhados: `<boas_praticas>` é exigida/adicionada/auditada SOMENTE em arquivos do tipo Scheduler, eliminando o falso positivo de 260812-k2h que teria gerado diffs incorretos em Orquestrador/Qualifier/Protractor/Recepcionista de clientes reais. Não há blocker para o próximo trabalho.

---
*Phase: quick-260812-km7*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 5 modified files + SUMMARY.md exist on disk; both task commits (`960e455`, `dc3c68e`) found in `git log --oneline --all`.
