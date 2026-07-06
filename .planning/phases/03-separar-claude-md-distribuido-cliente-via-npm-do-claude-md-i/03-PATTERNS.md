# Phase 3: Separar CLAUDE.md distribuído (cliente) do CLAUDE.md interno - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 15 (creations + modifications; ~10 fallback-read edits grouped by shared pattern)
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `client/CLAUDE.md` (new) | config/content payload | file-I/O (verbatim copy) | current `CLAUDE.md` (source content being moved) | exact (same content, new location) |
| `manifest.json` (files array entry) | config | CRUD (data shape change) | existing `files` array itself | exact |
| `bin/cli.js` — `normalizeEntry()` (new function) | utility | transform | none exists yet; closest shape is `removeFile()`'s guard-clause style | role-match |
| `bin/cli.js` — install loop (~lines 93-102) | controller (CLI loop) | batch / file-I/O | same loop, pre-change (self-modify) | exact |
| `bin/cli.js` — `help()` (~lines 114-128) | utility (CLI output) | transform | same function, pre-change (self-modify) | exact |
| `bin/cli.js` — `writeFile`/`fetchFile` call sites | utility | file-I/O | `fetchFile`/`writeFile` themselves (unchanged signatures, just called with `.from`/`.to`) | exact |
| `bin/cli.test.js` (new) | test | unit | `.claude/hooks/validate-xml-casca.test.js` | exact (same `node:test` framework, same repo) |
| root `CLAUDE.md` (emptied/removed) | config/content | file-I/O | n/a (deletion/reduction, not a new pattern) | n/a |
| `.claude/CLAUDE.md` (one line edited) | config/content | transform | itself, "Agent-Editing Conventions" section | exact |
| `.claude/hooks/check-claude-md-audience.sh` (new) | middleware/guard (hook) | event-driven | `.claude/hooks/validate-xml-casca.sh` | exact (same role: deterministic Stop/SubagentStop content guard) |
| `.claude/settings.local.json` (new hooks block) | config | event-driven (hook registration) | `.claude/settings.json` (`hooks.Stop`/`hooks.SubagentStop` blocks) | exact (same JSON shape, different file) |
| `.claude/agents/docs-analyzer.md` (Passo 0 fallback) | route/instruction (subagent doc) | request-response | itself, Passo 0 section | exact |
| `.claude/agents/client-scaffold-structure.md` (Fase 0 fallback) | route/instruction (subagent doc) | request-response | itself, Fase 0 §1 | exact |
| `.claude/agents/docs-editor-conciso.md` (Passo 0 + line 95 fallback) | route/instruction (subagent doc) | request-response | itself, Passo 0 section | exact |
| `.claude/agents/docs-reviewer.md`, `recepcionista-scaffolder.md`, `client-scaffold-collect.md`, `.claude/commands/ei-cria-cliente.md`, `ei-ajustes.md` (fallback reads) | route/instruction | request-response | same Passo/Fase 0 pattern as above (one shared template) | exact |

## Pattern Assignments

### `client/CLAUDE.md` (new file — content payload)

**Analog:** current root `CLAUDE.md` (to be copied verbatim minus "Commits" section, per D-05/D-06).

**Action:** Read the full current `/root/EiPrompt/CLAUDE.md`, copy every section EXCEPT `## Commits` into the new `client/CLAUDE.md`, unchanged byte-for-byte. Do not paraphrase, reformat headings, or reorder sections — D-01 requires physical/verbatim separation, not summarization.

---

### `manifest.json` — CLAUDE.md entry (CRUD, config)

**Analog:** `manifest.json` itself — current `files` array (~28 plain-string entries).

**Current shape** (representative excerpt, string entries):
```json
{
  "repo": "Expert-Integrado/ei-prompt",
  "branch": "main",
  "files": [
    "CLAUDE.md",
    "docs/regras-edicao.md",
    ".claude/settings.json"
  ]
}
```

**Target shape (from RESEARCH.md Exemplo 1):**
```json
{
  "files": [
    { "from": "client/CLAUDE.md", "to": "CLAUDE.md" },
    "docs/regras-edicao.md",
    ".claude/settings.json"
  ]
}
```
Only the `"CLAUDE.md"` entry becomes an object. All ~27 other entries stay untouched plain strings. `deprecated_files` array schema is unchanged (D-04).

---

### `bin/cli.js` — `normalizeEntry()` + install loop (controller, batch/file-I/O)

**Analog:** `bin/cli.js` itself, `removeFile()` (lines ~59-75) for its guard-clause error style, and the existing loop at lines 93-102.

**Imports pattern** (lines 1-8, already present, no change needed):
```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const manifest = require("../manifest.json");

const RAW_BASE = `https://raw.githubusercontent.com/${manifest.repo}/${manifest.branch}`;
```

**Existing loop to modify** (lines 93-102, current):
```javascript
for (const file of manifest.files) {
  try {
    const content = await fetchFile(file);
    const result = await writeFile(file, content, { overwrite });
    results[result]++;
  } catch (err) {
    log("red", "fail  ", `${file} — ${err.message}`);
    results.failed++;
  }
}
```

**New pattern** (RESEARCH.md Pattern 1, validation stays inside the per-file `try/catch` — same resilience convention as the codebase's documented error handling, "one failure doesn't abort the batch"):
```javascript
function normalizeEntry(entry) {
  if (typeof entry === "string") return { from: entry, to: entry };
  if (entry && typeof entry.from === "string" && typeof entry.to === "string") return entry;
  throw new Error(`entrada de manifest inválida: ${JSON.stringify(entry)}`);
}

for (const rawEntry of manifest.files) {
  try {
    const { from, to } = normalizeEntry(rawEntry);
    const content = await fetchFile(from);
    const result = await writeFile(to, content, { overwrite });
    results[result]++;
  } catch (err) {
    log("red", "fail  ", `${typeof rawEntry === "string" ? rawEntry : rawEntry.to || JSON.stringify(rawEntry)} — ${err.message}`);
    results.failed++;
  }
}
```

**Error handling pattern to preserve** (matches project convention documented in `.claude/CLAUDE.md` §Error Handling): validation errors thrown inside the per-file `try/catch`, aggregated into `results.failed`, never abort the full loop. `run({...}).catch(...)` at the bottom remains the only top-level catch-all (unchanged).

---

### `bin/cli.js` — `help()` (utility, transform)

**Analog:** `help()` itself, current lines ~114-128.

**Current pattern:**
```javascript
${COLORS.yellow}Arquivos instalados/atualizados:${COLORS.reset}
${manifest.files.map((f) => `  - ${f}`).join("\n")}
```

**New pattern** (RESEARCH.md Pattern 2):
```javascript
${manifest.files.map((f) => `  - ${typeof f === "string" ? f : f.to}`).join("\n")}
```
Show `.to` (the path in the installed project) — `.from` is a repo-source implementation detail not relevant to `--help` output.

---

### `bin/cli.test.js` (new — unit tests)

**Analog:** `.claude/hooks/validate-xml-casca.test.js` (same `node:test` built-in framework, same repo conventions, zero-dependency).

**Action:** Read `.claude/hooks/validate-xml-casca.test.js` in full to copy its `describe`/`it` + `assert` structure (Node built-in `node:test` + `node:assert`), then write equivalent cases for:
- `normalizeEntry("CLAUDE.md")` → `{from: "CLAUDE.md", to: "CLAUDE.md"}`
- `normalizeEntry({from: "client/CLAUDE.md", to: "CLAUDE.md"})` → passthrough unchanged
- `normalizeEntry({from: "x"})` (missing `to`) → throws
- `help()`-equivalent smoke test: build a mock manifest with a mixed array and assert the joined output string never contains `[object Object]` (per Pitfall 1 in RESEARCH.md — may need to extract/require internal functions or shell out `node bin/cli.js --help` and grep, matching the project's zero-mocking style since `bin/cli.js` isn't structured for `module.exports` — decide based on whether refactoring `bin/cli.js` to export `normalizeEntry` is in scope; minimal-invasive option is `require("../bin/cli.js")` after guarding CLI execution behind `require.main === module`, or duplicating the tiny function inline in the test with a comment noting it must be kept in sync — planner should pick the least invasive option per D-anything-not-decided).

Run command: `node --test .claude/hooks/validate-xml-casca.test.js` for regression baseline (must stay 27/27 green per RESEARCH.md), and `node --test bin/cli.test.js` for the new file.

---

### root `CLAUDE.md` (emptied or removed) + `.claude/CLAUDE.md` (one line fix)

**Analog:** `.claude/CLAUDE.md` itself — section "Agent-Editing Conventions".

**Current line to adjust** (already present, cited literally by CONTEXT.md D-08):
```
- **Commits never include "Generated with Claude Code" or "Co-Authored-By"** signatures (explicit project rule in `CLAUDE.md` and `docs/proibido-fazer.md`).
```

**Target** (remove the now-incorrect cross-reference to root `CLAUDE.md`, since the Commits rule no longer lives there per D-06/D-07):
```
- **Commits never include "Generated with Claude Code" or "Co-Authored-By"** signatures (explicit project rule — see `docs/proibido-fazer.md`).
```
Root `CLAUDE.md`: per RESEARCH.md State of the Art + A3, recommendation is full removal (Claude Code docs confirm removing root `CLAUDE.md` entirely is supported), leaving `.claude/CLAUDE.md` as the sole "Project instructions" file for this repo (D-07 discretion, planner should confirm final call).

---

### `.claude/hooks/check-claude-md-audience.sh` (new guard hook)

**Analog:** `.claude/hooks/validate-xml-casca.sh` (structurally identical role: deterministic Stop/SubagentStop content guard, no `stop_hook_active` suppression).

**Header/shebang + safety flags pattern** (lines 1-33 of `validate-xml-casca.sh`, copy verbatim style):
```bash
#!/bin/bash
# Stop/SubagentStop event hook — <describe purpose>
# ...
# DESIGN DELIBERADO — NENHUMA guarda de stop_hook_active:
# este hook reavalia um FATO estático e re-checável a cada invocação.
# ...
set -uo pipefail
```

**Transcript extraction pattern** (lines 34-40):
```bash
INPUT=$(cat)
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0
[ ! -r "$TRANSCRIPT" ] && exit 0
```

**Delegation-to-Node vs. pure-bash decision:** `validate-xml-casca.sh` delegates to `validate-xml-casca.js` via `discoverTouchedFiles(transcriptPath)` (lines 228+, parses `tool_input.file_path` from `type:assistant` entries). RESEARCH.md Open Question 1 says pure bash is sufficient here since the check is a simple grep over 5 fixed headings (RESEARCH.md Exemplo 3):
```bash
BANNED_HEADINGS='^## Mapa de Regras$|^## Arquitetura Padrão de Agentes$|^## Arquitetura Multi-Agente|^## Slash Commands$|^## Regras Básicas$'

for f in "${TOUCHED_ROOT_OR_INTERNAL_CLAUDE_MD[@]}"; do
  if grep -Eq "$BANNED_HEADINGS" "$f"; then
    echo "{\"decision\":\"block\",\"reason\":\"$f contém um cabeçalho migrado para client/CLAUDE.md (D-05) — conteúdo de cliente vazando para doc interno.\"}"
    exit 0
  fi
done
exit 0
```
If touched-file discovery needs the same robustness as `validate-xml-casca.js`'s `discoverTouchedFiles()` (transcript JSONL parsing, tail 400 lines, `entry.input.file_path`), reuse that function's logic (lines 228-296 of `validate-xml-casca.js`) rather than re-deriving it — same non-overlapping-range extraction target for planner/implementer.

**Output contract:** identical to `validate-xml-casca.sh` — `{}`/empty stdout = no block; `{"decision":"block","reason":"..."}` otherwise. No `stop_hook_active` check anywhere (intentional, matches the comment block above).

---

### `.claude/settings.local.json` (new `hooks` block — registration only, gitignored)

**Analog:** `.claude/settings.json`'s existing `hooks.Stop`/`hooks.SubagentStop` array shape.

**Current shape in `.claude/settings.json`** (full file read, hooks block):
```json
{
  "hooks": {
    "_disabled_note": "Sistema de injeção de contexto desativado em v1.8.9 para manutenção. ...",
    "SubagentStop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-scaffolder-review.sh" } ] },
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-xml-casca.sh" } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-ajustes-fanout.sh" } ] },
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-xml-casca.sh" } ] }
    ]
  }
}
```

**Target — merge into existing `.claude/settings.local.json`** (which currently only has a `permissions.allow` array + `additionalDirectories`, no `hooks` key yet). MUST preserve the existing `permissions` block untouched, only ADD a `hooks` key:
```json
{
  "permissions": { "allow": [ "... (existing block preserved verbatim) ..." ], "additionalDirectories": [ "..." ] },
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-claude-md-audience.sh" } ] }
    ],
    "SubagentStop": [
      { "hooks": [ { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-claude-md-audience.sh" } ] }
    ]
  }
}
```
CRITICAL: never touch `.claude/settings.json` for this (it is distributed via `manifest.json`, would ship a dangling hook reference to every client — Pitfall 3). Verify with `Read` the exact current content of `.claude/settings.local.json` before editing since it already has a large `permissions.allow` array that must not be clobbered.

---

### Fallback-read pattern for ~10 distributed subagents/commands (shared cross-cutting change)

**Analog:** each file's own existing "Passo 0" / "Fase 0" section (self-referential — same file, edited in place).

**`docs-analyzer.md` current Passo 0** (lines 12-18):
```markdown
## ⚠️ PASSO 0 — CARREGAR REGRAS (OBRIGATÓRIO)

Antes de qualquer outra ação, leia via `Read`:
- `CLAUDE.md`
- `docs/regras-edicao.md`
- `docs/proibido-fazer.md`
- `docs/multi-agente-recepcionista.md` (regra de personificação pós-transferência)
```

**`client-scaffold-structure.md` current Fase 0** (lines 14-20):
```markdown
## Fase 0: Carregar Contexto do Projeto (OBRIGATÓRIO antes de tudo)

> Injeção automática desativada em v1.8.9 (manutenção). Carregue manualmente via Read/Glob.

1. Leia `CLAUDE.md` integralmente via Read tool para internalizar as regras do projeto (arquitetura dos agentes, naming patterns, arquitetura multi-agente).
```

**`docs-editor-conciso.md` current Passo 0** (lines 9-15) + line 95 prose reference:
```markdown
## ⚠️ PASSO 0 — CARREGAR REGRAS DE EDIÇÃO (OBRIGATÓRIO)

> Injeção automática desativada em v1.8.9 (manutenção). Carregue manualmente via `Read`.

**Antes de qualquer outra ação**, leia via `Read`:
- `CLAUDE.md`
- `docs/regras-edicao.md`
- `docs/proibido-fazer.md`
```

**Target fallback pattern (RESEARCH.md Pattern 3 / CLMD-06)** — apply the same textual transformation to all ~10 occurrences (table in RESEARCH.md Pitfall 2: `client-scaffold-structure.md`, `client-scaffold-collect.md`, `docs-analyzer.md`, `docs-editor-conciso.md` x2, `docs-reviewer.md`, `recepcionista-scaffolder.md`, `ei-cria-cliente.md`, `ei-ajustes.md` x2):
```markdown
1. Verifique se `client/CLAUDE.md` existe (Glob). Se existir (você está rodando no
   repo-fonte do ei-prompt, testando o scaffolding), leia-o via Read — é a fonte
   real das regras de arquitetura de agentes/naming/multi-agente.
2. Se `client/CLAUDE.md` NÃO existir (você está rodando num projeto de cliente já
   instalado via npx), leia `CLAUDE.md` normalmente — ali está o conteúdo correto.
```
Each file's tool list must include `Glob` for this check — verify (`docs-analyzer.md` already has `Glob`; `client-scaffold-structure.md` already has `Glob`; `docs-editor-conciso.md` already has `Glob`) before assuming it's available; add to frontmatter `tools:` if missing.

**Sequencing constraint (from RESEARCH.md Architecture Patterns):** these ~10 edits MUST land BEFORE root `CLAUDE.md` is emptied/removed, so the repo is never in a state where neither file has valid content for the fallback to find.

## Shared Patterns

### Deterministic Stop/SubagentStop guard (no `stop_hook_active` suppression)
**Source:** `.claude/hooks/validate-xml-casca.sh` (comment block lines 18-26)
**Apply to:** `.claude/hooks/check-claude-md-audience.sh`
```bash
# DESIGN DELIBERADO — NENHUMA guarda de stop_hook_active: reavalia um FATO
# estático e re-checável a cada invocação, nunca suprimido em retry.
```

### Per-file try/catch resilience (batch never aborts on one bad entry)
**Source:** `bin/cli.js` install loop (lines 93-102) + documented in `.claude/CLAUDE.md` §Error Handling
**Apply to:** `bin/cli.js` `normalizeEntry()` integration
```javascript
try {
  const { from, to } = normalizeEntry(rawEntry);
  // ...
} catch (err) {
  log("red", "fail  ", `${...} — ${err.message}`);
  results.failed++;
}
```

### `manifest.json` files distributed vs. repo-local-only split
**Source:** `manifest.json` `files` array (28 distributed entries) vs. `.claude/hooks/check-claude-md-audience.sh` (deliberately absent from it) and `.claude/settings.local.json` (deliberately never in `files`)
**Apply to:** any new repo-local-only tooling — never add to `manifest.json`, never register in `.claude/settings.json`.

### `node:test` built-in test file structure
**Source:** `.claude/hooks/validate-xml-casca.test.js`
**Apply to:** `bin/cli.test.js`
Read the full file for `describe`/`it`/`assert` conventions before writing new tests — do not introduce a new test framework.

## No Analog Found

None — every file in scope has a direct or role-match analog already in the codebase.

## Metadata

**Analog search scope:** `bin/cli.js`, `manifest.json`, `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/*.sh`, `.claude/hooks/*.js`, `.claude/hooks/*.test.js`, `.claude/agents/*.md`, `.claude/commands/*.md`, root `CLAUDE.md`, `.claude/CLAUDE.md`
**Files scanned:** ~20 (bin/cli.js, manifest.json, settings.json, settings.local.json, validate-xml-casca.sh/.js, post-ajustes-fanout.sh, docs-analyzer.md, client-scaffold-structure.md, docs-editor-conciso.md, both CLAUDE.md files, plus RESEARCH.md's own file-line citations for the remaining ~7 subagent/command files)
**Pattern extraction date:** 2026-07-06
</content>
