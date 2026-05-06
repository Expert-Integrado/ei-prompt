---
description: Audita um agente EiPrompt via docs-reviewer (sem editar). Aceita template ou pasta de cliente (single ou multi-agente).
argument-hint: <agente> | <cliente> <agente> | "<cliente> <especialidade>" <agente>
---

Rode uma auditoria somente-leitura via `docs-reviewer`.

**Input bruto:** $ARGUMENTS

## Passo 1: Resolver o caminho alvo

- **1 argumento** (ex: `Qualifier`) → alvo = `modelo/$1.md` (template). Para auditar o recepcionista, use `Recepcionista`.
- **2 argumentos** — a forma do **primeiro** decide o modo:
  - **Single-agent** (ex: `malu Qualifier` ou `"ACS Advogados Associados" Orquestrador`) → alvo = `<cliente>/<agente>.md`.
    - Use Glob para localizar a pasta do cliente (match exato → case-insensitive → substring).
  - **Multi-agente** (ex: `"Brunno Brandi Consumidor" Qualifier`) → alvo = `<cliente>/<especialidade>/<agente>.md`.
    - Resolva o identificador composto entre aspas dividindo progressivamente em prefix+suffix:
      - `Brunno` + `Brandi Consumidor`, `Brunno Brandi` + `Consumidor`
      - Para cada divisão, verifique se `<prefix>/<suffix>/` existe.
      - Se exatamente uma resolver → use ela. Se múltiplas/nenhuma → liste e pergunte.

Se o caminho resolvido não existir → reportar erro com as opções disponíveis e parar.

## Passo 2: Ler contexto obrigatório (se ainda não leu nesta sessão)
- `CLAUDE.md`
- O arquivo alvo resolvido no Passo 1.

## Passo 3: Delegar ao agente `docs-reviewer`
Invoque via Agent tool com `subagent_type: docs-reviewer` passando o **caminho absoluto literal** do arquivo alvo (caractere por caractere, incluindo espaços) — NUNCA reescrever ou prefixar com `modelo/`.

## Passo 4: Apresentar veredicto
- APROVADO → informar conclusão.
- REPROVADO → listar problemas. Sugerir correção:
  - Template: `/ei-edit <agente> <instrução>`
  - Cliente single: `/ei-ajustes <cliente> <instrução>`
  - Cliente multi: `/ei-ajustes "<cliente> <especialidade>" <instrução>`

## Regras
- NUNCA edite o arquivo aqui — apenas audite.
- NUNCA invoque o `docs-editor-conciso` neste comando.
