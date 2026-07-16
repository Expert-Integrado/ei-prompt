#!/bin/bash
# Stop/SubagentStop event hook — validação determinística da casca XML dos
# arquivos de agente (Orquestrador/Qualifier/Scheduler/Protractor/Follow-Up/
# Recepcionista) tocados no turno corrente.
#
# Este script é um wrapper fino: extrai transcript_path do stdin JSON (mesmo
# idioma dos hooks existentes, sem jq) e delega TUDO — descoberta dos arquivos
# tocados no transcript e validação da casca — para o CLI Node.js já testado
# em validate-xml-casca.js (`node validate-xml-casca.js --transcript <path>`,
# contrato fechado no Plan 02).
#
# Schema de saída: {"decision":"block","reason":"<mensagens de erro>"} em
# stdout, IDÊNTICO para os eventos Stop e SubagentStop (RESEARCH.md Pitfall 6
# — não usar hookSpecificOutput.additionalContext aqui; esse padrão é do
# post-scaffolder-review.sh, que é informativo/não-bloqueante, não um
# validador que precisa bloquear).
#
# DESIGN DELIBERADO (D-07/Pitfall 4) — NENHUMA guarda de stop_hook_active:
# ao contrário de post-ajustes-fanout.sh (que checa stop_hook_active como
# primeira ação porque seu trabalho é uma INSTRUÇÃO de um único disparo), este
# hook reavalia um FATO estático e re-checável — "a casca deste arquivo está
# válida agora?" — a cada invocação. Se pularmos a checagem no retry
# (stop_hook_active=true), silenciosamente deixaríamos passar exatamente o
# ciclo em que um arquivo quebrado ainda está quebrado. Por isso este script
# NUNCA olha para stop_hook_active em lugar nenhum — omissão intencional, não
# esquecimento. Não "conserte" isso adicionando a guarda depois.
#
# Zero dependência: apenas POSIX bash + grep/sed + node (já requerido pelo
# projeto, engines.node >= 18).
# Referência: .claude/hooks/post-ajustes-fanout.sh (idioma de extração de
# transcript_path, header, exit 0 incondicional) e
# .claude/hooks/post-scaffolder-review.sh (mesmo idioma de extração).

# WR-03: set -uo pipefail para flagar uso de variáveis não-set e erros em pipes.
# NÃO usar set -e: o pipeline grep|sed retorna 1 quando grep não casa nada,
# e isso é caso esperado (tratado pelos checks `[ -z "$VAR" ]` abaixo).
set -uo pipefail

INPUT=$(cat)

# Extrair transcript_path do JSON de entrada (sem jq — mesmo padrão dos
# hooks existentes).
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0
# WR-03: também checar legibilidade (não-regular files: pipes, sockets, dirs com perm estranha).
[ ! -r "$TRANSCRIPT" ] && exit 0

# Delega descoberta + validação ao CLI Node.js (contrato fechado no Plan 02:
# `node validate-xml-casca.js --transcript <path>` imprime uma linha de JSON,
# `{}` ou `{"decision":"block","reason":"..."}`, em stdout).
RESULT=$(node "$CLAUDE_PROJECT_DIR/.claude/hooks/validate-xml-casca.js" --transcript "$TRANSCRIPT")

# Convenção Claude Code: "sem saída = sem bloqueio". Se o resultado for vazio
# ou literalmente "{}", não imprime nada. Caso contrário, repassa o JSON do
# Node verbatim — já é JSON válido e completo, não re-empacotar/reformatar.
if [ -z "$RESULT" ] || [ "$RESULT" = "{}" ]; then
  exit 0
fi

printf '%s\n' "$RESULT"
exit 0
