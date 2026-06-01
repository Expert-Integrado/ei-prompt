---
phase: 01-reforco-docs-analyzer
plan: 00
subsystem: planning-infra
tags: [validation, bash, greps, infrastructure, wave-0]
requires: []
provides:
  - .planning/phases/01-reforco-docs-analyzer/check-greps.sh
affects:
  - .planning/phases/01-reforco-docs-analyzer/*  # script é gate de verificação de todos os plans 01-01..01-07
tech-stack:
  added: []
  patterns:
    - "bash check battery (helpers ok/err/check/check_not)"
    - "estado-progressivo: PASS counter cresce monotonicamente conforme waves implementam D-XX"
key-files:
  created:
    - .planning/phases/01-reforco-docs-analyzer/check-greps.sh
  modified: []
decisions:
  - "Script herdado do template canônico phases/02-human-approval-gate/check-greps.sh — mesmo layout (header→groups→summary)"
  - "Script versionado dentro de .planning/ via `git add -f` (path está em .gitignore mas é artefato da fase)"
  - "Exit code != 0 no estado pré-edição é COMPORTAMENTO CORRETO (não bug) — serve como sinal de progresso para waves seguintes"
metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_changed: 1
  completed_at: "2026-06-01T16:06:10Z"
---

# Phase 01 Plan 00: Infraestrutura de Validação Estrutural Summary

Bash script `check-greps.sh` que valida estruturalmente D-01..D-16 com 40 greps (13 PASS + 27 FAIL no baseline pré-edição), servindo de gate para Waves 1-6.

## Objective

Criar (Wave 0) o script `check-greps.sh` que cobre TODAS as decisões D-01..D-16 da fase com greps positivos e negativos. É **pré-requisito** dos plans 01-01..01-07 — cada plan posterior roda este script após commit e deve ver mais greps virando verdes até FAIL=0 no final da fase.

## What Was Built

### Task 1 — Verificação do script `check-greps.sh` (commit 1046747)

Script existe em `.planning/phases/01-reforco-docs-analyzer/check-greps.sh` com:

- `#!/usr/bin/env bash` + `set -u` (1 ocorrência).
- 6 targets nomeados: `ANALYZER`, `EI_AJUSTES`, `CLAUDE_MD`, `MANIFEST`, `PACKAGE_JSON`, `CHANGELOG`.
- 4 helpers padrão: `ok()`, `err()`, `check()`, `check_not()`.
- 29 menções a decisões `D-XX` em comentários/labels (mínimo 14 exigido).
- Banner final `═══ Resultado ═══` + counters `PASS`/`FAIL` + exit `1` quando `FAIL>0`.
- 8 grupos lógicos cobrindo:
  - Grupo A (D-04/D-05/D-11) — schema novo do `<decisao>` com terceiro valor `reject`
  - Grupo B (D-08/D-09) — cabeçalho de auto-checagem + regra MENTAL
  - Grupo C (D-12/D-13) — `<conhecimento_dos_papeis>` expandido + Passo 0 condicional por `<modo>`
  - Grupo D (D-10) — 4 novos exemplos few-shot de `reject`
  - Grupo E (D-07 parsing) — Passo 3 reconhece `reject` e roteia para caminho [D]
  - Grupo F (D-06/D-07 caminho [D]) — bloco `#### Caminho **[D]**` no Passo 3.5
  - Grupo G (D-14) — CLAUDE.md atualizada
  - Grupo H (D-14/D-15) — version bump em `package.json`/`manifest.json` + CHANGELOG com `/ei-update` e `reject`/`caminho [D]`

### Task 2 — Sanity check (sem commit; apenas execução)

```bash
bash .planning/phases/01-reforco-docs-analyzer/check-greps.sh; echo "EXIT=$?"
```

Resultado pré-edição:
- Exit code: `1` (esperado — comportamento correto).
- `PASS: 13` (greps já verdes — ex: ausência de `<trace>`/`<auto_check>`, menções a Qualifier/Scheduler/Protractor existentes, CHANGELOG já tem entrada 2.0.4).
- `FAIL: 27` (greps que vão virar verdes nas Waves 1-6 — ex: `<decisao>reject</decisao>` ainda inexistente, caminho [D] no Passo 3.5 ainda inexistente, CLAUDE.md sem menção a `reject`).
- Última linha: `FALHOU — corrija os greps marcados ✗ antes do phase gate.`
- Stderr limpo (nenhum FATAL — todos 6 arquivos-alvo existem).

## Acceptance Criteria Verification

Todos os critérios de Task 1:
- ✓ `test -x check-greps.sh` retorna 0.
- ✓ `head -1` retorna `#!/usr/bin/env bash`.
- ✓ `grep -cF 'set -u'` = 1 (>=1).
- ✓ `grep -cE '^(ok|err|check|check_not)\(\)'` = 4 (>=4).
- ✓ `grep -cF 'D-'` = 29 (>=14).
- ✓ `grep -cF 'echo "═══ Resultado ═══"'` = 1 (>=1).

Todos os critérios de Task 2:
- ✓ `bash check-greps.sh` exit code = 1 (!= 0).
- ✓ Output contém múltiplas linhas `  ✗ ` (27 FAILs).
- ✓ `PASS: 13` e `FAIL: 27` (M >= 5).
- ✓ Sem FATAL no stderr.

## Success Criteria (Plan-Level)

- ✓ Script existe em `.planning/phases/01-reforco-docs-analyzer/check-greps.sh` (+x).
- ✓ Cobertura ≥25 greps (40 checks ao todo).
- ✓ Roda em <5s.
- ✓ Pré-edição: exit não-zero.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.planning/` não existia no worktree**
- **Found during:** Setup pré-Task 1.
- **Issue:** O worktree `.claude/worktrees/agent-ad9657c8a2e5549c6` tem `.planning/` listado em `.gitignore` e a árvore de trabalho do worktree começou vazia (sem `.planning/`). O arquivo `check-greps.sh` existia apenas no main repo (`/root/EiPrompt/.planning/phases/01-reforco-docs-analyzer/check-greps.sh`).
- **Fix:** Criei o diretório no worktree e copiei o `check-greps.sh` do main repo (`mkdir -p .planning/phases/01-reforco-docs-analyzer && cp ...`).
- **Files modified:** `.planning/phases/01-reforco-docs-analyzer/check-greps.sh` (copiado).
- **Commit:** `1046747`.

**2. [Rule 3 - Blocking] `.planning/` está em `.gitignore`**
- **Found during:** Stage do commit.
- **Issue:** `git add` ignora silenciosamente paths em `.gitignore`. Sem o force flag, o commit ficaria vazio e o plan declarado `files_modified: [.planning/.../check-greps.sh]` não seria honrado.
- **Fix:** Usei `git add -f` para forçar inclusão do artefato da fase (planning files são versionados conscientemente, apesar do `.gitignore` geral).
- **Files modified:** Nenhum a mais — apenas comando de stage.
- **Commit:** `1046747`.

## Auth Gates

Nenhum gate de autenticação encontrado.

## Decisions Made

- **Reaproveitar o script do main repo:** o planner já havia criado `check-greps.sh` no main repo durante o planejamento. O worktree não recebeu cópia automática (gitignore), mas o conteúdo está correto e nenhum ajuste foi necessário — a copia preserva chmod 755 e o conteúdo passa todos os critérios.
- **Não refatorar o script:** o plan diz explicitamente "NÃO refatorar de raiz — o script é cumulativo". Mantido como está; os 27 FAILs são esperados e serão eliminados pelos plans 01-01..01-07.

## Known Stubs

Nenhum stub introduzido — script é infraestrutura de validação completa.

## Threat Flags

Nenhum flag — script é read-only de arquivos do repo (apenas `grep`); não introduz superfície de rede, auth ou I/O privilegiado.

## Commits

| Task | Hash      | Message                                                                |
| ---- | --------- | ---------------------------------------------------------------------- |
| 1    | `1046747` | chore(01-00): add check-greps.sh validation script for phase 01        |
| 2    | _(no commit — execução-apenas)_ | sanity run reported PASS=13 FAIL=27 EXIT=1 (esperado)  |

## Output Note

Conforme `<output>` do plan: "NÃO criar SUMMARY.md ainda — esta task é infraestrutura. SUMMARY consolidado vem após Wave 6." Este SUMMARY individual (`01-00-SUMMARY.md`) está sendo criado mesmo assim porque o executor da GSD/worktree exige um SUMMARY por plan para o orquestrador agregar. O SUMMARY consolidado da fase (pós-Wave 6) será separado e mais abrangente.

## Self-Check: PASSED

- ✓ `.planning/phases/01-reforco-docs-analyzer/check-greps.sh` existe (FOUND).
- ✓ Commit `1046747` existe no histórico (FOUND via `git log --oneline -1`).
- ✓ `.planning/phases/01-reforco-docs-analyzer/01-00-SUMMARY.md` existe (este arquivo, FOUND após Write).
