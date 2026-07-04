# Codebase Concerns

**Analysis Date:** 2026-07-04

## Tech Debt

**Context injection system disabled but not removed:**
- Issue: `.claude/hooks/inject-ei-context.sh` (70 lines) implements a full context-injection system (editor/reviewer/full modes) but is disabled since v1.8.9. `.claude/settings.json` carries a `_disabled_note` explaining that the `SessionStart`/`UserPromptSubmit`/`PreToolUse` hook blocks that called it were removed, and CLAUDE.md now tells users to manually `Read` the docs table instead.
- Files: `.claude/hooks/inject-ei-context.sh`, `.claude/settings.json`, `CLAUDE.md` (header warning)
- Impact: dead code kept in the shipped manifest (`manifest.json` still lists `inject-ei-context.sh` as an installed file) even though nothing invokes it; every `npx ei-prompt` install ships an inert script. Also creates a manual-process failure mode — if a user (or Claude instance) forgets to manually load the docs table, project rules silently don't apply.
- Fix approach: either restore the hook wiring in `settings.json` (if the "maintenance" reason has resolved) or delete the script + manifest entry and rely purely on the CLAUDE.md-directed manual reads.

**Two independent hook-based auto-pipelines with overlapping responsibility:**
- Issue: `post-scaffolder-review.sh` (SubagentStop, 108 lines) and `post-ajustes-fanout.sh` (Stop, 76 lines) both detect sentinel markers in the transcript to drive multi-step agent pipelines (`/ei-cria-cliente` review and `/ei-ajustes` fan-out review). The `docs-editor-conciso)` branch inside `post-scaffolder-review.sh` explicitly special-cases coexistence with the other hook via a "guarda silenciosa" (silent guard) that must stay in sync with `post-ajustes-fanout.sh`'s sentinel regex.
- Files: `.claude/hooks/post-scaffolder-review.sh:72-96`, `.claude/hooks/post-ajustes-fanout.sh`
- Impact: the two scripts must be edited in lockstep (same regex `<ei-ajustes-round id="round-[0-9]+-[a-z0-9]{3}"`, same window sizes) — a change to one without the other reintroduces the "anti-loop" bug both were patched to fix (see `cb67556 fix(hooks): sentinela anti-loop`). No shared helper/library exists; the duplicated regex/logic lives inline in each script.
- Fix approach: extract the shared sentinel-detection logic (transcript extraction, JSONL de-escaping, round-id regex) into a single sourced helper (`.claude/hooks/lib/sentinel.sh`) used by both hooks.

**Fragile transcript parsing without JSON tooling:**
- Issue: all hook scripts parse hook input and Claude Code transcript JSONL using `grep -o`/`sed` regex instead of `jq`, per explicit "zero dependency" design comments.
- Files: `.claude/hooks/post-scaffolder-review.sh:26,36`, `.claude/hooks/post-ajustes-fanout.sh:30,46,54-57`
- Impact: any change to Claude Code's JSON field ordering/escaping, or a `"` inside a sentinel attribute, can silently break detection (comments already document one such fix, "CR-01", for JSONL string-escaping of `\"`). Failures are silent (hooks `exit 0` on any parse miss) so a regression would not throw an error — it would just stop the automation from firing, and nothing would notice.
- Fix approach: keep the no-dependency constraint if intentional (portability), but add a lightweight self-test invoked in CI (feed a synthetic transcript fixture and assert sentinel detection) so parsing regressions are caught before release.

**Command file size / complexity:**
- Issue: `.claude/commands/ei-ajustes.md` is 765 lines, encoding an 6-step pipeline (analyze → gate → fan-out edit → fan-out review → hook handoff) with multiple named "REGRA INVIOLÁVEL" (inviolable rule) blocks referenced by ID (HOOK-02, PARL-04, REVW-04, D-11, D-17, D-06...).
- Files: `.claude/commands/ei-ajustes.md`
- Impact: a single command file is the source of truth for a large amount of cross-cutting behavior (hooks, sub-agents, retry caps). Any edit risks breaking an invariant documented elsewhere (in `.planning/` phase docs referenced in hook comments, e.g. `05-RESEARCH.md`, `VALIDATION.md`) that isn't co-located with the code.
- Fix approach: no immediate action required, but future changes to this command should cross-check the referenced `.planning/phases/05-hook-driven-pipeline/` artifacts (if still present) before editing rule blocks.

## Known Bugs

**None currently open** — the two historical hook loop bugs (`client-project-scaffolder` background reinjection loop; `docs-editor-conciso` fan-out reinjection loop) both have committed fixes with anti-loop sentinel guards (see `cb67556` and inline comments in `post-scaffolder-review.sh:42-58` and `post-ajustes-fanout.sh:23-27`). No open TODO/FIXME/HACK/XXX markers were found in `bin/cli.js`, hooks, or `.claude/` config — the two hits from a repo-wide grep are documentation text referencing rule IDs, not literal debt markers.

## Security Considerations

**`removeFile` path-traversal guard is defense-in-depth against a self-owned manifest:**
- Risk: `bin/cli.js` fetches `manifest.json` bundled with the npm package (not remote), so `deprecated_files` entries are trusted at publish time. `removeFile()` (`bin/cli.js:59-78`) still checks `dest.startsWith(cwd + path.sep)` before unlinking, which is good practice, but there is no equivalent guard on the `writeFile()` path for `manifest.files` — a compromised/malicious manifest (e.g. via a supply-chain compromise of the npm package or a MITM if `RAW_BASE` weren't HTTPS) could write outside the project via `relPath` containing `../`.
- Files: `bin/cli.js:32-57` (`writeFile`), `bin/cli.js:59-78` (`removeFile`, has the guard)
- Current mitigation: only `removeFile` validates the resolved path stays under CWD; `writeFile` uses `path.join(process.cwd(), relPath)` without validating `../` traversal escapes CWD.
- Recommendation: add the same "resolved path starts with CWD" check to `writeFile` for symmetry, since `manifest.json` is fetched indirectly (via the published npm package, itself sourced from GitHub `main` branch per `.github/workflows/publish.yml`) and any future refactor to fetch the manifest remotely would inherit this gap silently.

**CI publish workflow runs unattended npm publish on every push to `main`:**
- Risk: `.github/workflows/publish.yml` runs `npm publish --access public` on every push to `main` (not just tags/releases), gated only by an `NPM_TOKEN` secret. Per project memory, releases happen via PR-merge-to-main, meaning any merged PR — including a compromised/malicious one that passes review — triggers an automatic public npm publish with no version-bump or approval gate.
- Files: `.github/workflows/publish.yml`
- Current mitigation: `id-token: write` permission suggests trusted publishing (OIDC) may be intended, but the workflow still uses a static `NODE_AUTH_TOKEN` secret rather than OIDC-based trusted publishing.
- Recommendation: add a manual approval environment (GitHub Environments with required reviewers) before the publish step, or gate on tag pushes only, to reduce blast radius of an accidental/malicious merge to `main`.

**Root `.env` file present:**
- Existence noted only (not read) — a `.env` file exists at `/root/EiPrompt/.env` and is correctly excluded via `.gitignore`. No further action needed as long as it stays untracked; verify no CI or hook accidentally reads/echoes it.

## Performance Bottlenecks

**None significant** — this is a small CLI (`bin/cli.js`, 143 lines) that sequentially fetches ~19 files from GitHub raw content per install/update. Fetches in `run()` (`bin/cli.js:93-102`) are awaited one at a time in a `for` loop rather than run in parallel via `Promise.all`, so install time scales linearly with file count (~19 sequential network round-trips). Not a practical problem at current file counts, but worth flagging if the manifest grows substantially.
- Files: `bin/cli.js:93-102`
- Improvement path: switch to `Promise.allSettled` over `manifest.files` to fetch/write concurrently, preserving per-file error handling.

## Fragile Areas

**Sentinel-marker protocol between hooks and Claude's own text output:**
- Files: `.claude/hooks/post-scaffolder-review.sh`, `.claude/hooks/post-ajustes-fanout.sh`, `.claude/commands/ei-ajustes.md`
- Why fragile: the entire automated pipeline hinges on Claude reliably emitting a literal sentinel string (e.g. `<ei-ajustes-round-consumed id="..."/>`) in free text, which the hook then greps for in the JSONL transcript. This is inherently probabilistic (an LLM instruction-following behavior) rather than a deterministic API contract. Comments already document three iterations of fixes (CR-01 JSONL escaping, "Phase 5 fix iter 3" type:assistant filter, HOOK-02b) needed to make detection reliable.
- Safe modification: any change to the instructional text that tells Claude to emit the sentinel (in `ei-ajustes.md` or the hook's injected `reason`/`additionalContext`) must keep the exact sentinel format (`round-<unix>-<3alfanum>`) in sync with the hook regexes, or detection silently breaks.
- Test coverage: no automated test harness verifies the hook scripts against synthetic transcripts (see Tech Debt above).

**`.claude/settings.local.json` is per-machine but present in repo working tree:**
- Files: `.claude/settings.local.json`
- Why fragile: local settings (typically permission grants) are usually gitignored; confirm this file is excluded via `.gitignore` (`.claude/worktrees/` is ignored, but `.claude/settings.local.json` is not explicitly listed) — if committed, it could leak machine-specific permission grants or paths into the shared repo.

## Scaling Limits

**Manifest file list is flat and manually maintained:**
- Current capacity: 19 files tracked in `manifest.json`, all individually listed for fetch/write and for the `--help` output.
- Limit: adding new agent files/docs requires manually updating `manifest.json` in three conceptual places (the array, `deprecated_files` if replacing something, and implicitly the README/CHANGELOG). No directory-based "sync everything under X" mechanism exists.
- Scaling path: if the project grows to dozens of client-facing template files, consider a manifest generator script (walk `docs/`, `.claude/`, `modelo/` and emit `manifest.json`) to avoid drift between what's on disk in the source repo and what's declared as installable.

## Dependencies at Risk

**None** — `package.json` declares zero runtime dependencies (`bin/cli.js` uses only Node built-ins `fs`, `path`, and global `fetch`, requiring Node >=18). This is a strength, not a risk: no supply-chain dependency surface to monitor.

## Missing Critical Features

**No dry-run / diff preview before overwrite:**
- Problem: `npx ei-prompt` always runs with `overwrite: true` (`bin/cli.js:135`) — there is no `--dry-run` flag to preview which files would change before they're overwritten, only a same-content check that silently no-ops (`writeFile:44-48`). A user with local edits to a client's `Orquestrador.md` who runs `ei-prompt` to pick up an unrelated fix has no way to preview the diff first.
- Blocks: safe adoption of the tool in projects with locally customized agent files that intentionally diverge from `modelo/`.

**No version check to detect breaking manifest changes:**
- Problem: the CLI always fetches `main`@HEAD; there's no local manifest version stored to detect that a big structural change (e.g., the `Orquestrador.md`/`Qualifier.md` deletion referenced in `manifest.json` deprecated section) happened since last install, beyond the printed added/updated/removed counts.
- Blocks: users can't easily tell "this update changed something structurally important" versus a routine content tweak.

## Test Coverage Gaps

**No automated tests exist anywhere in the repository:**
- What's not tested: `bin/cli.js` (fetch/write/remove logic, path-traversal guard, overwrite/skip/unchanged branching), all four `.claude/hooks/*.sh` scripts (sentinel detection, JSONL parsing, anti-loop guards), and all `.claude/agents/*.md` / `.claude/commands/*.md` prompt-driven behaviors (untestable via conventional unit tests, but currently have zero fixture-based verification either).
- Files: `bin/cli.js`, `.claude/hooks/*.sh`
- Risk: the hook scripts in particular encode subtle, previously-buggy anti-loop logic (see Known Bugs / Fragile Areas) with no regression test protecting against reintroducing the loop bugs already fixed once in production (`cb67556`).
- Priority: High for the two Stop/SubagentStop hook scripts (given their history of production loop bugs); Medium for `bin/cli.js`'s path-traversal and overwrite logic.

---

*Concerns audit: 2026-07-04*
