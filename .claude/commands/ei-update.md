---
description: Atualiza os agentes EiPrompt na pasta atual e mostra o que há de novo (CHANGELOG)
---

1. Execute a atualização do pacote:

   ```bash
   npx --no-install @expertzinhointegrado/ei-prompt@latest
   ```

   **Se der erro** (sandbox bloqueou, permissão negada, etc.):
   - Tente rodar fora do sandbox: use `dangerouslyDisableSandbox: true` na chamada Bash, ou
   - Oriente o usuário a rodar manualmente no terminal:
     ```
     npx @expertzinhointegrado/ei-prompt@latest
     ```

2. Leia o `./CHANGELOG.md` local (baixado pelo `npx`) e mostre só a seção da versão mais nova:

   ```bash
   awk '/^## \[/{c++} c==2{exit} {print}' ./CHANGELOG.md
   ```

3. Resuma ao usuário em 1–2 linhas:
   - Quantos arquivos foram `add`/`update`/`same` (do output do npx).
   - Qual a versão mais nova e o destaque dela (do CHANGELOG).
