# Release / CI-CD

Como publicar uma nova versão do `@expertzinhointegrado/ei-prompt` no npm.

## TL;DR

```bash
# 1. bump versão no package.json
# 2. atualizar CHANGELOG.md
# 3. commit + push
# 4. criar e empurrar a tag (← isso dispara o publish)
git tag v1.8.5
git push origin v1.8.5
```

O push da tag dispara o workflow [`Publish to npm`](.github/workflows/publish.yml), que roda `npm publish` automaticamente em ~10-25s.

## Como o CI/CD funciona

O workflow está em [`.github/workflows/publish.yml`](.github/workflows/publish.yml) e dispara **apenas** em push de tag no formato `v*`:

```yaml
on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
```

> ⚠️ **Push em `main` NÃO publica.** Só a tag dispara. Esquecer a tag = código no GitHub, mas npm desatualizado.

O job:

1. Faz checkout do repo na ref da tag.
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

> Não incluir assinaturas `Generated with Claude Code` nem `Co-Authored-By` (regra do `CLAUDE.md`).

### 4. Push do commit (opcional, mas recomendado antes da tag)

```bash
git push origin main
```

### 5. Criar e empurrar a tag

```bash
git tag v1.8.5
git push origin v1.8.5
```

A partir daqui o GitHub Action assume.

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

Deve retornar a versão da tag recém-publicada.

## Erros comuns

| Sintoma | Causa | Fix |
|---------|-------|-----|
| Push em `main` não publica | Workflow só roda em tag | Criar `git tag vX.Y.Z && git push origin vX.Y.Z` |
| `403 Forbidden` no publish | Versão já existe no npm | Bumpar versão no `package.json` e refazer tag |
| `401 Unauthorized` | `NPM_TOKEN` expirou | Renovar token e atualizar secret |
| Tag empurrada com versão diferente da do `package.json` | Esqueceu de commitar o bump antes da tag | Deletar tag (`git tag -d v1.8.5 && git push origin :v1.8.5`), corrigir, refazer |

## Rollback

Se publicou uma versão quebrada:

```bash
# unpublish só funciona nas primeiras 72h
npm unpublish @expertzinhointegrado/ei-prompt@1.8.5

# alternativa segura: deprecar e publicar um patch
npm deprecate @expertzinhointegrado/ei-prompt@1.8.5 "use 1.8.6+"
```

E na sequência: bump + tag nova com a correção.
