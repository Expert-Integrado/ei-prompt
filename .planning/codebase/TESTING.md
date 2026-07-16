# Testing Patterns

**Analysis Date:** 2026-07-04

## Test Framework

**Runner:** None. There is no `jest.config.*`, `vitest.config.*`, `mocha.opts`, or any test runner dependency in `package.json` (which declares zero `dependencies`/`devDependencies`). No `*.test.*` or `*.spec.*` files exist anywhere in the repo.

**Assertion Library:** None present.

**Run Commands:** None defined — `package.json` has no `scripts` block at all, so there is no `npm test`.

**Why:** The repo has two very different surfaces, and neither uses conventional automated tests today:
1. `bin/cli.js` — a ~120-line file-sync CLI with no unit tests.
2. `modelo/*.md` and `.claude/agents/*.md` — natural-language LLM prompts, which are not unit-testable in the traditional sense.

If a future phase introduces JS testing for `bin/cli.js`, prefer a lightweight runner with zero/near-zero deps (e.g. Node's built-in `node:test` + `node:assert`) to stay consistent with the project's zero-dependency philosophy (`package.json` has no deps today).

## What Currently Substitutes for Testing

This project's actual quality gate is **agent-driven review and validation of prompt content**, not code tests. Treat these as the equivalent of "test suites" when planning verification work:

### 1. `docs-reviewer` subagent (`.claude/agents/docs-reviewer.md`)
Acts as the automated auditor after every prompt edit. Runs a fixed checklist against `CLAUDE.md`, `docs/regras-validacao.md`, and `docs/proibido-fazer.md`:
- CLAUDE.md conformance (no duplicate rules, no new `<formato_resposta>` fields, `modelo/` untouched)
- Content rules (`<conhecimento>` is index-only, media blocks well-formed)
- Agent architecture invariants (Orquestrador/Qualifier/Scheduler never terminate/transfer directly; only Protractor does; Recepcionista never qualifies/schedules)
- Prompt efficiency (conciseness, no unnecessary justification, structure `objetivo → fluxo → regras → formato`)
- Logical coherence with the rest of the file

Verdict format: `✅ APROVADO` or `❌ REPROVADO` with itemized problems + a punch-list for `docs-editor-conciso` to fix.

**Anti-loop cap:** if the input already carries `[CICLO_CORRECAO=2]`, the reviewer does NOT re-invoke the editor again — it reports remaining issues for manual fix instead. This bounds the auto-correct loop to exactly one automatic retry.

### 2. `docs-analyzer` subagent (`.claude/agents/docs-analyzer.md`)
Read-only (Opus) pre-edit analysis: maps a free-text adjustment request to the exact file + section that needs changing, replacing keyword heuristics. Used as a gate before `/ei-ajustes` invokes the editor.

### 3. Manual/structural validation checklists (`docs/regras-validacao.md`)
Checklist categories to run "post-commit" on any edited prompt file:
- **Pré-Commit:** no rule duplicated, sections have distinct purposes, examples minimal, `<formato_resposta>` fields unchanged, `<exemplos_resposta>` covers every `result` scenario.
- **`resume` field actions:** only the fixed keyword vocabulary is used; termination/transfer always delegates to Protractor.
- **Knowledge base (`<conhecimento>`):** index/summary only, no full document dumps, media links are direct URLs with valid `mediaType`.
- **Architecture:** Orquestrador/Qualifier/Recepcionista invariants (see CONVENTIONS.md).
- **`<fluxo_de_conversa>` structure (Orquestrador):** `## ETAPA 1..4` numbering, required headers/labels preserved, 3 branches in ETAPA 3, no "final transfer stage".
- **XML shell (`<agente>`):** single root, correct `tipo` attribute per agent type, no nesting, no raw `<`/`&` in fixed boilerplate.

### 4. XML well-formedness check (executable, closest thing to a real test)
```bash
xmllint --noout modelo/*.md
```
This is the one concrete, scriptable verification command in the repo. It must PASS on clean template content and FAIL with line/column info when the `<agente>` shell is malformed. Known accepted blind spot: a client's *variable* field content containing a raw `<` or `&` (e.g. "M&A") will legitimately fail this check for that one generated file — this is accepted, not fixed via escaping/CDATA (`docs/regras-validacao.md`).

### 5. Hook-based automation (semi-tested via sentinel protocol)
`.claude/hooks/post-ajustes-fanout.sh` (Stop event) and `.claude/hooks/post-scaffolder-review.sh` (SubagentStop event) implement a stateless sentinel/consumed handshake (`<ei-ajustes-round id=...>` / `<ei-ajustes-round-consumed id=...>`) to drive the edit→review pipeline without a state file. There is no automated test harness for these hooks; verification is manual (inspect hook output / transcript) per `CLAUDE.md`'s HOOK-02 rules.

## Test Types (mapped onto this project's actual verification layers)

**Unit-equivalent:** None for JS. For prompts, the closest analog is the `docs-reviewer` checklist run against a single edited file.

**Integration-equivalent:** The fan-out pipeline in `/ei-ajustes` (Passo 5/6 in `.claude/commands/ei-ajustes.md`) — parallel `docs-editor-conciso` instances edit N files, then parallel `docs-reviewer` instances cross-review with `<contexto_cruzado>` from sibling edits in the same round, capped at 2 correction cycles per file.

**E2E-equivalent:** Manual CLI smoke test — running `npx @expertzinhointegrado/ei-prompt@latest` against a scratch directory and inspecting `add`/`update`/`skip`/`remove` output counts. No automated script for this exists; do it manually when changing `bin/cli.js` or `manifest.json`.

## Coverage

**Requirements:** None enforced (no coverage tool configured).

## Recommendations if Adding Real Tests

- For `bin/cli.js`: use `node:test` (zero new deps, matches Node >=18 engine requirement in `package.json`), mock `fetch` for `fetchFile`, and use a temp dir (via `fs.mkdtempSync`) for `writeFile`/`removeFile` path-safety assertions (especially the path-traversal guard).
- For prompt correctness: consider scripting the `docs/regras-validacao.md` checklist items that are mechanically checkable (duplicate-string detection across sections, `xmllint` well-formedness, presence of required `## ETAPA N:` headers) as a lightweight lint script, since these are currently verified only by LLM subagent review.

---

*Testing analysis: 2026-07-04*
