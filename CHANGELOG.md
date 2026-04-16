# Changelog

## [1.3.2] - 2026-04-16

- `/ei-update` agora mostra o CHANGELOG da versão mais nova após rodar o `npx`.

## [1.3.1] - 2026-04-16

- CLI mostra arquivos sem mudanças separadamente (`same`), destacando só o que foi realmente atualizado.

## [1.3.0] - 2026-04-16

- Novo slash command `/ei-update` que executa `npx @expertzinhointegrado/ei-prompt@latest` na pasta atual.

## [1.2.0] - 2026-04-15

- Comando único — install e update agora equivalem, sempre sobrescrevem arquivos.

## [1.1.x]

- Documentação dos slash commands `/ei-*` (COMANDOS.md, tabela no CLAUDE.md).
- Regra inviolável: `modelo/` é read-only; alterações só em pasta do cliente.

## [1.1.0] - 2026-04-15

- Hooks Claude Code + slash commands `/ei-*` + fluxo anti-loop editor/reviewer.

## [1.0.0] - 2026-04-14

- CLI `ei-prompt` inicial com comandos install e update.
- Workflow CI pra publicar no npm em push de tag `vX.Y.Z`.
