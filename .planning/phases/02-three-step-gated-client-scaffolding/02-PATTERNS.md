# Phase 2: 3-Step Gated Client Scaffolding - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 6 (3 new subagents, 1 rewritten command, 1 hook update, 1 manifest update)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.claude/agents/client-scaffold-structure.md` (Passo 1, name TBD by planner per D-02) | subagent (file-I/O only, no data collection) | file-I/O (mkdir/cp) | `.claude/agents/client-project-scaffolder.md` (Fase 3 sections only) | role-match (subset slice of monolith) |
| `.claude/agents/client-scaffold-collect.md` (Passo 2) | subagent (read-only conversational collector) | request-response (interactive Q&A, no writes) | `.claude/agents/docs-analyzer.md` (read-only XML-output contract pattern) + `client-project-scaffolder.md` (Fase 4/4.5 content to slice) | exact (analyzer's read-only/XML-output shape) + role-match (source content) |
| `.claude/agents/client-scaffold-fill.md` (Passo 3) | subagent (template writer) | CRUD (Edit/Write existing files) | `.claude/agents/client-project-scaffolder.md` (Fase 5 + "PADRÃO DE VARIÁVEIS DINÂMICAS" sections) | exact (same write behavior, narrower scope) |
| `.claude/commands/ei-cria-cliente.md` (rewritten Passo 4A/4B.1(b)) | command (orchestrator, contains the hard gate) | request-response (dispatches subagents + AskUserQuestion gate) | `.claude/commands/ei-ajustes.md` (Passo 3.5 gate + Passo 5 fan-out dispatch pattern) | exact (D-06 requires mirroring this literally) |
| `.claude/hooks/post-scaffolder-review.sh` (retarget case branch) | shell hook (SubagentStop) | event-driven (transcript-triggered) | itself — existing `client-project-scaffolder)` branch is the analog for the new `client-scaffold-fill)` branch | exact (same file, same hook, just retarget string + drop pause-guard per A2) |
| `manifest.json` (add 3 subagent paths, deprecate old one) | config | CRUD (declarative file list) | `manifest.json` itself — precedent of `ei-edit.md`/`ei-review.md`/`ei-ctx.md` moving to `deprecated_files[]` | exact |

## Pattern Assignments

### `.claude/agents/client-scaffold-structure.md` (subagent, file-I/O)

**Analog:** `.claude/agents/client-project-scaffolder.md` (Fase 0, Fase 1, Fase 3 single + Fase 3 multi sections, lines 9-48)

**Frontmatter pattern** (lines 1-7 of analog):
```yaml
---
name: client-project-scaffolder
description: Use this agent when the user wants to create a new client project ...
tools: Bash, Glob, Grep, Read, Edit, Write, NotebookEdit, TodoWrite, mcp__ide__executeCode
model: opus
color: pink
---
```
For `client-scaffold-structure`, narrow `tools:` to only what Fase 3 needs (`Bash, Glob, Read` — mkdir/cp + Read to load templates; explicitly no `Edit`/`Write` of content, since D-01/Pattern 1 requires structural (not just prompt) enforcement that this step asks zero questions and never customizes content).

**Fase 0 "carregar contexto" pattern to reuse verbatim** (lines 13-20):
```
> Injeção automática desativada em v1.8.9 (manutenção). Carregue manualmente via Read/Glob.
1. Leia `CLAUDE.md` integralmente via Read tool ...
2. Leia `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`.
3. Liste `modelo/` via Glob e leia CADA arquivo `.md` da pasta via Read tool.
4. Só avance para a Fase 1 após confirmar que tem o conteúdo completo ...
```

**Core structure-creation pattern (single-agent + multi)** (lines 35-48):
```
### Fase 3 (single-agent): Criação da Estrutura
1. Crie a pasta do cliente na raiz do projeto (ex: `/maria`, `/joao`).
2. Copie os templates de agente (...) de `modelo/` para a pasta do cliente.
3. Mantenha a estrutura original dos templates.

### Fase 3 (multi-agente-especialidade-unica): Criação de UMA Subpasta
1. Garanta a raiz com `mkdir -p "<nome_cliente>/<especialidade>"` (idempotente...).
2. Copie para `<nome_cliente>/<especialidade>/`: Orquestrador.md, Qualifier.md, Scheduler.md,
   Protractor.md (com TRANSFERIR_PARA_AGENT ativo), Follow-Up.md.
3. **NÃO** criar outras especialidades — só a recebida no parâmetro `especialidade`.
```
Return contract: mirror the "returns: estrutura criada em `<path>`, arquivos: [...]" shape described in RESEARCH.md's architecture diagram — plain text confirmation, no XML needed since this step has no data to hand off besides the path.

**No error-handling / validation section needed** — this step is pure deterministic file copy, same as its analog (no try/catch convention exists in these markdown "subagents"; errors surface as the agent narrating a failed Bash command).

---

### `.claude/agents/client-scaffold-collect.md` (subagent, read-only conversational collector)

**Analog 1 (read-only + structured-XML-output contract):** `.claude/agents/docs-analyzer.md`

**Frontmatter/tools pattern** (lines 10-12):
```yaml
model: opus
tools: Read, Glob, Grep
color: blue
```
Apply the same restriction philosophy: `client-scaffold-collect` gets `Read, Glob, Grep, TodoWrite` — explicitly **no Write/Edit/Bash** (per RESEARCH.md Pattern 1), so it is structurally incapable of filling templates even if induced to.

**Structured XML output-contract pattern to imitate** (lines 68-109, `<formato_resposta>` block) — same shape/spirit but adapted to RESEARCH.md's Pattern 3 contract:
```xml
<dados_coletados>
  <campo nome="nome_cliente" valor="Maria Silva" pendente="false"/>
  <campo nome="cnpj" valor="" pendente="true"/>
  <midias>
    <midia nome="Apresentação institucional" gatilho="quando pedir detalhes"
           mediaUrl="[PENDENTE - link do Banco de Mídia]" mediaType="file"/>
  </midias>
</dados_coletados>
```
(This exact block is given in RESEARCH.md "Pattern 3" — copy it near-verbatim as the subagent's `<formato_resposta>` schema, following `docs-analyzer.md`'s convention of declaring a strict schema block with a "Regras do schema" subsection below it.)

**Analog 2 (source content to slice, business logic of what/how to ask):** `.claude/agents/client-project-scaffolder.md` Fase 4 + Fase 4.5 (lines 50-67):
```
### Fase 4: Coleta de Dados
1. Para cada campo obrigatório identificado nos templates:
   - Pergunte ao usuário o valor.
   - Se o usuário disser que NÃO TEM: marque explicitamente como `[PENDENTE - informação não fornecida]`.
2. Não prossiga para atualização até ter perguntado sobre TODOS os campos.
3. Em modo multi-agente-especialidade-unica: colete dados só dessa especialidade ...

### Fase 4.5: Coleta de Mídias (obrigatório perguntar)
1. Pergunte: "Tem alguma mídia (imagem, vídeo, PDF) para o agente enviar ao lead?"
2. Se sim, para cada mídia colete: Nome/descrição curta, Gatilho, mediaUrl, mediaType
3. Se o usuário não tiver o link ainda ... marque como [PENDENTE - link do Banco de Mídia]
4. Se não houver mídia, apenas registre e siga.
```
Carry these rules into the new subagent's body nearly verbatim (SCAF-03 requirement) — this subagent must NOT proceed to any write action; it only returns the `<dados_coletados>` block above when done.

**"PASSO 0 — CARREGAR REGRAS" pattern to reuse** (docs-analyzer.md lines 15-23) — same Read-first discipline before collecting, adapted to load `modelo/*.md` (to know which fields exist) instead of client files.

**No error-handling section** — collection subagent has no failure mode beyond "user hasn't answered yet"; the loop is the Q&A itself, not exception handling.

---

### `.claude/agents/client-scaffold-fill.md` (subagent, template writer)

**Analog:** `.claude/agents/client-project-scaffolder.md` Fase 5 + "PADRÃO DE VARIÁVEIS DINÂMICAS" (lines 69-98)

**Frontmatter pattern:** same `tools:` as the monolith but scoped down — `Read, Edit, Write, NotebookEdit` (drop `Bash`/`Glob`/`Grep`/`TodoWrite` — Passo 3 receives the file path and data already, it doesn't need to search/copy, only read-then-edit the files Passo 1 already created).

**Core fill pattern** (lines 69-73):
```
### Fase 5: Atualização dos Arquivos
1. Atualize cada arquivo na pasta do cliente com os dados coletados.
2. Campos sem informação devem ficar claramente marcados como pendentes.
3. Confirme ao usuário quais arquivos foram atualizados.
4. Encerre retornando o controle. Sua tarefa termina aqui ...
```

**Variable-preservation rule (SCAF-06), copy verbatim** (lines 86-98):
```
## PADRÃO DE VARIÁVEIS DINÂMICAS
Ao criar arquivos .md, use chaves duplas para variáveis dinâmicas:
| Errado | Correto |
|--------|---------|
| `[NOME]` | `{{lead_first_name}}` |
...
**NUNCA** use colchetes `[CAMPO]` para variáveis - sempre `{{variavel}}`.
```

**Pending-marker example, copy verbatim** (lines 109-116):
```
## EXEMPLO DE MARCAÇÃO DE PENDÊNCIA
Nome do Cliente: Maria Silva
CNPJ: [PENDENTE - informação não fornecida]
...
```

**Data hand-off contract this subagent consumes as input** — the `<dados_coletados>` XML block produced by `client-scaffold-collect` (Pattern 3 in RESEARCH.md), embedded literally in this subagent's invocation prompt by the main command (per Pitfall 2 — this subagent has zero memory of Passo 2's conversation).

---

### `.claude/commands/ei-cria-cliente.md` (rewritten Passo 4A / 4B.1(b) with hard gate)

**Analog:** `.claude/commands/ei-ajustes.md` Passo 3.5 caminho [A] (gate) + Passo 5 (fan-out dispatch mechanics)

**Gate AskUserQuestion pattern to copy near-verbatim** (ei-ajustes.md lines ~111-140, options wording per D-06/D-07):
```json
{
  "questions": [{
    "question": "Campos coletados para <cliente>[/<especialidade>]:\n\n1. Nome do Cliente: Maria Silva\n2. CNPJ: [PENDENTE - informação não fornecida]\n...\n\nPreencher os templates com esses dados agora?",
    "header": "Confirmação",
    "multiSelect": false,
    "options": [
      {"label": "Aprovar e preencher", "description": "Despacha o preenchimento dos templates com os dados acima."},
      {"label": "Cancelar", "description": "Encerra sem preencher. A estrutura de pastas criada permanece em disco."}
    ]
  }]
}
```
(Given verbatim in RESEARCH.md Pattern 2, itself adapted from `ei-ajustes.md` lines 117-129 — labels are "Aprovar e preencher"/"Cancelar" per D-06, not "Aprovar e editar".)

**Fail-closed rule to copy verbatim** (ei-ajustes.md lines 137-140):
```
- Resposta = "Aprovar e editar" → segue para Passo 4 com a lista COMPLETA ...
- Resposta = "Cancelar" → encerra com a mensagem de cancelamento ...
- Resposta = "Outro" (texto livre via UI) → tratar como Cancelar ...
- Resposta vazia / answers={} / qualquer coisa diferente das acima → tratar como Cancelar (REGRA INVIOLÁVEL — fail-closed).
```
Adapt the first line's label to "Aprovar e preencher" per D-06/D-07; keep the rest identical.

**Runtime/no-TTY note to copy verbatim** (ei-ajustes.md line 107):
```
> Runtime / no-TTY: A tool AskUserQuestion é built-in do Claude Code >= v2.0.21. Em ambiente
> headless/no-TTY ... ela auto-resolve com answers={} — REGRA INVIOLÁVEL desta seção trata
> resposta vazia / não-"Aprovar" como Cancelar (fail-closed automático).
```

**"REGRA INVIOLÁVEL" callout style to copy** (ei-ajustes.md lines 252-258) — apply the same hard-rule framing to the new gate ("NUNCA invocar o `client-scaffold-fill` sem aprovação EXPLÍCITA via AskUserQuestion").

**Loop-per-specialty structure to preserve unchanged** — `.claude/commands/ei-cria-cliente.md` Passo 4B.1(b) itself (lines 78-88): the existing sequential (not parallel) per-specialty loop; the 3-subagent+gate chain (D-03) is inserted **inside** each loop iteration, replacing the single `client-project-scaffolder` dispatch with 3 sequential dispatches + 1 gate.

**Single-agent path to rewrite** — Passo 4A (lines 43-48): replace the single `client-project-scaffolder` dispatch with the same 3-dispatch + gate chain (no loop, N=1 cycle).

**Passo 5 resumo final — unchanged (D-04)** (lines 109-115): keep as-is, aggregating pending fields across all specialties.

---

### `.claude/hooks/post-scaffolder-review.sh` (retarget case branch)

**Analog:** itself — the existing `client-project-scaffolder)` branch (lines 40-71)

**Exact retarget per RESEARCH.md Code Examples section:**
```bash
# BEFORE (line 41):
case "$LAST_SUBAGENT" in
  client-project-scaffolder)
    ...
    ;;
  docs-editor-conciso)
    ...
    ;;
esac

# AFTER:
case "$LAST_SUBAGENT" in
  client-scaffold-fill)
    # same body, updated wording; consider dropping the background-pause
    # anti-reinjection guard (A2 — MEDIUM risk, keep defensively unless a
    # smoke test proves Passo 3 never pauses for user input)
    ...
    ;;
  docs-editor-conciso)
    ...
    ;;
esac
```
No branch needed for `client-scaffold-structure` or `client-scaffold-collect` — falling through the `case` with no match is already the correct silent no-op (per anti-pattern note in RESEARCH.md and CLAUDE.md's "Hook regex over-matching non-assistant transcript content" anti-pattern).

**`additionalContext` shape to preserve** (lines 63-70) — same `hookSpecificOutput.hookEventName: "SubagentStop"` + `additionalContext` string structure, sentinel `<scaffolder-review-triggered/>` guard logic unchanged (only the subagent name in the prose and the `case` key change).

---

### `manifest.json` (add/deprecate)

**Analog:** existing `deprecated_files[]` precedent (lines 33-37) for `ei-edit.md`/`ei-review.md`/`ei-ctx.md`

**Diff shape** (RESEARCH.md Code Examples, verified against actual file read):
```jsonc
{
  "files": [
    // ... unchanged entries ...
    // REMOVE: ".claude/agents/client-project-scaffolder.md",
    ".claude/agents/client-scaffold-structure.md",
    ".claude/agents/client-scaffold-collect.md",
    ".claude/agents/client-scaffold-fill.md",
    ".claude/agents/recepcionista-scaffolder.md",   // UNCHANGED — out of scope (D-05)
    ".claude/hooks/post-scaffolder-review.sh"
    // ... unchanged entries ...
  ],
  "deprecated_files": [
    ".claude/commands/ei-edit.md",
    ".claude/commands/ei-review.md",
    ".claude/commands/ei-ctx.md",
    ".claude/agents/client-project-scaffolder.md"
  ]
}
```
Current actual `files[]` array confirmed at `manifest.json` lines 4-32 (17 entries); `client-project-scaffolder.md` is at line 17 today — must move from that array to `deprecated_files[]` (lines 33-37) in the same change, not just be deleted from `files[]`.

## Shared Patterns

### XML-tagged input/output contract convention
**Source:** `.claude/agents/docs-analyzer.md` `<formato_resposta>` block (lines 68-109)
**Apply to:** `client-scaffold-collect.md`'s output (`<dados_coletados>`) and any structured hand-off between the 3 new subagents and the main command. Follow the same discipline: declare the schema literally, add a "Regras do schema" subsection, forbid inventing new tags.

### Fase 0 "carregar contexto" boilerplate
**Source:** `.claude/agents/client-project-scaffolder.md` lines 13-20 (also mirrored in `docs-analyzer.md`'s "PASSO 0")
**Apply to:** All 3 new subagents should open with an explicit "load CLAUDE.md + docs/*.md (+ modelo/*.md for structure/collect)" step before doing anything else — this repo's established discipline against acting on assumed/stale context.

### AskUserQuestion hard-gate pattern (fail-closed)
**Source:** `.claude/commands/ei-ajustes.md` Passo 3.5 caminho [A] (lines 95-140) and the "REGRA INVIOLÁVEL" callout style (lines 252-258)
**Apply to:** The new gate in `ei-cria-cliente.md` between Passo 2 (`client-scaffold-collect`) and Passo 3 (`client-scaffold-fill`) dispatches, for BOTH single-agent (Passo 4A) and multi-agent-per-specialty (Passo 4B.1(b)) flows. Copy the JSON `AskUserQuestion` shape, fail-closed response mapping, and no-TTY note near-verbatim; only reword labels per D-06 ("Aprovar e preencher" instead of "Aprovar e editar").

### SubagentStop hook retargeting via `case` string
**Source:** `.claude/hooks/post-scaffolder-review.sh` (lines 40-71)
**Apply to:** Only the fill step (`client-scaffold-fill`) needs a `case` branch — mirrors the existing rule that only content-writing subagents get audited (see RESEARCH.md Anti-Pattern "Auditing after every one of the 3 subagents").

### Sequential (non-parallel) per-specialty loop
**Source:** `.claude/commands/ei-cria-cliente.md` Passo 4B.1(b) (lines 78-88) and its "REGRA DO LOOP" (line 124)
**Apply to:** The rewritten multi-agent flow must still process one specialty fully (structure → collect → gate → fill) before starting the next — do not parallelize across specialties, do not reuse collected data across iterations (D-03).

### `manifest.json` deprecation-not-removal mechanism
**Source:** `manifest.json` lines 33-37 (existing `ei-edit.md`/`ei-review.md`/`ei-ctx.md` precedent); confirmed unconditional processing in `bin/cli.js` `run()` (per RESEARCH.md, lines 86-91 of that file)
**Apply to:** Retiring `client-project-scaffolder.md` — must be added to `deprecated_files[]`, never just deleted from `files[]`.

## No Analog Found

None — every file in this phase's scope has a strong, directly-applicable analog already in the repo (this phase is explicitly "adaptation and renaming, not invention" per RESEARCH.md's own conclusion).

## Metadata

**Analog search scope:** `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`, `manifest.json` (entire repo's Claude Code tooling surface — small, fully enumerated, no broader search needed)
**Files scanned:** `client-project-scaffolder.md`, `docs-analyzer.md`, `post-scaffolder-review.sh`, `ei-ajustes.md`, `ei-cria-cliente.md`, `manifest.json` (6 files read in full; sufficient per "stop at 3-5 strong matches" — this phase's scope is small enough that all directly relevant analogs were read)
**Pattern extraction date:** 2026-07-05
