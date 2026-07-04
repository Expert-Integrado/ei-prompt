# External Integrations

**Analysis Date:** 2026-07-04

## APIs & External Services

**GitHub raw content (core product mechanism):**
- Service: `raw.githubusercontent.com` — fetched directly via the global `fetch` API in `bin/cli.js` (`fetchFile()`, `RAW_BASE` built from `manifest.json`'s `repo`/`branch` fields: `Expert-Integrado/ei-prompt`@`main`).
  - SDK/Client: none — raw `fetch()`, no GitHub SDK/Octokit.
  - Auth: none — public unauthenticated GET requests only (repo is public).
  - Failure handling: non-2xx response throws `Error(status + statusText + url)`; caller (`run()`) catches per-file and increments a `failed` counter, exiting with code 1 if any file failed.

**npm registry:**
- Service: `https://registry.npmjs.org` — package publish target.
  - Client: `npm publish` (GitHub Actions step in `.github/workflows/publish.yml`).
  - Auth: `NODE_AUTH_TOKEN` populated from GitHub Actions secret `NPM_TOKEN`.

**GitHub CLI (`gh`):**
- Used interactively by maintainers (per user's global memory notes) for repo/PR operations; not invoked programmatically anywhere in this repo's code.

## Data Storage

**Databases:**
- None. No database, no ORM, no connection strings anywhere in the codebase.

**File Storage:**
- Local filesystem only. `bin/cli.js` reads/writes files relative to `process.cwd()` (the directory where `npx ei-prompt` is invoked) using Node's `fs` module. There is no remote/blob storage.

**Caching:**
- None. Every invocation re-fetches all files listed in `manifest.json` fresh from GitHub; local content is only compared byte-for-byte to decide `added`/`updated`/`unchanged`/`skipped` (no HTTP caching headers, no ETag logic).

## Authentication & Identity

**Auth Provider:**
- None in the shipped CLI. No login flow, no API keys required to run `ei-prompt`.
- Publishing pipeline auth: npm token (`NPM_TOKEN` secret) as described above.

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry/Bugsnag/etc. Errors are only printed to console (`log("red", "erro", ...)` in `bin/cli.js`) and surfaced via non-zero process exit codes.

**Logs:**
- Console-only, colorized via raw ANSI escape codes defined in `COLORS` (`bin/cli.js`). No log files, no external log aggregation.

## CI/CD & Deployment

**Hosting:**
- N/A — this is a CLI tool, not a hosted service. Distribution is via the npm registry; the "runtime" is whatever machine invokes `npx`.

**CI Pipeline:**
- GitHub Actions: `.github/workflows/publish.yml`
  - Trigger: push to `main` branch, or manual `workflow_dispatch`.
  - Steps: checkout (`actions/checkout@v4`) → setup Node 20 (`actions/setup-node@v4`, registry `https://registry.npmjs.org`) → `npm publish --access public`.
  - This is the **only** automated pipeline in the repo — no test/lint CI job exists.

## Environment Configuration

**Required env vars:**
- `NPM_TOKEN` (GitHub Actions secret, injected as `NODE_AUTH_TOKEN`) — required only for the publish workflow, not for end users running the CLI.
- `CLAUDE_PROJECT_DIR` — used by `.claude/settings.json` hook commands (Claude Code's own env var, not an app secret).
- `.env` file exists at repo root (contents not read per security policy) — not referenced anywhere in `bin/cli.js`; presumed to be local tooling config unrelated to the published package.

**Secrets location:**
- `NPM_TOKEN`: GitHub repository/organization Actions secrets (not in repo).
- Local `.env`: present in `.gitignore`, not committed.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None (the GitHub raw-content fetch described above is a pull, not a webhook).

## Claude Code Integration (project tooling, not shipped runtime dependency)

This repo is itself developed using Claude Code, and its `.claude/` directory (agents, hooks, slash commands) is one of the artifact sets distributed to end-user "client" projects via `manifest.json`. Notable pieces:
- `.claude/hooks/post-scaffolder-review.sh` — `SubagentStop` hook guarding against loops after the `client-project-scaffolder` subagent.
- `.claude/hooks/post-ajustes-fanout.sh` — `Stop` hook driving the `/ei-ajustes` multi-step pipeline (parallel edit/review fan-out) via the `reason` field of the Stop event schema.
- `.claude/hooks/inject-ei-context.sh` — currently disabled (per `.claude/settings.json` `_disabled_note`), previously injected `CLAUDE.md`/`docs/*` context automatically.
- Subagents with `model:` frontmatter (opus, etc.): `.claude/agents/client-project-scaffolder.md`, `docs-editor-conciso.md`, `docs-reviewer.md`, `docs-analyzer.md`, `recepcionista-scaffolder.md` — these run under the Claude API via Claude Code's own agent orchestration, not called directly by any code in this repo.

---

*Integration audit: 2026-07-04*
