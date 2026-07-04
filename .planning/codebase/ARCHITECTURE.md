<!-- refreshed: 2026-07-04 -->
# Architecture

**Analysis Date:** 2026-07-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Distribution Layer (npm)                  │
│  `bin/cli.js` + `manifest.json`                               │
│  Fetches files from GitHub raw and writes into a client repo  │
└───────────────────────────┬───────────────────────────────────┘
                             │ downloads
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Prompt Template Layer ("modelo/")                │
│  `modelo/Orquestrador.md` `modelo/Qualifier.md`               │
│  `modelo/Scheduler.md` `modelo/Protractor.md`                  │
│  `modelo/Recepcionista.md` `modelo/Follow-Up.md`               │
│  Read-only canonical agent prompt templates                   │
└───────────────────────────┬───────────────────────────────────┘
                             │ scaffolded/customized into
                             ▼
┌─────────────────────────────────────────────────────────────┐
│         Claude Code Automation Layer (`.claude/`)              │
├──────────────────┬──────────────────┬───────────────────────┤
│  Slash Commands  │   Subagents      │   Hooks (Stop/         │
│ `.claude/commands`│ `.claude/agents`│   SubagentStop)        │
│                  │                  │  `.claude/hooks`       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Generated client-project directories (outside repo    │
│         scope, e.g. `<cliente>/Orquestrador.md` or            │
│         `<cliente>/<especialidade>/Orquestrador.md`)          │
└─────────────────────────────────────────────────────────────┘
```

This is not a runtime application in the conventional sense — it is a **prompt-distribution CLI + Claude Code automation toolkit**. There is no server, database, or UI. The "product" is a set of markdown prompt templates (AI agent personas) plus Claude Code slash-commands/subagents/hooks that scaffold and edit copies of those templates for individual clients.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI entrypoint | Downloads manifest-listed files from GitHub raw into CWD, handles overwrite/skip/remove logic | `bin/cli.js` |
| Manifest | Single source of truth for which files ship and which are deprecated (auto-removed) | `manifest.json` |
| Agent templates | Canonical prompt personas (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up) | `modelo/*.md` |
| `/ei-cria-cliente` command | Creates a new client project (single- or multi-agent) by invoking scaffolder subagents | `.claude/commands/ei-cria-cliente.md` |
| `/ei-ajustes` command | Applies a targeted adjustment to an existing client agent via analyze→approve→edit→review pipeline | `.claude/commands/ei-ajustes.md` |
| `/ei-update` command | Re-runs the npx installer in the current folder and surfaces the changelog | `.claude/commands/ei-update.md` |
| `client-project-scaffolder` subagent | Generates a full single-agent client stack from `modelo/` | `.claude/agents/client-project-scaffolder.md` |
| `recepcionista-scaffolder` subagent | Generates the Recepcionista (router) stack for multi-agent clients | `.claude/agents/recepcionista-scaffolder.md` |
| `docs-analyzer` subagent | Read-only, opus-model analysis of which client file/section an adjustment description targets | `.claude/agents/docs-analyzer.md` |
| `docs-editor-conciso` subagent | Performs the actual concise edit to a client agent file | `.claude/agents/docs-editor-conciso.md` |
| `docs-reviewer` subagent | Cross-context audit of an edit, emits OK/CORRECAO/BLOQUEAR verdict | `.claude/agents/docs-reviewer.md` |
| `post-scaffolder-review.sh` hook | `SubagentStop` hook that reacts after `client-project-scaffolder` runs; has an anti-loop sentinel guard | `.claude/hooks/post-scaffolder-review.sh` |
| `post-ajustes-fanout.sh` hook | `Stop` hook that detects an in-flight `/ei-ajustes` editor fan-out sentinel and injects a `reason` to drive the main agent into the review step | `.claude/hooks/post-ajustes-fanout.sh` |
| `prompt-matches-agent.sh` hook | Utility hook for prompt/agent matching (supporting logic for the pipeline) | `.claude/hooks/prompt-matches-agent.sh` |
| `inject-ei-context.sh` hook | Disabled context-injection hook (see CLAUDE.md v1.8.9 note); kept for potential restoration from git history | `.claude/hooks/inject-ei-context.sh` |
| Rule docs | Fractioned detailed rules referenced from root `CLAUDE.md` | `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`, `docs/multi-agente-recepcionista.md` |

## Pattern Overview

**Overall:** Template-distribution CLI + declarative Claude Code automation pipeline (commands → subagents → hooks), driven by markdown, not general-purpose code.

**Key Characteristics:**
- No application runtime layer (no server/db/web framework) — `bin/cli.js` is the only executable JS in the repo.
- Business logic lives in **markdown prompts** interpreted by Claude Code (slash commands, subagents), not in imperative code.
- Hooks are bash scripts reacting to Claude Code lifecycle events (`Stop`, `SubagentStop`) to chain pipeline steps and prevent infinite loops (`stop_hook_active` guard, sentinel/consumed protocol).
- Strict separation between the **read-only source-of-truth templates** (`modelo/`) and **generated, customizable client copies** (created outside this repo, in arbitrary target folders named after the client).
- Distribution is one-way and idempotent: `bin/cli.js` diff-checks existing content before overwriting, and removes deprecated files listed in `manifest.json`.

## Layers

**Distribution (CLI) layer:**
- Purpose: fetch and install/update the latest agent templates and Claude Code tooling into any project folder via `npx @expertzinhointegrado/ei-prompt@latest`
- Location: `bin/cli.js`, `manifest.json`
- Contains: file-fetch/write/remove logic, colored console logging, add/update/skip/unchanged/removed/failed result aggregation
- Depends on: GitHub raw content API (`https://raw.githubusercontent.com/<repo>/<branch>/<path>`)
- Used by: end users via `npx`, and internally by `/ei-update`

**Template layer (`modelo/`):**
- Purpose: canonical, read-only agent persona definitions that scaffolders copy/customize per client
- Location: `modelo/*.md`
- Contains: prompt text defining each agent's role (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up)
- Depends on: nothing (leaf layer)
- Used by: `client-project-scaffolder`, `recepcionista-scaffolder` subagents

**Automation/orchestration layer (`.claude/`):**
- Purpose: implements the create-client and adjust-client workflows as Claude Code slash commands, subagents, and hooks
- Location: `.claude/commands/`, `.claude/agents/`, `.claude/hooks/`, `.claude/settings.json`
- Contains: command markdown (multi-step procedural instructions for the main Claude agent), subagent markdown (isolated-context task definitions), hook shell scripts (lifecycle event handlers)
- Depends on: `modelo/` (as scaffolding source), the target client folder structure, and Claude Code's Agent/Task tool + Stop/SubagentStop hook events
- Used by: end users invoking `/ei-cria-cliente`, `/ei-ajustes`, `/ei-update` inside Claude Code

**Governance/docs layer:**
- Purpose: encodes hard rules and conventions referenced by commands and by the root `CLAUDE.md` index
- Location: `docs/*.md`, root `CLAUDE.md`
- Contains: editing rules, validation checklists, hard prohibitions (`modelo/` read-only, etc.), multi-agent Recepcionista personification rules
- Depends on: nothing (reference material)
- Used by: main Claude agent when executing any command that edits or creates client agent files

## Data Flow

### Primary Path: New Client Creation (`/ei-cria-cliente`)

1. User invokes `/ei-cria-cliente <nome>` (`.claude/commands/ei-cria-cliente.md`)
2. Command determines single- vs multi-agent mode and dispatches `client-project-scaffolder` (per specialty, looped for multi-agent) (`.claude/agents/client-project-scaffolder.md`)
3. For multi-agent clients, `recepcionista-scaffolder` runs after all specialties exist, generating the Recepcionista router stack (`.claude/agents/recepcionista-scaffolder.md`)
4. `SubagentStop` hook `post-scaffolder-review.sh` fires after scaffolder subagent completion, with an anti-loop sentinel guard (`.claude/hooks/post-scaffolder-review.sh`)
5. Output: a new client directory (outside the repo's own tracked structure) containing customized copies of `modelo/*.md`

### Primary Path: Adjust Existing Client (`/ei-ajustes`)

1. User invokes `/ei-ajustes <cliente> <descrição>` or the multi-agent quoted form (`.claude/commands/ei-ajustes.md` Passo 1-2)
2. Command locates the target client/specialty folder via Glob-based fuzzy match (Passo 2)
3. `docs-analyzer` subagent (opus, read-only) reads all `.md` files in the target folder and returns structured XML (`<decisao>edit|clarify</decisao>`) (Passo 3, `.claude/agents/docs-analyzer.md`)
4. Hard approval gate: `AskUserQuestion` presents the analyzer's recommendation; no edit proceeds without explicit "Aprovar e editar"/"Confirmar" (Passo 3.5)
5. Fan-out edit: N parallel `docs-editor-conciso` subagent instances edit the N target files in one response, each emitting `<resultado>OK</resultado>` or `<resultado>ERRO: ...</resultado>` (Passo 5)
6. `Stop` hook `post-ajustes-fanout.sh` detects the `<ei-ajustes-round id=...>` sentinel in the transcript (only in `type:assistant` entries, tail 400 lines) and injects a `reason` instructing the main agent to emit `<ei-ajustes-round-consumed id=...>` and proceed to Passo 6 (`.claude/hooks/post-ajustes-fanout.sh`)
7. Fan-out review: M parallel `docs-reviewer` subagent instances audit the edited files with cross-context of sibling edits; `CORRECAO` verdict triggers a full re-edit + re-review cycle (capped at 2 corrections per file) (Passo 6)
8. Fallback: if the Stop hook does not fire (disabled/misconfigured), the command proceeds manually as "Phase 4" and appends note D-17 to the summary

**State Management:**
- No persistent application state or database. State for the `/ei-ajustes` pipeline is carried entirely in the Claude Code conversation transcript via sentinel markers (`<ei-ajustes-round id="round-<ts>-<3char>">` / `<ei-ajustes-round-consumed id="...">"`), read directly from the JSONL transcript file by the hook (stateless, idempotent design — no external state file).
- Retry/correction caps (2 retries per file for editors, 2 corrections per file for reviewers) are tracked conversationally by the main agent, not persisted to disk.

## Key Abstractions

**Slash Command (procedural playbook):**
- Purpose: represents a multi-step user-facing workflow the main Claude agent executes inline
- Examples: `.claude/commands/ei-cria-cliente.md`, `.claude/commands/ei-ajustes.md`, `.claude/commands/ei-update.md`
- Pattern: numbered "Passo N" sections with explicit branching logic, invocation templates for subagents, and inviolable rules (e.g., "REGRA INVIOLÁVEL HOOK-02")

**Subagent (isolated-context task):**
- Purpose: represents a single well-scoped task run with its own context window and often a restricted toolset/model
- Examples: `.claude/agents/docs-analyzer.md` (read-only, opus), `.claude/agents/docs-editor-conciso.md` (edit), `.claude/agents/docs-reviewer.md` (audit)
- Pattern: XML-tagged input/output contracts (`<descricao_ajuste>`, `<cliente_path>`, `<modo>` in, `<decisao>`/`<resultado>`/`<veredito>` out)

**Hook (lifecycle event reactor):**
- Purpose: bash scripts registered in `.claude/settings.json` against Claude Code lifecycle events (`Stop`, `SubagentStop`) that inspect the transcript and conditionally inject follow-up instructions
- Examples: `.claude/hooks/post-ajustes-fanout.sh`, `.claude/hooks/post-scaffolder-review.sh`
- Pattern: read JSON stdin → check `stop_hook_active` anti-loop guard → extract `transcript_path` → grep/sed the transcript for sentinel markers → emit `{"decision":"block","reason":"..."}` on stdout when action is needed, else exit 0 silently

**Sentinel/Consumed Protocol:**
- Purpose: stateless coordination between the main agent's free-text output and a hook's decision to intervene, without any state file on disk
- Examples: `<ei-ajustes-round id="round-<unix_ts>-<3_alfanum>">` emitted by main agent, `<ei-ajustes-round-consumed id="...">` marks it handled
- Pattern: hook scans only the last 400 lines of `type:assistant` transcript entries for the latest unconsumed round ID

## Entry Points

**`bin/cli.js` (npm bin entry `ei-prompt`):**
- Location: `bin/cli.js`
- Triggers: `npx @expertzinhointegrado/ei-prompt@latest [install|update|--help]`
- Responsibilities: read `manifest.json`, remove deprecated files, fetch and write/update each manifest file from GitHub raw, print colored progress and summary counts, exit 1 on any failure

**`/ei-cria-cliente`, `/ei-ajustes`, `/ei-update` (Claude Code slash commands):**
- Location: `.claude/commands/*.md`
- Triggers: invoked by the user inside a Claude Code session in this repo
- Responsibilities: drive multi-step client-creation/adjustment/update workflows by orchestrating subagents and relying on hooks for pipeline continuation

## Architectural Constraints

- **Threading:** N/A — no concurrent runtime. "Parallelism" is Claude Code's fan-out of multiple subagent invocations within a single command turn (`.claude/commands/ei-ajustes.md` Passo 5/6), not OS-level threads.
- **Global state:** None in code. The closest analog is `.claude/settings.json`'s hook registrations, which are effectively global config for the whole repo's Claude Code session.
- **Circular imports:** Not applicable — `bin/cli.js` is the only JS module and requires only `fs`, `path`, and `manifest.json`.
- **Read-only zone:** `modelo/*.md` must never be edited directly by the automation pipeline — always copy-then-customize into client folders (`docs/proibido-fazer.md`).
- **Anti-loop discipline:** Both hooks (`post-scaffolder-review.sh`, `post-ajustes-fanout.sh`) must check `stop_hook_active` first to respect Claude Code's `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=8` and avoid infinite Stop-hook loops.

## Anti-Patterns

### Editing `modelo/` directly

**What happens:** A future change mistakenly edits a template in `modelo/` instead of a generated client copy.
**Why it's wrong:** `modelo/` is the read-only source of truth shipped via `manifest.json`; direct edits corrupt every future client scaffold and are explicitly forbidden (`docs/proibido-fazer.md`).
**Do this instead:** Only scaffolder subagents copy `modelo/*.md` into client folders; edits target the generated client copy via `docs-editor-conciso`, never the template.

### Hook regex over-matching non-assistant transcript content

**What happens:** An earlier version of `post-ajustes-fanout.sh` risked matching sentinel-like text inside tool-result payloads (e.g., literal regex patterns quoted in a PLAN.md shown to the user), which are `type:user` entries in the JSONL, not `type:assistant`.
**Why it's wrong:** Would falsely trigger the fan-out continuation logic on content that was merely being displayed/discussed, not an actual live sentinel.
**Do this instead:** Filter the transcript tail to `"type":"assistant"` entries only, and require the exact canonical sentinel format `id="round-<unix_ts>-<3_alfanum>"` before treating it as real (`.claude/hooks/post-ajustes-fanout.sh`, CR-01/Phase 5 fix iter 3).

## Error Handling

**Strategy:** Fail-soft in the CLI (per-file try/catch, continue on failure, aggregate counts, exit 1 only if any file failed); fail-safe/silent-exit in hooks (missing/unreadable transcript, unrecognized sentinel, or `stop_hook_active` all result in a clean `exit 0` with no side effects).

**Patterns:**
- `bin/cli.js`: each `fetchFile`/`writeFile` call is wrapped per-file so one failed download does not abort the whole install; results are tallied into `{added, updated, unchanged, skipped, failed, removed}`.
- `.claude/hooks/*.sh`: use `set -uo pipefail` (not `set -e`, since expected pipeline "no match" from `grep` returns exit 1 and is handled explicitly via `[ -z "$VAR" ]` checks).
- `.claude/commands/ei-ajustes.md`: retry caps (2 per file) prevent infinite edit/review correction loops; unresolved-after-cap cases likely require manual/human escalation per the command's rules.

## Cross-Cutting Concerns

**Logging:** `bin/cli.js` uses ANSI-colored console output with fixed-width prefixes (`add`, `update`, `skip`, `same`, `remove`, `fail`) for human-readable install feedback. No structured/file logging elsewhere.
**Validation:** Enforced via `docs/regras-validacao.md` (post-edit checklists) and the `docs-reviewer` subagent's OK/CORRECAO/BLOQUEAR verdict, not automated tests.
**Authentication:** None — public GitHub raw content fetch, no auth tokens involved in `bin/cli.js`.

---

*Architecture analysis: 2026-07-04*
