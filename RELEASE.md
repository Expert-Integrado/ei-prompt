# Release / CI-CD

Como publicar uma nova versão do `@expertzinhointegrado/ei-prompt` no npm.

## TL;DR

```bash
# 1. bump versão no package.json
# 2. atualizar CHANGELOG.md
# 3. commit na branch de trabalho (dev)
# 4. push da dev + abrir PR para main
git push origin dev
gh pr create --base main --head dev

# 5. merge do PR (← isso dispara o publish, não existe passo de tag)
```

Merge do PR em `main` dispara o workflow [`Publish to npm`](.github/workflows/publish.yml), que roda `npm publish` automaticamente em ~10-25s. Não há passo de tag no fluxo atual — qualquer push que chegue em `main` (via merge de PR ou push direto) já é o gatilho.

## Como o CI/CD funciona

O workflow está em [`.github/workflows/publish.yml`](.github/workflows/publish.yml) e dispara em qualquer push que chegue na branch `main`, além de permitir disparo manual:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

> ⚠️ **Qualquer push em `main` publica automaticamente.** Não existe passo de tag — merge de PR em `main` já é a ação de publish, sem etapa manual separada depois. Por isso o bump de versão (`package.json`) e a entrada no `CHANGELOG.md` são obrigatórios ANTES do merge: mergear sem bumpar a versão falha com `403 Forbidden` (versão já publicada no npm).

O job:

1. Faz checkout do repo no commit mergeado em `main`.
2. Setup do Node 20 com registry `https://registry.npmjs.org`.
3. Roda `npm publish --access public` usando o secret `NPM_TOKEN`.

## Fluxo de release passo a passo

### 1. Bump da versão em `package.json`

Seguir [semver](https://semver.org):

- **Patch (`1.8.4 → 1.8.5`)** — ajuste de template, correção pontual, doc.
- **Minor (`1.8.x → 1.9.0`)** — novo template, nova feature opcional, novo slash command.
- **Major (`1.x.x → 2.0.0`)** — breaking change (renomeou tag, mudou estrutura de pasta esperada).

### 2. Atualizar `CHANGELOG.md`

Adicionar entrada no topo com a versão e a data:

```markdown
## [1.8.5] - 2026-05-13

**Resumo em 1 linha do que mudou.**

- Detalhe técnico 1
- Detalhe técnico 2
```

Manter ordem cronológica reversa (mais recente em cima).

### 3. Commit

Padrão observado nos commits anteriores:

```
chore: release v1.8.5 — <resumo curto>

<descrição opcional em 2-4 linhas>
```

O commit acontece na branch de trabalho (`dev`), antes de abrir o PR para `main`.

> Não incluir assinaturas `Generated with Claude Code` nem `Co-Authored-By` (regra do `CLAUDE.md`).

### 4. Push da `dev` e abertura do PR

```bash
git push origin dev
gh pr create --base main --head dev
```

Este passo é obrigatório — é o único jeito de levar o commit até `main` neste fluxo baseado em PR.

### 5. Merge do PR (dispara o publish)

Mergear o PR em `main` é o que faz a GitHub Action rodar. Como essa ação é irreversível e pública (publica de verdade no npm), trate-a como uma decisão humana deliberada e revisada — não como algo para automatizar.

### 6. Acompanhar o run

```bash
gh run list --limit 2
gh run watch <run-id>
```

Estado esperado: `queued → in_progress → success`.

## Secrets necessários

| Secret | Onde configurar | O que é |
|--------|-----------------|---------|
| `NPM_TOKEN` | GitHub repo → Settings → Secrets → Actions | Token de publicação do npm (escopo `@expertzinhointegrado`) |

Se o token expirar, o run falha com `401 Unauthorized` no passo `Publish`. Renovar em [npmjs.com/settings/.../tokens](https://www.npmjs.com/) e atualizar o secret.

## Verificar publicação

```bash
npm view @expertzinhointegrado/ei-prompt version
```

Deve retornar a versão recém-publicada.

## Erros comuns

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Merge em `main` publica versão antiga/duplicada | PR foi mergeado sem bumpar a versão em `package.json` antes | Bumpar versão e atualizar `CHANGELOG.md` ANTES de abrir/mergear o PR |
| `403 Forbidden` no publish | Versão já existe no npm | Bumpar versão no `package.json` e refazer commit/PR |
| `401 Unauthorized` | `NPM_TOKEN` expirou | Renovar token e atualizar secret |
| PR mergeado com versão diferente da esperada em `package.json` | Esqueceu de commitar o bump antes do merge | A versão anterior já está publicada e não pode ser reutilizada; bumpar a versão de novo e abrir um novo commit/PR — não dá pra "desfazer" o merge |

## Rollback

Se publicou uma versão quebrada:

```bash
# unpublish só funciona nas primeiras 72h
npm unpublish @expertzinhointegrado/ei-prompt@1.8.5

# alternativa segura: deprecar e publicar um patch
npm deprecate @expertzinhointegrado/ei-prompt@1.8.5 "use 1.8.6+"
```

E na sequência: bump de versão + novo commit + novo PR para `main` (sem tag) — o merge desse PR é o que republica a versão corrigida.
