---
description: Atualiza os agentes EiPrompt na pasta atual e mostra o que há de novo (CHANGELOG)
---

1. Execute a atualização do pacote:

   ```bash
   npx @expertzinhointegrado/ei-prompt@latest
   ```

2. Busque o CHANGELOG mais recente do repositório e mostre a seção do topo (versão mais nova):

   ```bash
   curl -s https://raw.githubusercontent.com/Expert-Integrado/ei-prompt/main/CHANGELOG.md | awk '/^## \[/{c++} c==2{exit} {print}'
   ```

3. Resuma ao usuário em 1–2 linhas:
   - Quantos arquivos foram `add`/`update`/`same` (do output do npx).
   - Qual a versão mais nova e o destaque dela (do CHANGELOG).
