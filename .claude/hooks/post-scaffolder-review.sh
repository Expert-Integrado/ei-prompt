#!/bin/bash
# SubagentStop hook — dispara auditoria automática com docs-reviewer
# depois que o client-project-scaffolder terminar.
#
# Estratégia: lê o transcript_path do JSON de entrada e procura pelo
# Agent tool mais recente com subagent_type=client-project-scaffolder.
# Se encontrou, injeta instrução no contexto do Claude principal.

INPUT=$(cat)

# Extrai transcript_path do JSON de entrada (sem depender de jq)
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

# Se não conseguiu extrair o transcript, sai silencioso
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0

# Procura nas últimas 200 linhas do transcript por invocação do scaffolder.
# Evita falsos positivos: só dispara se o subagent que acabou foi ele.
if tail -n 200 "$TRANSCRIPT" | grep -q '"subagent_type"[[:space:]]*:[[:space:]]*"client-project-scaffolder"'; then
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStop",
    "additionalContext": "O subagent client-project-scaffolder acabou de terminar (criação de novo projeto de cliente). AGORA invoque o agente docs-reviewer via Agent tool, EM PARALELO (múltiplas chamadas na mesma mensagem), para CADA arquivo .md criado na pasta do cliente recém-criada (Orquestrador, Qualifier, Scheduler, Protractor). Apresente o veredicto (APROVADO/REPROVADO) de cada arquivo no resumo final ao usuário. Se algum for REPROVADO, siga o fluxo anti-loop do próprio docs-reviewer."
  }
}
JSON
fi

exit 0
