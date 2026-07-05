# Phase 2: 3-Step Gated Client Scaffolding - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Refatorar a criação de cliente (`client-project-scaffolder`, hoje um único agente cobrindo Fase 3→4→4.5→5 numa tacada só) em 3 passos distintos, auditáveis e sequenciais — scaffold de pastas/arquivos, coleta de informações do cliente (incluindo mídias), e preenchimento de fato dos templates — com um **gate humano duro** entre a coleta e o preenchimento, mirrado no padrão já existente do `/ei-ajustes` Passo 3.5. Aplica-se aos dois modos existentes do scaffolder (`single-agent` e `multi-agente-especialidade-unica`). O `recepcionista-scaffolder` **não** faz parte deste escopo (ver Deferred).

</domain>

<decisions>
## Implementation Decisions

### Granularidade dos passos
- **D-01:** Os 3 passos viram **3 subagents dedicados** (não um único `client-project-scaffolder` parametrizado por `passo`). Confirmado com a documentação oficial de subagents da Claude Code (code.claude.com/docs/en/sub-agents), que recomenda explicitamente o padrão "chain subagents" para workflows multi-etapa e cita restrição de tools por etapa como motivo válido para separar agentes — aqui, o Passo 1 não precisa perguntar nada (I/O só de arquivo), o Passo 2 só coleta (não deveria escrever templates ainda), o Passo 3 escreve.
- **D-02 (Claude's discretion):** Nome exato dos 3 novos arquivos em `.claude/agents/` fica a critério do planner, seguindo a convenção kebab-case function-first já usada (`client-project-scaffolder.md`, `recepcionista-scaffolder.md`). Precisam ser adicionados a `manifest.json` (`files`) para distribuição via npx — mesma exigência já vista na Fase 1 para novos hooks.

### Escopo do split no modo multi-agente
- **D-03:** O split de 3 passos se aplica **por especialidade** — cada especialidade percorre o próprio ciclo Passo1→Passo2→gate→Passo3 completo antes de a próxima começar. Preserva o comportamento sequencial já documentado hoje no loop de `/ei-cria-cliente` Passo 4B.1(b) (não em paralelo, uma especialidade de cada vez, sem reaproveitar contexto entre iterações). Rejeitada a alternativa "agregada" (1 Passo 1 para todas as especialidades + Recepcionista, 1 Passo 2 para tudo, 1 gate único) por mudar demais a estrutura de loop atual do comando sem necessidade.
- **D-04:** O comando mantém o **resumo final consolidado** (árvore de pastas completa + pendências agregadas de todas as especialidades) ao final de todo o fluxo — além, não em vez, dos gates por especialidade. Espelha o Passo 5 já existente em `.claude/commands/ei-cria-cliente.md`.

### Recepcionista fora do escopo
- **D-05:** `recepcionista-scaffolder` **não** recebe o mesmo tratamento de 3 passos nesta fase. Decisão de Claude (usuário delegou): os requisitos SCAF-01 a SCAF-06 e o Core Value do PROJECT.md nomeiam explicitamente `client-project-scaffolder`, não `recepcionista-scaffolder` — expandir o escopo aqui seria scope creep sobre requisitos já travados no ROADMAP/REQUIREMENTS. Ver Deferred Ideas.

### UX do gate duro (Passo 2→3)
- **D-06:** O gate espelha **exatamente** o padrão do `/ei-ajustes` Passo 3.5 caminho [A]: uma única chamada `AskUserQuestion` com a `question` listando de forma resumida os campos coletados vs. pendentes (nos moldes da lista numerada `path → seção → justificativa` do [A]), e duas `options` fixas: `"Aprovar e preencher"` / `"Cancelar"`. Não usar o formato mais verboso de checklist campo-a-campo.
- **D-07:** Comportamento fail-closed idêntico ao `/ei-ajustes`: qualquer resposta que não seja explicitamente `"Aprovar e preencher"` — vazia, `answers={}`, `"Outro"` com texto livre, ou qualquer coisa ambígua — é tratada como Cancelar. O Passo 3 (preenchimento) NUNCA inicia sem essa confirmação inequívoca. Mesma regra do runtime/no-TTY do `/ei-ajustes` (headless/CI auto-resolve com `answers={}` → sempre cai no Cancelar).

### Claude's Discretion
- Nome exato dos 3 novos arquivos de subagent (D-02).
- Detalhes finos de implementação do fluxo interno de cada subagent (como exatamente o Passo 1 confirma que a estrutura foi criada antes de retornar controle ao comando, como o Passo 2 acumula os dados coletados para passar ao gate, etc.) — cabe ao planner definir com base nos padrões já estabelecidos em `client-project-scaffolder.md` e `.claude/commands/ei-ajustes.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e roadmap
- `.planning/ROADMAP.md` §"Phase 2: 3-Step Gated Client Scaffolding" — goal, success criteria, requirements SCAF-01..06.
- `.planning/REQUIREMENTS.md` §"Scaffolding de Cliente em 3 Passos" (SCAF-01 a SCAF-06) — requisitos travados desta fase.
- `.planning/PROJECT.md` — Core Value, Active requirements, Constraints (zero-dependency, manifest compatibility, não regredir `/ei-ajustes`).

### Padrão do gate duro a espelhar
- `.claude/commands/ei-ajustes.md` §"Passo 3.5: Aprovação humana via AskUserQuestion (gate-duro)" — padrão canônico de UX do gate (caminho [A]: `AskUserQuestion` com "Aprovar e editar"/"Cancelar", fail-closed em resposta vazia/ambígua/Outro).

### Estado atual a refatorar
- `.claude/agents/client-project-scaffolder.md` — agente único hoje cobrindo Fase 0→5 (contexto, modo, templates, criação de estrutura, coleta, coleta de mídia, atualização de arquivos); vira a base para os 3 novos subagents.
- `.claude/commands/ei-cria-cliente.md` — comando orquestrador; Passo 4A (single-agent) e Passo 4B.1(b) (loop multi-agente por especialidade) precisam ser reescritos para disparar os 3 novos subagents em sequência com o gate no meio, preservando Passo 5 (resumo final).
- `.claude/agents/recepcionista-scaffolder.md` — fora de escopo desta fase (D-05), mas fica como referência de como o padrão atual (1 agente, 1 tacada) se parece, caso uma fase futura decida aplicar o mesmo split aqui.

### Convenções de projeto
- `.claude/CLAUDE.md` (seção "Naming Patterns") / `.planning/codebase/CONVENTIONS.md` — kebab-case function-first para subagents; XML-tagged input/output contracts.
- `manifest.json` — novos arquivos de subagent precisam entrar em `files` para distribuição via npx.

### Referência externa
- https://code.claude.com/docs/en/sub-agents — confirma o padrão "chain subagents" para workflows multi-etapa e o racional de restrição de tools por etapa; base da decisão D-01.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client-project-scaffolder.md` já contém toda a lógica de negócio (leitura de templates, mapeamento de campos, marcação `[PENDENTE - informação não fornecida]`, padrão `{{variavel}}`) — os 3 novos subagents devem fatiar esse conteúdo existente por fase, não reescrever do zero.
- `.claude/commands/ei-ajustes.md` Passo 3.5 caminho [A] é o template literal a copiar para o novo gate (estrutura JSON do `AskUserQuestion`, texto de interpretação de resposta, nota sobre runtime/no-TTY).

### Established Patterns
- Subagents seguem contrato XML-tagged de entrada/saída (`<modo>`, `<nome_cliente>`, `<especialidade>` como entrada hoje) — os 3 novos subagents devem manter esse padrão, cada um provavelmente recebendo o output do anterior (ex: Passo 2 recebe confirmação de que Passo 1 rodou; Passo 3 recebe os dados coletados no Passo 2).
- Loop sequencial (não paralelo) por especialidade já existe em `ei-cria-cliente.md` Passo 4B.1(b) — o gate se insere DENTRO de cada iteração desse loop existente (D-03), não substitui a estrutura de loop.
- `post-scaffolder-review.sh` (hook `SubagentStop`) dispara after `client-project-scaffolder` hoje — precisa ser revisitado para decidir se dispara após CADA um dos 3 novos subagents ou só após o Passo 3 (preenchimento final), já que é o `docs-reviewer` quem audita o conteúdo final.

### Integration Points
- `manifest.json` `files[]` — 3 novas entradas para os subagents.
- `.claude/settings.json` `hooks.SubagentStop[]` — possível ajuste em `post-scaffolder-review.sh` (nome do subagent que dispara a revisão muda).

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual/UX específica além do padrão explícito de espelhar o `/ei-ajustes` Passo 3.5 (D-06/D-07) — este é o "I want it like X" central da discussão.

</specifics>

<deferred>
## Deferred Ideas

- **Aplicar o mesmo split de 3 passos + gate duro ao `recepcionista-scaffolder`** — fora do escopo da Fase 2 (requisitos SCAF-01..06 e o Core Value do PROJECT.md nomeiam só `client-project-scaffolder`). Candidato a fase futura se o mesmo problema de campos incompletos aparecer na criação da Recepcionista.

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-3-Step Gated Client Scaffolding*
*Context gathered: 2026-07-05*
