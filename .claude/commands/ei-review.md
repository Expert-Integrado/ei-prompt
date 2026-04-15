---
description: Audita um agente EiPrompt via docs-reviewer (sem editar)
argument-hint: <Orquestrador|Qualifier|Scheduler|Protractor>
---

Rode uma auditoria somente-leitura no agente `modelo/$1.md`.

1. **Ler contexto obrigatório** (se ainda não leu nesta sessão):
   - `CLAUDE.md`
   - `modelo/$1.md`

2. **Delegar ao agente `docs-reviewer`** via Agent tool, passando o arquivo alvo.

3. Apresentar o veredicto (APROVADO/REPROVADO) ao usuário.

4. Se REPROVADO, sugerir rodar `/ei-edit $1 <instrução de correção>` com base nos problemas identificados.

NUNCA edite o arquivo aqui — apenas audite.
