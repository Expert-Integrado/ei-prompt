#!/bin/bash
# SubagentStop hook — dispara auditoria automática com docs-reviewer
# quando os subagents client-project-scaffolder ou docs-editor-conciso terminam.
#
# Estratégia: lê o transcript_path do JSON de entrada e identifica o
# subagent_type MAIS RECENTE no transcript. Se bater com um dos casos
# cobertos, injeta instrução no contexto do Claude principal.

# WR-03: set -uo pipefail para flagar uso de variáveis não-set e erros em pipes.
# NÃO usar set -e: o pipeline grep|tail|sed retorna 1 quando grep não casa nada,
# e isso é caso esperado (tratado pelos checks `[ -z "$LAST_SUBAGENT" ]` abaixo).
set -uo pipefail

INPUT=$(cat)

# Extrai transcript_path do JSON de entrada (sem depender de jq)
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

# Se não conseguiu extrair o transcript, sai silencioso
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0
# WR-03: também checar legibilidade (não-regular files: pipes, sockets, dirs com perm estranha).
[ ! -r "$TRANSCRIPT" ] && exit 0

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
    # Guarda silenciosa D-11 (Phase 5): durante /ei-ajustes fan-out, deixar o
    # novo Stop hook post-ajustes-fanout.sh cuidar — evita regressão de Phase 4
    # (cross-context obrigatório) e conflito com o reason injetado pelo Stop hook.
    # Detecção: sentinela <ei-ajustes-round id="..."/> ATIVO sem <ei-ajustes-round-consumed
    # id="..."/> posterior no transcript do turno corrente.
    # Mesmo regex/janela que post-ajustes-fanout.sh (Plan 01) para coerência.
    # IMPORTANTE: guarda DENTRO do branch docs-editor-conciso) APENAS — o branch
    # client-project-scaffolder) acima NÃO recebe esta guarda (per VALIDATION.md L45).
    # NORMALIZAÇÃO JSONL (CR-01 fix): conteúdo de mensagens assistant é JSON-escapado
    # (`"` vira `\"`). Normalizamos antes dos greps para que `<ei-ajustes-round id="..."/>`
    # case. Idempotente (sed no-op se já não-escapado). Espelha fix de post-ajustes-fanout.sh.
    TAIL_AJUSTES=$(tail -n 400 "$TRANSCRIPT" | sed 's/\\"/"/g')
    ROUND_ID_AJUSTES=$(printf '%s' "$TAIL_AJUSTES" \
      | grep -o '<ei-ajustes-round id="[^"]*"' \
      | tail -1 \
      | sed 's/.*id="\([^"]*\)"/\1/')
    if [ -n "$ROUND_ID_AJUSTES" ] && ! printf '%s' "$TAIL_AJUSTES" | grep -qF "<ei-ajustes-round-consumed id=\"$ROUND_ID_AJUSTES\""; then
      exit 0  # silencioso — fan-out de /ei-ajustes em andamento; Stop hook (Plan 01) cuida
    fi
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
