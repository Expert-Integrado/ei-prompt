# Changelog

## [1.6.4] - 2026-04-29

- Correção no `docs-editor-conciso`: nova seção **"PROIBIDO NA RESPOSTA FINAL"** restringe o output do agente a (a) resumo das alterações + (b) veredicto literal do `docs-reviewer` (`APROVADO`/`REPROVADO`). Bloqueia explicitamente texto de help genérico, listagem de agentes/comandos e sugestões inventadas de slash commands — comportamento que mascarava o resultado real da edição.

## [1.6.3] - 2026-04-27

- Novo template `modelo/Follow-Up.md` — agente dedicado a gerar mensagens de follow-up para reengajar leads. Contém `<objetivo>`, `<regras_followup>` e `<templates>` com scaffold guiado para o configurador coletar e inserir os exemplos reais de FUP do cliente.

## [1.6.2] - 2026-04-23

- Hook `SubagentStop` (`post-scaffolder-review.sh`) ampliado para cobrir também o `docs-editor-conciso`. Quando o editor termina, o hook injeta instrução no Claude principal para invocar o `docs-reviewer` de verdade (via Agent tool) sobre o arquivo editado — impede auto-auditoria narrada pelo editor, que vinha acontecendo e mascarava a etapa de review.
- Detecção do subagent agora usa o mais recente no transcript (`tail -1`) em vez de `grep -q`, evitando falsos positivos quando múltiplos tipos aparecem.

## [1.6.1] - 2026-04-23

- `modelo/Orquestrador.md`: correção do fluxo de transferência e falha técnica.
  - Nova **regra 24** (ERRO TÉCNICO ACIONA PROTRACTOR): qualquer falha de ferramenta (erro, timeout, payload inválido, resposta vazia) aciona o Protractor imediatamente, sem retry.
  - Nova **regra 25** (MENCIONAR TRANSFERÊNCIA = EXECUTAR TRANSFERÊNCIA): se o orquestrador mencionar transferência ao lead, o Protractor é acionado na mesma resposta, com linguagem de ação concluída (nunca futura).
  - `<regras_protractor>` ganha 6º gatilho: **FALHA TÉCNICA**.
  - `<base_conhecimento>` (status `"error"`) e `<regras_agendamento>` ("Falhas de tool") agora remetem à regra 24.
  - Bloco "Limite de chamadas" removido de `<regras_agendamento>`.
  - Regra 22 atualizada para referenciar a regra 24; regra de mídia renumerada para 26.

## [1.6.0] - 2026-04-23

- `client-project-scaffolder` agora usa `model: opus` (tarefa mais complexa — lê CLAUDE.md + todos os templates, coleta dados, preenche variáveis).
- Novo hook `SubagentStop` (`.claude/hooks/post-scaffolder-review.sh`) dispara auditoria automática com `docs-reviewer` em paralelo após a criação de um novo cliente. Veredicto por arquivo é apresentado no resumo final.
- `settings.json` registra o novo hook; `manifest.json` baixa o script.
- `docs-reviewer` agora é **read-only** no nível do harness (`tools: Read, Grep, Glob, Bash, Agent`) — não pode editar/escrever, só lê, reporta e delega correção via `Agent` (fluxo anti-loop com `docs-editor-conciso`).

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
