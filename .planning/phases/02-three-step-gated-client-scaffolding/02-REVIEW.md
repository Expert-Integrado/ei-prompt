---
phase: 02-three-step-gated-client-scaffolding
reviewed: 2026-07-05T21:58:52Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - .claude/agents/client-scaffold-collect.md
  - .claude/agents/client-scaffold-fill.md
  - .claude/agents/client-scaffold-structure.md
  - .claude/commands/ei-cria-cliente.md
  - .claude/hooks/post-scaffolder-review.sh
  - manifest.json
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-05T21:58:52Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This phase replaces the old single-shot `client-project-scaffolder` with a 3-step gated pipeline (`client-scaffold-structure` → `client-scaffold-collect` → human gate → `client-scaffold-fill`), retargets the `post-scaffolder-review.sh` audit hook to the new `client-scaffold-fill` subagent, and updates `manifest.json` to distribute the new agents and deprecate the old one.

The individual prompt files are well-written and internally documented, but three provable defects undermine the phase's stated Core Value ("never let a client file with broken XML slip through unaudited" / "never let the fill step run without an explicit human gate"):

1. The old, fully-capable, un-gated `client-project-scaffolder` subagent is still present on disk and still trivially matchable by Claude's subagent routing, which completely bypasses the new 3-step gate.
2. The data contract between `client-scaffold-collect` and `client-scaffold-fill` has no file/location attribute, so the non-interactive `fill` step (which by design has no memory of the collection conversation) cannot reliably determine which of five target files a given collected field belongs to.
3. The audit-trigger hook uses a single global, unscoped sentinel to prevent re-injection loops; the new multi-specialty loop this same phase introduces (Passo 4B.1(b)) calls `client-scaffold-fill` multiple times per session, and the second and later calls will silently skip the automatic `docs-reviewer` audit once the sentinel is inside the hook's 2000-line lookback window — directly contradicting the guarantee documented in `ei-cria-cliente.md` Passo 5.

Several smaller consistency and least-privilege issues are also present (see Warnings/Info).

## Critical Issues

### CR-01: Old un-gated scaffolder subagent still live and discoverable, bypasses the entire 3-step gate

**File:** `.claude/agents/client-project-scaffolder.md` (whole file, 116 lines); also `manifest.json:39`

**Issue:** `manifest.json` moves `.claude/agents/client-project-scaffolder.md` into `deprecated_files` (so `bin/cli.js` will delete it from *downstream* client installations on their next `/ei-update`), but the file itself is never deleted from this repository. Its YAML frontmatter (`description:` with several natural-language examples like `"Preciso criar um projeto para o cliente Maria"`) still makes it a strong match for Claude's automatic subagent routing whenever a user asks to create a new client in *this* repo. That subagent performs the entire structure+collect+fill flow in a single, non-gated invocation (no `AskUserQuestion` confirmation step at all — see its Fase 4/5). Leaving it in place means the new mandatory human-approval gate (`ei-cria-cliente.md`'s "REGRA INVIOLÁVEL DO GATE DE CONFIRMAÇÃO") can be trivially bypassed simply by Claude (or a user) invoking the old subagent name instead of the new pipeline — exactly the failure mode this phase exists to close.

**Fix:** Delete `.claude/agents/client-project-scaffolder.md` from the repository now that it is superseded and listed in `deprecated_files`. If it must be kept for historical reference, move it out of `.claude/agents/` (e.g. into `.planning/` or docs) so it can no longer be matched as a live subagent.

### CR-02: `client-scaffold-fill` has no way to know which file each collected field belongs to

**File:** `.claude/agents/client-scaffold-collect.md:52-73`, `.claude/agents/client-scaffold-fill.md:27,31`

**Issue:** `client-scaffold-fill.md` is explicitly non-interactive and has *no memory of the Passo 2 conversation* ("não tem memória da conversa do Passo 2 — o comando precisa colar o bloco inteiro" / "este é o único registro que você tem do que foi perguntado; não existe conversa anterior para consultar", line 27). Its very first instruction (line 31) says: for each `<campo>`, "Read o arquivo de cliente relevante ... (o campo pertence a um arquivo específico — Orquestrador, Qualifier, Scheduler, Protractor ou Follow-Up, **conforme o placeholder original**)".

But the `<dados_coletados>` schema produced by `client-scaffold-collect` (lines 52-66) carries only `nome`, `valor`, and `pendente` on each `<campo>` — there is no `arquivo`/file attribute, and no reference to the original placeholder text or which template it came from. The fill agent is told to act "conforme o placeholder original" but is given no data that identifies that placeholder or its file. This is a genuine contract gap between the two subagents: `client-scaffold-fill` must either guess the target file from field-name semantics (unreliable — many fields are ambiguous across Orquestrador/Qualifier/Scheduler) or brute-force-read all 5 files looking for a matching bracket placeholder (not instructed, and fragile if the collected `nome` doesn't textually match the placeholder verbatim). Either way this is undocumented, non-deterministic behavior at the core handoff point of the entire phase.

**Fix:** Add a mandatory `arquivo` (or `placeholder`) attribute to `<campo>` in `client-scaffold-collect`'s output schema, e.g.:
```xml
<campo nome="cnpj" arquivo="Orquestrador.md" placeholder="[CNPJ]" valor="" pendente="true"/>
```
and update `client-scaffold-fill.md` to route strictly by that attribute instead of inferring "conforme o placeholder original."

### CR-03: Audit-trigger sentinel is global, not scoped per invocation — multi-specialty loop silently skips audits after the first specialty

**File:** `.claude/hooks/post-scaffolder-review.sh:41-71`; `.claude/commands/ei-cria-cliente.md:193, 202`

**Issue:** The `client-scaffold-fill` branch guards against re-injection loops by checking whether the literal marker `<scaffolder-review-triggered/>` already appears anywhere in the last 2000 transcript lines (lines 59-62), and if so exits silently without injecting the `docs-reviewer` audit instruction again. This sentinel carries no unique id (unlike the `<ei-ajustes-round id="...">` mechanism used in the `docs-editor-conciso` branch of the *same file*, which is correctly scoped per round).

This same phase adds the multi-specialty loop in `ei-cria-cliente.md` Passo 4B.1(b), which sequentially dispatches `client-scaffold-structure` → `client-scaffold-collect` → gate → `client-scaffold-fill` once **per specialty** (N ≥ 2 in the common multi-agent case). Once specialty 1's `client-scaffold-fill` run emits the sentinel, every subsequent specialty's `client-scaffold-fill` run in the same session will hit the "sentinel already present" branch and exit 0 — as long as that marker is still within the trailing 2000 lines, which is highly likely given per-specialty cycles are typically much shorter than 2000 transcript lines. The result: only the first specialty's generated files are ever automatically audited by `docs-reviewer`; specialties 2..N are silently never audited by the hook.

This directly contradicts the documented guarantee in `ei-cria-cliente.md:193`: "A auditoria automática (`docs-reviewer`) é disparada via hook `SubagentStop` **ao fim de cada agente**," and Passo 5's requirement to report an audit verdict per generated agent file. The hook's own comment (lines 55-58) only anticipates this as an edge case for "um 2º cliente criado logo em seguida na MESMA sessão" — it does not account for the multi-specialty loop this same phase introduces, where re-triggering for every `client-scaffold-fill` call is the *normal*, expected case, not an edge case.

**Fix:** Scope the sentinel per invocation, mirroring the round-id pattern already used in the `docs-editor-conciso` branch — e.g. have the main agent emit `<scaffolder-review-triggered client_path="..."/>` (or a monotonically incrementing id) and have the hook only suppress re-injection for an *already-consumed* marker matching the specific `client-scaffold-fill` invocation currently ending, not any prior one in the session.

## Warnings

### WR-01: Follow-Up.md is filled but never listed in the automated audit instruction

**File:** `.claude/hooks/post-scaffolder-review.sh:67`; `.claude/agents/client-scaffold-fill.md:31`

**Issue:** `client-scaffold-fill.md` explicitly lists `Follow-Up` as one of the five possible target files for a collected field ("Orquestrador, Qualifier, Scheduler, Protractor ou Follow-Up", line 31), and `client-scaffold-structure.md`/`client-scaffold-collect.md` both copy/scope `Follow-Up.md` as part of the client stack. However, the injected audit instruction in the hook only tells the main agent to invoke `docs-reviewer` for "Orquestrador, Qualifier, Scheduler, Protractor" — `Follow-Up.md` is never mentioned. Since `Follow-Up.md` carries the same XML "casca" risk as the other four files, this is a real gap in the audit-everything guarantee that is this project's stated Core Value. (This gap pre-dates this phase but was not fixed despite the phase's explicit purpose of hardening this exact pipeline.)

**Fix:** Update the `additionalContext` string in `post-scaffolder-review.sh` to include `Follow-Up` in the list of files to audit.

### WR-02: Inconsistent mode-name vocabulary within `client-scaffold-collect.md`

**File:** `.claude/agents/client-scaffold-collect.md:29,47`

**Issue:** "Entrada Esperada" (line 29) defines `<modo>` as taking the values `single` or `multi`, matching what `ei-cria-cliente.md` actually sends this subagent (`modo: single` / `modo: multi`). But "Regra Multi-Agente" (line 47) refers to "modo `multi-agente-especialidade-unica`" — the longer mode name that actually belongs to `client-scaffold-structure.md`'s vocabulary, not this file's. This looks like a copy-paste from the structure subagent without adjusting terminology, and could confuse a future editor about which literal value this subagent actually receives.

**Fix:** Change line 47 to reference `modo multi` (this file's own vocabulary), consistent with line 29-31.

### WR-03: Self-contradictory constraint in `client-scaffold-structure.md` about content modification

**File:** `.claude/agents/client-scaffold-structure.md:46,59`

**Issue:** Fase 2 (multi-agente) explicitly instructs the subagent to strip `////` comment markers from `Protractor.md` to activate `TRANSFERIR_PARA_AGENT` (line 46) — a content transformation, not a pure copy. Yet "REGRAS CRÍTICAS" (line 59) states: "Este subagent não tem capacidade de modificação de conteúdo além dos comandos de cópia via `Bash` — não pode e não deve tentar customizar nenhum arquivo." Read literally, this blanket rule contradicts the concrete instruction on line 46 and could cause an LLM interpreting the rules strictly to refuse the required comment-stripping step, or to skip it out of caution.

**Fix:** Reword line 59 to explicitly carve out the documented `////`-stripping operation as an allowed "copy command" (e.g., "...não pode e não deve customizar conteúdo além do necessário para ativar `TRANSFERIR_PARA_AGENT` conforme Fase 2").

### WR-04: No validation that the stated specialty count matches the actual name list

**File:** `.claude/commands/ei-cria-cliente.md:128-131`

**Issue:** Passo 4B.1(a) asks the user "Quantas especialidades?" and separately "Liste os nomes das especialidades, separados por vírgula", but there is no instruction to validate that the stated count matches the number of names actually parsed from the comma-separated list. A mismatch (e.g., user says "3" but lists 2 names, or has a stray comma) will silently drive the loop off the parsed name list with no cross-check, potentially creating fewer/more specialty folders than the user intended without any error being surfaced.

**Fix:** Add an explicit validation step: parse the name list, count the entries, and confirm the count with the user (or simply drop the separate "quantas" question and derive the count solely from the name list) before starting Passo 4B.1(b)'s loop.

### WR-05: Unused `Grep`/`TodoWrite` tool grants on a read-only conversational subagent

**File:** `.claude/agents/client-scaffold-collect.md:9`

**Issue:** The frontmatter grants `Read, Glob, Grep, TodoWrite`, but the body's documented flow only ever uses `Glob` (line 34) and `Read` (line 34); `Grep` and `TodoWrite` are never referenced anywhere in the instructions. For a subagent whose entire design intent is to be strictly read-only/non-destructive (explicitly emphasized in "Regras Críticas"), granting tools that are never exercised is an unnecessary least-privilege violation and dead configuration.

**Fix:** Remove `Grep` and `TodoWrite` from the `tools:` frontmatter unless there is a documented use for them, or add explicit instructions for when they should be used.

## Info

### IN-01: Overloaded "Passo N" numbering between top-level command steps and per-client sub-steps

**File:** `.claude/commands/ei-cria-cliente.md:43-45`

**Issue:** The reusable subsection is titled "Gate de Confirmação (Passo 2→3)", using "2" and "3" to mean the *sub-steps* of a per-client cycle (collect = step 2, gate = step 3, as enumerated in Passo 4A/4B.1(b)). But the command's own top-level numbering already assigns "Passo 2" to "Nome do cliente" and "Passo 3" to "Modo" (lines 20-23). Reusing the same numbers for a different, nested numbering scheme in the same document is confusing for future maintainers even though the current prose disambiguates via context.

**Fix:** Rename the anchor to something scope-unambiguous, e.g. "Gate de Confirmação (entre coleta e preenchimento)".

### IN-02: Headless/no-TTY fallback only documented for the confirmation gate

**File:** `.claude/commands/ei-cria-cliente.md:24-38, 68, 107-121`

**Issue:** The note about `AskUserQuestion` auto-resolving with `answers={}` in headless/no-TTY environments, and the fail-closed handling of that case, is documented only for the "Gate de Confirmação" (line 68). The other mandatory `AskUserQuestion` calls in the same command — Passo 3 (single vs. multi mode) and Passo 4B (full flow vs. bypass) — have no documented behavior for the same headless auto-resolution scenario, leaving it unspecified whether the command should default to a safe option, ask again, or abort in that case.

**Fix:** Either generalize the headless-handling note to cover every `AskUserQuestion` call in the command, or explicitly state a fail-safe default for Passo 3/4B when `answers={}`.

---

_Reviewed: 2026-07-05T21:58:52Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
