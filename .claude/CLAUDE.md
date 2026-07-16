<!-- GSD:project-start source:PROJECT.md -->

## Project

**ei-prompt — Validação de XML + Scaffolding em 3 Passos**

CLI npm (`@expertzinhointegrado/ei-prompt`) que distribui um conjunto de agentes Claude Code (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up) para pastas de clientes de atendimento automatizado. Os 6 templates em `modelo/` têm uma "casca" XML (`<?xml version="1.0" encoding="UTF-8"?>` + `<agente tipo="...">`) desde o commit `994b16f`. Este milestone endurece essa casca com validação de código (não só regra em prompt) e conserta o fluxo de criação de cliente, que hoje deixa campos incompletos porque tudo acontece numa única tacada.

**Core Value:** Um `docs-editor-conciso` ou `client-scaffold-fill` nunca deve conseguir gerar/deixar um arquivo de cliente com XML quebrado (casca removida, invertida ou malformada) sem que isso seja pego automaticamente — hoje isso só é "pego" se o `docs-reviewer` (LLM) lembrar de checar a checklist manual do `docs/regras-validacao.md`.

### Constraints

- **Sem dependências novas**: projeto é intencionalmente zero-dependency; preferir Node built-ins ou binário já mencionado nos docs (`xmllint`) a bibliotecas npm.
- **Compatibilidade com manifest**: qualquer novo hook/agente precisa ser adicionado a `manifest.json` (`files`) para ser distribuído aos usuários via npx.
- **Não regredir o pipeline `/ei-ajustes`**: o novo hook de XML deve coexistir com `post-ajustes-fanout.sh` e `post-scaffolder-review.sh` sem quebrar o protocolo sentinela existente.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (CommonJS, Node.js) - `bin/cli.js` — the entire published CLI
- Markdown - `modelo/*.md`, `docs/*.md`, `.claude/agents/*.md`, `.claude/commands/*.md` (prompt/agent definitions, not code, but versioned and shipped as CLI payload)
- Bash - `.claude/hooks/*.sh` (Claude Code hook scripts, not part of the npm package)
- JSON - `manifest.json`, `.claude/settings.json`, `package.json`

## Runtime

- Node.js >= 18 (declared in `package.json` `engines.node`; required for global `fetch` used in `bin/cli.js`)
- npm (package published as `@expertzinhointegrado/ei-prompt`)
- Lockfile: missing (no `package-lock.json` in repo; project has zero runtime dependencies so this is low-risk)

## Frameworks

- None — `bin/cli.js` is plain Node.js using only built-in modules (`fs`, `path`) and the global `fetch` API. No CLI framework (no commander/yargs), no bundler.
- None detected — no test framework, no test files, no `test` script in `package.json`.
- None — no build step; `bin/cli.js` is run directly via the `bin` field in `package.json` (`npx @expertzinhointegrado/ei-prompt@latest`).

## Key Dependencies

- None. `package.json` declares zero `dependencies` and zero `devDependencies`. The tool is intentionally dependency-free.
- `manifest.json` acts as the declarative "dependency" list for the CLI's own behavior — it enumerates every file the CLI downloads/removes from GitHub (see INTEGRATIONS.md).

## Configuration

- `.env` file present at repo root — contents not inspected (forbidden). Not referenced by `bin/cli.js`; likely used only for local/agent tooling, not the published package.
- No `.env.example` present.
- No build config files (no `tsconfig.json`, no bundler config, no `.babelrc`). `package.json` `files` field restricts the published npm tarball to `bin/` and `manifest.json` only — all other repo content (`docs/`, `modelo/`, `.claude/`) is distributed exclusively via the GitHub-fetch mechanism in `bin/cli.js`, not via npm.

## Platform Requirements

- Node.js >= 18 (for native `fetch`)
- Git (repo is the source of truth fetched at runtime by consumers of the CLI)
- Claude Code CLI (this repo's own `.claude/` directory — agents, hooks, commands — is used to develop/maintain the project itself, and is also one of the artifact sets shipped to end-user client projects via `manifest.json`)
- End users run `npx @expertzinhointegrado/ei-prompt@latest` in any Node >= 18 environment; the CLI has no server component and no persistent runtime — it downloads files from GitHub raw content into the invoking project's working directory (`bin/cli.js` `writeFile`/`fetchFile`).
- Publishing target: npm registry (`https://registry.npmjs.org`), automated via GitHub Actions (`.github/workflows/publish.yml`), Node 20 runner.
- Release process is documented in `RELEASE.md`: any push landing on `main` triggers `npm publish` automatically via that workflow, so the version bump (`package.json`) and the `CHANGELOG.md` entry must happen BEFORE a PR is merged into `main`.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Project Nature

## Naming Patterns

- CLI code: lowercase-dash-free single file, `bin/cli.js`.
- Agent/prompt templates: PascalCase Portuguese role names — `modelo/Orquestrador.md`, `modelo/Qualifier.md`, `modelo/Scheduler.md`, `modelo/Protractor.md`, `modelo/Recepcionista.md`, `modelo/Follow-Up.md`.
- Claude subagents: kebab-case, function-first — `.claude/agents/docs-editor-conciso.md`, `.claude/agents/docs-analyzer.md`, `.claude/agents/docs-reviewer.md`, `.claude/agents/client-scaffold-fill.md`, `.claude/agents/recepcionista-scaffolder.md`.
- Slash commands: kebab-case with `ei-` prefix — `.claude/commands/ei-ajustes.md`, `.claude/commands/ei-cria-cliente.md`, `.claude/commands/ei-update.md`.
- Shell hooks: kebab-case, verb/context descriptive — `.claude/hooks/inject-ei-context.sh`, `.claude/hooks/post-ajustes-fanout.sh`, `.claude/hooks/post-scaffolder-review.sh`, `.claude/hooks/prompt-matches-agent.sh`.
- Reference docs: lowercase-kebab in `docs/` — `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`, `docs/multi-agente-recepcionista.md`.
- `camelCase`, verb-first: `fetchFile`, `writeFile`, `removeFile`, `run`, `help`, `log`.
- Small, single-purpose async functions; no classes.
- `camelCase` for locals (`dest`, `exists`, `current`).
- `UPPER_SNAKE_CASE` for module-level constants (`RAW_BASE`, `COLORS`).
- Snake_case inside angle brackets: `<objetivo>`, `<fluxo_de_conversa>`, `<regras_qualificacao>`, `<formato_resposta>`, `<exemplos_resposta>`, `<conhecimento>`. These tag names are a fixed vocabulary — do not invent new tag names when editing; reuse the existing ones (see `docs/regras-edicao.md`).

## Code Style

- No Prettier/ESLint config present. Existing style in `bin/cli.js`: 2-space indent, double quotes, semicolons, template literals for string interpolation, trailing commas in multiline objects.
- Match this style exactly when editing `bin/cli.js` — do not introduce single quotes or a different indent width.
- Bilingual: command/agent instructional text is Portuguese (pt-BR); code/YAML frontmatter keys are English (`name`, `description`, `tools`, `model`, `color`).
- Headings use `#`/`##`/`###` hierarchy; checklists use `- [ ]`; tables (`| Col | Col |`) are used heavily for rule matrices (see `docs/proibido-fazer.md`, `docs/regras-validacao.md`).
- Emphasis conventions: **bold** for rule names/labels, `code font` for file paths, tag names, and literal keywords (`IR_PARA_AGENDAMENTO`, `ACIONAR_PROTRACTOR:*`).

## Import Organization

- Core Node builtins first (`fs`, `path`), then local relative requires (`../manifest.json`). No path aliases; no bundler.

## Error Handling

- Async operations wrapped in `try/catch` per-file inside the `run()` loop so one failed fetch does not abort the whole batch; failures are aggregated in a `results.failed` counter and cause `process.exit(1)` only after all files are processed.
- Errors surfaced via `log("red", "fail  ", ...)` with the underlying `err.message` — never swallowed silently.
- Path-traversal defense in `removeFile()`: resolved path is checked against `cwd` before deletion; out-of-bounds paths are warned and skipped (fail open with a warning), not thrown.
- Top-level `run({...}).catch(...)` is the single catch-all for unexpected startup errors, logging then `process.exit(1)`.
- Agents have hard-coded escalation paths instead of exceptions: Qualifier/Orquestrador/Scheduler never terminate/transfer directly — they must route through Protractor (`docs/proibido-fazer.md`). Treat this as the domain's error/edge-case handling convention: specialized agents delegate irreversible actions to a single authority agent.
- The `docs-reviewer` anti-loop protocol caps auto-correction at one retry cycle via the `[CICLO_CORRECAO=2]` tag (see `.claude/agents/docs-reviewer.md`) — this is the project's retry/backoff convention for agent-driven fixes.

## Logging

- Green = success (`add`, `pronto`), yellow = skip/warn, red = fail/error, cyan = update/info headers, dim = unchanged/secondary text.
- Prefix strings are fixed-width padded (`"add   "`, `"update"`, `"remove"`) for aligned console output.

## Comments

## Function Design (JS)

## Module Design

## Agent-Editing Conventions (project-specific, high value)

- **Never edit `modelo/*.md` directly via `/ei-ajustes`** — it is read-only in the distributed flow; client-specific changes go into the client's own copy (`docs/proibido-fazer.md`).
- **Never add new fields to `<formato_resposta>`** — only reuse existing fields (hard rule enforced by `docs-reviewer`).
- **Never duplicate a rule across sections** — consolidate into the single most-appropriate section and cross-reference by name instead of repeating text (`docs/regras-edicao.md`).
- **Action keywords in the `resume` field** follow a fixed vocabulary: `IR_PARA_AGENDAMENTO`, `ACIONAR_PROTRACTOR:FINALIZAR_SESSAO`, `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_HUMANO`, `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_AGENT:[nome]`, `COLETAR:[campo]` — do not invent new keywords.
- **Commits never include "Generated with Claude Code" or "Co-Authored-By"** signatures (explicit project rule — see `docs/proibido-fazer.md`).

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI entrypoint | Downloads manifest-listed files from GitHub raw into CWD, handles overwrite/skip/remove logic | `bin/cli.js` |
| Manifest | Single source of truth for which files ship and which are deprecated (auto-removed) | `manifest.json` |
| Agent templates | Canonical prompt personas (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up) | `modelo/*.md` |
| `/ei-cria-cliente` command | Creates a new client project (single- or multi-agent) by invoking scaffolder subagents | `.claude/commands/ei-cria-cliente.md` |
| `/ei-ajustes` command | Applies a targeted adjustment to an existing client agent via analyze→approve→edit→review pipeline | `.claude/commands/ei-ajustes.md` |
| `/ei-update` command | Re-runs the npx installer in the current folder and surfaces the changelog | `.claude/commands/ei-update.md` |
| `client-scaffold-structure` subagent | Creates the client folder skeleton and copies `modelo/*.md` templates verbatim, asking no questions | `.claude/agents/client-scaffold-structure.md` |
| `client-scaffold-collect` subagent | Reads the copied templates, collects every required field (including media) conversationally, returns a structured `<dados_coletados>` block; read-only, never writes files | `.claude/agents/client-scaffold-collect.md` |
| `client-scaffold-fill` subagent | Fills the copied templates' placeholders with the collected data, preserving `{{variavel}}` syntax and the pending marker for anything unanswered; non-interactive | `.claude/agents/client-scaffold-fill.md` |
| `recepcionista-scaffolder` subagent | Generates the Recepcionista (router) stack for multi-agent clients | `.claude/agents/recepcionista-scaffolder.md` |
| `docs-analyzer` subagent | Read-only, opus-model analysis of which client file/section an adjustment description targets | `.claude/agents/docs-analyzer.md` |
| `docs-editor-conciso` subagent | Performs the actual concise edit to a client agent file | `.claude/agents/docs-editor-conciso.md` |
| `docs-reviewer` subagent | Cross-context audit of an edit, emits OK/CORRECAO/BLOQUEAR verdict | `.claude/agents/docs-reviewer.md` |
| `post-scaffolder-review.sh` hook | `SubagentStop` hook that reacts after `client-scaffold-fill` runs; has an anti-loop sentinel guard | `.claude/hooks/post-scaffolder-review.sh` |
| `post-ajustes-fanout.sh` hook | `Stop` hook that detects an in-flight `/ei-ajustes` editor fan-out sentinel and injects a `reason` to drive the main agent into the review step | `.claude/hooks/post-ajustes-fanout.sh` |
| `prompt-matches-agent.sh` hook | Utility hook for prompt/agent matching (supporting logic for the pipeline) | `.claude/hooks/prompt-matches-agent.sh` |
| `inject-ei-context.sh` hook | Disabled context-injection hook (see CLAUDE.md v1.8.9 note); kept for potential restoration from git history | `.claude/hooks/inject-ei-context.sh` |
| Rule docs | Fractioned detailed rules referenced from root `CLAUDE.md` | `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`, `docs/multi-agente-recepcionista.md` |

## Pattern Overview

- No application runtime layer (no server/db/web framework) — `bin/cli.js` is the only executable JS in the repo.
- Business logic lives in **markdown prompts** interpreted by Claude Code (slash commands, subagents), not in imperative code.
- Hooks are bash scripts reacting to Claude Code lifecycle events (`Stop`, `SubagentStop`) to chain pipeline steps and prevent infinite loops (`stop_hook_active` guard, sentinel/consumed protocol).
- Strict separation between the **read-only source-of-truth templates** (`modelo/`) and **generated, customizable client copies** (created outside this repo, in arbitrary target folders named after the client).
- Distribution is one-way and idempotent: `bin/cli.js` diff-checks existing content before overwriting, and removes deprecated files listed in `manifest.json`.

## Layers

- Purpose: fetch and install/update the latest agent templates and Claude Code tooling into any project folder via `npx @expertzinhointegrado/ei-prompt@latest`
- Location: `bin/cli.js`, `manifest.json`
- Contains: file-fetch/write/remove logic, colored console logging, add/update/skip/unchanged/removed/failed result aggregation
- Depends on: GitHub raw content API (`https://raw.githubusercontent.com/<repo>/<branch>/<path>`)
- Used by: end users via `npx`, and internally by `/ei-update`
- Purpose: canonical, read-only agent persona definitions that scaffolders copy/customize per client
- Location: `modelo/*.md`
- Contains: prompt text defining each agent's role (Orquestrador, Qualifier, Scheduler, Protractor, Recepcionista, Follow-Up)
- Depends on: nothing (leaf layer)
- Used by: `client-scaffold-structure`, `recepcionista-scaffolder` subagents
- Purpose: implements the create-client and adjust-client workflows as Claude Code slash commands, subagents, and hooks
- Location: `.claude/commands/`, `.claude/agents/`, `.claude/hooks/`, `.claude/settings.json`
- Contains: command markdown (multi-step procedural instructions for the main Claude agent), subagent markdown (isolated-context task definitions), hook shell scripts (lifecycle event handlers)
- Depends on: `modelo/` (as scaffolding source), the target client folder structure, and Claude Code's Agent/Task tool + Stop/SubagentStop hook events
- Used by: end users invoking `/ei-cria-cliente`, `/ei-ajustes`, `/ei-update` inside Claude Code
- Purpose: encodes hard rules and conventions referenced by commands and by the root `CLAUDE.md` index
- Location: `docs/*.md`, root `CLAUDE.md`
- Contains: editing rules, validation checklists, hard prohibitions (`modelo/` read-only, etc.), multi-agent Recepcionista personification rules
- Depends on: nothing (reference material)
- Used by: main Claude agent when executing any command that edits or creates client agent files

## Data Flow

### Primary Path: New Client Creation (`/ei-cria-cliente`)

### Primary Path: Adjust Existing Client (`/ei-ajustes`)

- No persistent application state or database. State for the `/ei-ajustes` pipeline is carried entirely in the Claude Code conversation transcript via sentinel markers (`<ei-ajustes-round id="round-<ts>-<3char>">` / `<ei-ajustes-round-consumed id="...">"`), read directly from the JSONL transcript file by the hook (stateless, idempotent design — no external state file).
- Retry/correction caps (2 retries per file for editors, 2 corrections per file for reviewers) are tracked conversationally by the main agent, not persisted to disk.

## Key Abstractions

- Purpose: represents a multi-step user-facing workflow the main Claude agent executes inline
- Examples: `.claude/commands/ei-cria-cliente.md`, `.claude/commands/ei-ajustes.md`, `.claude/commands/ei-update.md`
- Pattern: numbered "Passo N" sections with explicit branching logic, invocation templates for subagents, and inviolable rules (e.g., "REGRA INVIOLÁVEL HOOK-02")
- Purpose: represents a single well-scoped task run with its own context window and often a restricted toolset/model
- Examples: `.claude/agents/docs-analyzer.md` (read-only, opus), `.claude/agents/docs-editor-conciso.md` (edit), `.claude/agents/docs-reviewer.md` (audit)
- Pattern: XML-tagged input/output contracts (`<descricao_ajuste>`, `<cliente_path>`, `<modo>` in, `<decisao>`/`<resultado>`/`<veredito>` out)
- Purpose: bash scripts registered in `.claude/settings.json` against Claude Code lifecycle events (`Stop`, `SubagentStop`) that inspect the transcript and conditionally inject follow-up instructions
- Examples: `.claude/hooks/post-ajustes-fanout.sh`, `.claude/hooks/post-scaffolder-review.sh`
- Pattern: read JSON stdin → check `stop_hook_active` anti-loop guard → extract `transcript_path` → grep/sed the transcript for sentinel markers → emit `{"decision":"block","reason":"..."}` on stdout when action is needed, else exit 0 silently
- Purpose: stateless coordination between the main agent's free-text output and a hook's decision to intervene, without any state file on disk
- Examples: `<ei-ajustes-round id="round-<unix_ts>-<3_alfanum>">` emitted by main agent, `<ei-ajustes-round-consumed id="...">` marks it handled
- Pattern: hook scans only the last 400 lines of `type:assistant` transcript entries for the latest unconsumed round ID

## Entry Points

- Location: `bin/cli.js`
- Triggers: `npx @expertzinhointegrado/ei-prompt@latest [install|update|--help]`
- Responsibilities: read `manifest.json`, remove deprecated files, fetch and write/update each manifest file from GitHub raw, print colored progress and summary counts, exit 1 on any failure
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

### Hook regex over-matching non-assistant transcript content

## Error Handling

- `bin/cli.js`: each `fetchFile`/`writeFile` call is wrapped per-file so one failed download does not abort the whole install; results are tallied into `{added, updated, unchanged, skipped, failed, removed}`.
- `.claude/hooks/*.sh`: use `set -uo pipefail` (not `set -e`, since expected pipeline "no match" from `grep` returns exit 1 and is handled explicitly via `[ -z "$VAR" ]` checks).
- `.claude/commands/ei-ajustes.md`: retry caps (2 per file) prevent infinite edit/review correction loops; unresolved-after-cap cases likely require manual/human escalation per the command's rules.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
