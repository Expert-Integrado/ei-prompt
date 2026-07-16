#!/bin/bash
# Stop/SubagentStop event hook — guarda de regressão repo-local-only (D-09)
# que bloqueia qualquer edição que reintroduza conteúdo de cliente em
# CLAUDE.md / .claude/CLAUDE.md depois da migração para client/CLAUDE.md
# (D-05, Fase 03).
#
# ATENÇÃO — este script é INTENCIONALMENTE repo-local-only:
#   - NUNCA é adicionado a manifest.json (não é distribuído a nenhum cliente).
#   - É registrado APENAS em .claude/settings.local.json (hooks.Stop /
#     hooks.SubagentStop) — NUNCA em .claude/settings.json, que é o arquivo
#     distribuído. Registrar aqui vazaria uma referência pendurada a este
#     script para todo cliente instalado via npx (RESEARCH.md Pitfall 3).
#
# Schema de saída: {"decision":"block","reason":"..."} em stdout, mesmo
# contrato de validate-xml-casca.sh — "sem saída = sem bloqueio".
#
# DESIGN DELIBERADO — NENHUMA guarda de stop_hook_active:
# assim como validate-xml-casca.sh, este hook reavalia um FATO estático e
# re-checável — "o conteúdo deste arquivo é voltado a cliente agora?" — a
# cada invocação. Se pularmos a checagem no retry (stop_hook_active=true),
# silenciosamente deixaríamos passar exatamente o ciclo em que um cabeçalho
# migrado ainda está vazando para CLAUDE.md/.claude/CLAUDE.md. Por isso este
# script NUNCA olha para stop_hook_active em lugar nenhum — omissão
# intencional, não esquecimento. Não "conserte" isso adicionando a guarda
# depois.
#
# Zero dependência: apenas POSIX bash + grep/sed (sem jq).
# Referência: .claude/hooks/validate-xml-casca.sh (header, idioma de
# extração de transcript_path, exit 0 incondicional).

# WR-03 (mesma convenção do projeto): set -uo pipefail para flagar uso de
# variáveis não-set e erros em pipes. NÃO usar set -e: o pipeline grep|sed
# retorna 1 quando grep não casa nada, e isso é caso esperado (tratado pelos
# checks `[ -z "$VAR" ]` abaixo).
set -uo pipefail

INPUT=$(cat)

# Extrair transcript_path do JSON de entrada (sem jq — mesmo padrão dos
# hooks existentes).
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0
[ ! -r "$TRANSCRIPT" ] && exit 0

# Descobrir arquivos CLAUDE.md tocados (Edit/Write tool_use) nas últimas 400
# linhas do transcript, excluindo client/CLAUDE.md (fonte real do payload
# distribuído — espera-se legitimamente conter os cabeçalhos migrados).
# CR-01 fix: restringir a chamadas de tool_use cujo "name" seja Edit ou
# Write — sem este filtro, uma chamada Read (ou qualquer outra tool_use)
# sobre um CLAUDE.md não relacionado (ex.: de outro repo, via
# Read(//root/**)) dispara falso-positivo de block, contradizendo o
# comentário de cabeçalho deste script e 03-05-PLAN.md.
# WR-02 fix: anchorar a exclusão de client/CLAUDE.md ao final do path
# (segmento de diretório exato, não substring livre) — evita excluir
# falsamente algo como '.../api-client/CLAUDE.md'.
mapfile -t TOUCHED < <(
  tail -n 400 "$TRANSCRIPT" \
    | grep -oE '"name"[[:space:]]*:[[:space:]]*"(Edit|Write)"[^}]*"file_path"[[:space:]]*:[[:space:]]*"[^"]*CLAUDE\.md"' \
    | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*CLAUDE\.md"' \
    | sed 's/.*"\([^"]*\)"$/\1/' \
    | sort -u \
    | grep -vE '(^|/)client/CLAUDE\.md$'
)

[ "${#TOUCHED[@]}" -eq 0 ] && exit 0

# Cabeçalhos H2 migrados para client/CLAUDE.md (D-05) — match de alta
# precisão nos 5 cabeçalhos exatos, nunca em keywords genéricas (RESEARCH.md
# Pitfall 4: um regex genérico ("modelo/", "Recepcionista") daria falso
# positivo no próprio conteúdo legítimo de .claude/CLAUDE.md).
BANNED_HEADINGS='^## Mapa de Regras$|^## Arquitetura Padrão de Agentes$|^## Arquitetura Multi-Agente|^## Slash Commands$|^## Regras Básicas$'

for f in "${TOUCHED[@]}"; do
  [ ! -f "$f" ] && continue
  if grep -Eq "$BANNED_HEADINGS" "$f"; then
    printf '{"decision":"block","reason":"%s contém um cabeçalho migrado para client/CLAUDE.md (D-05) — conteúdo de cliente vazando para doc interno."}\n' "$f"
    exit 0
  fi
done

exit 0
