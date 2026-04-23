#!/bin/bash
# SubagentStop hook — dispara auditoria automática com docs-reviewer
# quando os subagents client-project-scaffolder ou docs-editor-conciso terminam.
#
# Estratégia: lê o transcript_path do JSON de entrada e identifica o
# subagent_type MAIS RECENTE no transcript. Se bater com um dos casos
# cobertos, injeta instrução no contexto do Claude principal.

INPUT=$(cat)

# Extrai transcript_path do JSON de entrada (sem depender de jq)
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

# Se não conseguiu extrair o transcript, sai silencioso
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0

# Último subagent_type aparecendo nas últimas 200 linhas do transcript.
LAST_SUBAGENT=$(tail -n 200 "$TRANSCRIPT" \
  | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | tail -1 \
  | sed 's/.*"\([^"]*\)"$/\1/')

case "$LAST_SUBAGENT" in
  client-project-scaffolder)
    cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStop",
    "additionalContext": "O subagent client-project-scaffolder acabou de terminar (criação de novo projeto de cliente). AGORA invoque o agente docs-reviewer via Agent tool, EM PARALELO (múltiplas chamadas na mesma mensagem), para CADA arquivo .md criado na pasta do cliente recém-criada (Orquestrador, Qualifier, Scheduler, Protractor). Apresente o veredicto (APROVADO/REPROVADO) de cada arquivo no resumo final ao usuário. Se algum for REPROVADO, siga o fluxo anti-loop do próprio docs-reviewer."
  }
}
JSON
    ;;
  docs-editor-conciso)
    cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStop",
    "additionalContext": "O subagent docs-editor-conciso acabou de terminar. Se ele aplicou edições em um arquivo .md de agente (Orquestrador/Qualifier/Scheduler/Protractor — seja em modelo/ ou em pasta de cliente), AGORA invoque o docs-reviewer via Agent tool sobre ESSE arquivo para auditoria real. É PROIBIDO apresentar veredicto de auditoria ao usuário sem que o docs-reviewer tenha sido invocado de fato via Agent tool — auto-auditoria narrada pelo editor não conta. Se o veredicto for REPROVADO, siga o fluxo anti-loop do próprio docs-reviewer. Se nenhum arquivo .md de agente foi editado nesta rodada, ignore esta instrução."
  }
}
JSON
    ;;
esac

exit 0
