#!/bin/bash
# inject-ei-context.sh [mode]
# Injeta contexto EiPrompt seletivo conforme o modo:
#   editor    → CLAUDE.md + docs/regras-edicao.md   + docs/proibido-fazer.md
#   reviewer  → CLAUDE.md + docs/regras-validacao.md + docs/proibido-fazer.md
#   full|""   → CLAUDE.md + todos os docs/ + lista de modelo/*.md (padrão)
#
# Usado por SessionStart, UserPromptSubmit, PreToolUse (Edit|Write em modelo/*.md)
# e pelos agentes docs-editor-conciso / docs-reviewer.

MODE="${1:-full}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CLIENT_CLAUDE_MD="$PROJECT_DIR/client/CLAUDE.md"
ROOT_CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"
if [ -f "$CLIENT_CLAUDE_MD" ]; then
  CLAUDE_MD="$CLIENT_CLAUDE_MD"
else
  CLAUDE_MD="$ROOT_CLAUDE_MD"
fi
DOCS_DIR="$PROJECT_DIR/docs"
MODELO_DIR="$PROJECT_DIR/modelo"

# proibido-fazer.md é SEMPRE injetado (limites duros valem para todos os modos)
case "$MODE" in
  editor)
    DOCS_TO_LOAD=(regras-edicao.md proibido-fazer.md)
    ;;
  reviewer)
    DOCS_TO_LOAD=(regras-validacao.md proibido-fazer.md)
    ;;
  full|*)
    MODE="full"
    DOCS_TO_LOAD=(regras-edicao.md regras-validacao.md proibido-fazer.md)
    ;;
esac

echo "=== Contexto EiPrompt (injetado por hook, modo: $MODE) ==="
echo

if [ -f "$CLAUDE_MD" ]; then
  echo "## CLAUDE.md (regras do projeto — SEMPRE seguir)"
  echo
  cat "$CLAUDE_MD"
  echo
else
  echo "[aviso] CLAUDE.md não encontrado em $CLIENT_CLAUDE_MD nem em $ROOT_CLAUDE_MD" >&2
fi

if [ -d "$DOCS_DIR" ]; then
  for doc in "${DOCS_TO_LOAD[@]}"; do
    doc_path="$DOCS_DIR/$doc"
    if [ -f "$doc_path" ]; then
      echo "## docs/$doc (regras do projeto — SEMPRE seguir)"
      echo
      cat "$doc_path"
      echo
    fi
  done
fi

# Lista de modelo/*.md só no modo full (editor/reviewer recebem caminho literal e não precisam descobrir).
if [ "$MODE" = "full" ] && [ -d "$MODELO_DIR" ]; then
  echo "## Arquivos modelo disponíveis em modelo/"
  echo "Estes arquivos servem como BASE/referência ao editar ou criar agentes."
  echo "Não duplicar regras já contidas neles. Leia o conteúdo quando precisar consultar."
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
