# Changelog

## [2.0.6] - 2026-06-19

**Casca XML `<agente>` nos prompts — raiz única para validação automatizada.** Todos os 6 templates de `modelo/` passam a ser envolvidos numa casca XML com raiz única (`<agente>`), tornando os prompts byte-compatíveis com o Prompt Builder da SuperSDR. A casca inclui declaração XML, namespace, versão de layout e `tipo` do agente (mapa fixo em inglês, igual ao `PromptType` do builder). O conteúdo interno (tags como `<objetivo>`, `<fluxo_de_conversa>`, separadores `---`) permanece intacto, sem escaping nem CDATA. A operação é idempotente: ao re-gerar um prompt com casca existente, a casca antiga é removida antes de reaplicar.

- **`modelo/Orquestrador.md`**: casca `tipo="orchestrator"`. Boilerplate corrigido: regra #11 (`<>`) reescrita como "sinais de menor/maior", ref a `` `<conhecimento>` `` e `` `<regras_agendamento>` `` trocadas por nome em crases.
- **`modelo/Qualifier.md`**: casca `tipo="qualifier"`. Boilerplate já estava limpo.
- **`modelo/Protractor.md`**: casca `tipo="protractor"`. Boilerplate corrigido: comentário `////` com `<objetivo>` e `<response_format>` trocados por nome em crases.
- **`modelo/Scheduler.md`**: casca `tipo="scheduler"`. Boilerplate já estava limpo.
- **`modelo/Follow-Up.md`**: casca `tipo="followup"`. Boilerplate já estava limpo.
- **`modelo/Recepcionista.md`**: casca `tipo="orchestrator"` + `origem="recepcionista"` (materializa como `Orquestrador.md` do stack router). Boilerplate corrigido: 10 refs inline a tags (`` `<agentes_disponiveis>` ``, `` `<fluxo_conversa>` ``, `` `<regras_recepcao>` ``, `` `<fluxo_recepcao>` ``, `` `<regras_gerais>` ``) trocadas por nome em crases; regra #6 (`<>`) reescrita como "sinais de menor/maior".
- **`docs/regras-edicao.md`**: nova seção "Casca XML" com especificação completa (formato exato, tabela de atributos, mapa de `tipo`, regras invioláveis de raiz única / conteúdo intacto / idempotência / parse de legado, e regra de boilerplate sem `<`/`&` crus).
- **`docs/regras-validacao.md`**: novo checklist de validação da casca + como rodar (`xmllint --noout`) + ponto cego documentado: campos VARIÁVEIS do cliente com `<` ou `&` crus quebram a validação naquele prompt — esperado e aceito; **não** introduzir escaping/CDATA.
- **`package.json`**: version `2.0.5` → `2.0.6`.
- **Compat:** alteração de template. Clientes já gerados sem a casca continuam válidos (legado aceito). A casca passa a ser aplicada nos clientes criados/ajustados a partir desta versão.

## [2.0.5] - 2026-06-18

**Estrutura o `<fluxo_de_conversa>` do Orquestrador em ETAPAS numeradas.** O template do Orquestrador deixa de carregar o placeholder genérico `[FLUXO_DE_CONVERSA]` e passa a trazer um esqueleto fixo de etapas — `## ETAPA 1: Abertura`, `## ETAPA 2: Qualificação`, `## ETAPA 3: Pós-Qualificação` (com os 3 ramos `qualificado` / `desqualificado` / `informacoes_insuficientes`) e `## ETAPA 4: Agendamento` (opcional). Ao gerar/editar um cliente, preenche-se apenas os `[PLACEHOLDERS]` em prosa, preservando títulos, rótulos (`**Mensagem Inicial:**`, `**Perfil do Lead:**`, `**Mensagem:**`, `**Ação:**`) e marcadores `>> AÇÃO:`. A transferência/encerramento é sempre ação de uma etapa existente — não existe "etapa de transferência final".

- **`modelo/Orquestrador.md`:** placeholder `[FLUXO_DE_CONVERSA]` substituído pelo esqueleto de ETAPAS; tag `<fluxo_conversa>` renomeada para `<fluxo_de_conversa>`.
- **`docs/regras-edicao.md`:** nova seção documentando a estrutura padrão do `<fluxo_de_conversa>` (cabeçalho fixo, etapas, regra de quando existe/não existe a ETAPA 4, não duplicar detalhes operacionais no fluxo).
- **`docs/regras-validacao.md`:** novo checklist de validação do `<fluxo_de_conversa>` (etapas numeradas, rótulos preservados, 3 ramos na ETAPA 3, ausência de "etapa de transferência final").
- **`.claude/agents/client-project-scaffolder.md`:** instrução para preservar títulos/rótulos/marcadores das ETAPAS e remover a ETAPA 4 quando o atendimento não agenda.
- **`package.json`:** version `2.0.4` → `2.0.5`.
- **Compat:** alteração de template + docs. Clientes já gerados não são afetados; a nova estrutura passa a valer para clientes criados/ajustados a partir desta versão.

## [2.0.4] - 2026-05-28

**Documenta regra de personificação pós-transferência no fluxo multi-agente do Recepcionista.** Após o Recepcionista acionar Protractor com `TRANSFERIR_PARA_AGENT:[especialista]`, **quem envia a primeira mensagem ao lead em nome do especialista é o próprio Recepcionista** — personificando o especialista no MESMO turno da transferência, sem informar ao lead que houve mudança de agente. Somente a próxima mensagem do lead em diante é roteada de fato para o agente especialista. Esta regra existia apenas implicitamente no `mensagem_inicial_sugerida` do Protractor; agora é regra de projeto explícita, com lugar definido (Orquestrador do Recepcionista, NÃO do especialista) e roteamento determinístico no `docs-analyzer` para pedidos do tipo "o agente X precisa se apresentar após a transferência".

- **`docs/multi-agente-recepcionista.md`:** novo arquivo de regras. Documenta o porquê (continuidade visual da conversa — evita "salto" de interlocutor durante o delay de roteamento backend), como aplicar (mensagem inicial de personificação por especialista mora em `<cliente>/Recepcionista/Orquestrador.md`), sinais proibidos no chat ("vou te transferir", "aguarde", "olá, sou o especialista X recebi seu caso") vs aceitos (mensagem direta no tom do especialista), e como o `/ei-ajustes` deve tratar pedidos sobre isso.
- **`CLAUDE.md`:** nova entrada no "Mapa de Regras" apontando para `docs/multi-agente-recepcionista.md`. Correção da seção "Fluxo" da Arquitetura Multi-Agente — passo 3 agora reflete a personificação ("No MESMO turno, o Recepcionista envia a mensagem inicial personificando o especialista") e passo 4 explicita que só a próxima mensagem do lead vai de fato para a especialidade.
- **`.claude/agents/docs-analyzer.md`:** Passo 0 (carregar regras) ganha `docs/multi-agente-recepcionista.md` na lista obrigatória. Bloco `<conhecimento_dos_papeis>` do `Recepcionista/Orquestrador.md` ganha sub-bullet "Particularidade — personificação pós-transferência" + lista de 5 frases-gatilho do usuário que devem rotear para o Orquestrador do Recepcionista (NÃO para o especialista). Adicionado Exemplo 3 (alta confiança) em `<exemplos>` com saída esperada do schema XML.
- **`manifest.json`:** adicionada entrada `docs/multi-agente-recepcionista.md` em `files` (na ordem alfabética junto com os outros `docs/*`) para que o `npx @expertzinhointegrado/ei-prompt@latest` baixe o novo doc nas máquinas dos usuários.
- **`package.json`:** version `2.0.3` → `2.0.4`.
- **Compat:** zero impacto runtime — alteração é doc-only + injeção de conhecimento no `docs-analyzer`. Não muda lógica de hook, fluxo de comandos, schema de resposta dos agentes ou template em `modelo/`. Clientes multi-agente existentes seguem funcionando — a regra só entra em jogo quando o usuário pedir ajuste sobre a mensagem inicial pós-transferência via `/ei-ajustes`.

## [2.0.3] - 2026-05-27

**Fix doc-only no pipeline `/ei-ajustes`: emissão inline de `<ei-ajustes-round-consumed>` no caminho fallback puro.** Quando o `/ei-ajustes` roda Passos 5→6 (sentinela + dispatch de editores + bloco pós-Tasks + dispatch de reviewers + Apresentação final) num único turno SEM nunca receber `reason` do hook `post-ajustes-fanout.sh`, o sentinela ficava ATIVO no transcript sem `consumed` correspondente — o hook varria no evento `Stop` e injetava `decision:block + reason` retroativamente no próximo turno, gerando um "Stop hook blocking error" cosmético + 1 turno extra desnecessário só para fechar o ciclo (observado em produção 2026-05-27). Esta versão adiciona a regra **HOOK-02b** no Passo 6 da documentação, instruindo emissão de `<ei-ajustes-round-consumed id="<ROUND_ID>"/>` em UMA linha de texto livre **imediatamente antes do bloco de Apresentação final** quando rodar fallback puro num único turno. Lógica do hook permanece intocada (idempotência via `grep -qF` em [post-ajustes-fanout.sh:63] + anti-loop `stop_hook_active` já cobriam o race teórico — HOOK-02b apenas evita o disparo retroativo cosmético).

- **`.claude/commands/ei-ajustes.md`:** novo bullet **HOOK-02b** no bloco "Instrução de trigger do hook (HOOK-02 — fallback é o ESTADO PADRÃO)" do Passo 6, entre o bullet "Se você NÃO recebeu reason do hook" e a REGRA INVIOLÁVEL HOOK-02. O bullet HOOK-02b cobre o cenário "fallback puro num único turno", instrui emissão inline de `consumed` antes da Apresentação final, e explicita que a emissão é idempotente (segura mesmo em race teórico hook+consumed simultâneos).
- **`package.json`:** version `2.0.2` → `2.0.3`.
- **Compat:** zero impacto runtime — fix é doc-only. Lógica do hook `post-ajustes-fanout.sh`, fluxo do `/ei-ajustes`, e protocolo sentinela↔consumed permanecem inalterados. Execuções existentes do `/ei-ajustes` que rodaram com o "Stop hook blocking error" cosmético continuam funcionalmente corretas — apenas o turno extra deixa de ocorrer em execuções futuras.

## [2.0.0] - 2026-05-25

**Marco maior: pipeline `/ei-ajustes` evolui para arquitetura multi-agente com levantamento prévio de requisitos.** A operação de ajuste e auditoria de prompts passa a ser conduzida por um conjunto coordenado de subagentes especializados, despachados em paralelo, em vez de um único editor sequencial. Antes de qualquer alteração, um **levantador de requisitos** (subagente `docs-analyzer`) analisa a solicitação em linguagem natural contra os arquivos do cliente, valida o escopo e determina qual é a forma correta de aplicar a mudança — identificando arquivo(s) e seção(ões) alvo, ou solicitando esclarecimento quando a intenção é ambígua. A recomendação passa por um **gate de aprovação humana explícita** (`AskUserQuestion`) antes que qualquer edição seja executada. Aprovada a alteração, um **fan-out paralelo de editores** (`docs-editor-conciso`) aplica as mudanças simultaneamente nos N arquivos envolvidos, seguido de uma **revisão paralela cross-context** (`docs-reviewer`), em que cada auditor recebe o contexto cruzado dos arquivos irmãos da mesma rodada. A transição entre fases é automatizada via hook `Stop` (`post-ajustes-fanout.sh`), com protocolo sentinela idempotente e fallback manual garantido. Em complemento, esta versão completa a descontinuação dos slash commands de mantenedor (`/ei-edit`, `/ei-review`, `/ei-ctx`): v1.9.0 já os havia removido da distribuição npm via `manifest.files` e introduzido `deprecated_files` para cleanup proativo nas máquinas dos usuários; em v2.0.0 a remoção é definitiva — os arquivos saem do repo source e o array `deprecated_files` é retirado do manifest (cleanup já consolidado). A auditoria de templates passa a ser operação manual do mantenedor dentro do clone, e o pipeline automatizado de cliente roda exclusivamente via `/ei-ajustes`.

- **`.claude/commands/ei-edit.md`, `ei-review.md`, `ei-ctx.md`:** deletados via `git rm` (não existem mais nem no source).
- **`manifest.json`:** array `deprecated_files` removido. v1.9.0 já fez a limpeza em máquinas existentes; cleanup loop em `bin/cli.js` simplesmente no-op se o campo estiver ausente (Array.isArray guard preserva compat).
- **`CLAUDE.md`:** removida a nota "Comandos internos (mantenedor)"; warning de `/ei-ctx` desativado também sai (só hook `inject-ei-context.sh` permanece mencionado como em manutenção). Hook `post-scaffolder-review.sh` perde menção a `/ei-edit legado`.
- **`COMANDOS.md`:** rewrite — removidas as seções `/ei-edit`, `/ei-review`, `/ei-ctx` inteiras e o índice "Comandos internos". Só os 3 públicos (`/ei-cria-cliente`, `/ei-ajustes`, `/ei-update`) + tabela de hooks + agentes.
- **`README.md`:** linha de slash commands não menciona mais os internos.
- **`docs/proibido-fazer.md`:** regra `modelo/ read-only` reescrita sem referenciar `/ei-edit` / `/ei-review`. Edição de templates passa a ser "operação manual do mantenedor no clone do repo source".
- **`.claude/agents/docs-reviewer.md`:** removida seção "SLASH COMMANDS RELACIONADOS"; mensagens de output não sugerem mais `/ei-review` / `/ei-edit`.
- **`.claude/agents/docs-editor-conciso.md`:** removida seção "SLASH COMMANDS RELACIONADOS"; mensagens não sugerem mais slash commands específicos.
- **`.claude/commands/ei-ajustes.md`:** mensagem pós-edit (linha 333) não menciona mais `/ei-review`; nota Phase 4 (linha 483) atualizada; regra "NUNCA aplique em `modelo/`" reescrita sem referência a `/ei-edit`.
- **Compat:** zero impacto em usuários finais — esses comandos já não eram distribuídos desde v1.9.0. Usuários que ainda tiverem os arquivos legados em suas máquinas devem rodar `npx @expertzinhointegrado/ei-prompt@1.9.0` UMA VEZ antes de migrar para v1.9.1+ (v1.9.0 ainda executa o cleanup).

## [1.9.0] - 2026-05-25

**Distribuição completa do pipeline novo `/ei-ajustes` (analyzer + parallel editors/reviewers + hook automático) + split público/interno dos slash commands + cleanup proativo de comandos legados.** Comandos de mantenedor (`/ei-edit`, `/ei-review`, `/ei-ctx`) deixam de ser distribuídos via `npx ei-prompt` — saem do `manifest.json`. Permanecem no repo source (intocados) e seguem invocáveis pelo mantenedor operando dentro do clone do repositório. Usuários finais agora veem na paleta apenas `/ei-cria-cliente`, `/ei-ajustes` e `/ei-update`. **`/ei-ajustes` ganha pipeline novo end-to-end:** subagente `docs-analyzer` identifica arquivo+seção, gate de aprovação `AskUserQuestion`, fan-out paralelo de editores (`docs-editor-conciso`), revisão paralela cross-context (`docs-reviewer`) e transição editor→reviewer via hook `Stop` (`post-ajustes-fanout.sh`).

- **`manifest.json`:** removidas 3 entradas de `files` (`.claude/commands/ei-edit.md`, `ei-review.md`, `ei-ctx.md`). Adicionadas 2 entradas novas: `.claude/agents/docs-analyzer.md` (subagente do Passo 3 do `/ei-ajustes`) e `.claude/hooks/post-ajustes-fanout.sh` (hook `Stop` que automatiza a transição editor→reviewer no Passo 5/6). Sem esses dois paths, o `settings.json` (já distribuído) referenciaria arquivos ausentes na máquina do usuário, quebrando o pipeline. Novo campo aditivo `deprecated_files` lista os 3 paths removidos para cleanup proativo. Schema mantém compat com CLIs anteriores (campo novo é ignorado pelo cli.js antigo).
- **`bin/cli.js`:** nova função `removeFile(relPath)` (paralela a `writeFile`) faz `fs.unlinkSync` em paths declarados em `manifest.deprecated_files`, antes do loop principal de download. Fail-soft em erro (warning + continue, nunca aborta). Resumo final ganha contador `removidos`. Zero nova dependência (mantém constraint zero-deps).
- **`CLAUDE.md`:** tabela "Slash Commands" reduzida aos 3 públicos + nota "Comandos internos (mantenedor)" com link para `COMANDOS.md`.
- **`COMANDOS.md`:** novo índice no topo separando "Comandos públicos" de "Comandos internos (mantenedor)". Seções detalhadas dos comandos internos ganham callout explícito ("Comando interno (mantenedor). Não distribuído via `npx ei-prompt`...") sem perder a referência completa para o mantenedor.
- **`README.md`:** linha de slash commands aponta só os públicos e menciona explicitamente que comandos de mantenedor não são distribuídos.
- **Compat:** sintaxe `/ei-ajustes <cliente> <descrição>` e `/ei-ajustes "<cliente> <especialidade>" <descrição>` inalteradas. Clientes legados (`malu/`, `Brunno Brandi/Consumidor/`) passam pelo novo fluxo sem migração manual.

## [1.8.9] - 2026-05-23

**Sistema de injeção automática de contexto desativado para manutenção.** O hook `inject-ei-context.sh`, o slash command `/ei-ctx` e todas as chamadas explícitas em commands/agents foram neutralizadas. Carregamento de contexto agora é manual via `Read` até a manutenção ser concluída.

- **`.claude/settings.json`:** removidos os blocos `SessionStart`, `UserPromptSubmit` e `PreToolUse` (Edit/Write em `modelo/*.md`) que chamavam `inject-ei-context.sh` / `prompt-matches-agent.sh`. Apenas `SubagentStop` (auditoria pós-scaffolder) permanece ativo. Histórico preservado em git para fácil restauração.
- **`/ei-ctx`:** marcado como DESATIVADO no frontmatter e no corpo do arquivo — agora apenas orienta o usuário a carregar `CLAUDE.md` + `docs/*` manualmente via `Read`.
- **`/ei-cria-cliente`, `/ei-ajustes`, `/ei-review`:** Passo de carregamento de contexto reescrito — em vez de invocar o hook via Bash, instrui leitura manual de `CLAUDE.md` + `docs/regras-edicao.md` + `docs/regras-validacao.md` + `docs/proibido-fazer.md`.
- **`docs-editor-conciso`, `docs-reviewer`, `client-project-scaffolder`:** Passo 0 / Fase 0 não chama mais o hook — instrui Read manual dos mesmos arquivos.
- **`CLAUDE.md`, `README.md`, `COMANDOS.md`:** banners de aviso indicando o status `[DESATIVADO em v1.8.9 — em manutenção]` em todas as referências ao sistema de injeção automática.
- **Arquivos `inject-ei-context.sh` e `prompt-matches-agent.sh` preservados no disco** — não invocados, mas prontos para reativação restaurando os blocos de hooks no `settings.json`.

## [1.8.8] - 2026-05-18

**Injeção seletiva de contexto por agente.** O hook `inject-ei-context.sh` agora aceita um modo (`editor`, `reviewer` ou padrão) e injeta apenas os `docs/` relevantes para o consumidor — reduzindo ruído no contexto dos subagents e mantendo `docs/proibido-fazer.md` sempre presente como guarda-corpo universal.

- **`.claude/hooks/inject-ei-context.sh`:** novo argumento de modo. `editor` → `CLAUDE.md` + `docs/regras-edicao.md` + `docs/proibido-fazer.md`; `reviewer` → `CLAUDE.md` + `docs/regras-validacao.md` + `docs/proibido-fazer.md`; sem argumento (`full`) → todos os docs + lista de `modelo/*.md` (comportamento atual preservado para `SessionStart`/`UserPromptSubmit`/`PreToolUse`).
- **`/ei-ctx`** aceita argumento opcional (`editor` | `reviewer`) e repassa ao hook via `$ARGUMENTS`.
- **`docs-editor-conciso`** ganha Passo 0 obrigatório: roda o hook em modo `editor` antes de qualquer edição.
- **`docs-reviewer`** atualizado: Passo 0 agora roda o hook em modo `reviewer` (antes carregava o conjunto completo).

## [1.8.7] - 2026-05-18

**Fracionamento do `CLAUDE.md` em `docs/`.** O índice agora mora no `CLAUDE.md` (enxuto: arquitetura, comandos, regras básicas) e as regras detalhadas foram movidas para 3 arquivos especializados em `docs/`. O hook `inject-ei-context.sh` injeta os 3 arquivos automaticamente, garantindo que agentes (editor, reviewer) sempre vejam o conjunto completo.

- **`CLAUDE.md` reduzido a índice** — mantém Commits, Arquitetura de Agentes (single + multi), Slash Commands, Regras Básicas e mapa de regras.
- **`docs/regras-edicao.md`** — princípios de concisão, estrutura padrão de prompts, padrões de economia, formato de resposta, ações no campo `resume`, Base de Conhecimento e Envio de Mídia.
- **`docs/regras-validacao.md`** — checklists pós-edição (pré-commit, ações no `resume`, base de conhecimento, arquitetura) e auditoria automática.
- **`docs/proibido-fazer.md`** — limites duros: `modelo/` read-only, o que NÃO pode ser ajustado via prompts, o que NÃO entra em `<conhecimento>`, o que NÃO pode em edições/commits.
- **`.claude/hooks/inject-ei-context.sh`** atualizado para injetar os 3 arquivos de `docs/` após o `CLAUDE.md`.
- **`manifest.json`** inclui os novos arquivos de `docs/` — `/ei-update` baixa o conjunto completo para clientes existentes.

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
