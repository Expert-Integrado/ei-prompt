# Technology Stack

**Analysis Date:** 2026-07-04

## Languages

**Primary:**
- JavaScript (CommonJS, Node.js) - `bin/cli.js` — the entire published CLI

**Secondary:**
- Markdown - `modelo/*.md`, `docs/*.md`, `.claude/agents/*.md`, `.claude/commands/*.md` (prompt/agent definitions, not code, but versioned and shipped as CLI payload)
- Bash - `.claude/hooks/*.sh` (Claude Code hook scripts, not part of the npm package)
- JSON - `manifest.json`, `.claude/settings.json`, `package.json`

## Runtime

**Environment:**
- Node.js >= 18 (declared in `package.json` `engines.node`; required for global `fetch` used in `bin/cli.js`)

**Package Manager:**
- npm (package published as `@expertzinhointegrado/ei-prompt`)
- Lockfile: missing (no `package-lock.json` in repo; project has zero runtime dependencies so this is low-risk)

## Frameworks

**Core:**
- None — `bin/cli.js` is plain Node.js using only built-in modules (`fs`, `path`) and the global `fetch` API. No CLI framework (no commander/yargs), no bundler.

**Testing:**
- None detected — no test framework, no test files, no `test` script in `package.json`.

**Build/Dev:**
- None — no build step; `bin/cli.js` is run directly via the `bin` field in `package.json` (`npx @expertzinhointegrado/ei-prompt@latest`).

## Key Dependencies

**Critical:**
- None. `package.json` declares zero `dependencies` and zero `devDependencies`. The tool is intentionally dependency-free.

**Infrastructure:**
- `manifest.json` acts as the declarative "dependency" list for the CLI's own behavior — it enumerates every file the CLI downloads/removes from GitHub (see INTEGRATIONS.md).

## Configuration

**Environment:**
- `.env` file present at repo root — contents not inspected (forbidden). Not referenced by `bin/cli.js`; likely used only for local/agent tooling, not the published package.
- No `.env.example` present.

**Build:**
- No build config files (no `tsconfig.json`, no bundler config, no `.babelrc`). `package.json` `files` field restricts the published npm tarball to `bin/` and `manifest.json` only — all other repo content (`docs/`, `modelo/`, `.claude/`) is distributed exclusively via the GitHub-fetch mechanism in `bin/cli.js`, not via npm.

## Platform Requirements

**Development:**
- Node.js >= 18 (for native `fetch`)
- Git (repo is the source of truth fetched at runtime by consumers of the CLI)
- Claude Code CLI (this repo's own `.claude/` directory — agents, hooks, commands — is used to develop/maintain the project itself, and is also one of the artifact sets shipped to end-user client projects via `manifest.json`)

**Production:**
- End users run `npx @expertzinhointegrado/ei-prompt@latest` in any Node >= 18 environment; the CLI has no server component and no persistent runtime — it downloads files from GitHub raw content into the invoking project's working directory (`bin/cli.js` `writeFile`/`fetchFile`).
- Publishing target: npm registry (`https://registry.npmjs.org`), automated via GitHub Actions (`.github/workflows/publish.yml`), Node 20 runner.

---

*Stack analysis: 2026-07-04*
