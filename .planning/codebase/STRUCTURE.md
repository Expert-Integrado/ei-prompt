# Codebase Structure

**Analysis Date:** 2026-07-04

## Directory Layout

```
EiPrompt/
├── bin/
│   └── cli.js                       # npm bin entry — downloads/updates agent files from GitHub
├── manifest.json                    # List of files to install/update and deprecated files to remove
├── modelo/                          # Read-only canonical agent prompt templates
│   ├── Orquestrador.md
│   ├── Qualifier.md
│   ├── Scheduler.md
│   ├── Protractor.md
│   ├── Recepcionista.md
│   └── Follow-Up.md
├── docs/                            # Fractioned detailed rules referenced by root CLAUDE.md
│   ├── regras-edicao.md
│   ├── regras-validacao.md
│   ├── proibido-fazer.md
│   └── multi-agente-recepcionista.md
├── .claude/
│   ├── commands/                    # Slash commands (multi-step playbooks for main Claude agent)
│   │   ├── ei-cria-cliente.md
│   │   ├── ei-ajustes.md
│   │   └── ei-update.md
│   ├── agents/                      # Subagent definitions (isolated-context tasks)
│   │   ├── client-project-scaffolder.md
│   │   ├── recepcionista-scaffolder.md
│   │   ├── docs-analyzer.md
│   │   ├── docs-editor-conciso.md
│   │   └── docs-reviewer.md
│   ├── hooks/                       # Bash scripts reacting to Claude Code lifecycle events
│   │   ├── inject-ei-context.sh     # Disabled since v1.8.9 (context injection)
│   │   ├── post-scaffolder-review.sh
│   │   ├── post-ajustes-fanout.sh
│   │   └── prompt-matches-agent.sh
│   ├── settings.json                # Registers Stop/SubagentStop hook bindings
│   └── worktrees/                   # Git worktree scratch area (not part of shipped manifest)
├── .planning/                       # GSD planning artifacts (phases, codebase docs — this file's home)
│   └── codebase/
├── .github/
│   └── workflows/                   # CI: publish-to-npm-on-merge-to-main Action
├── CLAUDE.md                        # Root index of project rules, links into docs/
├── CHANGELOG.md                     # Version history (shipped as part of manifest)
├── COMANDOS.md                      # Command reference doc (not in manifest — repo-local)
├── README.md
└── RELEASE.md                       # Notes on release flow (repo-local, per user memory: outdated re: npm publish)
```

## Directory Purposes

**`bin/`:**
- Purpose: single executable entry point for the npm package
- Contains: `cli.js` — the entire CLI implementation (~143 lines), no submodules
- Key files: `bin/cli.js`

**`modelo/`:**
- Purpose: canonical, read-only source-of-truth agent persona prompts, distributed via `manifest.json` and copied into client projects by scaffolder subagents
- Contains: one `.md` file per agent role
- Key files: `modelo/Orquestrador.md` (main conversational controller, 309 lines — largest template), `modelo/Scheduler.md` (307 lines)
- **Never edit directly** — `docs/proibido-fazer.md`

**`docs/`:**
- Purpose: detailed rule sets fractioned out of the root `CLAUDE.md` index, loaded manually (auto-injection hook is disabled)
- Contains: editing rules, validation checklists, hard prohibitions, multi-agent Recepcionista personification behavior
- Key files: `docs/regras-edicao.md` (180 lines, largest), `docs/proibido-fazer.md` (hard limits)

**`.claude/commands/`:**
- Purpose: slash-command playbooks executed inline by the main Claude Code agent
- Contains: numbered "Passo N" procedural markdown with subagent invocation templates and inviolable rules
- Key files: `.claude/commands/ei-ajustes.md` (765 lines — by far the most complex command, encodes the full analyze→approve→edit→review pipeline)

**`.claude/agents/`:**
- Purpose: subagent definitions invoked via the Agent/Task tool, each with its own context/model/tool restrictions
- Contains: scaffolder subagents (create client stacks) and docs pipeline subagents (analyze/edit/review)
- Key files: `.claude/agents/docs-analyzer.md` (207 lines, opus model, read-only)

**`.claude/hooks/`:**
- Purpose: bash scripts registered against Claude Code lifecycle events (`Stop`, `SubagentStop`) to chain automation steps
- Contains: sentinel-detection and anti-loop-guarded shell scripts
- Key files: `.claude/hooks/post-ajustes-fanout.sh` (drives Passo 5→6 transition in `/ei-ajustes`), `.claude/hooks/post-scaffolder-review.sh`

**`.claude/worktrees/`:**
- Purpose: git worktree scratch space used during development/testing
- Generated: Yes (git worktree mechanics)
- Committed: Not applicable — local working state, should not be treated as source

**`.planning/`:**
- Purpose: GSD workflow planning artifacts (phase docs, codebase maps such as this one)
- Contains: `.planning/codebase/` (ARCHITECTURE.md, STRUCTURE.md, etc.), likely `.planning/phases/` for GSD phase tracking (referenced in hook comments, e.g. `05-RESEARCH.md`)

**`.github/workflows/`:**
- Purpose: CI automation
- Contains: GitHub Action that publishes to npm on merge to `main` (per user memory: push-triggered, not tag-triggered)

## Key File Locations

**Entry Points:**
- `bin/cli.js`: npm CLI executable (`ei-prompt` bin command)

**Configuration:**
- `manifest.json`: single source of truth for which files ship/update/deprecate
- `package.json`: npm package metadata, `bin` mapping, `engines.node >= 18`
- `.claude/settings.json`: Claude Code hook registrations (Stop, SubagentStop)

**Core Logic:**
- `bin/cli.js`: fetch/write/remove file logic for distribution
- `.claude/commands/ei-ajustes.md`: the most complex workflow — client adjustment pipeline
- `.claude/hooks/post-ajustes-fanout.sh`: pipeline-continuation hook logic

**Testing:**
- Not detected — no test framework, test files, or test script in `package.json`

## Naming Conventions

**Files:**
- Agent persona templates: PascalCase Portuguese role names — `Orquestrador.md`, `Qualifier.md`, `Scheduler.md`, `Protractor.md`, `Recepcionista.md`, `Follow-Up.md`
- Slash commands: kebab-case with `ei-` prefix — `ei-cria-cliente.md`, `ei-ajustes.md`, `ei-update.md`
- Subagents: kebab-case, descriptive of role — `client-project-scaffolder.md`, `docs-analyzer.md`, `docs-editor-conciso.md`, `docs-reviewer.md`
- Hooks: kebab-case, `<trigger-context>-<action>.sh` — `post-scaffolder-review.sh`, `post-ajustes-fanout.sh`, `prompt-matches-agent.sh`
- Docs: kebab-case Portuguese descriptive names — `regras-edicao.md`, `proibido-fazer.md`

**Directories:**
- Top-level: lowercase single-word (`bin`, `docs`, `modelo`) or dot-prefixed Claude Code convention (`.claude`, `.github`, `.planning`)
- Generated client projects (outside this repo's tracked scope): human client name as folder, optionally with specialty subfolders for multi-agent clients — e.g. `Brunno Brandi/Consumidor/`

## Where to Add New Code

**New agent persona template:**
- Add to `modelo/<NovoNome>.md`
- Register the path in `manifest.json`'s `files` array so it ships via the CLI
- Reference it from any relevant scaffolder subagent (`.claude/agents/client-project-scaffolder.md` or `recepcionista-scaffolder.md`)

**New slash command:**
- Add `.claude/commands/<nome-comando>.md` following the "Passo N" numbered structure seen in `ei-ajustes.md`/`ei-cria-cliente.md`
- Register the path in `manifest.json`
- Document it in the "Slash Commands" table in root `CLAUDE.md` and in `COMANDOS.md`

**New subagent:**
- Add `.claude/agents/<nome>.md` with clear input/output XML contract (see `docs-analyzer.md` for the pattern)
- Register in `manifest.json`
- Wire invocation from the relevant command markdown

**New hook:**
- Add `.claude/hooks/<nome>.sh`, following the `set -uo pipefail` + `stop_hook_active` anti-loop guard pattern from `post-ajustes-fanout.sh`
- Register the event binding in `.claude/settings.json`
- Register the file path in `manifest.json`

**Utilities:**
- No shared JS utility module exists; `bin/cli.js` is self-contained. If CLI logic grows, consider extracting helpers into a `lib/` directory (not currently present).

## Special Directories

**`modelo/`:**
- Purpose: read-only template source of truth
- Generated: No (hand-authored)
- Committed: Yes

**`.claude/worktrees/`:**
- Purpose: git worktree scratch space
- Generated: Yes
- Committed: No (should be gitignored; verify against `.gitignore`)

**`.planning/`:**
- Purpose: GSD workflow state and generated codebase documentation
- Generated: Partially (codebase docs generated by mapper agents; phase docs hand/AI-authored during planning)
- Committed: Yes (per repo convention, `.planning/` is typically tracked)

---

*Structure analysis: 2026-07-04*
