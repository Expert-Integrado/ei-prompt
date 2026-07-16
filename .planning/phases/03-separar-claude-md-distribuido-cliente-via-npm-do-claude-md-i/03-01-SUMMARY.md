---
phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
plan: 01
subsystem: infra
tags: [manifest, cli, distribution, claude-md]

# Dependency graph
requires:
  - phase: 02-three-step-gated-client-scaffolding
    provides: stable manifest.json schema and bin/cli.js fetch/write pipeline that this plan's new {from,to} shape will be consumed by in Plan 03-02
provides:
  - "client/CLAUDE.md — new isolated source file, the real npm-distributed client payload (verbatim copy of root CLAUDE.md minus the Commits section)"
  - "manifest.json files[] CLAUDE.md entry converted to {from: 'client/CLAUDE.md', to: 'CLAUDE.md'} object shape"
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "manifest.json files[] entries may now be either a plain string (from==to) or a {from,to} object — first use of this dual shape in the manifest schema"
    - "client/ folder convention: isolated, single-file-only source folders for content that must never trigger Claude Code's subpath CLAUDE.md autoload behavior"

key-files:
  created: [client/CLAUDE.md]
  modified: [manifest.json]

key-decisions:
  - "client/CLAUDE.md is a byte-for-byte copy of root CLAUDE.md minus only the ## Commits section (3 lines) — verified via diff against the pre-migration root file"
  - "manifest.json's files[] CLAUDE.md entry is the ONLY entry converted to {from,to}; all other 28 files[] strings and all 4 deprecated_files[] strings remain untouched plain strings"
  - "Root CLAUDE.md is intentionally left untouched in this plan — it keeps holding the current content until Plan 03-04 removes it, once the consuming code (03-02) and fallback reads (03-03) have landed. This plan only adds the new source, never removes the old one."

requirements-completed: [CLMD-01, CLMD-02]

coverage:
  - id: D1
    description: "client/CLAUDE.md exists as the sole file in a new isolated client/ folder, byte-for-byte identical to root CLAUDE.md minus the Commits section"
    requirement: "CLMD-01"
    verification:
      - kind: unit
        ref: "shell verify: grep -c checks for zero '## Commits' occurrences and exactly one occurrence each of the 5 migrated headings + v1.8.9 banner note (Task 1 automated verify)"
        status: pass
      - kind: unit
        ref: "diff <(sed '16,18d' CLAUDE.md) client/CLAUDE.md — confirms exact verbatim match minus only the 3 Commits-section lines"
        status: pass
    human_judgment: false
  - id: D2
    description: "manifest.json's files[] CLAUDE.md entry is converted to {from: 'client/CLAUDE.md', to: 'CLAUDE.md'}; all 28 other files[] entries and 4 deprecated_files[] entries remain unchanged plain strings"
    requirement: "CLMD-02"
    verification:
      - kind: unit
        ref: "node -e assertion script (Task 2 automated verify) — checks object shape, string-entry count (28), and deprecated_files schema (4 strings)"
        status: pass
      - kind: other
        ref: "node bin/cli.js --help — smoke check confirming manifest.json parses without throwing (bin/cli.js not yet updated to consume {from,to}; that lands in Plan 03-02)"
        status: pass
    human_judgment: false

duration: ~8min
completed: 2026-07-16
status: complete
---

# Phase 03 Plan 01: Isolate client/CLAUDE.md and repoint manifest.json Summary

**New `client/CLAUDE.md` source file (verbatim copy of root CLAUDE.md minus the Commits section) plus manifest.json's `files[]` CLAUDE.md entry converted to the new `{from, to}` object shape — root CLAUDE.md left untouched.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-16T12:52:00Z
- **Completed:** 2026-07-16T13:00:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created the isolated `client/` folder containing only `client/CLAUDE.md`, a byte-for-byte copy of root `CLAUDE.md` minus the `## Commits` section (3 lines: heading, bullet, blank line)
- Converted manifest.json's `files[]` CLAUDE.md entry from a plain string to `{from: "client/CLAUDE.md", to: "CLAUDE.md"}` — the first and only object-shaped entry in an otherwise all-string array
- Confirmed `node bin/cli.js --help` still runs without throwing after the manifest.json schema change (bin/cli.js's own consumption of the new shape is out of scope for this plan — that's Plan 03-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create client/CLAUDE.md verbatim minus the Commits section** - `e357e99` (feat)
2. **Task 2: Point manifest.json's CLAUDE.md entry at {from, to}** - `d9df7a6` (feat)

**Plan metadata:** (final commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `client/CLAUDE.md` - New isolated source file; the real npm-distributed client payload, verbatim copy of root CLAUDE.md minus the Commits section
- `manifest.json` - `files[]` CLAUDE.md entry converted to `{from: "client/CLAUDE.md", to: "CLAUDE.md"}`; all 28 other entries and 4 `deprecated_files[]` entries unchanged

## Decisions Made
- None beyond what the plan specified — plan executed exactly as written (D-01 through D-06 from 03-RESEARCH.md were pre-decided; this plan just implements them).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `node bin/cli.js --help` smoke check prints `[object Object]` for the CLAUDE.md line in its help text output — this is expected and explicitly called out in the plan's `<verification>` section, since `bin/cli.js` is not yet updated to consume the `{from,to}` shape (that lands in Plan 03-02). The smoke check only confirms the manifest.json parse itself doesn't throw, which it doesn't.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `client/CLAUDE.md` and manifest.json's `{from,to}` data shape are in place and ready to be consumed by Plan 03-02's `normalizeEntry()`/`fetchFile()`/`writeFile()` updates in `bin/cli.js`
- Root `CLAUDE.md` remains untouched and fully valid — no window where the repo lacks a valid copy of the client payload
- No blockers for Plan 03-02

---
*Phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: client/CLAUDE.md
- FOUND: e357e99
- FOUND: d9df7a6
