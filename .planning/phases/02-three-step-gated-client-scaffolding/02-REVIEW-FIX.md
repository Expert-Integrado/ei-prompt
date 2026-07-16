---
phase: 02-three-step-gated-client-scaffolding
fixed_at: 2026-07-06T02:20:28Z
review_path: .planning/phases/02-three-step-gated-client-scaffolding/02-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-07-06T02:20:28Z
**Source review:** .planning/phases/02-three-step-gated-client-scaffolding/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 Critical + 5 Warning; Info findings out of scope per `fix_scope: critical_warning`)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Old un-gated scaffolder subagent still live and discoverable, bypasses the entire 3-step gate

**Files modified:** `.claude/agents/client-project-scaffolder.md` (deleted)
**Commit:** `41f2c2c`
**Applied fix:** Deleted the file from the repository. It was already listed in `manifest.json`'s `deprecated_files` (no change needed there — that entry now correctly reflects a file that no longer exists live in this repo), so downstream client installs will still get it removed on `/ei-update`, and it can no longer be matched as a live Claude subagent in this repo, closing the gate-bypass path.

### CR-02: `client-scaffold-fill` has no way to know which file each collected field belongs to

**Files modified:** `.claude/agents/client-scaffold-collect.md`, `.claude/agents/client-scaffold-fill.md`
**Commit:** `d92a025`
**Applied fix:** Added a mandatory `arquivo` attribute to `<campo>` in `client-scaffold-collect`'s output schema (example block + a new explicit schema rule stating it is required, plus a note in the collection flow instructing the subagent to track which file each placeholder came from while enumerating fields). Updated `client-scaffold-fill.md`'s fill instruction to route strictly by `arquivo` instead of inferring "conforme o placeholder original," and added an explicit instruction to stop and report (never guess) if a `<campo>` arrives without the `arquivo` attribute.

### CR-03: Audit-trigger sentinel is global, not scoped per invocation — multi-specialty loop silently skips audits after the first specialty

**Files modified:** `.claude/hooks/post-scaffolder-review.sh`, `.claude/commands/ei-cria-cliente.md`
**Commit:** `abe4fcd`
**Applied fix:** Mirrored the round-id pattern already used in the `docs-editor-conciso` branch of the same hook file. `ei-cria-cliente.md` now instructs the main agent to emit a fresh `<scaffolder-fill-round id="fill-<UNIX_TIMESTAMP>-<3_ALFANUM>"/>` sentinel (new id per invocation) immediately before every `client-scaffold-fill` dispatch, in both Passo 4A (single-agent) and Passo 4B.1(b) (multi-specialty loop, one new id per specialty iteration). The hook now extracts the most recent round id from the transcript and only suppresses re-injection for a completion marker matching that exact id (`<scaffolder-review-triggered id="...">`), rather than any prior global marker — so each specialty's `client-scaffold-fill` invocation gets its own independent audit trigger. A backward-compatible fallback (old global, unscoped marker) is retained for the case where no round id is found in the transcript. The JSON payload construction was moved from a static heredoc to a small `node -e` snippet using `JSON.stringify` to correctly escape the dynamically-embedded id inside the nested XML-attribute-inside-JSON-string structure. Verified end-to-end with a simulated multi-specialty transcript: 1st specialty audit triggers, repeated pauses within the same invocation are suppressed, and the 2nd specialty (new round id) correctly triggers a fresh audit injection.

## Fixed Issues (Warnings)

### WR-01: Follow-Up.md is filled but never listed in the automated audit instruction

**Files modified:** `.claude/hooks/post-scaffolder-review.sh`
**Commit:** `0b165af`
**Applied fix:** Added `Follow-Up` to the list of files the injected `additionalContext` instructs the main agent to audit via `docs-reviewer` (was: Orquestrador, Qualifier, Scheduler, Protractor — now includes Follow-Up).

### WR-02: Inconsistent mode-name vocabulary within `client-scaffold-collect.md`

**Files modified:** `.claude/agents/client-scaffold-collect.md`
**Commit:** `09f06e3`
**Applied fix:** Changed "Regra Multi-Agente" section's reference from `modo multi-agente-especialidade-unica` (which belongs to `client-scaffold-structure.md`'s vocabulary) to `modo multi`, matching the literal value this subagent actually receives per its own "Entrada Esperada" section.

### WR-03: Self-contradictory constraint in `client-scaffold-structure.md` about content modification

**Files modified:** `.claude/agents/client-scaffold-structure.md`
**Commit:** `62030b3`
**Applied fix:** Reworded the blanket "no content modification" rule in REGRAS CRÍTICAS to explicitly carve out the documented `////`-stripping operation for `Protractor.md` (required by Fase 2), removing the contradiction that could cause an LLM to refuse or skip the required comment-stripping step.

### WR-04: No validation that the stated specialty count matches the actual name list

**Files modified:** `.claude/commands/ei-cria-cliente.md`
**Commit:** `0f9d7fd`
**Applied fix:** Dropped the separate "Quantas especialidades?" question (which created a second, divergable source of truth) and now derive the specialty count solely from parsing the comma-separated name list (trimmed, counted). Added an explicit confirmation step where the main agent restates the parsed list and count back to the user before starting the Passo 4B.1(b) loop, catching stray commas or count mismatches before any folders are created.

### WR-05: Unused `Grep`/`TodoWrite` tool grants on a read-only conversational subagent

**Files modified:** `.claude/agents/client-scaffold-collect.md`
**Commit:** `48baa10`
**Applied fix:** Removed `Grep` and `TodoWrite` from the `tools:` frontmatter, leaving `Read, Glob` — matching the tools actually exercised by the documented flow (confirmed no remaining references to either tool in the file body).

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-06T02:20:28Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
