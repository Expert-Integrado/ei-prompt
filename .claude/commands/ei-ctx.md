---
description: Carrega/recarrega o contexto EiPrompt (CLAUDE.md + docs/ + lista modelo/*.md). Aceita modo opcional.
argument-hint: [editor|reviewer]
---

Modos disponíveis (argumento opcional):
- `editor` → CLAUDE.md + `docs/regras-edicao.md` + `docs/proibido-fazer.md`
- `reviewer` → CLAUDE.md + `docs/regras-validacao.md` + `docs/proibido-fazer.md`
- _(sem argumento)_ → tudo (CLAUDE.md + todos os docs + lista de `modelo/*.md`)

Execute o hook de injeção de contexto manualmente:

```bash
"${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"/.claude/hooks/inject-ei-context.sh $ARGUMENTS
```

Depois confirme ao usuário que o contexto foi recarregado, indicando o modo usado e (se modo `full`) quais agentes estão disponíveis em `modelo/`.
