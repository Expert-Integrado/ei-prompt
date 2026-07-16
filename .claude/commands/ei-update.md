---
description: Atualiza os agentes EiPrompt na pasta atual e mostra o que há de novo (CHANGELOG)
---

1. Descubra a versão **atual** (local) antes de mexer em qualquer arquivo, e extraia o número puro (ex: `2.0.5`) para usar como `OLD_VERSION` no passo 5:

   ```bash
   awk '/^## \[/{print; exit}' ./CHANGELOG.md 2>/dev/null || echo "(nenhum CHANGELOG.md local — primeira instalação)"
   ```

2. Descubra a versão **mais nova** disponível no GitHub, sem sobrescrever nada ainda:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Expert-Integrado/ei-prompt/main/CHANGELOG.md | awk '/^## \[/{print; exit}'
   ```

3. Compare as duas versões e informe ao usuário: "atual: X → mais nova: Y" (ou "já está na mais nova" se forem iguais — pergunte se quer atualizar mesmo assim antes de prosseguir).

4. Execute a atualização do pacote:

   ```bash
   npx --no-install @expertzinhointegrado/ei-prompt@latest
   ```

   **Se der erro** (sandbox bloqueou, permissão negada, etc.):
   - Tente rodar fora do sandbox: use `dangerouslyDisableSandbox: true` na chamada Bash, ou
   - Oriente o usuário a rodar manualmente no terminal:
     ```
     npx @expertzinhointegrado/ei-prompt@latest
     ```

5. Leia o `./CHANGELOG.md` local (agora atualizado pelo `npx`) e mostre **todas** as seções entre a versão atual (passo 1, exclusive) e a mais nova (passo 2, inclusive) — não só a última, já que o usuário pode estar vários releases atrasado:

   ```bash
   awk -v old="## [$OLD_VERSION]" '/^## \[/{if (index($0, old)==1) exit} {print}' ./CHANGELOG.md
   ```

   Se não havia CHANGELOG local (primeira instalação), mostre só a seção da versão mais nova.

6. Resuma ao usuário em 1–2 linhas:
   - Versão atual → versão nova (do passo 3).
   - Quantos arquivos foram `add`/`update`/`same` (do output do npx).
   - Destaques de cada versão nova instalada (dos CHANGELOGs lidos no passo 5).
