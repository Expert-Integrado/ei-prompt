---
phase: 01-xml-validation-hook
plan: 02
subsystem: testing
tags: [node-test, transcript-parsing, jsonl, cli, zero-dependency]

# Dependency graph
requires:
  - "validateFile(filePath) / TIPO_MAP from Plan 01 (.claude/hooks/validate-xml-casca.js)"
provides:
  - "discoverTouchedFiles(transcriptPath, tailLines) — extracts deduped, TIPO_MAP-filtered Edit/Write file_path values from real Claude Code transcript JSONL"
  - "runCli(argv) — {decision:'block', reason} / {} contract wiring discovery + validation together"
  - "require.main === module CLI entry point: node validate-xml-casca.js --transcript <path> prints one line of JSON to stdout"
  - "node:test suite extended to 24 passing assertions (was 17), including 2 discovery tests, 4 runCli function-level tests, 1 real-subprocess CLI test"
affects: ["01-03 (bash wrapper + manifest.json/settings.json distribution — invokes exactly `node validate-xml-casca.js --transcript \"$TRANSCRIPT\"`)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transcript JSONL discovery via last-N-lines tail window + per-line try/catch JSON.parse, matching the existing convention in post-ajustes-fanout.sh/post-scaffolder-review.sh (tail window, type:assistant filter)"
    - "hasOwnProperty-based TIPO_MAP membership check (not `in`/truthiness) to avoid prototype-chain false positives"
    - "require.main === module CLI entry point pattern — same module is unit-testable via require() and directly executable via node, with zero branching cost to the exported functions"

key-files:
  created: []
  modified:
    - .claude/hooks/validate-xml-casca.js
    - .claude/hooks/validate-xml-casca.test.js

key-decisions:
  - "Confirmed the real transcript shape empirically against two live JSONL files in this repo (/root/.claude/projects/-root-EiPrompt/*.jsonl) via a standalone python3 JSON parse, not merely assumed from SDK docs — resolves RESEARCH.md Open Question A1 as the plan required. message.content[].type===\"tool_use\" / .name / .input.file_path is the exact shape; implemented directly with no defensive alternate-shape branches."
  - "discoverTouchedFiles never calls fs.statSync/readFileSync on a discovered path (T-1-02) — it only extracts and basename-filters candidate strings; the one existence/regular-file check remains exclusively in Plan 01's validateFile, satisfying the plan's key_links requirement that path safety is enforced exactly once."

requirements-completed: [XMLV-05, XMLV-06]

coverage:
  - id: D1
    description: "discoverTouchedFiles extracts only Edit/Write file_path values whose basename is a recognized client-agent filename, scoped to the current transcript window, ignoring non-assistant lines and malformed JSON lines without throwing"
    requirement: "XMLV-05"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#discoverTouchedFiles extracts recognized Edit/Write file_path values... (2 tests: filtering + dedup)"
        status: pass
    human_judgment: false
  - id: D2
    description: "runCli(argv) returns {decision:'block', reason} when any discovered file is invalid, and {} when all discovered files are valid, when no recognized files are discovered, or when --transcript is absent"
    requirement: "XMLV-06"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#runCli returns... (4 tests: block/valid/no-files/no-argv)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Invoking the file directly as a CLI (node validate-xml-casca.js --transcript <path>) prints a single line of valid JSON to stdout and exits 0, matching the in-process runCli result for the same input"
    verification:
      - kind: unit
        ref: ".claude/hooks/validate-xml-casca.test.js#invoking validate-xml-casca.js directly as a CLI subprocess prints matching block JSON to stdout (execFileSync subprocess test)"
        status: pass
    human_judgment: false
  - id: D4
    description: "message.content[].type==='tool_use' / .name / .input.file_path transcript shape empirically confirmed against real Claude Code transcripts in this repo (resolves RESEARCH.md Open Question A1)"
    verification:
      - kind: manual
        ref: "python3 JSON-parse walk of /root/.claude/projects/-root-EiPrompt/60db5108-*.jsonl confirming real Edit/Write tool_use blocks match the assumed shape; node .claude/hooks/validate-xml-casca.js --transcript <real transcript> run twice against genuinely live JSONL, no crash, correct {} result (files touched were .planning/*.md, not TIPO_MAP basenames)"
        status: pass
    human_judgment: true

duration: 25min
completed: 2026-07-04
status: complete
---

# Phase 1 Plan 2: Transcript Discovery + CLI Entry Point Summary

**Wired Plan 01's validator engine to real Claude Code transcripts: `discoverTouchedFiles` extracts only-this-turn's Edit/Write file_path values from JSONL, `runCli` produces the exact `{decision:'block',reason}`/`{}` contract, both confirmed against genuinely live transcript files in this repo (not just synthetic fixtures).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-04T23:14:36Z (per STATE.md prior activity)
- **Completed:** 2026-07-04T23:20:56Z
- **Tasks:** 2
- **Files modified:** 2 (validator module, test file)

## Accomplishments

- Implemented `discoverTouchedFiles(transcriptPath, tailLines = 400)`: reads the last N JSONL lines, tolerates malformed lines and non-JSON entries via per-line try/catch, filters to `"type":"assistant"` entries only (user-type tool_use blocks never count), extracts `Edit`/`Write` `tool_use.input.file_path` values, dedupes via `Set`, and filters to basenames present in `TIPO_MAP` using `hasOwnProperty` (not `in`/truthiness).
- Implemented `runCli(argv)`: manual argv scan for `--transcript` (zero-dependency, no arg-parsing library), returns `{}` immediately if the flag or its value is missing or if discovery finds zero files, otherwise validates every discovered file via Plan 01's `validateFile` and returns `{decision:"block", reason: <joined error messages>}` or `{}` if all clean.
- Added the `require.main === module` CLI entry point: `node .claude/hooks/validate-xml-casca.js --transcript <path>` prints exactly one line of JSON (`{}` or `{"decision":"block","reason":"..."}`) to stdout and exits 0 — this block never fires when the test file `require()`s the module.
- **Resolved RESEARCH.md Open Question A1 empirically, not just by following the plan's assertion**: walked two real, genuinely-live JSONL transcript files from this repo's own Claude Code sessions (`/root/.claude/projects/-root-EiPrompt/*.jsonl`) via a standalone `python3` JSON parse, confirming the exact `message.content[].type==="tool_use"` / `.name` / `.input.file_path` shape holds for real `Edit`/`Write` tool calls (e.g. `Write /root/EiPrompt/.planning/.../01-VALIDATION.md`, `Edit .../01-RESEARCH.md`). Then ran the actual CLI (`node validate-xml-casca.js --transcript <real-path>`) against that same live transcript twice — no crash, correct `{}` result (the files touched in those sessions were `.planning/*.md`, not recognized `TIPO_MAP` basenames, so `{}` is the correct, verified answer, not a false negative).
- Extended `.claude/hooks/validate-xml-casca.test.js` from 17 to 24 passing assertions: 2 discovery tests (filtering + dedup), 4 `runCli` function-level tests (block/valid/no-recognized-files/no-argv), and 1 real-subprocess CLI test using `child_process.execFileSync` proving the `require.main === module` branch actually works when invoked the way Plan 03's bash wrapper will invoke it.

## Task Commits

Each task followed a per-task RED→GREEN cycle (mirroring Plan 01's pattern):

1. **Task 1 RED: failing test for discoverTouchedFiles** - `93c8cc7` (test)
2. **Task 1 GREEN: implement discoverTouchedFiles** - `0b0c2a4` (feat)
3. **Task 2 RED: failing test for runCli + CLI entry point** - `c5a31bc` (test)
4. **Task 2 GREEN: implement runCli + CLI entry point** - `50689b4` (feat)

## TDD Gate Compliance

Both tasks have `tdd="true"`. Git log confirms, for each task, a `test(...)` commit (RED) followed by a `feat(...)` commit (GREEN) with the intervening test run showing new tests failing before implementation and passing after. No REFACTOR commit was needed (no cleanup pass required beyond the initial clean implementation).

## Files Created/Modified

- `.claude/hooks/validate-xml-casca.js` - Added `discoverTouchedFiles`, `runCli`, and the `require.main === module` CLI entry point; both new functions added to `module.exports` alongside all Plan 01 exports (none removed/renamed).
- `.claude/hooks/validate-xml-casca.test.js` - Added 7 new tests (2 discovery, 4 runCli function-level, 1 CLI subprocess-level), plus `os`, `execFileSync`, `makeTempDir`, and `jsonlLine` test helpers.

## Decisions Made

- Confirmed the real transcript shape empirically (see Accomplishments) rather than trusting the plan's assertion blindly — this is the one point in the pipeline where an "external-ish" input first enters (per the plan's own threat model), so verifying against live data rather than only synthetic fixtures was worth the extra step.
- Followed `discoverTouchedFiles`'s threat-mitigation contract exactly: no `fs.statSync`/`readFileSync` call on any discovered path inside discovery — existence/regular-file checks remain exclusively inside Plan 01's `validateFile`, so path safety (T-1-02) is enforced exactly once regardless of how many candidate paths a transcript contains.
- Used `hasOwnProperty.call(TIPO_MAP, ...)` rather than a plain `in`/truthiness check for the basename filter, per the plan's explicit instruction, to avoid prototype-chain surprises (e.g. a discovered basename literally named `"constructor"` or `"toString"`).

## Deviations from Plan

None. The plan's `<action>` blocks for both tasks were followed literally: `discoverTouchedFiles`'s tail-window/try-catch/dedup/hasOwnProperty behavior, and `runCli`'s manual argv scan / concatenated-errors / `require.main === module` entry point, all match the plan's specification exactly. The one addition beyond the plan's explicit synthetic-fixture test instructions was the extra empirical real-transcript verification documented above under Accomplishments/Decisions — this was already invited by the plan's own `<verification>` section ("manually run ... if one is reachable in this environment"), not a scope change.

## Issues Encountered

None. All 24 tests (17 pre-existing + 7 new) pass on the first GREEN implementation for each task; no auto-fixes, blockers, or architectural questions arose.

## User Setup Required

None — pure Node.js module extension, no external service configuration, no new dependencies.

## Next Phase Readiness

- `node .claude/hooks/validate-xml-casca.js --transcript <path>` is a real, tested, subprocess-verified capability producing exactly the `{"decision":"block","reason":"..."}` / `{}` contract Plan 03's bash wrapper needs.
- `runCli`'s `--transcript` argv contract is exactly `node validate-xml-casca.js --transcript "$TRANSCRIPT"` — ready for Plan 03 to invoke unchanged from a thin bash wrapper.
- `discoverTouchedFiles`, `runCli`, `TIPO_MAP`, `validateFile` are all stable, tested exports Plan 03 can rely on without modification.
- No blockers identified for Plan 03 (manifest.json/settings.json distribution + Stop/SubagentStop hook registration).

## Self-Check: PASSED

All modified files exist on disk (`.claude/hooks/validate-xml-casca.js`, `.claude/hooks/validate-xml-casca.test.js`) and all 4 task commit hashes (`93c8cc7`, `0b0c2a4`, `c5a31bc`, `50689b4`) are present in git log. `node --test .claude/hooks/validate-xml-casca.test.js` exits 0 with 24/24 passing. No missing items.

---
*Phase: 01-xml-validation-hook*
*Completed: 2026-07-04*
