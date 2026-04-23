# Changelog

## [1.6.0] - 2026-04-23

- `client-project-scaffolder` agora usa `model: opus` (tarefa mais complexa — lê CLAUDE.md + todos os templates, coleta dados, preenche variáveis).
- Novo hook `SubagentStop` (`.claude/hooks/post-scaffolder-review.sh`) dispara auditoria automática com `docs-reviewer` em paralelo após a criação de um novo cliente. Veredicto por arquivo é apresentado no resumo final.
- `settings.json` registra o novo hook; `manifest.json` baixa o script.

## [1.5.0] - 2026-04-20

- Nova seção **"Limites do Ajuste de Prompts"** no CLAUDE.md — tabela clara do que NÃO pode ser ajustado via prompt (e onde resolver) vs. o que PODE ser ajustado.
- `docs-editor-conciso` agora verifica escopo antes de editar: se o pedido está fora do escopo, orienta o usuário para o local correto e não prossegue.
- `docs-reviewer` inclui checklist de escopo na auditoria.

## [1.4.0] - 2026-04-16

- Conhecimento de **Envio de Mídia** (imagens, vídeos, PDFs): padrão de bloco em `<conhecimento>` do Orquestrador, tipos válidos (`image`/`video`/`file`), regras do link direto e orientação para gerar o `mediaUrl` no Banco de Mídia do frontend ExpertIntegrado.
- Template `modelo/Orquestrador.md`: placeholder de mídia em `<conhecimento>` + regra de acionamento em `<regras_gerais>`.
- `client-project-scaffolder` ganhou Fase 4.5 — pergunta obrigatória sobre mídias no fluxo de criação de cliente.

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
