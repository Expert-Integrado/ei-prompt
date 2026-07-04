# Phase 1: XML Validation Hook - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A deterministic (code, not prompt-rule) hook that catches broken/malformed XML casca in client agent files (`<?xml ...?>` declaration + `<agente xmlns=... versao="1.0" tipo="...">` wrapper), wired into the existing `Stop`/`SubagentStop` hook pipeline, without ever attempting to auto-fix the accepted blind spot of raw `<`/`&` in client-variable content. This replaces the manual checklist in `docs/regras-validacao.md` ("Validação da Casca XML") with real code checks.

</domain>

<decisions>
## Implementation Decisions

### Validation Engine
- **D-01:** Pure Node.js (regex/string-based), zero dependency. `xmllint` was ruled out — confirmed NOT installed in this dev sandbox, not guaranteed on other machines, and the project has an explicit zero-new-dependency constraint. Node.js is already the project's required runtime (`bin/cli.js`).
- **D-02:** Validator logic lives in a dedicated `.js` script (e.g. `.claude/hooks/validate-xml-casca.js`) invoked by a thin bash wrapper, following the existing hooks' pattern (read stdin JSON, check `stop_hook_active`, extract `transcript_path`). Node is used specifically for the parts needing structural precision (line/column tracking, tag-nesting stack); bash wrapper stays consistent with `post-ajustes-fanout.sh` / `post-scaffolder-review.sh` conventions.
- **D-03:** Targeted structural checks, not a generic XML tokenizer — line-by-line regex for line 1 (`<?xml ...?>`) and line 2 (`<agente ...>`), plus a simple `<agente>`/`</agente>` open/close count for nesting/duplicate-root detection. Scope is intentionally limited to the 7 XMLV-01..07 requirements, not arbitrary XML well-formedness.
- **D-04:** Attribute checks (`xmlns`, `versao`, `tipo`, and `origem` for Recepcionista) are tolerant of attribute order — each required attribute is extracted and validated individually for presence/correctness, not matched as one exact literal string. This avoids false positives from harmless attribute reordering by an editor.

### File Discovery & Scope
- **D-05 (Claude's discretion):** Exact file-discovery mechanism is left to the researcher/planner. Likely approach: parse `transcript_path` for `Edit`/`Write` tool calls in the current turn, mirroring `post-scaffolder-review.sh`'s transcript-scanning pattern — client files live in arbitrary folders outside this repo, so there's no fixed path to scan.
- **D-06:** Validate only the file(s) actually touched in that turn, not the whole client folder. Faster, and XMLV requirements are per-file (no cross-file validation need).

### Blocking Behavior
- **D-07:** The hook always blocks on a broken casca — emits `{"decision":"block","reason":"..."}` (same schema as `post-ajustes-fanout.sh`), with the actionable file + line/column detail (XMLV-06). Warn-only was rejected: it would let an AI editor ignore the warning, directly contradicting the milestone's Core Value ("never let a broken file pass unnoticed").
- **D-08:** The accepted blind spot (XMLV-07 — raw `<`/`&` in client-variable content breaking the parse) is treated the same as any other structural failure: it blocks, and the error message must never suggest escaping/CDATA as a fix. No heuristic is built to distinguish "real casca break" from "content-triggered break" — per D-03's targeted-check design, the validator only tracks literal `<agente>`/`</agente>` boundaries, so generic client `<`/`&` in prose won't spuriously trip it anyway.

### Integration & Distribution
- **D-09:** New dedicated hook script(s), registered alongside the existing `post-ajustes-fanout.sh` (Stop) and `post-scaffolder-review.sh` (SubagentStop) entries in `.claude/settings.json` — multiple hooks on the same event run in sequence. Existing hook code is not modified, eliminating risk to the sentinel/anti-loop protocol.
- **D-10:** Must be added to `manifest.json`'s `files` list for distribution via `npx ei-prompt` — end users need this protection in their own client folders too, since `docs-editor-conciso` and `client-project-scaffolder` run there, not just in this repo.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Validation rules being replaced/automated
- `docs/regras-validacao.md` §"Validação da Casca XML" (lines ~37-49) — the manual checklist this hook replaces; preserves the same rules and the documented accepted blind spot.

### Hook patterns to mirror
- `.claude/hooks/post-ajustes-fanout.sh` — Stop-event hook; canonical pattern for `stop_hook_active` guard, `transcript_path` extraction, `decision:block` + `reason` schema, and `type:assistant`-only transcript filtering.
- `.claude/hooks/post-scaffolder-review.sh` — SubagentStop-event hook; canonical pattern for extracting the last-touched subagent/files from the transcript.
- `.claude/settings.json` — where the new hook(s) must be registered under `Stop`/`SubagentStop`.

### Distribution
- `manifest.json` — new hook file(s) must be added to `files` for npx distribution.

### Casca format reference
- `modelo/*.md` — the 6 canonical templates already carrying the correct casca (confirmed: `tipo` values are `orchestrator`/`qualifier`/`scheduler`/`protractor`/`followup`, and Recepcionista uses `orchestrator` + `origem="recepcionista"`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None directly reusable as a library — but `post-ajustes-fanout.sh` and `post-scaffolder-review.sh` are the structural templates to copy the bash-wrapper conventions from (JSON stdin parsing without `jq`, `stop_hook_active` check, transcript tail-scanning).

### Established Patterns
- Hooks are zero-dependency POSIX bash using only `grep`/`sed`/`tail`/`cat`/`printf` — confirmed via reading both existing hook scripts. The new hook introduces Node.js into this layer for the first time (previously Node was only used in `bin/cli.js`), which is an accepted, discussed departure (D-02) given the structural-parsing need.
- Fail-safe/silent-exit convention: hooks exit 0 cleanly on missing/unreadable transcript or `stop_hook_active`. The new hook should follow the same convention for its own guard conditions (distinct from the deliberate `decision:block` when a real casca violation is found).
- `manifest.json` is the single source of truth for what ships to end users (`files` array); anything new needs an explicit entry there or it's dev-only.

### Integration Points
- `.claude/settings.json` `hooks.Stop[]` and `hooks.SubagentStop[]` arrays — new hook entries append here, run in sequence alongside existing ones.
- Confirmed via direct check: `xmllint` is NOT installed in this development sandbox — reinforces D-01 (pure Node.js, no external binary dependency).

</code_context>

<specifics>
## Specific Ideas

No specific UI/UX-style references — this is a backend/infra hook. The core specific requirement is fidelity to the exact casca format already in `modelo/*.md` and the tipo-per-filename mapping (Orquestrador→orchestrator, Qualifier→qualifier, Scheduler→scheduler, Protractor→protractor, Follow-Up→followup, Recepcionista→orchestrator+origem="recepcionista").

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Phase 2's 3-step gated scaffolding work is a separate, already-scoped track and was not discussed here.)

</deferred>

---

*Phase: 1-XML Validation Hook*
*Context gathered: 2026-07-04*
