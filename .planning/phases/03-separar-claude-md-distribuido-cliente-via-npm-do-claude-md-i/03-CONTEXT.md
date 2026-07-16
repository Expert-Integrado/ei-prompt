# Phase 3: Separar CLAUDE.md distribuído (cliente via npm) do CLAUDE.md interno do repo - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Hoje `CLAUDE.md` na raiz do repo cumpre dupla função incompatível: (1) é o arquivo que `manifest.json` busca no GitHub e grava como `CLAUDE.md` na raiz de todo projeto-cliente instanciado via `npx @expertzinhointegrado/ei-prompt@latest` — conteúdo inteiramente voltado a como a IA do CLIENTE deve editar os agentes dele (Orquestrador, Qualifier, etc.); (2) é TAMBÉM automaticamente carregado por qualquer sessão Claude Code que trabalhe NESTE repo (incluindo esta), competindo com `.claude/CLAUDE.md` (doc interno já existente, gerado/mantido por convenção GSD com stack técnico, conventions, GSD Workflow Enforcement). Isso faz com que regras de cliente (ex: "modelo/ é read-only") apareçam incorretamente como regra para quem MANTÉM o ei-prompt — cujo trabalho é justamente editar `modelo/`.

Esta fase entrega a separação física real dessas duas audiências: um novo arquivo-fonte (`client/CLAUDE.md`) passa a ser a origem real do payload distribuído ao cliente, `manifest.json`/`bin/cli.js` ganham suporte a mapear um path de origem diferente do path de destino, e o `CLAUDE.md` raiz + `.claude/CLAUDE.md` deste repo passam a conter apenas regras de manutenção do próprio ei-prompt — sem nenhuma regra de cliente vazando para dentro.

**Fora do escopo desta fase:** definir/mudar o CONTEÚDO das regras de cliente ou das regras internas — é uma reorganização estrutural (onde cada regra mora), não uma revisão do que cada regra diz.

</domain>

<decisions>
## Implementation Decisions

### Mecanismo de separação
- **D-01:** Separação física real, não "self-aware" (não basta um aviso de texto no topo do CLAUDE.md raiz dizendo "ignore isso se você é maintainer"). Root `CLAUDE.md` e `.claude/CLAUDE.md` passam a conter só conteúdo interno; um arquivo novo é a fonte real do payload cliente.
- **D-02:** O arquivo-fonte do payload cliente é `client/CLAUDE.md` — pasta nova, isolada, sem mais nenhum arquivo dentro. Confirmado deliberadamente após pesquisa oficial (ver Canonical References) mostrar que Claude Code carrega `CLAUDE.md` de subpastas **sob demanda, sempre que qualquer agente lê um arquivo daquela subpasta** — colocar em `docs/` (mesmo com nome diferente) foi descartado porque `docs/` é lida o tempo todo pelos subagentes de edição (`docs-editor-conciso`, `docs-analyzer`), e o usuário preferiu isolamento físico total a só evitar o nome reservado.
- **D-03:** `manifest.json` ganha suporte a formato misto nas entradas de `files`: entradas normais continuam string simples (mesmo path pra fetch e write, como hoje); só a entrada do CLAUDE.md vira objeto `{"from": "client/CLAUDE.md", "to": "CLAUDE.md"}`. `bin/cli.js` deve normalizar internamente (string → `{from: x, to: x}`) e usar `from` em `fetchFile` / `to` em `writeFile`. As ~28 entradas restantes NÃO são convertidas para objeto — só a que precisa.
- **D-04:** `deprecated_files` não precisa do mesmo tratamento (só usa um path, para remoção local no cliente) — sem mudança de schema ali.

### Fronteira de conteúdo cliente vs. interno
- **D-05:** Todo o conteúdo atual do `CLAUDE.md` raiz migra **verbatim** para `client/CLAUDE.md`: Mapa de Regras, Arquitetura Padrão de Agentes, Arquitetura Multi-Agente (Recepcionista), tabela de Slash Commands, Regras Básicas, e a nota de versão v1.8.9 sobre `inject-ei-context.sh` desativado (essa nota É client-facing de fato — o hook é distribuído ao cliente via manifest, então a instrução de "leia manualmente" se aplica à sessão do cliente).
- **D-06:** ÚNICA exceção: a seção "Commits" (regra de não incluir assinatura "Generated with Claude Code"/"Co-Authored-By") NÃO migra para `client/CLAUDE.md` — é regra sobre como commitar mudanças NESTE repo (ei-prompt), não sobre o comportamento do bot do cliente. Essa seção sai do CLAUDE.md raiz e vira conteúdo interno (ver D-07).
- **D-07:** Após a migração, o `CLAUDE.md` raiz deste repo fica sem conteúdo próprio relevante para quem desenvolve ei-prompt — pesquisa/planejamento deve decidir se ele fica vazio/mínimo (ex: um ponteiro pro `.claude/CLAUDE.md`) ou se é removido, desde que `client/CLAUDE.md` seja a única fonte real do payload cliente.

### Destino do conteúdo interno
- **D-08:** `.claude/CLAUDE.md` **já contém** uma linha herdada em "Agent-Editing Conventions" citando a regra de commits e referenciando o `CLAUDE.md` raiz como fonte ("(explicit project rule in `CLAUDE.md` and `docs/proibido-fazer.md`)"). Não é necessário criar nenhum arquivo novo — só ajustar essa linha existente para não referenciar mais o `CLAUDE.md` raiz como fonte (já que a regra sai de lá), apontando só para `docs/proibido-fazer.md` ou removendo a referência cruzada. `.claude/CLAUDE.md` continua sendo o único doc interno do repo.

### Prevenção de regressão futura
- **D-09:** Usuário delegou o mecanismo ("you decide"). Decisão: checagem determinística leve, alinhada ao Core Value do milestone inteiro (ver PROJECT.md — "código sempre checa, não só regra em prompt", mesmo racional da Fase 1/XML Validation Hook). Este novo guard é **separado** do hook `validate-xml-casca.sh`/`.js` já existente — aquele hook é distribuído ao cliente via manifest e valida arquivos de AGENTE do cliente (audiência/escopo diferente). O novo guard é **repo-local-only** (NÃO entra em `manifest.json`, não é distribuído): dispara em `Stop`/`SubagentStop` quando `CLAUDE.md` raiz ou `.claude/CLAUDE.md` deste repo são tocados no turno, e avisa/bloqueia se o diff introduzir padrões típicos de regra-de-cliente (ex: menção a "modelo/ é read-only", tabela de Slash Commands, tags `<agente>`) fora de `client/CLAUDE.md`.
- **D-10:** O wiring exato do guard (regex de detecção, se reaproveita infraestrutura de sentinela existente, onde registrar em `.claude/settings.json`) fica para research/planning — é detalhe de implementação, não decisão de produto.

### Claude's Discretion
- Formato final do `CLAUDE.md` raiz pós-migração (vazio/mínimo vs. removido) — D-07.
- Wiring exato do guard de prevenção de regressão (D-09/D-10) — regex, reaproveitamento de infra de sentinela, registro em settings.json.
- Texto exato da linha ajustada em `.claude/CLAUDE.md` (D-08).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto de produto/repo
- `.planning/PROJECT.md` — Core Value do milestone ("validação de código, não só regra em prompt"), Constraints (zero deps novas, compatibilidade com manifest)
- `.planning/ROADMAP.md` §Phase 3 — título e goal ainda `[To be planned]`, único ponto onde a fase é mencionada antes desta discussão
- `docs/proibido-fazer.md` — hoje documenta a regra "modelo/ é read-only"; após a separação, essa regra deve existir SÓ em `client/CLAUDE.md` (ou em outro doc client-facing), nunca em `.claude/CLAUDE.md`
- `manifest.json` — schema atual de `files`/`deprecated_files` (array de strings simples) que D-03 estende
- `bin/cli.js` (`fetchFile` linha 23, `writeFile` linha 32) — hoje usa o MESMO `relPath` pra fetch e write; é o ponto exato que precisa suportar `{from, to}`

### Pesquisa oficial (consultada ao vivo durante a discussão, a pedido do usuário)
- https://code.claude.com/docs/en/memory — confirma que (1) Claude Code NÃO tem mecanismo nativo para separar CLAUDE.md por audiência; `./CLAUDE.md` e `./.claude/CLAUDE.md` carregam juntos, mesmo escopo "Project instructions"; (2) CLAUDE.md em subpastas carrega **sob demanda** quando qualquer arquivo daquela subpasta é lido (não só no launch) — motivo direto da escolha de `client/CLAUDE.md` (pasta isolada) em vez de `docs/CLAUDE-CLIENTE.md`; (3) só o nome de arquivo exato `CLAUDE.md`/`CLAUDE.local.md` dispara autoload, qualquer outro nome é inerte

### Sem specs/ADRs formais
Não existe SPEC.md para esta fase (nenhum encontrado por `check_spec`). Os requisitos formais (traceability em `.planning/REQUIREMENTS.md`) ainda não existem para a Fase 3 — pesquisa/planejamento deve propor os requisitos v1 correspondentes com base nas decisões acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.claude/hooks/post-ajustes-fanout.sh` e `.claude/hooks/post-scaffolder-review.sh` — padrão de guard `set -uo pipefail` + `stop_hook_active` anti-loop já estabelecido; o novo guard repo-local (D-09) deve seguir o mesmo padrão de registro em `.claude/settings.json`, mas SEM entrar em `manifest.json` (diferença crítica: esses dois hooks SÃO distribuídos, o novo NÃO deve ser).
- `.claude/hooks/validate-xml-casca.sh`/`.js` — exemplo concreto de "hook determinístico substitui checklist manual", mesmo racional a aplicar aqui, mas como guard separado (D-09).

### Established Patterns
- `docs/` já é 100% payload cliente (regras-edicao.md, regras-validacao.md, proibido-fazer.md, multi-agente-recepcionista.md, todos em `manifest.json`) — mas NÃO é onde o novo `client/CLAUDE.md` deve morar, por causa do autoload sob-demanda (D-02).
- Padrão de "Onde adicionar código novo" em `.planning/codebase/STRUCTURE.md` já teria uma entrada pra "novo arquivo shippado" — atualizar essa doc depois que `client/` existir (não obrigatório nesta fase, mas útil).

### Integration Points
- `bin/cli.js:93-102` (loop `for (const file of manifest.files)`) — ponto que precisa normalizar entradas string vs. objeto antes de chamar `fetchFile`/`writeFile`.
- `bin/cli.js:114-128` (`help()`) — usa `manifest.files.map(f => ...)` assumindo string; precisa lidar com entradas objeto ao exibir `--help` (usar `.to` ou `.from` para exibição, decisão de implementação).

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual ou de exemplo específico foi trazida pelo usuário — a discussão foi inteiramente sobre arquitetura/estrutura de arquivos.

</specifics>

<deferred>
## Deferred Ideas

Nenhuma — discussão ficou inteiramente dentro do escopo da fase. Nenhum todo pendente teve match com esta fase (`todo.match-phase` retornou vazio).

</deferred>

---

*Phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i*
*Context gathered: 2026-07-06*
