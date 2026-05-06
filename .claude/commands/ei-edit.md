---
description: Edita um agente EiPrompt (modelo/*.md) via docs-editor-conciso + auditoria automática com docs-reviewer
argument-hint: <Orquestrador|Qualifier|Scheduler|Protractor|Recepcionista|Follow-Up> <instrução>
---

Você vai coordenar a edição de um agente EiPrompt.

**Alvo:** `modelo/$1.md`
**Instrução do usuário:** $2

Execute nesta ordem:

1. **Ler contexto obrigatório** (se ainda não leu nesta sessão):
   - `CLAUDE.md`
   - `modelo/$1.md`

2. **Delegar ao agente `docs-editor-conciso`** via Agent tool, passando:
   - arquivo alvo: `modelo/$1.md`
   - instrução: `$2`
   - lembrete: preservar `<response_format>` intacto e seguir princípios de concisão do CLAUDE.md

3. O `docs-editor-conciso` invoca automaticamente o `docs-reviewer` ao finalizar. Apenas **repasse o veredicto** ao usuário:
   - Se REPROVADO, sugerir `/ei-edit $1 <correção>` com base nos problemas encontrados.
   - Se APROVADO, informar conclusão.

NUNCA edite o arquivo diretamente — sempre via `docs-editor-conciso`.
