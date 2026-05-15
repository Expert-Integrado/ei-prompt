# Changelog

## [1.8.6] - 2026-05-15

**Melhoria de performance na pipeline de revisão/ajuste de agentes.** O `docs-reviewer` agora sempre recarrega o contexto antes de auditar (regras novas do `CLAUDE.md` são aplicadas imediatamente), `/ei-review` passa o foco da auditoria explicitamente e `/ei-ajustes` injeta contexto antes de delegar ao editor — eliminando auditorias com regras defasadas.

- **`docs-reviewer`:** novo Passo 0 obrigatório — roda `inject-ei-context.sh` (via `/ei-ctx`) antes de qualquer auditoria, garantindo regras vigentes do `CLAUDE.md`. Abordagem **diff-first**: prioriza o trecho alterado, depois valida coerência com o resto. Checklist expandido com regras de Base de Conhecimento, Envio de Mídia, `modelo/` read-only e multi-agente (Recepcionista/especialidades).
- **`/ei-review`:** Passo 2 reescrito — executa o hook de contexto explicitamente (antes lia só `CLAUDE.md` da memória). Prompt do reviewer ganha campo separado `O QUE FOI ALTERADO` (foco da auditoria) distinto de `OBJETIVO DO AJUSTE` (motivo do pedido).
- **`/ei-ajustes`:** Passo 4 agora roda o hook `inject-ei-context.sh` antes de delegar ao `docs-editor-conciso` — simetria com `/ei-review`, garante regras frescas no fluxo de edição.
- **`CLAUDE.md`:** nova seção **Base de Conhecimento (`<conhecimento>` do Orquestrador)** — esclarece que `<conhecimento>` é índice/resumo, não a base completa (que mora no frontend `/base_conhecimento`). Define o que pode/não pode entrar e como orientar o usuário quando pedir "colocar a base inteira no prompt".

## [1.8.5] - 2026-05-13

**Ajuste no `modelo/Recepcionista.md`: coleta opcional de contexto ANTES de identificar o agente.** O template agora suporta uma lista linear de perguntas configuráveis em `<fluxo_conversa>` — quando preenchida, a Recepcionista faz as perguntas em ordem antes de mapear contra `<agentes_disponiveis>`; quando vazia, mantém o comportamento original (pergunta aberta para identificar intenção).

- **Nova seção `<fluxo_conversa>`** entre `<agentes_disponiveis>` e `<fluxo_recepcao>` — opcional, lista numerada de perguntas. Comentário de cabeçalho referencia `<regras_gerais>` item 4 (uma pergunta por vez) sem duplicar.
- **`<fluxo_recepcao>` Passo 2 reescrito com bifurcação:** caminho A (perguntas configuradas) faz coleta sequencial pulando perguntas já respondidas implicitamente na 1ª mensagem; caminho B (vazio) usa a pergunta aberta padrão. Se o lead pressionar por conteúdo (preço, prazo, condições) no meio da coleta, aplica `<regras_recepcao>` e vai direto à transferência (curto-circuito intencional).
- **Mapeamento (Passo 3) usa o histórico das respostas** para escolher o agente — funciona nos dois caminhos sem mudança.
- `<response_format>` e demais regras preservados intactos.

## [1.8.0] - 2026-05-07

**Correção do fluxo de criação de clientes multi-agente.** A criação da Recepcionista foi extraída para um agente dedicado, e a ordem de execução foi invertida (especialidades primeiro, Recepcionista depois — pois o router precisa conhecer a lista das especialidades para popular `<agentes_disponiveis>`).

- **Novo agente `recepcionista-scaffolder`** (`.claude/agents/recepcionista-scaffolder.md`) — especialista em montar a pasta `Recepcionista/`: cria `Orquestrador.md` (a partir de `modelo/Recepcionista.md`), stubs neutralizados de `Qualifier.md` e `Scheduler.md`, e `Protractor.md` com `TRANSFERIR_PARA_AGENT` ATIVO (remove os marcadores `////`). Preenche `<agentes_disponiveis>` com a lista das especialidades e coleta dados institucionais (frases, regras críticas, pode/não pode informar). Faz `mkdir -p` da raiz para funcionar tanto no fluxo completo quanto no bypass.
- **`/ei-cria-cliente` virou orquestrador.** Pergunta single/multi via `AskUserQuestion` (com estrutura JSON explícita), e em multi pergunta novamente "criar tudo do zero" vs "só Recepcionista (bypass)". No fluxo completo, dispara `client-project-scaffolder` PRIMEIRO (cria todas as especialidades em loop) e depois `recepcionista-scaffolder` (cria a Recepcionista com a lista das especialidades). No bypass, só dispara o `recepcionista-scaffolder`.
- **`client-project-scaffolder` enxugado.** Removida a Fase 1.5 interativa (modo agora vem do prompt do comando) e toda a lógica de criar Recepcionista (migrou para o novo agente). Aceita `modo: single-agent` ou `modo: multi-agente-especialidades`. Em multi, cria apenas as subpastas das especialidades.

## [1.7.1] - 2026-05-07

**Melhoria de performance nos slash commands `/ei-ajustes` e `/ei-review`** — redução do tamanho dos prompts enviados aos sub-agentes, diminuindo consumo de tokens e tempo de resposta.

- **`/ei-ajustes`:** removido bloco `CONTEÚDO ATUAL DO ARQUIVO` do prompt — o `docs-editor-conciso` lê o arquivo diretamente pelo caminho absoluto, eliminando duplicação de conteúdo. Passo 4 simplificado (carrega apenas `CLAUDE.md`). Adicionado campo `OBJETIVO DO AJUSTE` — resumo em 1 linha do que deve mudar, dando contexto direto ao editor.
- **`/ei-review`:** Passo 3 agora monta prompt explícito com `ARQUIVO ALVO` e `OBJETIVO DO AJUSTE` (o que foi editado, ou "auditoria geral" se chamado standalone).

## [1.7.0] - 2026-05-06

- **Novo padrão arquitetural: Recepcionista (multi-agente).** Para clientes que atendem múltiplas frentes/áreas (ex: Consumidor + Trabalhista + Previdenciário), o EiPrompt agora suporta um agente **router** que recebe o lead, identifica intenção e transfere para o agente especialista correto via Protractor (`TRANSFERIR_PARA_AGENT:[nome]`).
  - Novo template `modelo/Recepcionista.md` — Orquestrador-router enxuto (sem Qualifier/Scheduler), com seção `<agentes_disponiveis>` listando cada especialista, `<fluxo_recepcao>` (saudação neutra → identificar intenção → mapear → transferir) e `<regras_recepcao>` (não qualifica, não agenda, não responde dúvidas técnicas).
  - Estrutura aninhada por especialidade: `Cliente/Recepcionista/` (router + stubs de Qualifier/Scheduler) + `Cliente/<Especialidade-N>/` (stack completo single-agent) para cada frente.
  - `client-project-scaffolder` ganha **Fase 1.5** que pergunta se o cliente é multi-agente e coleta nomes/descrição/gatilhos de cada especialidade. Cria estrutura aninhada automaticamente, com bloco `TRANSFERIR_PARA_AGENT` ATIVO em todos os Protractors da árvore.
  - `/ei-ajustes` ganha modo multi-agente via aspas: `/ei-ajustes "Brunno Brandi Consumidor" <descrição>` resolve para `Brunno Brandi/Consumidor/<Agente>.md` por divisão progressiva do identificador composto. Modo single (legado) `/ei-ajustes <cliente> <descrição>` continua funcionando.
  - `/ei-review` estendido para o mesmo formato: `/ei-review "Brunno Brandi Consumidor" Qualifier` resolve para a subpasta da especialidade.
  - `/ei-edit` ganha `Recepcionista` e `Follow-Up` no argument-hint.
  - Nova ação no campo `resume`: `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_AGENT:[nome]` documentada no CLAUDE.md.

## [1.6.8] - 2026-05-01

- Melhora no fluxo de auditoria pós-edição em `/ei-ajustes`: o `docs-editor-conciso` termina com aviso ao agente principal (`Edição concluída ... ative /ei-review <CLIENTE> <AGENTE>`) e o agente principal **executa `/ei-review` automaticamente** — auditoria via `docs-reviewer` segue acontecendo, mas roteada explicitamente pelo slash command `/ei-review` em vez de auto-invocação interna do editor.
- `/ei-review` estendido para aceitar pasta de cliente: além de `/ei-review <agente>` (template em `modelo/`), agora aceita `/ei-review <cliente> <agente>` (ex: `/ei-review malu Qualifier`, `/ei-review "ACS Advogados Associados" Orquestrador`).

## [1.6.7] - 2026-05-01

- `docs-editor-conciso`: o fix de v1.6.6 (Passo 0) era ignorado pelo agente — em pastas de cliente com espaços, o agente continuava reportando "arquivo `modelo/<palavra>.md` não existe", entrava em modo auditoria sozinho e duplicava regras. Correção em duas camadas:
  - **Agente:** nova **REGRA #0 — CAMINHO LITERAL** promovida para o topo absoluto do prompt (antes da arquitetura/missão), com exemplo concreto da armadilha (`ACS Advogados Associados`), exigência explícita de chamar `Read` antes de reportar erro, e desambiguação edição vs auditoria. Passo 0 do Fluxo de Trabalho agora apenas referencia a REGRA #0 (sem duplicação).
  - **Slash command `/ei-ajustes`:** agora pré-lê o conteúdo do arquivo no Passo 4 e o injeta inline (`<conteudo_atual>`) no prompt do agente, eliminando estruturalmente a ambiguidade. Prompt do agente passa a ter formato fixo: `TAREFA`, `ARQUIVO ALVO`, `INSTRUÇÃO`, `CONTEÚDO ATUAL`.

## [1.6.6] - 2026-05-01

- `docs-editor-conciso`: corrige falha em pastas de cliente com nomes contendo espaços (ex: `ACS Advogados Associados/Orquestrador.md`). O agente extraía a primeira palavra do nome e tentava abrir `modelo/<palavra>.md`, falhando com "arquivo não existe". Reforço aplicado em dois pontos:
  - **description**: explicita que edita tanto `modelo/*.md` quanto arquivos em pastas de cliente (inclusive com espaços) e proíbe prefixar com `modelo/`.
  - **Passo 0 do FLUXO**: instrução triplicada para copiar o caminho literal caractere por caractere, NUNCA prefixar com `modelo/`, NUNCA extrair palavras do nome do cliente.

## [1.6.5] - 2026-04-29

- `docs-editor-conciso`: Passo 0 obriga `Read` no caminho exato recebido no prompt antes de qualquer edição — impede o agente de adivinhar/reescrever caminhos quando o arquivo está fora de `modelo/`.
- `ei-ajustes`: passa caminho absoluto completo (ex: `/root/EiPrompt/malu/Qualifier.md`) ao `docs-editor-conciso`, eliminando ambiguidade que levava o editor a procurar em `modelo/`.

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
