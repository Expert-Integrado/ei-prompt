---
description: Carrega/recarrega o contexto EiPrompt (CLAUDE.md + lista modelo/*.md) manualmente
---

Execute o hook de injeção de contexto manualmente:

```bash
"$CLAUDE_PROJECT_DIR"/.claude/hooks/inject-ei-context.sh
```

Depois confirme ao usuário que o contexto foi recarregado, listando quais agentes estão disponíveis em `modelo/`.
