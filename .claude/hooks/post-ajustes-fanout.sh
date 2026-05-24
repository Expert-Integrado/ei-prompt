#!/bin/bash
# Stop event hook — dispara o Passo 6 do /ei-ajustes via injeção de reason
# quando detecta um fan-out de editores em curso (sentinela <ei-ajustes-round>
# ativo sem <ei-ajustes-round-consumed> posterior no transcript).
#
# Schema CORRETO para Stop event: {"decision":"block","reason":"<texto>"} em stdout.
# (NÃO usar hookSpecificOutput.additionalContext — esse campo NÃO existe em Stop;
# ver .planning/phases/05-hook-driven-pipeline/05-RESEARCH.md §Pitfall 1.)
#
# Anti-loop: PRIMEIRA ação é checar stop_hook_active (cap=8 do Claude Code).
# Zero dependência: apenas POSIX bash + grep/sed/tail/cat/printf.
#
# Referência: .planning/phases/05-hook-driven-pipeline/05-RESEARCH.md §Code Examples Exemplo 1
# Espelha o padrão de .claude/hooks/post-scaffolder-review.sh (extração de transcript_path).

INPUT=$(cat)

# 1) Anti-loop guard: respeitar stop_hook_active (cap=8 do Claude Code).
#    Sem esta guarda, qualquer bug na detecção de consumed pode loopar até CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=8.
if printf '%s' "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

# 2) Extrair transcript_path do JSON de entrada (sem jq — mesmo padrão do post-scaffolder-review.sh L12).
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0

# 3) Janela do turno atual: últimas 400 linhas do transcript JSONL (tail aproximado;
#    abordagem mais robusta de filtrar por requestId está documentada em RESEARCH Pitfall 6
#    como melhoria futura — tail -n 400 + idempotência por id é suficiente na prática).
TAIL=$(tail -n 400 "$TRANSCRIPT")

# 4) Extrair o ÚLTIMO sentinela emitido no tail (regex captura id="..." entre aspas duplas).
#    Se não houver sentinela, este turno NÃO é fan-out de editores — sair silencioso.
ROUND_ID=$(printf '%s' "$TAIL" \
  | grep -o '<ei-ajustes-round id="[^"]*"' \
  | tail -1 \
  | sed 's/.*id="\([^"]*\)"/\1/')
[ -z "$ROUND_ID" ] && exit 0

# 5) Idempotência (protocolo sentinela ↔ consumed — D-06 do CONTEXT.md):
#    se já existe <ei-ajustes-round-consumed id="$ROUND_ID"/> no tail, este round já foi tratado.
if printf '%s' "$TAIL" | grep -qF "<ei-ajustes-round-consumed id=\"$ROUND_ID\""; then
  exit 0
fi

# 6) Emitir block + reason (schema CORRETO para Stop event).
#    Texto em PT-BR (constraint do projeto — CLAUDE.md), instrui main Claude a emitir
#    consumed PRIMEIRO e aplicar Passo 6 em seguida (hook é só trigger; main Claude faz parsing).
cat <<JSON
{
  "decision": "block",
  "reason": "Os editores da rodada ${ROUND_ID} terminaram (trigger do hook post-ajustes-fanout). Antes de qualquer outra coisa, emita LITERALMENTE em UMA linha de texto livre: <ei-ajustes-round-consumed id=\"${ROUND_ID}\"/>. Em seguida, aplique o bloco pós-Tasks do Passo 5 (parsing dos <resultado>, gate PARL-04 se K>=1) seguido do Passo 6 (fan-out de M reviewers cross-context) conforme .claude/commands/ei-ajustes.md. Não pule etapas. Não peça permissão."
}
JSON
exit 0
