# Coding Conventions

**Analysis Date:** 2026-07-04

## Project Nature

EiPrompt is a dual-artifact codebase:
1. **A tiny Node.js CLI** (`bin/cli.js`, ~120 lines, no dependencies, no build step) that downloads/updates agent prompt files from GitHub into a client project.
2. **A prompt-engineering system** (`modelo/*.md` templates, `.claude/agents/*.md`, `.claude/commands/*.md`) — the majority of the repo's logic lives in Markdown/XML prompt files that define LLM agent behavior, not in executable code.

Conventions below cover both layers. There is no `.eslintrc`, `.prettierrc`, `tsconfig.json`, or any JS test framework in the repo — style is enforced by convention and by the `docs-reviewer` subagent, not by tooling.

## Naming Patterns

**Files:**
- CLI code: lowercase-dash-free single file, `bin/cli.js`.
- Agent/prompt templates: PascalCase Portuguese role names — `modelo/Orquestrador.md`, `modelo/Qualifier.md`, `modelo/Scheduler.md`, `modelo/Protractor.md`, `modelo/Recepcionista.md`, `modelo/Follow-Up.md`.
- Claude subagents: kebab-case, function-first — `.claude/agents/docs-editor-conciso.md`, `.claude/agents/docs-analyzer.md`, `.claude/agents/docs-reviewer.md`, `.claude/agents/client-scaffold-fill.md`, `.claude/agents/recepcionista-scaffolder.md`.
- Slash commands: kebab-case with `ei-` prefix — `.claude/commands/ei-ajustes.md`, `.claude/commands/ei-cria-cliente.md`, `.claude/commands/ei-update.md`.
- Shell hooks: kebab-case, verb/context descriptive — `.claude/hooks/inject-ei-context.sh`, `.claude/hooks/post-ajustes-fanout.sh`, `.claude/hooks/post-scaffolder-review.sh`, `.claude/hooks/prompt-matches-agent.sh`.
- Reference docs: lowercase-kebab in `docs/` — `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`, `docs/multi-agente-recepcionista.md`.

**Functions (JS, `bin/cli.js`):**
- `camelCase`, verb-first: `fetchFile`, `writeFile`, `removeFile`, `run`, `help`, `log`.
- Small, single-purpose async functions; no classes.

**Variables:**
- `camelCase` for locals (`dest`, `exists`, `current`).
- `UPPER_SNAKE_CASE` for module-level constants (`RAW_BASE`, `COLORS`).

**Markdown section tags (prompt files):**
- Snake_case inside angle brackets: `<objetivo>`, `<fluxo_de_conversa>`, `<regras_qualificacao>`, `<formato_resposta>`, `<exemplos_resposta>`, `<conhecimento>`. These tag names are a fixed vocabulary — do not invent new tag names when editing; reuse the existing ones (see `docs/regras-edicao.md`).

## Code Style

**Formatting (JS):**
- No Prettier/ESLint config present. Existing style in `bin/cli.js`: 2-space indent, double quotes, semicolons, template literals for string interpolation, trailing commas in multiline objects.
- Match this style exactly when editing `bin/cli.js` — do not introduce single quotes or a different indent width.

**Formatting (Markdown/prompts):**
- Bilingual: command/agent instructional text is Portuguese (pt-BR); code/YAML frontmatter keys are English (`name`, `description`, `tools`, `model`, `color`).
- Headings use `#`/`##`/`###` hierarchy; checklists use `- [ ]`; tables (`| Col | Col |`) are used heavily for rule matrices (see `docs/proibido-fazer.md`, `docs/regras-validacao.md`).
- Emphasis conventions: **bold** for rule names/labels, `code font` for file paths, tag names, and literal keywords (`IR_PARA_AGENDAMENTO`, `ACIONAR_PROTRACTOR:*`).

## Import Organization

**JS (`bin/cli.js`):**
- Core Node builtins first (`fs`, `path`), then local relative requires (`../manifest.json`). No path aliases; no bundler.

## Error Handling

**JS (`bin/cli.js`):**
- Async operations wrapped in `try/catch` per-file inside the `run()` loop so one failed fetch does not abort the whole batch; failures are aggregated in a `results.failed` counter and cause `process.exit(1)` only after all files are processed.
- Errors surfaced via `log("red", "fail  ", ...)` with the underlying `err.message` — never swallowed silently.
- Path-traversal defense in `removeFile()`: resolved path is checked against `cwd` before deletion; out-of-bounds paths are warned and skipped (fail open with a warning), not thrown.
- Top-level `run({...}).catch(...)` is the single catch-all for unexpected startup errors, logging then `process.exit(1)`.

**Prompt-layer "error handling":**
- Agents have hard-coded escalation paths instead of exceptions: Qualifier/Orquestrador/Scheduler never terminate/transfer directly — they must route through Protractor (`docs/proibido-fazer.md`). Treat this as the domain's error/edge-case handling convention: specialized agents delegate irreversible actions to a single authority agent.
- The `docs-reviewer` anti-loop protocol caps auto-correction at one retry cycle via the `[CICLO_CORRECAO=2]` tag (see `.claude/agents/docs-reviewer.md`) — this is the project's retry/backoff convention for agent-driven fixes.

## Logging

**Framework:** Custom `log(color, prefix, msg)` helper in `bin/cli.js` using raw ANSI escape codes (`COLORS` object: reset/green/yellow/red/cyan/dim). No external logging library.

**Patterns:**
- Green = success (`add`, `pronto`), yellow = skip/warn, red = fail/error, cyan = update/info headers, dim = unchanged/secondary text.
- Prefix strings are fixed-width padded (`"add   "`, `"update"`, `"remove"`) for aligned console output.

## Comments

**JS:** Sparse; only used for non-obvious defensive logic (e.g. `// Defense-in-depth: bloqueia path traversal via '..' em manifest comprometido` in `bin/cli.js`). Comments are written in Portuguese even in code.

**Prompt Markdown:** Extensive use of blockquote callouts (`> ...`) for meta-notes to future editors (e.g. version-specific deprecation notices), and inline `⚠️` markers for mandatory/critical steps.

## Function Design (JS)

**Size:** Very small (5-25 lines each); one responsibility per function (fetch, write, remove, log, help).

**Parameters:** Options passed as a single destructured object where there is more than one flag, e.g. `writeFile(relPath, content, { overwrite })`, `run({ overwrite })`.

**Return Values:** String status codes returned from `writeFile`/`removeFile` (`"skipped"`, `"unchanged"`, `"updated"`, `"added"`, `"removed"`, `"absent"`, `"warn"`) which the caller uses as a key into a `results` accumulator object — a lightweight state-machine-via-string-enum pattern. Reuse this pattern (rather than booleans/exceptions) when extending `bin/cli.js` behavior.

## Module Design

**Exports:** `bin/cli.js` is a script, not a module — no `module.exports`. `manifest.json` is the single data contract consumed via `require("../manifest.json")` (fields: `repo`, `branch`, `files[]`, `deprecated_files[]`).

**Prompt template contract ("XML shell"):** every distributed agent prompt (`modelo/*.md` and generated client files) must be wrapped in a single-root `<agente xmlns="..." versao="1.0" tipo="...">...</agente>` shell, unescaped, never nested. This is the closest equivalent to a "module format" in the prompt layer — see `docs/regras-edicao.md` "Casca XML" section for the exact byte-for-byte structure, and validate with `xmllint --noout modelo/*.md` (`docs/regras-validacao.md`).

## Agent-Editing Conventions (project-specific, high value)

- **Never edit `modelo/*.md` directly via `/ei-ajustes`** — it is read-only in the distributed flow; client-specific changes go into the client's own copy (`docs/proibido-fazer.md`).
- **Never add new fields to `<formato_resposta>`** — only reuse existing fields (hard rule enforced by `docs-reviewer`).
- **Never duplicate a rule across sections** — consolidate into the single most-appropriate section and cross-reference by name instead of repeating text (`docs/regras-edicao.md`).
- **Action keywords in the `resume` field** follow a fixed vocabulary: `IR_PARA_AGENDAMENTO`, `ACIONAR_PROTRACTOR:FINALIZAR_SESSAO`, `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_HUMANO`, `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_AGENT:[nome]`, `COLETAR:[campo]` — do not invent new keywords.
- **Commits never include "Generated with Claude Code" or "Co-Authored-By"** signatures (explicit project rule in `CLAUDE.md` and `docs/proibido-fazer.md`).

---

*Convention analysis: 2026-07-04*
