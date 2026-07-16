---
phase: 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
verified: 2026-07-16T14:30:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 03: Separar CLAUDE.md distribuído (cliente via npm) do CLAUDE.md interno do repo — Verification Report

**Phase Goal:** Como mantenedor do ei-prompt, quero que o `CLAUDE.md` distribuído a cada cliente via `npx ei-prompt` e o `CLAUDE.md`/`.claude/CLAUDE.md` que carrego ao trabalhar neste repo sejam fisicamente separados — cada um só com conteúdo da audiência correta — para que uma regra de cliente nunca mais apareça como se fosse regra de como eu mesmo devo editar `modelo/`, e para que essa separação seja garantida por código (hook determinístico), não por um aviso de texto.

**Verified:** 2026-07-16T14:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

**Note on premature "complete" marking:** STATE.md/ROADMAP.md marked this phase complete before code review and this verification ran, which is a process-order violation. However, in this specific case the actual sequence of events was: (1) plans executed, (2) code review ran and found 2 critical + 3 warning issues, (3) 4 of 5 findings (both criticals + 2 of 3 warnings) were fixed and committed, (4) this verification now runs against the current (post-fix) codebase state. All findings below are checked against the CURRENT code, not against SUMMARY.md claims — the premature marking did not cause any gap to be masked; the review+fix work already happened and is confirmed present in the code below.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `client/CLAUDE.md` exists, is the sole file in `client/`, and is byte-identical to the pre-migration root `CLAUDE.md` minus the `## Commits` section | ✓ VERIFIED | `ls client/` shows only `CLAUDE.md`; `diff <(git show 3c1ceaa~1:CLAUDE.md \| grep -v -A2 '^## Commits') client/CLAUDE.md` produces zero diff (only the trailing blank-line artifact of the grep exclusion itself) |
| 2 | `manifest.json`'s `files[]` CLAUDE.md entry is `{from: "client/CLAUDE.md", to: "CLAUDE.md"}`; all other entries remain plain strings | ✓ VERIFIED | Read of `manifest.json` line 5: `{ "from": "client/CLAUDE.md", "to": "CLAUDE.md" }`; all 28 other `files[]` entries and all 4 `deprecated_files[]` entries are plain strings |
| 3 | `bin/cli.js` normalizes every manifest entry (string → `{from,to}`) before use in both the install loop and the `deprecated_files` cleanup loop; `help()` never prints `[object Object]` | ✓ VERIFIED | `normalizeEntry()`/`formatManifestEntry()` present (bin/cli.js:23-32), used by install loop (line 113) AND by the deprecated_files loop (line 100 — this is the CR-02 fix, confirmed present in current code, not just claimed in SUMMARY); `help()` uses `formatManifestEntry()` (lines 143, 146); `npm test` run live shows 43/43 passing including `formatManifestEntry({from,to}) returns the .to path, never '[object Object]'` |
| 4 | Root `CLAUDE.md` no longer exists in this repo; `.claude/CLAUDE.md` is the sole functional "Project instructions" file, contains none of the 5 migrated headings, and its commits-rule line no longer cites root `CLAUDE.md` | ✓ VERIFIED | `ls CLAUDE.md` → "No such file or directory"; `grep -nE '^## (Mapa de Regras\|Arquitetura Padrão de Agentes\|Arquitetura Multi-Agente\|Slash Commands\|Regras Básicas)' .claude/CLAUDE.md` → zero matches; commits line reads "explicit project rule — see `docs/proibido-fazer.md`" (no longer citing `CLAUDE.md`) |
| 5 | All 9 distributed subagents/commands (7 agents + 2 commands, 11 total edit points) check `client/CLAUDE.md` via Glob first, fall back to `CLAUDE.md` | ✓ VERIFIED | Live grep of all 9 files confirms `client/CLAUDE.md` present in each; `docs-editor-conciso.md` has 2 occurrences (Passo 0 + mid-flow "Limites do Ajuste de Prompts"), `ei-ajustes.md` has 2 occurrences (Passo 4 + reviewer fan-out checklist) — matches the 11-edit-point spec exactly; `client-scaffold-fill.md`'s `tools:` frontmatter confirmed to include `Glob` (`tools: Read, Glob, Edit, Write`) |
| 6 | `check-claude-md-audience.sh` deterministically blocks Edit/Write reintroduction of a migrated heading into `CLAUDE.md`/`.claude/CLAUDE.md` (excluding `client/CLAUDE.md`), and does NOT false-positive on read-only tool calls | ✓ VERIFIED | Live behavioral spot check performed directly against the real script (not the test suite): a synthetic transcript with an `Edit` tool_use on a temp `CLAUDE.md` containing `## Slash Commands` produces `{"decision":"block",...}`; an identical transcript with `Read` instead of `Edit` produces empty stdout (confirms CR-01 fix is live, not just claimed) |
| 7 | The guard is registered ONLY in `.claude/settings.local.json` — never in `.claude/settings.json` or `manifest.json` | ✓ VERIFIED | `.claude/settings.local.json` has `hooks.Stop`/`hooks.SubagentStop` pointing at `check-claude-md-audience.sh`; `grep -c check-claude-md-audience .claude/settings.json manifest.json` → 0/0 in both files; `.gitignore` contains `.claude/settings.local.json` |
| 8 | End-to-end distribution (`bin/cli.js` against the manifest) still produces a `CLAUDE.md` identical to the pre-migration payload | ✓ VERIFIED | Content-equivalence already proven by Truth 1 (client/CLAUDE.md == pre-migration root minus Commits, and manifest now maps that file to `CLAUDE.md` on install); human checkpoint (03-05-PLAN Task 3, `gate="blocking"`) was run and approved per 03-05-SUMMARY.md ("Human response: 'approved'"), covering the actual network-fetch path this zero-dependency project has no automated mock for |

**Score:** 8/8 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/CLAUDE.md` | New isolated client payload source | ✓ VERIFIED | Exists, 80 lines, sole file in `client/`, content matches pre-migration root minus Commits |
| `manifest.json` | `{from,to}` object entry for CLAUDE.md | ✓ VERIFIED | Confirmed exact shape at line 5, rest of array/deprecated_files unchanged |
| `bin/cli.js` (normalizeEntry/formatManifestEntry) | Handles mixed schema safely everywhere | ✓ VERIFIED | Both functions present, used in install loop, deprecated_files loop (CR-02 fix), and help() |
| `bin/cli.test.js` | Unit coverage for normalize/format | ✓ VERIFIED | 8 behavior cases present, all passing |
| 9 subagent/command files | Dual-context fallback-read pattern | ✓ VERIFIED | All 9 confirmed via grep, correct edit-point counts |
| `.claude/hooks/check-claude-md-audience.sh` | Deterministic regression guard | ✓ VERIFIED | Present, executable, live-tested to block Edit/Write and ignore Read (CR-01 fix) and to exclude only exact `client/CLAUDE.md` path (WR-02 fix) |
| `.claude/hooks/check-claude-md-audience.test.js` | Unit coverage for guard | ✓ VERIFIED | 8 tests present (5 required behaviors + CR-01/WR-02 regressions + stop_hook_active-absence check), all passing, temp-dir cleanup added (WR-03 fix) |
| `.claude/settings.local.json` | Guard registration, local-only | ✓ VERIFIED | `hooks.Stop`/`hooks.SubagentStop` present, `permissions` block untouched |
| `.gitignore` | Defense-in-depth for settings.local.json | ✓ VERIFIED | Line present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `manifest.json` `{from,to}` entry | `bin/cli.js` install loop | `normalizeEntry(rawEntry)` → `fetchFile(from)`/`writeFile(to)` | ✓ WIRED | Confirmed at bin/cli.js:111-122 |
| `manifest.json` `deprecated_files[]` entry | `bin/cli.js` cleanup loop | `normalizeEntry(rawEntry)` → `removeFile(to)`, wrapped in try/catch | ✓ WIRED | Confirmed at bin/cli.js:98-109 — this is the CR-02 fix, verified present in current code (not merely claimed in 03-REVIEW-FIX.md) |
| 9 subagent/command Fase/Passo 0 blocks | `client/CLAUDE.md` or `CLAUDE.md` | Glob-then-Read fallback instruction text | ✓ WIRED | grep-confirmed in all 9 files |
| `.claude/settings.local.json` `hooks.Stop`/`hooks.SubagentStop` | `check-claude-md-audience.sh` | `"$CLAUDE_PROJECT_DIR"/.claude/hooks/check-claude-md-audience.sh` | ✓ WIRED | Confirmed via `require()` of settings.local.json |
| `check-claude-md-audience.sh` touched-file discovery | banned-heading grep | `name":"(Edit\|Write)"` filter → `grep -Eq "$BANNED_HEADINGS"` | ✓ WIRED | Live spot check: Edit blocks, Read does not (CR-01 fix confirmed live) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Guard blocks Edit tool_use on a CLAUDE.md file (not under client/) containing a banned heading | Synthetic transcript piped to `check-claude-md-audience.sh` | `{"decision":"block",...}` | ✓ PASS |
| Guard does NOT block Read-only tool_use on the same file/content | Same synthetic transcript, `name:"Read"` | Empty stdout | ✓ PASS |
| `npm test` full regression suite | `npm test` | 43/43 passing | ✓ PASS |
| client/CLAUDE.md content matches pre-migration root minus Commits | `diff` against git history pre-removal commit | Zero diff (except the 3 removed Commits lines) | ✓ PASS |
| `.claude/CLAUDE.md` has zero migrated H2 headings | grep | Zero matches (exit 1) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLMD-01 | 03-01 | `client/CLAUDE.md` verbatim minus Commits | ✓ SATISFIED | Truth 1 |
| CLMD-02 | 03-01 | `manifest.json` `{from,to}` shape | ✓ SATISFIED | Truth 2 |
| CLMD-03 | 03-02 | `bin/cli.js` normalizes entries, no `[object Object]` | ✓ SATISFIED | Truth 3 (including CR-02 fix for deprecated_files) |
| CLMD-04 | 03-04 | Root `CLAUDE.md` removed, no client content leaks | ✓ SATISFIED | Truth 4 |
| CLMD-05 | 03-04 | `.claude/CLAUDE.md` commits-line no longer cites root | ✓ SATISFIED | Truth 4 |
| CLMD-06 | 03-03 | 9 distributed files use dual-context fallback | ✓ SATISFIED | Truth 5 |
| CLMD-07 | 03-05 | Deterministic guard, repo-local-only registration | ✓ SATISFIED | Truth 6, 7 |
| CLMD-08 | 03-05 | End-to-end distribution unchanged | ✓ SATISFIED | Truth 8 (human-approved checkpoint + content-equivalence proof) |

All 8 requirement IDs (CLMD-01 through CLMD-08) declared in ROADMAP.md for Phase 3 are claimed by exactly one plan each (03-01: CLMD-01/02; 03-02: CLMD-03; 03-03: CLMD-06; 03-04: CLMD-04/05; 03-05: CLMD-07/08). No orphaned requirements found.

### Anti-Patterns Found

None blocking. Code review (03-REVIEW.md) already found and this verification independently reconfirmed the fix status of all findings:

| Finding | Severity | Status | Verified Fix Location |
|---------|----------|--------|------------------------|
| CR-01 (guard false-positives on Read) | Critical | ✓ Fixed, confirmed live | `.claude/hooks/check-claude-md-audience.sh:57-63` (Edit/Write name filter); live spot check performed |
| CR-02 (deprecated_files object entry crashes install) | Critical | ✓ Fixed, confirmed in code | `bin/cli.js:98-109` |
| WR-02 (`/client/` substring match too loose) | Warning | ✓ Fixed, confirmed in code | `.claude/hooks/check-claude-md-audience.sh:63` (`grep -vE '(^|/)client/CLAUDE\.md$'`) |
| WR-03 (test temp-dir leak) | Warning | ✓ Fixed, confirmed in test file (t.after cleanup pattern) | `.claude/hooks/check-claude-md-audience.test.js` |
| WR-01 (settings.local.json permissions list size) | Warning | Correctly skipped — reviewer's own note says "no action required" | N/A, informational only |

No unreferenced `TBD`/`FIXME`/`XXX` markers found in the phase's modified files. `IN-01`/`IN-02`/`IN-03` from 03-REVIEW.md remain open as low-priority, non-blocking info items (stale GSD project-block prose, JSON quote-escaping edge case, undocumented dual-missing-file fallback) — none affect goal achievement.

### Human Verification Required

None. The one item requiring human judgment (CLMD-08's end-to-end distribution check, since this zero-dependency project has no network-fetch mock) was already run as a blocking `checkpoint:human-verify` gate in Plan 03-05 Task 3, and the human response ("approved") is documented in `03-05-SUMMARY.md`'s "Checkpoint Resolution" section. This verification additionally reconfirmed the underlying content-equivalence claim independently via `git diff` against the pre-migration file, so the goal is not resting on the human approval alone.

### Gaps Summary

No gaps found. All 8 must-have truths verified against the current codebase state (not SUMMARY.md claims). All 5 ROADMAP.md success criteria hold. Both critical code-review findings (CR-01, CR-02) and 2 of 3 warnings (WR-02, WR-03) are fixed and confirmed present in the live code via direct inspection and a live behavioral spot check (not just re-reading the fix report). The one skipped warning (WR-01) was explicitly marked "no action required for this phase" by the reviewer itself. `npm test` passes 43/43 in a fresh run. Working tree is clean; all fix commits are present in git history.

---

_Verified: 2026-07-16T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
