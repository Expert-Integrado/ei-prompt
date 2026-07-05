---
phase: 02-three-step-gated-client-scaffolding
plan: 01
subsystem: infra
tags: [claude-code-subagents, prompt-engineering, scaffolding, xml-contracts]

# Dependency graph
requires:
  - phase: 01-xml-validation-hook
    provides: XML casca validation hook and preserved blind-spot rules that client-scaffold-fill must not "fix"
provides:
  - Three new tool-scoped subagents replacing the monolithic client-project-scaffolder for the 3-step gated flow (SCAF-01)
  - client-scaffold-structure (Passo 1) — file-I/O only, zero questions (SCAF-02)
  - client-scaffold-collect (Passo 2) — read-only conversational collector with structured <dados_coletados> output contract (SCAF-03)
  - client-scaffold-fill (Passo 3) — non-interactive template writer preserving {{variavel}} and pending markers (SCAF-06)
affects: [02-02-manifest-and-hook-retarget, 02-03-command-single-agent-gate, 02-04-command-multi-agent-gate, 02-05-live-smoke-test]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool-scoped subagent chaining: each step's tools: frontmatter is the structural (not just prose) enforcement boundary"
    - "XML-tagged hand-off contract (<dados_coletados> with <campo>/<midias>/<midia>) mirroring docs-analyzer.md's <formato_resposta> convention"

key-files:
  created:
    - .claude/agents/client-scaffold-structure.md
    - .claude/agents/client-scaffold-collect.md
    - .claude/agents/client-scaffold-fill.md
  modified: []

key-decisions:
  - "Named the three subagents client-scaffold-structure/-collect/-fill (D-02 discretion), keeping the client-scaffold-* shared prefix so post-scaffolder-review.sh's case branches stay greppable as a family (per Plan 02-02)"
  - "client-scaffold-structure gets tools: Bash, Glob, Read only — no Write/Edit, so it cannot customize content even if prompted to"
  - "client-scaffold-collect gets tools: Read, Glob, Grep, TodoWrite only — no Write/Edit/Bash, so it cannot fill templates even if induced to"
  - "client-scaffold-fill gets tools: Read, Edit, Write — the only one of the three with write capability, keeping the blast radius of a bad edit contained to this one subagent"
  - "Neither client-scaffold-collect nor client-scaffold-fill references AskUserQuestion by name in their own prompt body — the real hard gate lives exclusively in /ei-cria-cliente.md, to be added in Plan 02-03/02-04"

patterns-established:
  - "Pattern 1 (RESEARCH.md): tool restriction as structural enforcement of step boundaries, not prompt instruction alone"
  - "Pattern 3 (RESEARCH.md): <dados_coletados> as the literal, byte-identical XML contract between client-scaffold-collect (producer) and client-scaffold-fill (consumer)"

requirements-completed: [SCAF-01, SCAF-02, SCAF-03, SCAF-06]

coverage:
  - id: D1
    description: "client-scaffold-structure.md created with tools: Bash, Glob, Read (no write capability), covering both single-agent and multi-agente-especialidade-unica structure creation, zero client-data questions"
    requirement: "SCAF-01"
    verification:
      - kind: other
        ref: "grep frontmatter assertions (name/tools lines) — see Task 1 <automated> verify command, executed and passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "client-scaffold-structure.md asks zero client-data questions and returns control without proceeding to collection or filling"
    requirement: "SCAF-02"
    verification: []
    human_judgment: true
    rationale: "Prompt-body fidelity to 'asks zero questions' can only be confirmed by exercising the subagent in a live session (per RESEARCH.md Validation Architecture — no test framework exists for conversational/orchestration behavior in this repo); Plan 02-05's live smoke test is the actual verification point."
  - id: D3
    description: "client-scaffold-collect.md created with tools: Read, Glob, Grep, TodoWrite (no write capability), declares <dados_coletados> output schema with <campo> and <midias>/<midia>, documents mandatory media collection and multi-agent per-specialty scoping, zero references to AskUserQuestion"
    requirement: "SCAF-03"
    verification:
      - kind: other
        ref: "grep frontmatter + schema + mediaType + AskUserQuestion-absence assertions — see Task 2 <automated> verify command, executed and passed"
        status: pass
    human_judgment: false
  - id: D4
    description: "client-scaffold-fill.md created with tools: Read, Edit, Write, documents the <dados_coletados> input contract, preserves {{variavel}} and [PENDENTE ...] markers verbatim, is explicitly non-interactive"
    requirement: "SCAF-06"
    verification:
      - kind: other
        ref: "grep frontmatter + dados_coletados + {{variavel}} + PENDENTE assertions — see Task 3 <automated> verify command, executed and passed"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-07-05
status: complete
---

# Phase 2 Plan 1: Three Dedicated Scaffolding Subagents Summary

**Three tool-scoped subagents (client-scaffold-structure, client-scaffold-collect, client-scaffold-fill) sliced from the monolithic client-project-scaffolder, each with a `tools:` frontmatter allowlist that structurally enforces its step boundary rather than relying on prompt wording alone.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-05
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments

- `client-scaffold-structure.md` (Passo 1): pure file-I/O subagent (`Bash, Glob, Read`) that creates the folder/file skeleton for both `single-agent` and `multi-agente-especialidade-unica` modes, copying `modelo/` templates verbatim and asking zero client-data questions (SCAF-02).
- `client-scaffold-collect.md` (Passo 2): read-only conversational collector (`Read, Glob, Grep, TodoWrite`) that scans the already-created client files for every required field and mídia, conducts the Q&A, and returns a structured `<dados_coletados>` XML block (SCAF-03) — structurally incapable of writing or editing anything.
- `client-scaffold-fill.md` (Passo 3): the only one of the three with write capability (`Read, Edit, Write`), consumes `<dados_coletados>` embedded literally in its invocation prompt (no memory of Passo 2's conversation) and fills templates while preserving `{{variavel}}` and `[PENDENTE - informação não fornecida]` markers verbatim (SCAF-06).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create client-scaffold-structure.md** - `660f511` (feat)
2. **Task 2: Create client-scaffold-collect.md** - `fa209b3` (feat)
3. **Task 3: Create client-scaffold-fill.md** - `a7280ba` (feat)

## Files Created/Modified

- `.claude/agents/client-scaffold-structure.md` - Passo 1 subagent, zero-question folder/file scaffolding for both operation modes
- `.claude/agents/client-scaffold-collect.md` - Passo 2 subagent, read-only field+mídia collector with `<dados_coletados>` output contract
- `.claude/agents/client-scaffold-fill.md` - Passo 3 subagent, non-interactive template writer consuming `<dados_coletados>`

## Decisions Made

- Locked in the exact subagent file names (`client-scaffold-structure`/`-collect`/`-fill`) per D-02's planner discretion, following the `client-scaffold-*` shared-prefix convention so `post-scaffolder-review.sh`'s `case` branches stay greppable as a family (referenced explicitly by Plan 02-02).
- Enforced the Passo 1→2→3 boundary via `tools:` frontmatter restriction rather than prompt instruction alone, per RESEARCH.md Pattern 1 and the plan's threat model (T-2-01a): `client-scaffold-collect` has no `Write`/`Edit`/`Bash`, so it is structurally incapable of filling templates regardless of what its prompt says.
- Deliberately excluded any reference to the platform's structured single-shot confirmation-choice tool (`AskUserQuestion`) from both `client-scaffold-collect.md` and `client-scaffold-fill.md`'s own prompt bodies, per threat T-2-01b — the real hard gate must live exclusively in `/ei-cria-cliente.md` (Plan 02-03/02-04), never narrated inside a subagent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None - all three files are complete, functioning subagent definitions ready to be dispatched by the rewritten `/ei-cria-cliente.md` command (Plan 02-03/02-04). They are not yet wired into any command or `manifest.json` entry — that wiring is explicitly Plan 02-02 (manifest + hook retarget) and Plan 02-03/02-04 (command rewrite) scope, not a stub in this plan's own deliverable.

## Threat Flags

None - both STRIDE threats in this plan's threat model (T-2-01a, T-2-01b) were mitigated directly by the tool-scoping and AskUserQuestion-omission decisions documented above; no new, unaddressed surface was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The three subagent files exist and pass all automated frontmatter/content verification checks; they are the building blocks Plan 02-02/02-03/02-04 will wire into `manifest.json`, `post-scaffolder-review.sh`, and `/ei-cria-cliente.md`.
- Plan 02-02 must add these three paths to `manifest.json` `files[]` and move `client-project-scaffolder.md` to `deprecated_files[]`, and retarget `post-scaffolder-review.sh`'s `case` branch from `client-project-scaffolder` to `client-scaffold-fill`.
- Plan 02-03/02-04 must build the `AskUserQuestion` hard gate in `/ei-cria-cliente.md` between the `client-scaffold-collect` and `client-scaffold-fill` dispatches, mirroring `/ei-ajustes.md` Passo 3.5 caminho [A] per D-06/D-07 — no gate exists yet inside any file created by this plan, by design.
- No blockers.

---
*Phase: 02-three-step-gated-client-scaffolding*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created files and task commit hashes verified present on disk and in git log.
