# Milestones

## v1.0 Validacao XML e Scaffolding em 3 Passos (Shipped: 2026-07-16)

**Phases completed:** 4 phases, 17 plans, 36 tasks

**Key accomplishments:**

- Wired Plan 01's validator engine to real Claude Code transcripts: `discoverTouchedFiles` extracts only-this-turn's Edit/Write file_path values from JSONL, `runCli` produces the exact `{decision:'block',reason}`/`{}` contract, both confirmed against genuinely live transcript files in this repo (not just synthetic fixtures).
- Wired the walking skeleton's final vertical slice: `validate-xml-casca.sh` shells out to Plan 02's CLI, registered under both `Stop` and `SubagentStop` in `.claude/settings.json` alongside the existing hooks, distributed to end users via `manifest.json`, and live-confirmed against a real Claude Code lifecycle event.
- Closed the D-06/WR-02 verification gap: `discoverTouchedFiles` now scopes Edit/Write discovery to the current transcript turn via genuine-user-turn-boundary detection, and `runCli` no longer blocks on a discovered file that has since been deleted.
- Three tool-scoped subagents (client-scaffold-structure, client-scaffold-collect, client-scaffold-fill) sliced from the monolithic client-project-scaffolder, each with a `tools:` frontmatter allowlist that structurally enforces its step boundary rather than relying on prompt wording alone.
- manifest.json now ships client-scaffold-structure/-collect/-fill and actively retires client-project-scaffolder.md; post-scaffolder-review.sh's SubagentStop audit now fires on client-scaffold-fill instead of the retired agent name
- `/ei-cria-cliente.md` Passo 4A now chains `client-scaffold-structure` → `client-scaffold-collect` → a new "Gate de Confirmação" hard gate → `client-scaffold-fill`, delivering the first complete end-to-end vertical slice of the 3-step gated scaffolding flow for single-agent clients.
- `/ei-cria-cliente.md` Passo 4B.1(b) now chains `client-scaffold-structure` → `client-scaffold-collect` → the shared "Gate de Confirmação" → `client-scaffold-fill` per especialidade, sequentially, with Cancel-at-gate continuing the loop instead of aborting the run — completing the second and final vertical slice of the 3-step gated scaffolding flow (multi-agent mode).
- Phase 1's XML casca validator suite re-confirmed green (27/27), and both live-session human-verify checkpoints (single-agent happy path, multi-agent with a deliberate Cancel) were explicitly approved by the human running real Claude Code sessions — closing out the phase's only manual-only proof point for SCAF-01 through SCAF-06.
- New `client/CLAUDE.md` source file (verbatim copy of root CLAUDE.md minus the Commits section) plus manifest.json's `files[]` CLAUDE.md entry converted to the new `{from, to}` object shape — root CLAUDE.md left untouched.
- bin/cli.js gains a single normalizeEntry()/formatManifestEntry() gate for manifest.json's mixed string/{from,to} schema, with a requirable module.exports guard and an 8-case bin/cli.test.js proving both functions in isolation
- Applied RESEARCH.md Pattern 3 (Glob-check client/CLAUDE.md, fallback to CLAUDE.md) to all 9 distributed subagents/commands that previously assumed CLAUDE.md held the client payload — 11 edit points across 3 atomic commits, unblocking Plan 03-04's removal of root CLAUDE.md
- Root `CLAUDE.md` deleted entirely (D-07); `.claude/CLAUDE.md`'s commits-rule line no longer cites the removed file as a source (D-08).
- check-claude-md-audience.sh: deterministic Stop/SubagentStop guard blocking migrated headings from leaking back into CLAUDE.md/.claude/CLAUDE.md, wired only into gitignored settings.local.json — human-approved end-to-end distribution checkpoint closes the phase
- Renamed 3 retired-subagent mentions + rewrote a factually-backwards confirmation line in recepcionista-scaffolder.md, and added the client/CLAUDE.md-first fallback to inject-ei-context.sh matching every other consumer in the repo
- Corrected 5 stale references in `.claude/CLAUDE.md` and rewrote `COMANDOS.md`'s `/ei-cria-cliente` Fluxo section to document the current 3-step gated scaffolding chain (`client-scaffold-structure` → `client-scaffold-collect` → Gate de Confirmação → `client-scaffold-fill`) instead of the retired monolithic single-subagent flow.
- Renamed the retired `client-project-scaffolder` subagent to the correct 3-step chain (`client-scaffold-structure`/`client-scaffold-collect`/`client-scaffold-fill`) across 7 current-state files — the npm-distributed `client/CLAUDE.md` payload, `PROJECT.md`/`STATE.md` Core Value statements, and 4 GSD-generated codebase-mapping docs — closing `03.1-VERIFICATION.md` truth #7.

---
