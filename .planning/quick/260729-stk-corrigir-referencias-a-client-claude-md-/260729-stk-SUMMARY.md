---
phase: quick-260729-stk
plan: 01
subsystem: claude-tooling
status: complete
tags: [prompt-payload, dual-context, release-prep, ei-ajustes, scaffolding]
requires:
  - "manifest.json linha 5 — mapeamento { from: client/CLAUDE.md, to: CLAUDE.md } (inalterado)"
  - ".claude/agents/docs-reviewer.md Passo 0 — resolvedor dual-contexto remanescente"
provides:
  - "Redação canônica única (CANON-B) para carregamento do arquivo de regras nos 6 pontos de bullet"
  - "Template de prompt do docs-reviewer livre de caminho interno"
  - "v2.2.1 pronta para publicação (bump + CHANGELOG no branch dev)"
affects:
  - ".claude/agents/ (5 agentes de bullet + 2 scaffolders)"
  - ".claude/commands/ei-ajustes.md, .claude/commands/ei-cria-cliente.md"
  - "payload distribuído via manifest.json aos projetos de cliente"
tech-stack:
  added: []
  patterns:
    - "Precedência canônica-primeiro + exceção declarada (em vez de fallback condicional-primeiro)"
    - "Cláusula explícita de ausência-é-normal para suprimir erro/aviso/pergunta em agente"
key-files:
  created: []
  modified:
    - .claude/agents/client-scaffold-collect.md
    - .claude/agents/client-scaffold-fill.md
    - .claude/agents/docs-analyzer.md
    - .claude/agents/docs-editor-conciso.md
    - .claude/agents/docs-reviewer.md
    - .claude/agents/client-scaffold-structure.md
    - .claude/agents/recepcionista-scaffolder.md
    - .claude/commands/ei-cria-cliente.md
    - .claude/commands/ei-ajustes.md
    - package.json
    - CHANGELOG.md
decisions:
  - "CLAUDE.md da raiz é a referência canônica citada primeiro; client/CLAUDE.md vira exceção explícita do repo-fonte"
  - "Ponto E: caminho interno removido por completo do template de prompt do reviewer — resolução dual-contexto concentrada no Passo 0 do docs-reviewer"
  - "manifest.json e modelo/ deliberadamente intocados (o mapeamento do manifest é o correto, não o defeito)"
  - "Gate 3 da <verification> do plano é over-broad; validado com check preciso escopado a CANON-B (ver Deviations)"
metrics:
  duration: ~6min
  tasks: 3
  files: 11
  completed: 2026-07-29
---

# Quick Task 260729-stk: Corrigir referências a client/CLAUDE.md Summary

Inversão de precedência das referências ao arquivo de regras em 11 pontos de 9 arquivos distribuídos — `CLAUDE.md` da raiz passa a ser a referência canônica citada primeiro e o caminho `client/`-prefixado vira exceção declarada do repo-fonte — mais a remoção do caminho interno do template de prompt que `/ei-ajustes` injeta no `docs-reviewer`, com release prep v2.2.1.

## What Was Built

O instalador npx grava o payload como `CLAUDE.md` na raiz do projeto do cliente (`manifest.json` linha 5 é o único `{from,to}` do manifest). Num projeto instalado, portanto, o caminho `client/`-prefixado **nunca existe** — mas 11 pontos de prompt o citavam primeiro, fazendo um path inexistente vazar para dentro de prompts de subagente e para o que é mostrado ao usuário.

Três tasks, três commits atômicos:

**Task 1 (tracer) — `73ca9ab`** — Estabeleceu a redação canônica CANON-B e a aplicou nos 5 bullets de carregamento de contexto (`client-scaffold-collect.md:19`, `client-scaffold-fill.md:19`, `docs-analyzer.md:18`, `docs-editor-conciso.md:14`, `docs-reviewer.md:19`), convergindo duas variantes de gloss divergentes ("fallback dual-contexto: repo-fonte..." longo e "(fallback dual-contexto)" curto) numa forma única byte-idêntica. Os 3 espaços de indentação do sub-bullet aninhado em `docs-reviewer.md:19` foram preservados. O 6º ponto de edição — a referência cruzada da "VERIFICAÇÃO DE ESCOPO" em `docs-editor-conciso.md:95` — teve apenas a ordem invertida dentro do parêntese, sem repetir a cláusula de ausência-é-normal (repeti-la ali duplicaria uma regra, o que a convenção do projeto proíbe).

**Task 2 — `e366419`** — Expandiu a redação para os 5 pontos não-bullet:
- Pontos A/B/C (`client-scaffold-structure.md:20`, `recepcionista-scaffolder.md:40`, `ei-cria-cliente.md:16`): instrução numerada da Fase/Passo 0 agora abre pela leitura da raiz, preservando os glosses de conteúdo/seção que cada linha já trazia ("é a fonte real das regras do projeto...", a seção "Arquitetura Multi-Agente", o "integralmente").
- Ponto D (`ei-ajustes.md:265`): CANON-B byte-idêntica aos 5 agentes.
- Ponto E (`ei-ajustes.md:553`) — o ponto crítico: a linha vive **dentro** do template de prompt que o comando cola no `docs-reviewer` no fan-out do Passo 6, ou seja, o texto é literalmente injetado no prompt de um subagente rodando no projeto do cliente. Agora cita só `CLAUDE.md`. Antes de aplicar, foi confirmado por leitura que o Passo 0 do `docs-reviewer.md` já carregava a exceção do repo-fonte (aplicada na Task 1), de modo que nenhuma semântica dual-contexto foi perdida.

**Task 3 — `6dacd45`** — Release prep obrigatório por `RELEASE.md` (push em `main` dispara `npm publish`): `package.json` `2.2.0` → `2.2.1` e entrada `## [2.2.1] - 2026-07-29` no topo do `CHANGELOG.md`, no formato das entradas existentes (resumo em negrito voltado ao usuário final, bullets em linguagem de usuário, depois os técnicos, e o bullet de `package.json` por último).

## Key Implementation Details

CANON-B, a redação canônica reutilizada nos 6 pontos de bullet (única variação permitida: a indentação preexistente da linha):

```
- `CLAUDE.md` (raiz do projeto) — referência canônica. Exceção só no repo-fonte do ei-prompt: se `client/CLAUDE.md` existir (Glob), leia esse em vez do da raiz; a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele.
```

A cláusula "a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele" é o que impede o path inexistente de chegar ao usuário final como erro ou pergunta (mitiga T-quick260729stk-02).

A semântica dual-contexto continua íntegra: quando `client/CLAUDE.md` existe (só no repo-fonte), ele mantém precedência de leitura — o `CLAUDE.md` da raiz deste repo é doc interno de dev, não o payload do cliente.

`Glob` já estava declarado no frontmatter `tools:` de todos os 5 agentes de bullet — verificado, nada adicionado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Defeito no artefato de plano] Gate 3 da `<verification>` é over-broad e falha contra a própria Task 2**

- **Found during:** verificação plan-level, após as 3 tasks
- **Issue:** o check 3 do plano (`test "$(grep -rh '^[[:space:]]*- \`CLAUDE\.md\`' ... | wc -l)" = "6"` e 1 forma única) **também casa a linha que o Ponto E da Task 2 era obrigado a produzir** — `ei-ajustes.md:553`, que agora começa com `` - `CLAUDE.md` + docs/regras-validacao.md ``. O real é 7 linhas / 2 formas, não 6/1. Contradição interna do plano: o gate da própria Task 2 valida essa linha com `grep -q '^- \`CLAUDE\.md\` + docs/regras-validacao\.md...'`, então os dois gates não podem passar simultaneamente com o regex genérico.
- **Fix:** nenhuma mudança de código — a implementação está correta. A linha 553 não é um bullet de carregamento de contexto (é a checklist de regras dentro do template de prompt do reviewer), então a must-have truth real ("as 6 linhas de bullet de carregamento de contexto usam uma única redação canônica byte-idêntica") **está satisfeita**. Validado com um check preciso, escopado à forma CANON-B:
  - `grep -rh '^[[:space:]]*- \`CLAUDE\.md\` (raiz do projeto) — referência canônica\.'` → 6 linhas, 1 forma única ✓
  - linha 553 confere byte-a-byte com o output literal exigido pelo Ponto E ✓
  - total de 7 linhas = 6 CANON-B + 1 Ponto E, nenhuma variante remanescente ✓
- **Files modified:** nenhum (defeito no `260729-stk-PLAN.md` linha 211, não no código)
- **Commit:** n/a — registrado no ledger `.planning/WINDOWS.md` como `kind: deviation`

Nenhum outro desvio. As Tasks 1–3 seguiram o plano exatamente como escrito.

## Verification Results

| # | Check | Result |
|---|-------|--------|
| 1 | Ordem invertida em TODAS as ocorrências remanescentes (`awk` boundary check) | 0 violações ✓ |
| 2 | Contagem total 11 → 10 (Ponto E removido) | 10 ✓ |
| 3 | Redação canônica única nos bullets de carregamento | 6 linhas / 1 forma (check preciso — ver Deviations) ✓ |
| 4 | Cláusula ausência-é-normal nas 9 instruções de carregamento | 9 ✓ |
| 5 | `manifest.json` + `modelo/` com diff vazio | vazio ✓ |
| 6 | `npm test` | 47 passando / 0 falhando ✓ |
| 7 | Diff confinado aos 11 arquivos esperados | exatamente os 9 `.md` + `package.json` + `CHANGELOG.md` ✓ |

`ei-ajustes.md` tem exatamente 1 ocorrência do caminho interno (linha 265 / Ponto D, instrução local do comando) e ela **não** está dentro do template de prompt do reviewer — mitigação T-quick260729stk-01 confirmada.

## Threat Mitigations Applied

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-quick260729stk-01 (Info Disclosure — template de prompt do reviewer) | mitigate | ✓ Ponto E removeu o caminho interno; gate força 1 única ocorrência no arquivo |
| T-quick260729stk-02 (Info Disclosure — 10 linhas de instrução) | mitigate | ✓ precedência invertida + cláusula não-reportar/não-avisar/não-perguntar |
| T-quick260729stk-03 (Tampering — Passo 0 do docs-reviewer como último resolvedor) | mitigate | ✓ presença da exceção confirmada por leitura antes de aplicar o Ponto E |
| T-quick260729stk-04 (Tampering — zonas read-only) | mitigate | ✓ diff vazio em `manifest.json` e `modelo/` |
| T-quick260729stk-SC (supply chain) | accept | ✓ nenhum pacote instalado; projeto segue zero-dependency |

## Known Stubs

Nenhum. As mudanças são todas de texto de prompt já vigente, mais um bump de versão e uma entrada de CHANGELOG — sem placeholder, sem TODO, sem valor hardcodeado pendente de fiação.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (tracer) | `73ca9ab` | CANON-B nos 5 agentes de bullet + referência cruzada em `docs-editor-conciso.md` |
| 2 | `e366419` | 3 instruções em prosa invertidas + limpeza do template de prompt do reviewer |
| 3 | `6dacd45` | Release prep v2.2.1 (bump + CHANGELOG) |

## Follow-Up / Fora de Escopo

Deliberadamente **não** tocados (justificados no `<context>` do plano):

- `.claude/hooks/check-claude-md-audience.sh` / `.test.js` — guarda de regressão repo-local-only por design; o caminho interno ali é o alvo legítimo da exclusão do hook.
- `.claude/hooks/inject-ei-context.sh:13` — hook desativado em v1.8.9, não registrado em `.claude/settings.json`; risco latente apenas.
- `manifest.json` — o `from` é correto por definição, é a CAUSA-RAIZ do bug só no sentido de que o rename é o que torna o path interno inexistente no destino.
- `modelo/*.md` — read-only por regra dura do projeto.

**Ação humana pendente (fora deste plano):** v2.2.1 está commitada em `dev` mas **não publicada**. O merge em `main` dispara `npm publish` real e irreversível via `.github/workflows/publish.yml` — nenhum PR foi aberto e nenhum merge foi feito, conforme os limites do plano.

## Self-Check: PASSED

Todos os 11 arquivos modificados existem em disco e os 3 commits foram confirmados presentes em `git log`.
