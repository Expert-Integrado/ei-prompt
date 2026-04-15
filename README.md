# ei-prompt

CLI que instala o conjunto de agentes **EiPrompt** (Orquestrador, Qualifier, Scheduler, Protractor) no seu projeto, direto do repositório oficial no GitHub.

## Uso

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
- `.claude/commands/ei-*.md` — slash commands (`/ei-cria-cliente`, `/ei-ajustes`, `/ei-edit`, `/ei-review`, `/ei-ctx`)

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
