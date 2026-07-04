# Walking Skeleton — ei-prompt (XML Validation Hook)

**Phase:** 1
**Generated:** 2026-07-04

> Adapted from the generic web-app SKELETON.md template: `ei-prompt` is a zero-dependency Node.js CLI + Claude Code hook/subagent system, not a web app. There is no database, no UI framework, no routing layer, and "deployment" means `npm publish` fetched later via `npx`, not a running service. This document reframes each generic slot in those real terms.

## Capability Proven End-to-End

A client agent `.md` file's XML casca (the `<?xml ...?>` declaration + `<agente ...>` root wrapper) is read from disk by a deterministic Node.js function, validated against the fixed `tipo`-per-filename mapping and root-uniqueness rule, and — when broken — produces a `{"decision":"block","reason":"<file> linha N coluna C: <erro acionável>"}` JSON payload that is emitted by the real `.claude/hooks/validate-xml-casca.sh` wrapper and, by the end of Phase 1, actually reaches a live `Stop`/`SubagentStop` Claude Code event and prevents the turn from ending silently — coexisting with the two pre-existing pipeline hooks (`post-ajustes-fanout.sh`, `post-scaffolder-review.sh`).

## Architectural Decisions

*(Sourced from `.planning/phases/01-xml-validation-hook/01-CONTEXT.md` D-01..D-10 — locked, not renegotiated by later phases.)*

| Decision | Choice | Rationale |
|---|---|---|
| Validation engine | Pure Node.js, regex/string-based, zero new dependency (D-01) | `xmllint` confirmed absent from the dev sandbox and not guaranteed on end-user machines; project has an explicit zero-new-dependency constraint; Node is already the project's required runtime (`bin/cli.js`) |
| Module shape | One dedicated `.js` validator, dual-mode (exported pure functions + CLI via `require.main === module`), invoked by a thin `.sh` wrapper (D-02) | Node is needed for line/column precision and tag-nesting counting; the bash wrapper stays consistent with `post-ajustes-fanout.sh`/`post-scaffolder-review.sh` conventions (stdin JSON, transcript_path extraction, `exit 0` always) |
| Validation scope | Targeted structural checks only — line 1 declaration, line 2 `agente` attributes, `agente` open/close tag count — not a generic XML tokenizer (D-03) | Scope is intentionally limited to XMLV-01..07; a generic parser would also have to "solve" the accepted blind spot, which is explicitly out of scope |
| Attribute parsing | Order-tolerant, attribute-by-attribute extraction, never a literal full-line string match (D-04) | Avoids false positives from harmless attribute reordering by an editor |
| File discovery | Parse `transcript_path` JSONL for `Edit`/`Write` `tool_use` blocks' `input.file_path`, filtered to a fixed basename map (D-05 — confirmed this session against real transcripts in `.claude/projects/`, not just SDK docs) | Client files live in arbitrary folders outside this repo; `JSON.parse` per JSONL line is robust versus regex-extracting a nested JSON field in bash |
| Validation cadence | Only files actually touched in the current turn (D-06), never a full-folder scan | XMLV requirements are per-file; there is no cross-file validation need |
| Blocking behavior | Always `{"decision":"block",...}` on a broken casca, never warn-only (D-07) | Warn-only would let an AI editor ignore it, contradicting the milestone's Core Value |
| Blind-spot handling | A raw `<`/`&` in client content that happens to break one of the structural checks still blocks like anything else, but the message text never suggests escaping/CDATA (D-08) | Preserves the accepted blind spot instead of "fixing" it — no heuristic distinguishes a "real" break from a content-triggered one |
| Hook registration | `validate-xml-casca.sh` appended to BOTH `Stop[]` and `SubagentStop[]` in `.claude/settings.json`, alongside — never replacing — `post-ajustes-fanout.sh`/`post-scaffolder-review.sh` (D-09) | Multiple hooks per event run in sequence; existing hook code and its sentinel/anti-loop protocol stay completely untouched |
| Distribution | The `.sh` + `.js` runtime pair (not the test file or fixtures) is added to `manifest.json`'s `files[]` (D-10) | End users installing via `npx @expertzinhointegrado/ei-prompt@latest` get the same protection inside their own client folders, where `docs-editor-conciso`/`client-project-scaffolder` actually run |

## Stack Touched in Phase 1

*(Adapted checklist — this project has no DB/UI/deployment-service tiers; each generic slot below is reframed to this project's real architecture.)*

- [ ] **Project scaffold** — the new hook script pair `.claude/hooks/validate-xml-casca.sh` + `.claude/hooks/validate-xml-casca.js`, following the bash-wrapper conventions already established by `post-ajustes-fanout.sh`/`post-scaffolder-review.sh`
- [ ] **"Database read"** — one real validation READ: `validateFile()` called directly against all 6 real `modelo/*.md` files confirms `{valid:true}` for every one (Plan 01, Task 3), plus 10 fixture files under `.claude/hooks/__fixtures__/xml-casca/` exercising every broken-casca case (Plan 01, Task 1)
- [ ] **"Database write"** — one real validation WRITE: the hook's `{"decision":"block","reason":"..."}` JSON payload, produced by the real Node CLI (`node validate-xml-casca.js --transcript ...`, Plan 02) and relayed verbatim by the real bash wrapper (Plan 03)
- [ ] **"UI interaction"** — the hook's block decision reaching a real `Stop`/`SubagentStop` Claude Code event and provably preventing the agent from stopping, without disturbing the existing sentinel/anti-loop protocols (Plan 03, Task 3 human checkpoint) — this is this project's actual observable surface, since there is no browser UI
- [ ] **"Deployment"** — registration in `.claude/settings.json` (`hooks.Stop[]`/`hooks.SubagentStop[]`, Plan 03 Task 2) plus the `manifest.json` `files[]` entry (same task) that makes the hook reach end-user client folders the next time they run `npx @expertzinhointegrado/ei-prompt@latest`

## Out of Scope (Deferred to Later Slices)

- Generic/full XML well-formedness parsing (a SAX/DOM-style tokenizer) — explicitly rejected by D-03; it would also have to "solve" the accepted blind spot (XMLV-07), which this project deliberately does not want solved
- Any escaping/CDATA "fix" applied to raw `<`/`&` in client-variable content — explicitly rejected; the blind spot is preserved by design (XMLV-07), not treated as a bug
- Special-casing `modelo/*.md` in file discovery — out of scope per `01-RESEARCH.md` Open Question 2; validating `modelo/*.md` is harmless (all 6 already pass) so no exclusion logic is added either way
- Phase 2's 3-Step Gated Client Scaffolding — an independent, already-scoped track (SCAF-01..06), not discussed during this phase's `/gsd-discuss-phase` session
- Any argument-parsing library, XML parser library, or other npm dependency — the zero-dependency constraint is absolute for this phase (confirmed: zero packages installed, Package Legitimacy Gate N/A)

## Subsequent Slice Plan

- **Phase 2: 3-Step Gated Client Scaffolding** — splits `client-project-scaffolder` into scaffold → gather → fill steps with a hard confirmation gate (SCAF-01..06); an independent track from this phase, reusing the project's existing Stop/SubagentStop hook conventions for its own gate but not this phase's XML validator code
- **Phase 3** (not yet planned) — separate the CLAUDE.md distributed to client projects via npm from this repo's own internal `CLAUDE.md` (GSD `.planning`/agent conventions)
