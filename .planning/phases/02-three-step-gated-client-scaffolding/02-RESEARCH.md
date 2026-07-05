# Phase 2: 3-Step Gated Client Scaffolding - Research

**Researched:** 2026-07-05
**Domain:** Claude Code subagent orchestration (prompt/markdown architecture, not application code) — splitting a monolithic scaffolding subagent into 3 chained subagents with a hard human-confirmation gate
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Os 3 passos viram **3 subagents dedicados** (não um único `client-project-scaffolder` parametrizado por `passo`). Confirmado com a documentação oficial de subagents da Claude Code (code.claude.com/docs/en/sub-agents), que recomenda explicitamente o padrão "chain subagents" para workflows multi-etapa e cita restrição de tools por etapa como motivo válido para separar agentes.
- **D-02 (Claude's discretion):** Nome exato dos 3 novos arquivos em `.claude/agents/` fica a critério do planner, seguindo a convenção kebab-case function-first já usada. Precisam ser adicionados a `manifest.json` (`files`) para distribuição via npx.
- **D-03:** O split de 3 passos se aplica **por especialidade** — cada especialidade percorre o próprio ciclo Passo1→Passo2→gate→Passo3 completo antes de a próxima começar. Preserva o comportamento sequencial já documentado hoje no loop de `/ei-cria-cliente` Passo 4B.1(b). Rejeitada a alternativa "agregada".
- **D-04:** O comando mantém o **resumo final consolidado** (árvore de pastas completa + pendências agregadas de todas as especialidades) ao final de todo o fluxo — além, não em vez, dos gates por especialidade. Espelha o Passo 5 já existente em `.claude/commands/ei-cria-cliente.md`.
- **D-05:** `recepcionista-scaffolder` **não** recebe o mesmo tratamento de 3 passos nesta fase — os requisitos SCAF-01 a SCAF-06 e o Core Value do PROJECT.md nomeiam explicitamente `client-project-scaffolder`, não `recepcionista-scaffolder`.
- **D-06:** O gate espelha **exatamente** o padrão do `/ei-ajustes` Passo 3.5 caminho [A]: uma única chamada `AskUserQuestion` com a `question` listando de forma resumida os campos coletados vs. pendentes, e duas `options` fixas: `"Aprovar e preencher"` / `"Cancelar"`. Não usar o formato mais verboso de checklist campo-a-campo.
- **D-07:** Comportamento fail-closed idêntico ao `/ei-ajustes`: qualquer resposta que não seja explicitamente `"Aprovar e preencher"` — vazia, `answers={}`, `"Outro"` com texto livre, ou qualquer coisa ambígua — é tratada como Cancelar. O Passo 3 (preenchimento) NUNCA inicia sem essa confirmação inequívoca. Mesma regra do runtime/no-TTY do `/ei-ajustes` (headless/CI auto-resolve com `answers={}` → sempre cai no Cancelar).

### Claude's Discretion

- Nome exato dos 3 novos arquivos de subagent (D-02).
- Detalhes finos de implementação do fluxo interno de cada subagent (como exatamente o Passo 1 confirma que a estrutura foi criada antes de retornar controle ao comando, como o Passo 2 acumula os dados coletados para passar ao gate, etc.) — cabe ao planner definir com base nos padrões já estabelecidos em `client-project-scaffolder.md` e `.claude/commands/ei-ajustes.md`.

### Deferred Ideas (OUT OF SCOPE)

- **Aplicar o mesmo split de 3 passos + gate duro ao `recepcionista-scaffolder`** — fora do escopo da Fase 2 (requisitos SCAF-01..06 e o Core Value do PROJECT.md nomeiam só `client-project-scaffolder`). Candidato a fase futura se o mesmo problema de campos incompletos aparecer na criação da Recepcionista.
- Reviewed Todos (not folded): None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|---------------------|
| SCAF-01 | `client-project-scaffolder` dividido em 3 passos distintos e auditáveis: (1) criar pastas/arquivos/compor template, (2) levantar informações do cliente, (3) preencher o template | Architectural Responsibility Map + Pattern 1 (tool-scoped subagent split); Recommended Project Structure names 3 candidate files |
| SCAF-02 | Passo 1 não coleta nenhum dado do cliente — só estrutura de pastas/arquivos, sem perguntas | Pattern 1 (Passo 1 subagent has no interactive-collection tooling need); System Architecture Diagram shows Passo 1 as zero-question |
| SCAF-03 | Passo 2 coleta todos os campos obrigatórios identificados nos templates, incluindo mídias (atual Fase 4.5) | Pattern 3 (structured `<dados_coletados>` contract incl. `<midias>`); source content of `client-project-scaffolder.md` Fase 4/4.5 to slice from |
| SCAF-04 | Gate duro entre Passo 2 e Passo 3 — só avança pro preenchimento com confirmação explícita, no mesmo padrão do gate humano já usado em `/ei-ajustes` (Passo 3.5) | Pattern 2 (main-command gate) + Pitfall 1 (`AskUserQuestion` unavailable in subagents — gate MUST be in main command) — the central, verified finding of this research |
| SCAF-05 | Split aplica-se aos dois modos existentes do scaffolder (`single-agent` e `multi-agente-especialidade-unica`) | System Architecture Diagram + D-03 loop-per-specialty note; both modes reuse the identical 3-subagent + gate chain, only the invocation parameters differ (per today's `client-project-scaffolder.md` Fase 1) |
| SCAF-06 | Passo 3 preenche os arquivos com os dados coletados, preservando `{{variavel}}` e `[PENDENTE - informação não fornecida]` | Pattern 3 (data hand-off contract carries pending markers verbatim); PADRÃO DE VARIÁVEIS DINÂMICAS section of `client-project-scaffolder.md` to carry into `client-scaffold-fill` |
</phase_requirements>

## Summary

This phase is pure prompt-engineering/orchestration work: no new runtime code, no new dependencies, no database, no network surface. The deliverable is (1) three new `.claude/agents/*.md` subagent files sliced from the existing `client-project-scaffolder.md`, (2) a rewritten `/ei-cria-cliente.md` command that chains them with a hard `AskUserQuestion` gate in between, and (3) bookkeeping updates (`manifest.json`, `post-scaffolder-review.sh`).

The single most important technical constraint discovered this session, confirmed against **official Claude Code documentation** (not training-data assumption): **`AskUserQuestion` is not available inside subagents spawned via the Agent/Task tool** (`code.claude.com/docs/en/agent-sdk/user-input`, "Limitations" section, verbatim: *"Subagents: AskUserQuestion is not currently available in subagents spawned via the Agent tool"*). This means the hard gate required by SCAF-04/D-06/D-07 **cannot be embedded inside the Passo 2 or Passo 3 subagent** — it must live in the main orchestrating command (`/ei-cria-cliente.md`), executed by the main Claude thread, exactly mirroring where `/ei-ajustes.md` Passo 3.5 already lives (between the `docs-analyzer` subagent call and the `docs-editor-conciso` fan-out, both in main-command context, never inside a subagent). This is not a new pattern to invent — it is the existing, working pattern in this repo, and D-06 explicitly requires mirroring it "exactly."

A second load-bearing consequence follows directly from Claude Code's own "Chain subagents" guidance (`code.claude.com/docs/en/sub-agents`, verbatim: *"Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent"*): because Passo 3 runs in a **fresh, isolated context** with no memory of Passo 2's conversation, the main command must **explicitly serialize** everything Passo 2 collected (including pending markers and media blocks) into Passo 3's invocation prompt. The planner must design a structured hand-off contract (XML-tagged, matching this repo's existing convention) for this, not rely on "the agent will remember."

A third finding, verified by reading `bin/cli.js` directly: `manifest.json`'s `deprecated_files[]` array is unconditionally processed and deleted from every user's project on every `npx ei-prompt` run, *before* `files[]` is fetched — this is the mechanism (already used for `ei-edit.md`/`ei-review.md`/`ei-ctx.md`) that must retire the old `client-project-scaffolder.md` for existing installs, not a simple removal from `files[]`.

**Primary recommendation:** Slice `client-project-scaffolder.md` into 3 subagents distinguished by **tool restriction**, not just prompt instruction — Passo 1 gets no `Edit`/no data-asking capability at all (pure file I/O), Passo 2 gets `Read`/`Glob`/`Grep`/`TodoWrite` but explicitly **no `Write`/`Edit`** (so it is structurally incapable of touching templates), and Passo 3 gets `Read`/`Edit`/`Write`. Put the `AskUserQuestion` gate — copied near-verbatim from `/ei-ajustes.md` Passo 3.5 caminho [A] — in `/ei-cria-cliente.md` between the Passo 2 and Passo 3 dispatches, per requirement and per subagent capability constraints.

## Architectural Responsibility Map

This project has no web-app tiers (browser/API/DB); its "tiers" are Claude Code's own execution contexts. Mapping capabilities to the tier that can actually own them (given the `AskUserQuestion`-in-subagents constraint above) is the single highest-value output of this research phase.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Folder/file structure creation (Passo 1) | Subagent (new `*-structure` agent) | — | Deterministic file I/O, zero questions (SCAF-02) — ideal isolated-context task, verbose `cp`/`mkdir` output doesn't pollute main thread |
| Field/media data collection (Passo 2) | Subagent (new `*-collect` agent) | Main command (receives structured output) | Conversational Q&A already works today via subagent background-pause/resume (`SendMessage`) — same mechanism, just scoped to collection only; subagent has no `Write`/`Edit` so it *cannot* fill templates even if instructed to |
| Hard confirmation gate (Passo 2→3) | **Main orchestrator command** (`/ei-cria-cliente.md`) | — | `AskUserQuestion` is confirmed unavailable inside subagents (`code.claude.com/docs/en/agent-sdk/user-input`) — this capability is structurally impossible to place in a subagent |
| Cross-subagent data hand-off (collected fields → fill prompt) | Main orchestrator command | — | Subagents "return results to Claude, which then passes relevant context to the next subagent" (official chaining pattern) — Passo 3 has zero memory of Passo 2's conversation |
| Template filling (Passo 3) | Subagent (new `*-fill` agent) | — | Only step that needs `Write`/`Edit`; isolating it keeps blast radius of a bad edit contained and matches "restrict tools per step" rationale (D-01) |
| Post-fill content audit | Hook (`post-scaffolder-review.sh`, `SubagentStop`) | Main command (fallback per existing `/ei-cria-cliente.md` Passo 5 note) | `docs-reviewer`'s checklist only concerns *written* content (duplicate rules, `<formato_resposta>` fields, media format) — only the fill step produces content worth auditing |
| Distribution bookkeeping (new/old files) | CLI/manifest layer (`manifest.json`, `bin/cli.js`) | — | `files[]`/`deprecated_files[]` is this project's only "release" mechanism; unrelated to runtime behavior but required for the phase to actually ship |

## Standard Stack

There are no npm/pip/cargo packages in scope for this phase — the project is intentionally zero-dependency (`package.json` has no `dependencies`), and this phase only adds/edits Markdown (`.claude/agents/*.md`, `.claude/commands/*.md`), JSON (`manifest.json`), and a Bash hook (`post-scaffolder-review.sh`). **Package Legitimacy Audit is N/A — no external packages are installed by this phase.**

### Core (Claude Code platform primitives used)

| Primitive | Constraint | Purpose | Why Standard |
|-----------|------------|---------|---------------|
| Subagent (`.claude/agents/*.md`, invoked via Agent tool) | Frontmatter `tools:` allowlist | Isolate each of the 3 steps in its own context with its own tool permissions | Official recommended pattern for "multi-step workflows" and "enforce specific tool restrictions" (`code.claude.com/docs/en/sub-agents`) — this repo already uses it for `docs-analyzer`/`docs-editor-conciso`/`docs-reviewer` |
| `AskUserQuestion` built-in tool | Claude Code >= v2.0.21 (already documented in `ei-ajustes.md`); **NOT available inside subagents** | The hard gate's UI | `[CITED: code.claude.com/docs/en/agent-sdk/user-input]` — confirmed unavailable in subagents; must run in main command context |
| `SubagentStop` / `Stop` hook events (`.claude/settings.json`) | Bash scripts, `stop_hook_active` anti-loop guard | Trigger `docs-reviewer` audit after content-writing steps | Already wired for `client-project-scaffolder` today; needs retargeting, not reinvention |

### Supporting

| Item | Purpose | When to Use |
|------|---------|-------------|
| Subagent-to-subagent data hand-off via main-command prompt embedding | Carry Passo 2's collected data into Passo 3's invocation | Any time a chained subagent needs the prior step's output verbatim (mirrors `docs-analyzer` → `/ei-ajustes.md` Passo 5 pattern) |
| `manifest.json` `deprecated_files[]` | Force-remove the retired `client-project-scaffolder.md` from existing user installs | Whenever a distributed file is renamed/split/removed (same mechanism already used for `ei-edit.md`/`ei-review.md`/`ei-ctx.md`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 3 separate subagent files (D-01, locked) | 1 subagent parameterized by a `passo` input | Rejected by CONTEXT.md D-01 — a single parameterized agent cannot have per-step tool restrictions, and a prompt-only "don't ask/don't write" instruction is not structurally enforced (an LLM can still ignore it); the split makes SCAF-02 ("Passo 1 asks nothing") and the Passo 2→3 boundary enforceable by tool allowlist, not just by wording |
| Gate inside Passo 2 subagent (agent asks "proceed?" itself) | N/A — not viable | `AskUserQuestion` unavailable in subagents; a subagent narrating "I'm now confirming with you" without the actual tool is exactly the failure mode the `docs-editor-conciso` anti-pattern in `post-scaffolder-review.sh`'s comments warns about ("auto-auditoria narrada... não conta") |

**Installation:** N/A (no package manager involved; all changes are file creation/edits within the repo, distributed via the existing GitHub-raw + `manifest.json` mechanism).

## Package Legitimacy Audit

N/A — this phase does not install any external package in any ecosystem. No `npm install`/`pip install`/`cargo add` commands are part of this phase's scope. Skip this section's table; do not gate any task behind `checkpoint:human-verify` for package legitimacy reasons.

## Architecture Patterns

### System Architecture Diagram

```text
User invokes /ei-cria-cliente <nome>
        │
        ▼
┌─────────────────────────── Main Claude thread (ei-cria-cliente.md) ───────────────────────────┐
│                                                                                                  │
│  Passo 1-3 (existing): load context, ask nome_cliente, ask modo (AskUserQuestion)                │
│        │                                                                                          │
│        ▼                                                                                          │
│  Passo 4A (single) / Passo 4B.1(b) loop (multi, per specialty)                                   │
│        │                                                                                          │
│        ├─► dispatch Subagent: <passo1-structure>  (modo, nome_cliente, [especialidade])          │
│        │        - Bash: mkdir -p, cp modelo/*.md → destino                                        │
│        │        - ZERO questions, ZERO Write/Edit of content (SCAF-02)                            │
│        │        - returns: "estrutura criada em <path>, arquivos: [...]"                          │
│        │◄───────────────────────────────────────────────────────────────────────────────────────┤
│        │                                                                                          │
│        ├─► dispatch Subagent: <passo2-collect>  (path from Passo 1, templates to scan)            │
│        │        - Read/Glob/Grep templates to enumerate required fields + mídia (SCAF-03)         │
│        │        - Conversational Q&A with user (background pause / SendMessage resume,            │
│        │          same mechanism already used by today's Fase 4/4.5 — NOT AskUserQuestion)        │
│        │        - NO Write/Edit tool available (structural enforcement of "Passo 2 never fills")  │
│        │        - returns: structured <dados_coletados> XML block (field=value or pendente)       │
│        │◄───────────────────────────────────────────────────────────────────────────────────────┤
│        │                                                                                          │
│        ▼                                                                                          │
│  ⚠️ HARD GATE — AskUserQuestion, main-command context ONLY (SCAF-04, D-06, D-07)                  │
│     Mirrors /ei-ajustes.md Passo 3.5 caminho [A] literally:                                       │
│     question = numbered summary of collected vs. pendente fields                                  │
│     options = ["Aprovar e preencher", "Cancelar"]                                                 │
│     any answer ≠ "Aprovar e preencher" (empty / answers={} / "Outro" / no-TTY) → Cancelar          │
│        │                                                                                          │
│        │ "Aprovar e preencher"                              "Cancelar" / fail-closed              │
│        ▼                                                            │                             │
│  ├─► dispatch Subagent: <passo3-fill> (path, FULL <dados_coletados>  │  end this specialty's       │
│  │        embedded literally in the prompt — Passo 3 has NO memory  │  cycle; structure from       │
│  │        of Passo 2's conversation)                                │  Passo 1 remains on disk     │
│  │        - Read/Edit/Write templates with collected data           │  unfilled (see Open Q1)      │
│  │        - preserves {{variavel}} / [PENDENTE ...] markers          │                             │
│  │        - returns: files updated + pending fields                 │                             │
│  │◄──────────────────────────────────────────────────────────────┘                                │
│  │                                                                                                 │
│  ▼                                                                                                 │
│  SubagentStop hook (post-scaffolder-review.sh) fires ONLY on <passo3-fill> name match              │
│     → triggers docs-reviewer audit of the filled files                                            │
│                                                                                                     │
│  (multi-agent) loop repeats Passo1→Passo2→GATE→Passo3 for next especialidade (D-03)                │
│        │                                                                                           │
│        ▼                                                                                           │
│  Passo 5 — resumo final consolidado (unchanged, D-04)                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
.claude/
├── agents/
│   ├── client-scaffold-structure.md   # Passo 1 — folder/file creation, zero questions
│   ├── client-scaffold-collect.md     # Passo 2 — field + mídia data collection, no Write/Edit
│   ├── client-scaffold-fill.md        # Passo 3 — template filling with collected data
│   ├── recepcionista-scaffolder.md    # UNCHANGED — out of scope (D-05)
│   ├── docs-analyzer.md               # UNCHANGED — reference pattern for XML contracts
│   ├── docs-editor-conciso.md         # UNCHANGED
│   └── docs-reviewer.md               # UNCHANGED — its checklist doesn't change
├── commands/
│   └── ei-cria-cliente.md             # REWRITTEN: Passo 4A / 4B.1(b) chain the 3 new subagents + gate
├── hooks/
│   └── post-scaffolder-review.sh      # UPDATED: case match retargeted to client-scaffold-fill
└── settings.json                      # UNCHANGED (hook registration path doesn't change)

manifest.json                          # UPDATED: 3 new files in `files[]`,
                                        #   client-project-scaffolder.md moved to `deprecated_files[]`
```

**Naming note (D-02, Claude's discretion):** the names above (`client-scaffold-structure`, `client-scaffold-collect`, `client-scaffold-fill`) follow the existing kebab-case, function-first convention (`docs-editor-conciso`, `docs-analyzer`, `docs-reviewer`) and keep the `client-scaffold-*` prefix so `post-scaffolder-review.sh`'s case-statement pattern-matching stays legible and greppable as a family. This is a recommendation, not a lock — the planner may choose different exact names but should preserve: (a) kebab-case, (b) a shared recognizable prefix so the hook's `case` branches are easy to reason about, (c) the step number or verb encoded in the suffix (`structure`/`collect`/`fill` or `-1`/`-2`/`-3`) so `/ei-cria-cliente.md`'s dispatch order is self-documenting.

### Pattern 1: Subagent Chaining with Tool-Scoped Boundaries

**What:** Each of the 3 steps is a separate subagent file with a deliberately restricted `tools:` frontmatter field, so the boundary between steps is enforced by what the subagent *can* do, not only by what its prompt tells it to do.

**When to use:** Any multi-step workflow where a prior step's temptation to "just go ahead and do the next step too" (e.g., Passo 2 deciding to fill in a template it already has the data for) needs a hard technical barrier, not just an instruction.

**Example (tool restriction driving the SCAF-02/SCAF-04 boundary):**
```yaml
# Source: pattern extracted from existing .claude/agents/docs-analyzer.md
#   (tools: Read, Glob, Grep — read-only by design, per docs-analyzer.md frontmatter)
---
name: client-scaffold-collect
description: Use this agent to collect all required client fields and media for a
  client project AFTER client-scaffold-structure has created the folder/files.
  Never writes or edits any template file — only asks questions and returns
  structured collected data for the calling command to hand off to client-scaffold-fill.
tools: Read, Glob, Grep, TodoWrite
model: opus
color: pink
---
```
No `Write`/`Edit`/`Bash` tool in the list — even if the prompt body were somehow induced to "just fill the template now," the subagent has no tool capable of doing it.

### Pattern 2: Main-Command Gate Between Subagent Dispatches (mirrors `/ei-ajustes.md` Passo 3.5)

**What:** The `AskUserQuestion` hard gate lives in the orchestrating command file, executed by the main Claude thread, positioned textually between the Passo 2 dispatch and the Passo 3 dispatch.

**When to use:** Whenever a workflow needs human confirmation between two subagent-driven steps — subagents cannot render this UI themselves.

**Example (copied/adapted from `.claude/commands/ei-ajustes.md` Passo 3.5 caminho [A], per D-06):**
```json
// Source: .claude/commands/ei-ajustes.md lines 117-129 (verified in this repo),
// adapted per D-06 wording ("Aprovar e preencher" instead of "Aprovar e editar")
{
  "questions": [{
    "question": "Campos coletados para <cliente>[/<especialidade>]:\n\n1. Nome do Cliente: Maria Silva\n2. CNPJ: [PENDENTE - informação não fornecida]\n3. Telefone: (11) 99999-0000\n...\n\nPreencher os templates com esses dados agora?",
    "header": "Confirmação",
    "multiSelect": false,
    "options": [
      {"label": "Aprovar e preencher", "description": "Despacha o preenchimento dos templates com os dados acima."},
      {"label": "Cancelar", "description": "Encerra sem preencher. A estrutura de pastas criada permanece em disco."}
    ]
  }]
}
```
Any response other than the literal label `"Aprovar e preencher"` — empty, `answers={}`, `"Outro"`, or anything else — must be treated as Cancelar, exactly matching `/ei-ajustes.md`'s fail-closed rule (D-07). Do not use a per-field checklist UI (D-06 explicitly rejects the more verbose format).

### Pattern 3: Structured Hand-off Contract Between Subagents

**What:** Passo 2's final response must be a structured, machine-parseable block (not free prose) so the main command can (a) build the gate's `question` text and (b) embed it verbatim into Passo 3's prompt.

**When to use:** Any subagent chain where a later step needs the literal data an earlier step gathered, and the two steps do not share a context window.

**Example (XML contract, following this repo's existing `<tag>` convention seen in `docs-analyzer.md`'s `<decisao>`/`<arquivo>` output):**
```xml
<!-- Recommended output contract for client-scaffold-collect -->
<dados_coletados>
  <campo nome="nome_cliente" valor="Maria Silva" pendente="false"/>
  <campo nome="cnpj" valor="" pendente="true"/>
  <campo nome="telefone" valor="(11) 99999-0000" pendente="false"/>
  <!-- ...one <campo> per required field identified in the templates... -->
  <midias>
    <midia nome="Apresentação institucional" gatilho="quando pedir detalhes"
           mediaUrl="[PENDENTE - link do Banco de Mídia]" mediaType="file"/>
  </midias>
</dados_coletados>
```
The main command parses this to build the gate summary and, on approval, passes the **entire block verbatim** inside `client-scaffold-fill`'s invocation prompt (same technique `/ei-ajustes.md` uses to pass `docs-analyzer`'s `<arquivo>` list into each `docs-editor-conciso` Task prompt).

### Anti-Patterns to Avoid

- **Embedding "confirm with the user" instructions inside a subagent's prompt body:** the subagent cannot call `AskUserQuestion`; at best it will narrate a fake confirmation, at worst it will hallucinate a tool call or hang. The gate must be textually located in `/ei-cria-cliente.md`, never inside `client-scaffold-collect.md` or `client-scaffold-fill.md`.
- **Assuming Passo 3 "remembers" what Passo 2 asked:** each subagent dispatch is a fresh, isolated context (`code.claude.com/docs/en/sub-agents`: subagents "start fresh"). If the main command's Passo 3 invocation prompt doesn't literally contain the collected data, Passo 3 will either re-ask the user (regressing to the old monolithic behavior) or fabricate values.
- **Auditing after every one of the 3 subagents:** `docs-reviewer`'s checklist (`docs/regras-validacao.md`) is entirely about *written content* correctness (duplicate rules, `<formato_resposta>` fields, media block format, XML casca). Passo 1 produces byte-identical copies of already-reviewed `modelo/` files (nothing new to audit) and Passo 2 writes no files at all. Firing the hook on those two steps would either no-op uselessly or (worse) confuse the reviewer with nothing to diff.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Human confirmation gate UI | Custom text-based "type YES to continue" prompt loop | The existing `/ei-ajustes.md` Passo 3.5 caminho [A] `AskUserQuestion` structure, copied verbatim (D-06) | Already has a battle-tested fail-closed spec (D-07) covering empty/no-TTY/"Outro" responses; reinventing risks missing one of those edge cases |
| Detecting "did the fill step actually run" for the audit hook | New sentinel/JSONL parsing logic | Rename the existing `case "$LAST_SUBAGENT" in client-project-scaffolder)` branch in `post-scaffolder-review.sh` to match the new Passo-3 subagent's name | The transcript-parsing, anti-reinjection, and background-pause guard logic in that hook already works and is documented; only the string literal needs to change |
| Retiring the old subagent file for existing user installs | A migration script, a new CLI flag, a version check | `manifest.json` `deprecated_files[]` (already the mechanism for `ei-edit.md`/`ei-review.md`/`ei-ctx.md`) | `bin/cli.js:86-91` already unconditionally processes this array on every install/update — zero new code needed |

**Key insight:** almost every piece of infrastructure this phase needs (gate UX, hook dispatch, deprecation mechanism, XML data contracts) already exists in this repo for a parallel use case (`/ei-ajustes.md`'s analyze→gate→edit→review pipeline). The work is adaptation and renaming, not invention — deviating from the existing patterns (e.g., inventing a new confirmation UX, or a new file-retirement mechanism) would be pure scope creep and a source of subtle bugs.

## Common Pitfalls

### Pitfall 1: Trying to put the `AskUserQuestion` gate inside a subagent
**What goes wrong:** The gate is written into `client-scaffold-collect.md` or `client-scaffold-fill.md`'s prompt body instead of `/ei-cria-cliente.md`.
**Why it happens:** It reads naturally to put "ask for confirmation" right after "finish collecting data," inside the same subagent — this is how the *current* monolithic `client-project-scaffolder.md` is structured (data collection and filling happen in the same continuous session).
**How to avoid:** Treat the gate as belonging exclusively to the orchestrating command, same tier as `/ei-ajustes.md` Passo 3.5. `[CITED: code.claude.com/docs/en/agent-sdk/user-input]` confirms `AskUserQuestion` is unavailable in subagents — this is a hard platform limitation, not a style choice.
**Warning signs:** Any subagent `.md` file containing the string `AskUserQuestion` in its own prompt body (recepcionista-scaffolder.md, out of scope for this phase, already does this today — do not copy that pattern into the new Phase 2 subagents).

### Pitfall 2: Passo 3 losing the collected data because it wasn't embedded in its invocation prompt
**What goes wrong:** The main command dispatches `client-scaffold-fill` with only a vague instruction like "fill in the templates with what was collected" — Passo 3 has no access to Passo 2's conversation and either re-asks the user or invents plausible-looking values.
**Why it happens:** It's easy to assume subagent state persists across dispatches in the same command execution; it does not — each `Agent`/`Task` invocation is a fresh context.
**How to avoid:** The main command must literally serialize Passo 2's structured `<dados_coletados>` output (Pattern 3 above) into Passo 3's prompt text, the same way `/ei-ajustes.md` embeds `docs-analyzer`'s `<arquivo>` fields into each `docs-editor-conciso` Task prompt.
**Warning signs:** Passo 3's invocation prompt in the plan is shorter than the full set of fields Passo 2 was asked to collect.

### Pitfall 3: Hook silently stops auditing because the case-statement string wasn't updated
**What goes wrong:** `post-scaffolder-review.sh`'s `case "$LAST_SUBAGENT" in client-project-scaffolder)` branch never matches the new Passo 3 subagent's name, so `docs-reviewer` is never triggered — and because all hooks in this codebase `exit 0` silently on non-match (by design, per `docs/CONCERNS.md` "Fragile transcript parsing" note), there is no error, no log, nothing to notice.
**Why it happens:** The hook references the exact literal subagent name `client-project-scaffolder`, which will no longer exist once the split happens.
**How to avoid:** Update the `case` value to the new Passo 3 subagent's exact `name:` frontmatter value; verify against a live Claude Code session (matches the Phase 1 precedent of "Task 3 human-verify" against a real transcript, not just static code review).
**Warning signs:** Newly created client files never receive an automatic `docs-reviewer` verdict; a smoke test should confirm the verdict actually appears.

### Pitfall 4: Forgetting `deprecated_files[]`, leaving a stale agent on existing installs
**What goes wrong:** `client-project-scaffolder.md` is simply removed from `manifest.json`'s `files[]` array. Existing user projects that already have the file on disk keep it forever (the CLI never deletes files that aren't listed anywhere) — a confusing, unmaintained agent with an outdated description sits alongside the 3 new ones, and Claude's own delegation-by-description matching could pick the wrong one.
**Why it happens:** `files[]` removal feels like the natural way to "stop shipping" a file, but `bin/cli.js` has no such semantics — only `deprecated_files[]` triggers active deletion (`bin/cli.js:86-91`, `removeFile()`).
**How to avoid:** Move `.claude/agents/client-project-scaffolder.md` from `files[]` to `deprecated_files[]` in the same commit that adds the 3 new subagent paths to `files[]`. This exact move was already done for `ei-edit.md`/`ei-review.md`/`ei-ctx.md` — follow that precedent.
**Warning signs:** `manifest.json` diff shows the old path only removed, never added to `deprecated_files`.

### Pitfall 5: Undefined "Cancel" semantics leaving partially-created client folders in ambiguous states
**What goes wrong:** In `/ei-ajustes.md`, "Cancelar" is safe because nothing has been written yet (the analyzer is read-only). In this phase, Passo 1 has already created folders/files on disk *before* the gate runs. If the user cancels at the gate, CONTEXT.md's D-07 only specifies that "Passo 3 never starts" — it does not specify what state the already-created structure is left in, or whether the multi-agent loop (D-03) should abort entirely or skip to the next specialty.
**Why it happens:** The `/ei-ajustes.md` Cancel precedent has no analogous "already-created-artifact" case to draw from directly.
**How to avoid:** Surface this explicitly to the planner as an open decision (see Open Questions below) rather than silently picking a behavior. The safest default, consistent with `/ei-ajustes.md`'s own "Cancelar tudo NÃO desfaz Edits já aplicados" precedent (non-destructive, additive-only cancellation), is: leave the Passo-1-created structure on disk with unfilled `{{variavel}}` placeholders, end that specialty's cycle, and (in multi-agent mode) let the user decide per D-04's final summary whether to re-run for that specialty.

## Runtime State Inventory

N/A — this phase is not a rename/refactor/migration of existing runtime state. It splits a subagent's *behavior* across three files; it does not rename any client-facing template variable, database key, or external service identifier. The one artifact that changes identity is the subagent file itself (`client-project-scaffolder.md` → 3 new files), which is covered above under Pitfall 4 (manifest `deprecated_files[]`) — that is a distribution-bookkeeping concern, not a stored/live-service-state concern, so the 5-category inventory template does not apply here.

## Code Examples

### Retargeting `post-scaffolder-review.sh`'s case statement

```bash
# Source: .claude/hooks/post-scaffolder-review.sh (existing, verified in this repo)
# BEFORE (line 41):
case "$LAST_SUBAGENT" in
  client-project-scaffolder)
    ...
    ;;
  docs-editor-conciso)
    ...
    ;;
esac

# AFTER (recommended — retarget to the Passo-3 subagent only; Passo 1/2 need no branch
# because falling through the case with no match is already the correct, silent no-op):
case "$LAST_SUBAGENT" in
  client-scaffold-fill)
    # same body as the old client-project-scaffolder) branch, updated wording
    ...
    ;;
  docs-editor-conciso)
    ...
    ;;
esac
```
Note the background-pause anti-reinjection guard in the old `client-project-scaffolder)` branch existed because *that* subagent paused mid-execution waiting for user answers (interactive Q&A). If `client-scaffold-fill` is designed to run non-interactively (it only needs the data already embedded in its prompt — no user Q&A expected), the new branch can likely drop that guard's complexity; confirm this against a live smoke test rather than assuming, since `docs-reviewer`'s audit trigger behavior is safety-critical (silent failure = unaudited client files shipped).

### `manifest.json` diff shape

```jsonc
// Source: manifest.json (existing, verified in this repo)
{
  "files": [
    // ... unchanged entries ...
    // REMOVE: ".claude/agents/client-project-scaffolder.md",
    "ADD: .claude/agents/client-scaffold-structure.md",
    "ADD: .claude/agents/client-scaffold-collect.md",
    "ADD: .claude/agents/client-scaffold-fill.md",
    // .claude/agents/recepcionista-scaffolder.md — UNCHANGED (out of scope, D-05)
    ".claude/hooks/post-scaffolder-review.sh"
    // ... unchanged entries ...
  ],
  "deprecated_files": [
    ".claude/commands/ei-edit.md",
    ".claude/commands/ei-review.md",
    ".claude/commands/ei-ctx.md",
    "ADD: .claude/agents/client-project-scaffolder.md"
  ]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Single subagent (`client-project-scaffolder`) doing scaffold + collect + fill in one continuous session | 3 chained subagents with tool-scoped boundaries + main-command gate | This phase (v1 milestone) | Structurally impossible to skip data collection or leave fields silently unasked — previously the LLM could (and per the Core Value narrative, did) run all fases in one pass and drift past incomplete fields |
| `client-project-scaffolder` narrating a confirmation ("vou perguntar...") without an actual approval mechanism | Explicit `AskUserQuestion` gate in main-command context, fail-closed (D-07) | This phase | Matches the already-shipped `/ei-ajustes.md` Passo 3.5 hardening (Phase "Fase 3" of that command's own evolution) — same rigor now applied to client creation |

**Deprecated/outdated:**
- `client-project-scaffolder.md` as a single monolithic agent: superseded by the 3-subagent split; must move to `manifest.json` `deprecated_files[]` (not just removed from `files[]`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Recommended subagent file names (`client-scaffold-structure`/`-collect`/`-fill`) are the best names, not just *a* valid naming | Recommended Project Structure | Low — D-02 explicitly leaves this to planner discretion; any kebab-case name satisfies the actual requirement |
| A2 | `client-scaffold-fill` runs non-interactively (no user Q&A expected during Passo 3) and therefore doesn't need the background-pause anti-reinjection guard that `client-project-scaffolder` needed | Code Examples / Pitfall 3 | Medium — if Passo 3 does end up pausing (e.g., to ask a disambiguation question about an edge case), dropping the guard could reintroduce the historical reinjection-loop bug (`cb67556`) that guard was written to fix; the planner should keep the guard defensively unless a smoke test proves Passo 3 never pauses |
| A3 | The default Cancel-at-gate behavior (leave Passo-1 structure on disk, end that specialty's cycle) is the right default, absent an explicit CONTEXT.md decision | Pitfall 5 / Open Questions | Medium — this is genuinely undecided by CONTEXT.md; if the intended UX is "delete the half-created folder on cancel," the plan needs an explicit cleanup step instead |

## Open Questions

1. **What happens to a Passo-1-created folder structure when the user cancels at the gate?**
   - What we know: D-07 specifies Passo 3 must never start without approval; `/ei-ajustes.md`'s Cancel precedent is non-destructive (nothing is undone).
   - What's unclear: whether the newly created (but unfilled) client folder should be left as-is, deleted, or flagged for retry in the final summary (D-04).
   - Recommendation: default to non-destructive (leave on disk with `{{variavel}}` placeholders unfilled) per A3 above; surface this explicitly in the plan so it's a conscious choice, not an accident.

2. **Should `client-scaffold-collect`'s Q&A use the exact same background-pause/`SendMessage` mechanism as today's `client-project-scaffolder`, or does splitting change anything about how many times `SubagentStop` fires during collection?**
   - What we know: today's single agent already pauses/resumes across multiple user answers within Fase 4/4.5, and `post-scaffolder-review.sh`'s existing anti-reinjection guard was built specifically for this pause pattern.
   - What's unclear: whether isolating collection into its own subagent changes the pause/resume cadence in a way that needs the guard adapted for the new subagent name too (even though this phase's audit hook branch is being retargeted to Passo 3, `SubagentStop` still fires on every Passo 2 pause — it just won't match any `case` branch, which should be a safe no-op, but should be confirmed live).
   - Recommendation: include a human-verify smoke test step (mirroring Phase 1's Task 3 precedent) that runs the full Passo1→2→gate→3 flow in a live session and confirms no spurious hook firing/errors occur during Passo 2's multi-turn Q&A.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Claude Code CLI with `AskUserQuestion` tool | Hard gate (SCAF-04) | Assumed ✓ (already relied on by `/ei-ajustes.md` today) | >= v2.0.21 (per existing `ei-ajustes.md` note) | None — this is a hard platform requirement already accepted by the project |
| Claude Code subagent background-pause / `SendMessage` resume mechanism | Passo 2 interactive collection | Assumed ✓ (already relied on by today's `client-project-scaffolder`, documented in `post-scaffolder-review.sh` comments) | Unspecified exact version; behavior referenced in production hook comments since a prior fix commit (`cb67556`) | None — pre-existing dependency, not newly introduced by this phase |
| `bash` with `grep -oE` (extended regex) | `post-scaffolder-review.sh` case-statement update | ✓ (already in use by existing hooks) | POSIX-compatible | None needed |

**Missing dependencies with no fallback:** None — all dependencies are already relied upon by the existing, shipping `/ei-ajustes.md` and `client-project-scaffolder.md` today; this phase does not introduce any new external dependency.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None applicable to prompt/subagent behavior — `node:test` exists in this repo (from Phase 1) but only covers the deterministic XML-casca validator (`validate-xml-casca.js`), not conversational/orchestration logic |
| Config file | none — see Wave 0 |
| Quick run command | N/A for this phase's own changes (no JS logic is added/modified) |
| Full suite command | `node --test .claude/hooks/validate-xml-casca.test.js` (Phase 1's suite; unaffected by this phase but should still pass since generated client files must still satisfy the XML casca) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| SCAF-01 | 3-passo split exists as 3 distinct subagent files | manual-only (file existence + frontmatter review) | N/A — no test framework for `.md` subagent structure | N/A |
| SCAF-02 | Passo 1 asks zero questions, collects zero data | manual-only (live session transcript review) | N/A | N/A |
| SCAF-03 | Passo 2 collects every required field incl. mídia | manual-only (live session, compare collected fields against template placeholder scan) | N/A | N/A |
| SCAF-04 | Hard gate blocks Passo 2→3 without explicit approval | manual-only (live session: attempt Cancelar, empty response, "Outro"; confirm Passo 3 never dispatches) | N/A | N/A |
| SCAF-05 | Behavior identical for `single-agent` and `multi-agente-especialidade-unica` | manual-only (run both modes end-to-end) | N/A | N/A |
| SCAF-06 | Passo 3 preserves `{{variavel}}` and `[PENDENTE ...]` markers | manual-only (diff filled output against expected placeholder preservation) | N/A | N/A |

**Justification for manual-only classification:** `.planning/codebase/TESTING.md` (verified this session) documents that this project has **no test framework for prompt-driven/orchestration behavior** — `docs-reviewer` (an LLM subagent) and manual checklists in `docs/regras-validacao.md` are the project's actual quality gates for exactly this kind of change, and Phase 1's own precedent for orchestration/hook behavior was a `checkpoint:human-verify` task against a live session (see `01-03-PLAN.md`'s "Task 3 human-verify"), not an automated test. The planner should follow that same precedent: end this phase's waves with one or more `checkpoint:human-verify` tasks that run the actual Passo1→2→gate→3 flow in both modes.

### Sampling Rate

- **Per task commit:** N/A (no automated quick-run exists for this domain)
- **Per wave merge:** run `node --test .claude/hooks/validate-xml-casca.test.js` if any generated client file content is touched by a smoke test, to confirm the XML casca still validates
- **Phase gate:** live-session `checkpoint:human-verify` walkthrough of both `single-agent` and `multi-agente-especialidade-unica` flows, end-to-end, including a deliberate Cancel-at-gate attempt

### Wave 0 Gaps

- No test file gaps — there is no existing or plannable automated test infrastructure for subagent conversational behavior in this repo.
- Framework install: none needed.

*(No automated Wave 0 gaps: "None — this phase's verification surface is inherently manual/agentic per this project's established testing model; see Validation Architecture justification above.")*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No | This phase has no auth surface — it edits local prompt/config files consumed only by the invoking developer's own Claude Code session |
| V3 Session Management | No | No session concept beyond the Claude Code conversation itself |
| V4 Access Control | Marginally | The hard gate (SCAF-04) is a *process* control (confirm-before-write), not an ASVS access-control boundary — no privilege levels are involved; note it here for completeness but it does not map to a formal ASVS control |
| V5 Input Validation | No new surface | Client-provided field values (names, phone numbers, mídia URLs) were already accepted as free text by the existing monolithic agent; this phase does not change what data is accepted, only *when* it's written to disk. The existing accepted blind spot (raw `<`/`&` in client content breaking XML casca parse, per XMLV-07/Phase 1) is unaffected and intentionally out of scope here. |
| V6 Cryptography | No | No cryptographic operation in scope |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Malicious/malformed `manifest.json` causing path traversal on write | Tampering | Out of scope for this phase — `bin/cli.js`'s `writeFile()` lacks the same CWD-boundary guard `removeFile()` has (documented pre-existing gap in `.planning/codebase/CONCERNS.md`); this phase only adds ordinary relative paths under `.claude/agents/` and does not touch `writeFile()`'s guard logic, so it neither introduces nor fixes this gap. Do not silently "fix" it as part of this phase — it's unrelated scope. |
| Subagent silently gaining write capability it shouldn't have (Passo 2 filling templates) | Elevation of Privilege (informal, prompt-layer) | Enforce via `tools:` frontmatter allowlist (no `Write`/`Edit` on `client-scaffold-collect`), not just prompt wording — see Pattern 1 |
| Hard gate silently bypassed by a future edit that forgets the fail-closed rule | Tampering / Repudiation (informal) | Mirror `/ei-ajustes.md`'s explicit "REGRA INVIOLÁVEL" callout style so future editors can't miss the fail-closed requirement when touching `/ei-cria-cliente.md` |

## Sources

### Primary (HIGH confidence)
- `code.claude.com/docs/en/agent-sdk/user-input` — "Limitations" section, confirms `AskUserQuestion` is unavailable in subagents spawned via the Agent tool. `[CITED]`
- `code.claude.com/docs/en/sub-agents` — "Chain subagents" section, confirms the results-pass-through pattern between chained subagents; also confirms tool-restriction as an explicit reason to split subagents. `[CITED]`
- `bin/cli.js` (this repo, read directly) — confirms `deprecated_files[]` unconditional-removal mechanism (`run()`, lines 86-91) and `writeFile`'s lack of a CWD-traversal guard (contrast with `removeFile`). `[VERIFIED: codebase]`
- `.claude/commands/ei-ajustes.md` (this repo, read directly, Passo 3.5) — literal AskUserQuestion gate structure, fail-closed rules, options wording, to be mirrored per D-06/D-07. `[VERIFIED: codebase]`
- `.claude/agents/client-project-scaffolder.md` (this repo, read directly, full content) — source material to slice into 3 subagents; current tool list, fase structure, variable/mídia rules. `[VERIFIED: codebase]`
- `.claude/hooks/post-scaffolder-review.sh` (this repo, read directly, full content) — exact `case` statement string to retarget, background-pause anti-reinjection guard rationale. `[VERIFIED: codebase]`
- `manifest.json`, `.claude/settings.json` (this repo, read directly) — current file lists and hook registrations. `[VERIFIED: codebase]`
- `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md` (this repo, read directly) — the field/format/mídia rules Passo 2 must collect against and Passo 3 must preserve. `[VERIFIED: codebase]`
- `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md` (this repo's own codebase-mapper output, read directly) — confirms no automated test framework exists for prompt/orchestration behavior; confirms the `writeFile` traversal-guard gap (noted as out-of-scope for this phase). `[VERIFIED: codebase]`

### Secondary (MEDIUM confidence)
- GitHub issue `anthropics/claude-code#18721` — corroborates (does not independently establish) the `AskUserQuestion`-unavailable-in-subagents finding; the official docs page above is the authoritative source, this is a secondary confirmation of community awareness of the same limitation. `[CITED]`

### Tertiary (LOW confidence)
- General web search results characterizing "background subagents" and `SendMessage` resume behavior — consistent with, but not independently more authoritative than, this repo's own `post-scaffolder-review.sh` comments (which already document the same mechanism as production behavior observed in this exact codebase). Treated as corroboration only; the codebase comments are the primary evidence for A2/Open Question 2.

## Metadata

**Confidence breakdown:**
- Standard stack / platform primitives: HIGH — verified against official Claude Code documentation (subagent chaining, AskUserQuestion limitation) and this repo's own working code
- Architecture (gate placement, tool-scoping, data hand-off): HIGH — derived directly from a documented platform limitation plus an existing, working analogous pipeline (`/ei-ajustes.md`) in this same repo
- Pitfalls: HIGH for Pitfalls 1-4 (each traceable to a specific documented fact or code read); MEDIUM for Pitfall 5 (genuinely undecided by CONTEXT.md, flagged as Open Question rather than asserted)
- Validation architecture: HIGH — directly grounded in this repo's own `.planning/codebase/TESTING.md` analysis and Phase 1's own precedent for handling untestable orchestration logic

**Research date:** 2026-07-05
**Valid until:** 2026-08-04 (30 days — Claude Code platform capabilities around subagents/`AskUserQuestion` are evolving; re-verify the "unavailable in subagents" limitation against current docs if this phase's planning/execution is delayed materially past this window)
