---
phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
plan: 02
subsystem: infra
tags: [node, cli, manifest-schema, node-test, regression-testing]

# Dependency graph
requires: []
provides:
  - "bin/cli.js supports manifest.json entries that are either plain strings or {from,to} objects, via a single normalizeEntry() gate"
  - "help() renders mixed-shape manifest entries safely via formatManifestEntry(), never printing [object Object]"
  - "bin/cli.js is requirable from tests (module.exports + require.main === module guard) without triggering install/help side effects"
  - "bin/cli.test.js unit suite (8 cases) covering both new functions"
  - "npm test script consolidating bin/*.test.js and .claude/hooks/*.test.js into one regression command"
affects: [03-01, 03-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "normalizeEntry()/formatManifestEntry() single-gate normalization for a mixed string/object manifest schema, mirroring RESEARCH.md Pattern 1"
    - "module.exports + require.main === module guard for making a CLI entrypoint requirable from node:test, mirroring .claude/hooks/validate-xml-casca.js"

key-files:
  created: [bin/cli.test.js]
  modified: [bin/cli.js, package.json]

key-decisions:
  - "Followed RESEARCH.md Pattern 1/2 verbatim for normalizeEntry()/formatManifestEntry() — no deviation from the documented shape or error message text"
  - "Kept normalizeEntry()'s throw inside the existing per-file try/catch in the install loop, preserving the project's one-failure-doesn't-abort-the-batch convention"

patterns-established:
  - "Any future manifest.json schema extension (files[] or deprecated_files[]) must route through normalizeEntry()/formatManifestEntry() to avoid re-introducing the loop-crash + help()-display split-brain bug"

requirements-completed: [CLMD-03]

coverage:
  - id: D1
    description: "normalizeEntry() normalizes string entries to {from,to}, passes through valid {from,to} objects unchanged, and throws for any other shape (with the throw contained inside the install loop's existing try/catch)"
    requirement: CLMD-03
    verification:
      - kind: unit
        ref: "bin/cli.test.js#normalizeEntry('CLAUDE.md') returns {from,to} both equal to the string"
        status: pass
      - kind: unit
        ref: "bin/cli.test.js#normalizeEntry({from,to}) passes an already-correct object through unchanged"
        status: pass
      - kind: unit
        ref: "bin/cli.test.js#normalizeEntry({from}) missing 'to' throws an Error"
        status: pass
      - kind: unit
        ref: "bin/cli.test.js#normalizeEntry({to}) missing 'from' throws an Error"
        status: pass
      - kind: unit
        ref: "bin/cli.test.js#normalizeEntry(null) throws an Error"
        status: pass
      - kind: unit
        ref: "bin/cli.test.js#normalizeEntry(42) throws an Error"
        status: pass
    human_judgment: false
  - id: D2
    description: "formatManifestEntry() renders string entries unchanged and object entries as their .to path, never '[object Object]'; help() uses it for both files[] and deprecated_files[]"
    requirement: CLMD-03
    verification:
      - kind: unit
        ref: "bin/cli.test.js#formatManifestEntry('CHANGELOG.md') returns the string unchanged"
        status: pass
      - kind: unit
        ref: "bin/cli.test.js#formatManifestEntry({from,to}) returns the .to path, never '[object Object]'"
        status: pass
      - kind: other
        ref: "node bin/cli.js --help | grep -qv '\\[object Object\\]'"
        status: pass
    human_judgment: false
  - id: D3
    description: "bin/cli.js is requirable from a test file without side effects; npm test runs bin/*.test.js and .claude/hooks/*.test.js together with zero regression"
    requirement: CLMD-03
    verification:
      - kind: unit
        ref: "node --test .claude/hooks/validate-xml-casca.test.js (27/27 pass, unchanged from Phase 1)"
        status: pass
      - kind: other
        ref: "npm test (35/35 pass: 27 regression + 8 new)"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-07-16
status: complete
---

# Phase 03 Plan 02: normalizeEntry/formatManifestEntry Summary

**bin/cli.js gains a single normalizeEntry()/formatManifestEntry() gate for manifest.json's mixed string/{from,to} schema, with a requirable module.exports guard and an 8-case bin/cli.test.js proving both functions in isolation**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-16T13:05:16Z
- **Tasks:** 2
- **Files modified:** 3 (bin/cli.js, bin/cli.test.js, package.json)

## Accomplishments
- `normalizeEntry(entry)` normalizes string manifest entries to `{from, to}`, passes through valid `{from,to}` objects, and throws a diagnosable error (`entrada de manifest inválida: ...`) for any other shape — contained inside the install loop's existing per-file `try/catch`
- `formatManifestEntry(entry)` gives `help()` a single safe rendering path for both `manifest.files` and `manifest.deprecated_files`, eliminating the `[object Object]` display bug for object entries
- `bin/cli.js` now exports `{ normalizeEntry, formatManifestEntry, fetchFile, writeFile, removeFile, run, help }` and wraps its CLI dispatch block in `require.main === module`, mirroring `.claude/hooks/validate-xml-casca.js`'s established pattern — requiring the module for tests no longer triggers a real install
- `bin/cli.test.js` (8 `node:test` cases) covers every bullet in the plan's `<behavior>` block
- `package.json` gains a consolidated `"test": "node --test bin/*.test.js .claude/hooks/*.test.js"` script

## Task Commits

Each task was committed atomically:

1. **Task 1: Add normalizeEntry()/formatManifestEntry() to bin/cli.js and refactor the install loop + help()** - `1dc3256` (feat)
2. **Task 2: Write bin/cli.test.js, add package.json test script, run full regression suite** - `e804d5c` (test)

**Plan metadata:** committed separately (see final commit hash in completion report)

## Files Created/Modified
- `bin/cli.js` - added `normalizeEntry()`/`formatManifestEntry()`, refactored install loop to use `rawEntry`/`normalizeEntry()`, refactored `help()`'s two `.map()` calls, added `module.exports` + `require.main === module` guard around the CLI dispatch block
- `bin/cli.test.js` - new file, 8 `node:test` cases covering both new functions
- `package.json` - added top-level `"scripts": { "test": "node --test bin/*.test.js .claude/hooks/*.test.js" }`, all other keys preserved untouched

## Decisions Made
- Implemented `normalizeEntry()`/`formatManifestEntry()` exactly per RESEARCH.md Pattern 1/2 (error message text `entrada de manifest inválida: ${JSON.stringify(entry)}` matched verbatim) — no deviation needed since the plan's `<action>` and RESEARCH.md agreed precisely.
- No architectural changes required; this plan is purely additive (new functions + a guard), matching its "safe to run in parallel with 03-01/03-03" framing.

## Deviations from Plan

None — plan executed exactly as written. All 8 behavior cases, both refactor call sites (install loop + `help()`), the `module.exports`/`require.main` guard, the test file, and the `package.json` script all match the plan's `<action>`/`<behavior>` blocks verbatim.

## Issues Encountered

The plan's Task 2 `<verify>` automated command greps for TAP-format `^# (pass|fail) ` lines from `node --test`, but this environment's Node (v24.12.0) defaults to the "spec" reporter (which prints `ℹ pass N` / `ℹ fail N`, not `# pass N`) when no `--test-reporter` flag is given. Ran `node --test --test-reporter=tap .claude/hooks/validate-xml-casca.test.js` to confirm the exact TAP-format line the plan expects (`# pass 27` / `# fail 0`), and additionally ran the suite in default mode and via `npm test` — all three confirm 27/27 regression tests pass with zero failures, plus the new 8 `bin/cli.test.js` cases, for 35/35 total. This is an environment/Node-version reporter-default difference, not a code or test defect; no fix was needed to `bin/cli.test.js`, `bin/cli.js`, or the `package.json` script itself.

## Next Phase Readiness

- `bin/cli.js` is now ready to consume Plan 03-01's `manifest.json` `{from,to}` entry for `CLAUDE.md` — `normalizeEntry()`/`formatManifestEntry()` were validated against synthetic inputs matching that exact shape, independent of whether 03-01 has landed in this working tree yet.
- No blockers for Plan 03-03.

---
*Phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: bin/cli.test.js
- FOUND: .planning/phases/03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i/03-02-SUMMARY.md
- FOUND: 1dc3256 (Task 1 commit)
- FOUND: e804d5c (Task 2 commit)
- FOUND: 4273ed2 (SUMMARY commit)
