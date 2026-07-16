---
phase: 01-xml-validation-hook
plan: 01
subsystem: testing
tags: [node-test, regex-validation, xml-casca, zero-dependency]

# Dependency graph
requires: []
provides:
  - "validateFile(filePath) / validateCasca(content, basename) — deterministic Node.js validator for the client-agent XML casca (declaration + agente root wrapper)"
  - "TIPO_MAP keyed by basename, disambiguating Recepcionista.md from Orquestrador.md (both tipo=orchestrator)"
  - "node:test suite (.claude/hooks/validate-xml-casca.test.js) with 17 passing assertions, including all 6 real modelo/*.md files validating clean"
  - "10 fixture files under .claude/hooks/__fixtures__/xml-casca/ covering every XMLV-01..04/07 broken-casca case"
affects: ["01-02 (bash wrapper + Stop/SubagentStop hook wiring)", "01-03 (manifest.json/settings.json distribution)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-mode CommonJS module: pure exported functions + (future) CLI entry point, unit-testable via require() without process spawning"
    - "Word-boundary-safe tag counting via lookahead (/<agente(?=[\\s>])/g) instead of naive substring match — avoids false positive on <agentes_disponiveis>"
    - "Attribute-order-tolerant parsing: extract each required attribute individually rather than matching the whole line-2 string literally"

key-files:
  created:
    - .claude/hooks/validate-xml-casca.js
    - .claude/hooks/validate-xml-casca.test.js
    - .claude/hooks/__fixtures__/xml-casca/valid-orquestrador.md
    - .claude/hooks/__fixtures__/xml-casca/valid-recepcionista.md
    - .claude/hooks/__fixtures__/xml-casca/missing-declaration.md
    - .claude/hooks/__fixtures__/xml-casca/wrong-declaration.md
    - .claude/hooks/__fixtures__/xml-casca/wrong-tipo.md
    - .claude/hooks/__fixtures__/xml-casca/missing-xmlns.md
    - .claude/hooks/__fixtures__/xml-casca/missing-origem-recepcionista.md
    - .claude/hooks/__fixtures__/xml-casca/nested-root.md
    - .claude/hooks/__fixtures__/xml-casca/duplicate-root.md
    - .claude/hooks/__fixtures__/xml-casca/raw-ampersand-in-content.md
  modified: []

key-decisions:
  - "For XMLV-01, distinguish 'line 1 isn't a declaration at all' (report col 1, blunt) from 'line 1 starts with <?xml but diverges later' (report the precise divergence column) — both are literal readings of the plan's own behavior spec, which specified col 1 for total absence and a precise diff column for partial mismatch"

requirements-completed: [XMLV-01, XMLV-02, XMLV-03, XMLV-04, XMLV-06, XMLV-07]

coverage:
  - id: D1
    description: "validateCasca/validateFile detect and report every one of the 7 broken-casca XMLV cases with a distinct, actionable {line,col,message} error, never mentioning escape/CDATA"
    requirement: "XMLV-01, XMLV-02, XMLV-03, XMLV-04, XMLV-06, XMLV-07"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js (11 fixture-driven behavior tests, all pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "countAgenteTags does not false-positive on Recepcionista.md's real agentes_disponiveis body tag (Pitfall 1 regression)"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#countAgenteTags does not false-positive on Recepcionista's agentes_disponiveis body tag"
        status: pass
    human_judgment: false
  - id: D3
    description: "validateFile() called directly against all 6 real modelo/*.md files returns valid:true with zero errors"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#validateFile() returns valid:true for all 6 real modelo/*.md files"
        status: pass
    human_judgment: false
  - id: D4
    description: "ReDoS bounded-time guarantee (T-1-01) and path-safety guarantee (T-1-02) hold under adversarial-ish inputs"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js (ReDoS <50ms + non-existent-path/directory-path regression tests)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-04
status: complete
---

# Phase 1 Plan 1: XML Casca Validator Engine Summary

**Deterministic, zero-dependency Node.js validator (`validate-xml-casca.js`) that catches all 7 XMLV-01/02/03/04/07 broken-casca cases with actionable file+line+column errors, proven against all 6 real `modelo/*.md` templates and hardened against ReDoS/path-traversal.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-04T22:52:00Z (approx, per STATE.md prior activity)
- **Completed:** 2026-07-04T23:09:00Z
- **Tasks:** 3
- **Files modified:** 12 (1 module, 1 test file, 10 fixtures)

## Accomplishments
- Built `.claude/hooks/validate-xml-casca.js` exporting `TIPO_MAP`, `normalizeContent`, `offsetToLineCol`, `parseAgenteLine`, `countAgenteTags`, `validateCasca`, `validateFile` — a pure, CommonJS, zero-dependency module matching `bin/cli.js`'s existing style conventions.
- Proved the validator against real production content: `validateFile()` returns `valid:true, errors:[]` for all 6 real `modelo/Orquestrador.md`, `Qualifier.md`, `Scheduler.md`, `Protractor.md`, `Follow-Up.md`, `Recepcionista.md` files — no synthetic-only coverage.
- Implemented the two most critical non-obvious correctness requirements from RESEARCH.md: word-boundary-safe tag counting (Pitfall 1 — avoids false positive on `<agentes_disponiveis>`) and filename-keyed `TIPO_MAP` (Pitfall 7 — disambiguates Recepcionista.md from Orquestrador.md, both `tipo="orchestrator"`).
- Preserved the accepted XMLV-07 blind spot: raw `<`/`&` in client content still blocks (via the same tag-count mechanism, no special-casing), and no error message in the entire module ever mentions escape/CDATA wording — verified by regex scan across every fixture's error output.
- Added ReDoS (T-1-01) and path-safety (T-1-02) regression tests: `parseAgenteLine`/`countAgenteTags` complete in well under 50ms against 50,000-character crafted inputs; `validateFile()` returns structured `{valid:false}` (never throws) for non-existent paths and directory paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write 10 fixture files + failing node:test suite (RED)** - `4e98f94` (test)
2. **Task 2: Implement the validator engine (GREEN)** - `464ef33` (feat)
3. **Task 3: Real-file integration test + threat-mitigation regression tests** - `a39b0b0` (test)

**Plan metadata:** (this commit, see below)

_Note: This plan follows per-task TDD (`tdd="true"` on each task) rather than a single plan-level RED→GREEN→REFACTOR cycle — Task 1 is RED, Task 2 is GREEN, Task 3 extends the already-green suite with additional regression coverage._

## Files Created/Modified
- `.claude/hooks/validate-xml-casca.js` - The validator engine: `TIPO_MAP`, `normalizeContent`, `offsetToLineCol`, `parseAgenteLine`, `countAgenteTags`, `validateCasca`, `validateFile`
- `.claude/hooks/validate-xml-casca.test.js` - `node:test` suite, 17 assertions covering all behaviors + real-file + threat regression tests
- `.claude/hooks/__fixtures__/xml-casca/*.md` (10 files) - Synthetic valid/broken casca fixtures modeling the exact shape of real `modelo/*.md` templates

## Decisions Made
- **XMLV-01 column precision split:** When line 1 doesn't even start with `<?xml`, report a blunt `col:1` (it's not a declaration attempt at all). When line 1 starts with `<?xml` but diverges later (e.g. missing `encoding="UTF-8"`), report the precise character-divergence column. This satisfies both plan-specified behaviors (`missing-declaration.md` → col 1; `wrong-declaration.md` → col 20, the first point of divergence) without weakening either signal's actionability.
- Followed `bin/cli.js`'s existing CommonJS style exactly (2-space indent, double quotes, semicolons, camelCase verb-first functions, UPPER_SNAKE_CASE constants) since it's this repo's only prior Node.js module and the plan's designated analog.
- Did NOT add `discoverTouchedFiles`, `runCli`, or the `require.main === module` CLI block — explicitly deferred to Plan 02 per the plan's own instruction, keeping this plan's surface limited to the tested, reviewed validation engine only.

## Deviations from Plan

None beyond the column-precision refinement documented above under "Decisions Made" (a same-task correctness fix while satisfying the plan's own two stated behaviors — not a scope change, no new files, no architecture change).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This is a pure Node.js module with no runtime dependencies.

## Next Phase Readiness
- `require(".claude/hooks/validate-xml-casca.js").validateFile("modelo/Qualifier.md")` is a real, callable, tested capability — ready for Plan 02 to wrap in a thin bash hook (`validate-xml-casca.sh`) and wire into `Stop`/`SubagentStop` per D-02/D-09.
- `TIPO_MAP`, `validateCasca`, and `validateFile` are stable exports Plan 02 can rely on without modification.
- No blockers identified for Plan 02 (bash wrapper + hook registration) or Plan 03 (manifest.json/settings.json distribution).

## Self-Check: PASSED

All 12 created files exist on disk (validator module, test file, 10 fixtures) and all 4 task/summary commit hashes (`4e98f94`, `464ef33`, `a39b0b0`, `294b3dd`) are present in git log. No missing items.

---
*Phase: 01-xml-validation-hook*
*Completed: 2026-07-04*
