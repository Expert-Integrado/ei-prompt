#!/bin/bash
# prompt-matches-agent.sh
# Usado pelo hook UserPromptSubmit: só injeta contexto se o prompt mencionar
# arquivos modelo, CLAUDE.md ou ações de edição de agentes.

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

PATTERN='Orquestrador|Qualifier|Scheduler|Protractor|CLAUDE\.md|modelo/|agente|prompt|formato_resposta|ACIONAR_PROTRACTOR|IR_PARA_AGENDAMENTO|COLETAR'

if echo "$PROMPT" | grep -Eiq "$PATTERN"; then
  exec "$(dirname "$0")/inject-ei-context.sh"
fi

exit 0
