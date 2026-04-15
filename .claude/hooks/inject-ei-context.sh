#!/bin/bash
# inject-ei-context.sh
# Injeta contexto EiPrompt: CLAUDE.md + lista dos arquivos modelo.
# Usado por SessionStart, UserPromptSubmit e PreToolUse (Edit|Write em modelo/*.md).

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"
MODELO_DIR="$PROJECT_DIR/modelo"

echo "=== Contexto EiPrompt (injetado por hook) ==="
echo

if [ -f "$CLAUDE_MD" ]; then
  echo "## CLAUDE.md (regras do projeto — SEMPRE seguir)"
  echo
  cat "$CLAUDE_MD"
  echo
else
  echo "[aviso] CLAUDE.md não encontrado em $CLAUDE_MD" >&2
fi

if [ -d "$MODELO_DIR" ]; then
  echo "## Arquivos modelo disponíveis em modelo/"
  echo "Leia ANTES de editar/referenciar qualquer agente:"
  echo
  for f in "$MODELO_DIR"/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    echo "- modelo/$name"
  done
  echo
  echo "Para editar qualquer um destes, use o agente 'docs-editor-conciso'."
fi

exit 0
