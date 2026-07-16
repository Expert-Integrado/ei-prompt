# ei-prompt

**[→ Como funciona o EiPrompt](https://expert-integrado.github.io/ei-prompt/)** — a página do projeto, com o sistema explicado visualmente.

CLI que instala o conjunto de agentes **EiPrompt** (Orquestrador, Qualifier, Scheduler, Protractor) no seu projeto, direto do repositório oficial no GitHub.

## Uso

### Instalação assistida (recomendada)

Abra o Claude Code na pasta onde quer instalar os agentes e cole o prompt abaixo; o Claude conduz a instalação inteira, inclusive as etapas de navegador se você deixar.

```text
Quero instalar o EiPrompt (conjunto de agentes da Expert Integrado) nesta pasta, e você vai conduzir a instalação inteira. Siga exatamente:

1. Pré-requisitos: verifique com comandos reais se o Node.js 18 ou superior está instalado (node --version) e se o npx está disponível (npx --version). Se faltar algo, me oriente a instalar e só continue depois de resolvido.

2. Confirme comigo a pasta de destino: a instalação escreve os arquivos na pasta atual. Se eu quiser outra pasta, crie e trabalhe dentro dela.

3. Rode: npx @expertzinhointegrado/ei-prompt@latest
   O comando baixa os arquivos da branch main do repositório https://github.com/Expert-Integrado/ei-prompt e sobrescreve arquivos existentes (vale para primeira instalação e para atualização).

4. Valide a instalação: o CLI termina com um resumo (adicionados, atualizados, falhas). Qualquer falha precisa ser investigada antes de seguir (causa comum: rede bloqueando raw.githubusercontent.com). Confira que existem na pasta: CLAUDE.md, CHANGELOG.md, modelo/ (Orquestrador.md, Qualifier.md, Scheduler.md, Protractor.md, Follow-Up.md, Recepcionista.md), docs/ (regras-edicao.md, regras-validacao.md, proibido-fazer.md, multi-agente-recepcionista.md), .claude/agents/, .claude/settings.json, .claude/hooks/ e .claude/commands/ (ei-cria-cliente.md, ei-ajustes.md, ei-update.md).

5. Se alguma etapa precisar acontecer em navegador (por exemplo, abrir a página do projeto https://expert-integrado.github.io/ei-prompt/ para eu conhecer o sistema, ou consultar o repositório no GitHub), pergunte com botões (AskUserQuestion) se eu quero que você faça por mim. Rota padrão: Playwright MCP; se não estiver instalado, ofereça instalar com: claude mcp add playwright -- npx -y @playwright/mcp@latest. Alternativas: extensão Claude in Chrome, ou eu faço manualmente. Qualquer login é sempre meu: você nunca digita nem recebe minhas senhas.

6. Este projeto não usa chaves de API nem variáveis de ambiente. Se em algum fluxo surgir um segredo, ele nunca aparece no chat: vai direto para o destino (arquivo ou cofre) e você valida com uma chamada real, sem exibir o valor.

7. Teste ponta a ponta: me avise que os slash commands podem exigir reiniciar a sessão do Claude Code nesta pasta para carregar. Depois, confirme que /ei-cria-cliente, /ei-ajustes e /ei-update estão disponíveis e, se eu aprovar, crie um cliente de teste com /ei-cria-cliente (posso apagar a pasta depois).

8. Termine com um resumo: o que foi instalado, o que foi testado e os próximos passos (criar o primeiro cliente com /ei-cria-cliente <nome> e ajustar com /ei-ajustes).

Antes de cada comando, diga o que vai fazer. Se algo falhar duas vezes com o mesmo erro, pare e me mostre o diagnóstico.
```

### Instalação manual (alternativa)

Um único comando — baixa tudo e sempre sobrescreve arquivos existentes (funciona tanto para primeira instalação quanto para atualização):

```bash
npx @expertzinhointegrado/ei-prompt@latest

# Ajuda
npx @expertzinhointegrado/ei-prompt@latest --help
```

## O que é instalado

Os arquivos são baixados do repo [`Expert-Integrado/ei-prompt`](https://github.com/Expert-Integrado/ei-prompt) (branch `main`):

- `CLAUDE.md` — preferências do projeto
- `modelo/*.md` — templates dos agentes (Orquestrador, Qualifier, Scheduler, Protractor)
- `.claude/agents/*.md` — subagentes (scaffolder, editor, reviewer)
- `.claude/settings.json` — configuração dos hooks
- `.claude/hooks/*.sh` — scripts que injetam contexto automaticamente
- `.claude/commands/ei-*.md` — slash commands `/ei-cria-cliente`, `/ei-ajustes`, `/ei-update`.

## Como funciona

O pacote publicado no npm é pequeno — contém apenas o CLI e o `manifest.json`. Os arquivos de prompt são sempre buscados da branch `main` do repo GitHub em tempo de execução, então toda atualização no repo reflete imediatamente sem precisar republicar no npm.

## Publicação

```bash
npm login
npm publish --access public
```

Para atualizar o CLI (bump de versão):

```bash
npm version patch   # ou minor / major
npm publish
```
