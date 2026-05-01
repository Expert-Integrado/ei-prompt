---
description: Audita um agente EiPrompt via docs-reviewer (sem editar). Aceita template ou pasta de cliente.
argument-hint: <agente> | <cliente> <agente>
---

Rode uma auditoria somente-leitura via `docs-reviewer`.

**Input bruto:** $ARGUMENTS

## Passo 1: Resolver o caminho alvo

- **Se 1 argumento** (ex: `Qualifier`) → alvo = `modelo/$1.md` (template).
- **Se 2 argumentos** (ex: `malu Qualifier` ou `"ACS Advogados Associados" Orquestrador`) → alvo = `<cliente>/<agente>.md` (pasta de cliente).
  - Use Glob para localizar a pasta do cliente (match exato → case-insensitive → substring).
  - Suporte nomes com espaços (passe entre aspas ou trate todos os tokens menos o último como o cliente).

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
  - Cliente: `/ei-ajustes <cliente> <instrução>`

## Regras
- NUNCA edite o arquivo aqui — apenas audite.
- NUNCA invoque o `docs-editor-conciso` neste comando.
