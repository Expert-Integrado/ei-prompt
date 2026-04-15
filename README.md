# ei-prompt

CLI que instala o conjunto de agentes **EiPrompt** (Orquestrador, Qualifier, Scheduler, Protractor) no seu projeto, direto do repositório oficial no GitHub.

## Uso

```bash
# Instala os arquivos (não sobrescreve o que já existe)
npx @expertzinhointegrado/ei-prompt@latest

# Atualiza — sobrescreve arquivos já existentes
npx @expertzinhointegrado/ei-prompt@latest update

# Ajuda
npx @expertzinhointegrado/ei-prompt@latest --help
```

## O que é instalado

Os arquivos são baixados do repo [`Expert-Integrado/ei-prompt`](https://github.com/Expert-Integrado/ei-prompt) (branch `main`):

- `CLAUDE.md` — preferências do projeto
- `modelo/Orquestrador.md`
- `modelo/Qualifier.md`
- `modelo/Scheduler.md`
- `modelo/Protractor.md`
- `.claude/agents/client-project-scaffolder.md`
- `.claude/agents/docs-editor-conciso.md`
- `.claude/agents/docs-reviewer.md`

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
