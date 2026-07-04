# Phase 1: XML Validation Hook - Research

**Researched:** 2026-07-04
**Domain:** Node.js text validation script + Claude Code Stop/SubagentStop hook integration (zero-dependency)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Validation Engine**
- **D-01:** Pure Node.js (regex/string-based), zero dependency. `xmllint` was ruled out — confirmed NOT installed in this dev sandbox, not guaranteed on other machines, and the project has an explicit zero-new-dependency constraint. Node.js is already the project's required runtime (`bin/cli.js`).
- **D-02:** Validator logic lives in a dedicated `.js` script (e.g. `.claude/hooks/validate-xml-casca.js`) invoked by a thin bash wrapper, following the existing hooks' pattern (read stdin JSON, check `stop_hook_active`, extract `transcript_path`). Node is used specifically for the parts needing structural precision (line/column tracking, tag-nesting stack); bash wrapper stays consistent with `post-ajustes-fanout.sh` / `post-scaffolder-review.sh` conventions.
- **D-03:** Targeted structural checks, not a generic XML tokenizer — line-by-line regex for line 1 (`<?xml ...?>`) and line 2 (`<agente ...>`), plus a simple `<agente>`/`</agente>` open/close count for nesting/duplicate-root detection. Scope is intentionally limited to the 7 XMLV-01..07 requirements, not arbitrary XML well-formedness.
- **D-04:** Attribute checks (`xmlns`, `versao`, `tipo`, and `origem` for Recepcionista) are tolerant of attribute order — each required attribute is extracted and validated individually for presence/correctness, not matched as one exact literal string. This avoids false positives from harmless attribute reordering by an editor.

**File Discovery & Scope**
- **D-05 (Claude's discretion):** Exact file-discovery mechanism is left to the researcher/planner. Likely approach: parse `transcript_path` for `Edit`/`Write` tool calls in the current turn, mirroring `post-scaffolder-review.sh`'s transcript-scanning pattern — client files live in arbitrary folders outside this repo, so there's no fixed path to scan. **Research recommendation (this document):** delegate the actual transcript parsing to Node (`JSON.parse` per JSONL line), not bash grep/sed — see Architecture Patterns, Pattern 2, and Pitfall discussion.
- **D-06:** Validate only the file(s) actually touched in that turn, not the whole client folder. Faster, and XMLV requirements are per-file (no cross-file validation need).

**Blocking Behavior**
- **D-07:** The hook always blocks on a broken casca — emits `{"decision":"block","reason":"..."}` (same schema as `post-ajustes-fanout.sh`), with the actionable file + line/column detail (XMLV-06). Warn-only was rejected: it would let an AI editor ignore the warning, directly contradicting the milestone's Core Value ("never let a broken file pass unnoticed"). **Research finding (this document):** this means the new hook must NOT copy the `stop_hook_active` early-exit guard from the two existing hooks — see Pitfall 4.
- **D-08:** The accepted blind spot (XMLV-07 — raw `<`/`&` in client-variable content breaking the parse) is treated the same as any other structural failure: it blocks, and the error message must never suggest escaping/CDATA as a fix. No heuristic is built to distinguish "real casca break" from "content-triggered break" — per D-03's targeted-check design, the validator only tracks literal `<agente>`/`</agente>` boundaries, so generic client `<`/`&` in prose won't spuriously trip it anyway.

**Integration & Distribution**
- **D-09:** New dedicated hook script(s), registered alongside the existing `post-ajustes-fanout.sh` (Stop) and `post-scaffolder-review.sh` (SubagentStop) entries in `.claude/settings.json` — multiple hooks on the same event run in sequence. Existing hook code is not modified, eliminating risk to the sentinel/anti-loop protocol.
- **D-10:** Must be added to `manifest.json`'s `files` list for distribution via `npx ei-prompt` — end users need this protection in their own client folders too, since `docs-editor-conciso` and `client-project-scaffolder` run there, not just in this repo.

### Claude's Discretion
- Exact file-discovery mechanism (D-05) — this research recommends Node-side `JSON.parse`-per-JSONL-line over bash grep/sed for the nested `tool_use.input.file_path` extraction, while keeping bash-side extraction for flat fields (`transcript_path` itself) to stay consistent with existing hook conventions.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Phase 2's 3-step gated scaffolding work is a separate, already-scoped track and was not discussed here.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| XMLV-01 | Hook determinístico valida que cada arquivo de cliente começa com `<?xml version="1.0" encoding="UTF-8"?>` na 1ª linha | Architecture Patterns Pattern 1/2, Code Example 2 (BOM/CRLF-safe line splitting), Pitfalls 2 & 3 (empirically verified edge cases), Validation Architecture test map |
| XMLV-02 | Hook valida que a 2ª linha é `<agente xmlns="..." versao="1.0" tipo="…">` com atributos corretos numa linha só | Code Example 1 (attribute-order-tolerant parser, tested against all 6 real templates), Pitfall 7 |
| XMLV-03 | Hook valida que `tipo` corresponde ao arquivo (mapeamento fixo, incl. Recepcionista `orchestrator`+`origem="recepcionista"`) | Pitfall 7 (tipo collision between Recepcionista/Orquestrador), TIPO_MAP in Pattern 1, confirmed against all 6 live `modelo/*.md` files |
| XMLV-04 | Hook valida raiz única sem aninhamento | Pitfall 1 (critical — naive substring counting false-positives on Recepcionista's `<agentes_disponiveis>` tag), word-boundary-safe regex in Pattern 1, empirically tested against nested/duplicate synthetic cases |
| XMLV-05 | Hook roda automaticamente no pipeline `Stop`/`SubagentStop` sem invocação manual | System Architecture Diagram, Pitfall 4 (stop_hook_active must NOT early-exit), Pitfall 6 (decision:block valid for both events), Architecture & Distribution sections |
| XMLV-06 | Falha reporta arquivo + linha/coluna (mensagem acionável) | All Pitfalls document exact line/col-affecting edge cases (BOM, CRLF, tag-boundary); Validation Architecture test map requires asserting message content, not just pass/fail |
| XMLV-07 | Ponto cego aceito preservado — sem escaping/CDATA "corretivo" | D-08 (locked decision above), Pitfall discussion "blind spot preserved" wording constraint, Validation Architecture test map (asserts block occurs AND message excludes escape/CDATA wording AND file is not mutated) |
</phase_requirements>

## Summary

This phase replaces the manual "Validação da Casca XML" checklist in `docs/regras-validacao.md` with a deterministic Node.js validator wired into the two existing hook events (`Stop`, `SubagentStop`). All 10 implementation decisions are already locked in `01-CONTEXT.md` (D-01..D-10); this research focuses on making those decisions **executable**: the exact regex/line-splitting logic, the exact tipo-per-filename table (confirmed against all 6 live `modelo/*.md` files), the exact hook stdin/stdout schema, and — critically — several non-obvious pitfalls that were empirically reproduced in this session (not just theorized).

The single most important finding: a **naive substring match on `<agente` / `</agente>` produces a false positive on `modelo/Recepcionista.md`**, because that file legitimately contains an `<agentes_disponiveis>` tag whose name starts with `agente`. This was verified by running both the naive and the corrected (word-boundary-safe) counting logic against real file content. The corrected approach (`/<agente(?=[\s>])/g` for opens, `/<\/agente>/g` for closes) was tested against all 6 real templates plus synthetic nested-root, duplicate-root, and attribute-reorder cases and passed every case.

The second most important finding concerns **hook lifecycle correctness**: unlike the two existing hooks (`post-ajustes-fanout.sh`, `post-scaffolder-review.sh`), which early-exit when `stop_hook_active` is true (to avoid re-injecting a stateful multi-step instruction), the new XML validator hook **must NOT copy that early-exit guard**. Its job is a stateless, idempotent fact-check ("is this file valid right now?"), not a one-shot instruction injection — skipping on `stop_hook_active=true` would silently disable validation on the very retry cycle where a broken file is most likely to still be broken, directly undermining D-07 and the phase's Core Value.

**Primary recommendation:** Build `.claude/hooks/validate-xml-casca.js` as a CommonJS module that exports its pure validation functions (for direct unit testing via `node:test`) and also runs as a CLI (`require.main === module` pattern) that does its OWN transcript JSONL parsing (via `JSON.parse` per line, not bash grep) for robust Edit/Write `file_path` discovery. Keep `.claude/hooks/validate-xml-casca.sh` as a minimal bash wrapper — mirroring only the `stop_hook_active`-agnostic parts of the existing hooks (stdin capture, `transcript_path` extraction, existence/readability guards) — that shells out to the Node script and passes its stdout/exit code straight through. Register this ONE bash wrapper under both `hooks.Stop[]` and `hooks.SubagentStop[]` in `.claude/settings.json`, appended after the existing entries.

## Architectural Responsibility Map

This project has no browser/server/database tiers — it is a Claude Code hook pipeline + npm distribution CLI. The "tiers" here are pipeline layers:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hook lifecycle plumbing (stdin JSON, guards, exit code) | Bash Hook Wrapper | — | Mirrors `post-ajustes-fanout.sh`/`post-scaffolder-review.sh` conventions exactly; zero new deps needed for this thin layer |
| Transcript parsing / touched-file discovery | Node Validator Script | Bash Hook Wrapper (passes `$TRANSCRIPT` path as argv) | JSONL lines are individual JSON objects — `JSON.parse` per line is robust; bash grep/sed on nested `tool_use.input.file_path` JSON is fragile (verified reasoning below) |
| XML declaration / casca structural validation (line/col precision) | Node Validator Script | — | Requires character-offset precision that regex-in-bash cannot provide reliably (D-02) |
| Blocking decision + actionable message | Node Validator Script (produces JSON) | Bash Hook Wrapper (emits it verbatim to stdout) | Single source of truth for the message text avoids drift between two script layers |
| Hook event wiring | `.claude/settings.json` | — | Declarative registration layer; no logic lives here |
| End-user distribution | `manifest.json` + `bin/cli.js` | — | Existing CLI already handles fetch/write of any new file added to `files[]` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`) | Node ≥18 (confirmed installed: v24.12.0) `[VERIFIED: node --version in this sandbox]` | Read file content, resolve/validate paths | Already the project's only runtime dependency (`bin/cli.js`); zero-dependency constraint (D-01) |
| `node:test`, `node:assert` | Built into Node ≥18, no install | Unit tests for the validator's pure functions | Confirmed working in this sandbox `[VERIFIED: ran a smoke node:test in this environment]`; matches the exact recommendation already logged in `.planning/codebase/TESTING.md` ("prefer Node's built-in `node:test` + `node:assert`") |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | The zero-dependency constraint (project CLAUDE.md + `.claude/CLAUDE.md` Constraints) and D-01 rule out any npm XML parser (`fast-xml-parser`, `sax`, `xml2js`, etc.) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled regex/line-scan validator | `xmllint --noout` | Rejected by D-01 — confirmed NOT installed in this sandbox `[VERIFIED: command -v xmllint → not found]`, not guaranteed on end-user machines, and gives no control over "preserve the blind spot" behavior (XMLV-07) |
| Hand-rolled regex/line-scan validator | npm XML parser library (`fast-xml-parser`, `sax-js`) | Would violate the zero-dependency constraint; also these parsers are strict-mode by default and would need custom configuration to NOT "fix" the accepted `<`/`&` blind spot, adding complexity for no benefit given the narrow XMLV-01..07 scope |

**Installation:** None — no `npm install` needed for this phase.

**Version verification:** Node engine requirement in `package.json` is `>= 18`; this sandbox has v24.12.0, exceeding it. No package registry lookups apply since no packages are installed.

## Package Legitimacy Audit

**N/A — this phase installs zero external packages.** D-01 mandates pure Node.js built-ins; the Package Legitimacy Gate protocol is not applicable. No `npm view`/`package-legitimacy check` calls were made because there is nothing to check.

**Packages removed due to [SLOP] verdict:** none (N/A)
**Packages flagged as suspicious [SUS]:** none (N/A)

## Architecture Patterns

### System Architecture Diagram

```
 Claude Code session (main agent or subagent editing a client .md file)
        │
        ▼
 [Stop event]  or  [SubagentStop event] fires
        │                     │
        └─────────┬───────────┘
                   ▼
   .claude/hooks/validate-xml-casca.sh   (bash wrapper — thin, stateless)
        │  1. capture stdin JSON
        │  2. extract "transcript_path"
        │  3. guard: file exists + readable (fail-open/silent-skip)
        │     (NOTE: does NOT check stop_hook_active — see Pitfall 4)
        ▼
   node .claude/hooks/validate-xml-casca.js --transcript "$TRANSCRIPT"
        │
        │  4. read transcript JSONL, JSON.parse per line (last N lines,
        │     mirroring existing hooks' tail-window approximation)
        │  5. find Edit/Write tool_use blocks → collect input.file_path
        │  6. filter to basenames in TIPO_MAP (Orquestrador.md, Qualifier.md,
        │     Scheduler.md, Protractor.md, Follow-Up.md, Recepcionista.md)
        │  7. dedupe touched files (D-06: only files touched THIS turn)
        ▼
   For each touched file:
        │  8. read file content (fs.readFileSync utf8)
        │  9. XMLV-01: check line 1 == exact declaration (BOM-aware)
        │ 10. XMLV-02/03: parse line 2 attrs (order-tolerant regex),
        │     validate against TIPO_MAP[basename] (incl. Recepcionista's
        │     origem="recepcionista" special case)
        │ 11. XMLV-04: word-boundary-safe <agente>/</agente> open/close count
        │ 12. XMLV-07: if content is otherwise well-formed casca but raw
        │     `<`/`&` in body breaks a conceptual "well-formedness" check,
        │     block WITHOUT suggesting escape/CDATA (blind spot preserved)
        ▼
   Node script prints ONE JSON object to stdout:
        { "decision": "block", "reason": "<file> linha <N> col <C>: <erro>" }
        (or nothing / {} if all touched files are valid — no block)
        │
        ▼
   Bash wrapper passes stdout through verbatim, then `exit 0`
   (exit 0 ALWAYS — even when blocking; see Pitfall 5)
```

A reader can trace: an edit happens → a lifecycle event fires → the bash wrapper hands off to Node → Node discovers which files changed → Node validates structure → Node emits a block decision → the bash wrapper relays it unchanged → Claude Code either forces continuation (with the reason text) or lets the agent stop.

### Recommended Project Structure
```
.claude/hooks/
├── validate-xml-casca.sh        # thin bash wrapper — Stop + SubagentStop entry point
├── validate-xml-casca.js        # Node validator: exports functions AND runs as CLI
├── validate-xml-casca.test.js   # node:test unit tests (Wave 0 requirement)
└── __fixtures__/
    └── xml-casca/
        ├── valid-orquestrador.md
        ├── valid-recepcionista.md          # exercises tipo="orchestrator"+origem="recepcionista"
        ├── missing-declaration.md          # XMLV-01
        ├── wrong-declaration.md            # XMLV-01
        ├── wrong-tipo.md                   # XMLV-03 (e.g. Qualifier.md body, tipo="orchestrator")
        ├── missing-xmlns.md                # XMLV-02
        ├── missing-origem-recepcionista.md # XMLV-03 Recepcionista special case
        ├── nested-root.md                  # XMLV-04
        ├── duplicate-root.md               # XMLV-04
        └── raw-ampersand-in-content.md      # XMLV-07 (blind spot — must still block, no auto-fix)
```

### Pattern 1: Exported functions + CLI runner (dual-mode Node module)
**What:** `validate-xml-casca.js` defines pure functions (`parseAgenteLine`, `countAgenteTags`, `validateFile`, `TIPO_MAP`) and exports them via `module.exports`, but also runs as a script when invoked directly.
**When to use:** Any time a Node script needs both to be unit-testable in isolation (via `require(...)` from a test file) and runnable as a CLI from the bash wrapper.
**Example:**
```javascript
// .claude/hooks/validate-xml-casca.js
// Source: idiomatic Node.js CommonJS dual-mode pattern; verified working in this session's tests

const TIPO_MAP = {
  "Orquestrador.md": { tipo: "orchestrator" },
  "Qualifier.md":    { tipo: "qualifier" },
  "Scheduler.md":    { tipo: "scheduler" },
  "Protractor.md":   { tipo: "protractor" },
  "Follow-Up.md":    { tipo: "followup" },
  "Recepcionista.md": { tipo: "orchestrator", origem: "recepcionista" },
};

function parseAgenteLine(line) {
  const openMatch = line.match(/^<agente\b([^>]*)>$/);
  if (!openMatch) return { ok: false, reason: "linha 2 não é uma tag <agente ...> de linha única" };
  const attrs = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = attrRegex.exec(openMatch[1])) !== null) attrs[m[1]] = m[2];
  return { ok: true, attrs };
}

// Word-boundary-safe: does NOT match <agentes_disponiveis> (see Pitfall 1)
function countAgenteTags(content) {
  const opens = (content.match(/<agente(?=[\s>])/g) || []).length;
  const closes = (content.match(/<\/agente>/g) || []).length;
  return { opens, closes };
}

module.exports = { TIPO_MAP, parseAgenteLine, countAgenteTags };

if (require.main === module) {
  // CLI entry point invoked by validate-xml-casca.sh
  // ... read argv file paths, run validateFile() per file, print JSON, process.exit(0)
}
```

### Pattern 2: Robust transcript file-discovery via `JSON.parse` per JSONL line
**What:** Read the transcript file, split on `\n`, `JSON.parse` each non-empty line, and inspect `message.content[]` entries where `type === "tool_use"` and `name` is `"Edit"` or `"Write"`, collecting `input.file_path`.
**When to use:** Whenever precise extraction of a nested JSON field (not a simple flag/sentinel string) is needed from the transcript — as opposed to the existing hooks' `grep`/`sed` approach, which only ever extracts flat top-level string fields (`transcript_path`, `subagent_type`, a literal sentinel tag).
**Why this is the right call here (not bash grep):** `tool_use.input.file_path` is a **nested** field inside a JSON value that may itself contain other keys (`old_string`, `new_string`, etc. for `Edit`); a regex trying to pull `file_path` out of that blob reliably (across possible key reordering, escaped quotes inside paths, etc.) is exactly the kind of fragile hand-rolled JSON-in-regex parsing this project's own CLAUDE.md error-handling conventions warn against implicitly by always preferring structured access. Since Node is already introduced into this pipeline for the structural XML checks (D-02), reusing it for structured JSONL access avoids introducing two different "half-parsers" (bash-regex JSON field extraction + Node JSON.parse) for the same class of problem.
```javascript
// Source: standard JSONL processing pattern; field names (tool_use, name, input.file_path)
// [CITED: Claude API Messages tool_use content block schema] cross-referenced against
// the Agent SDK hooks documentation's own example (tool_input.file_path) fetched this session.
function discoverTouchedFiles(transcriptPath, tailLines = 400) {
  const raw = fs.readFileSync(transcriptPath, "utf8");
  const lines = raw.split("\n").slice(-tailLines);
  const found = new Set();
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; } // tolerate partial/malformed lines
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === "tool_use" && (block.name === "Edit" || block.name === "Write")) {
        const fp = block.input?.file_path;
        if (fp) found.add(fp);
      }
    }
  }
  return [...found].filter(fp => TIPO_MAP[path.basename(fp)]);
}
```
**Open question (flagged below):** the exact `message.content[]` shape should be smoke-tested against one real transcript file during Wave 0 before finalizing — see Open Questions.

### Anti-Patterns to Avoid
- **Naive substring tag counting (`content.match(/<agente/g)` / `/<\/agente/g` without boundary):** produces false positives on `modelo/Recepcionista.md`'s `<agentes_disponiveis>` tag — reproduced empirically this session (see Pitfall 1).
- **Copying the `stop_hook_active` early-exit guard from the other two hooks:** breaks the "always blocks" requirement on retry cycles (see Pitfall 4).
- **Using `hookSpecificOutput.additionalContext` for blocking:** that field is non-blocking/informational per Claude Code's hook output schema; only `decision:"block"` + `reason` actually prevents the stop (see Pitfall 6).
- **Exiting with a non-zero code to signal a block:** the two existing hooks in this repo always `exit 0` and communicate blocking purely via the JSON payload printed to stdout — diverging from this (e.g. `exit 2`, which the docs describe as an alternate valid mechanism) is unnecessary risk given zero precedent for it in this codebase (see Pitfall 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full XML well-formedness parsing | A generic SAX/DOM-style tokenizer | Targeted line/regex checks scoped to XMLV-01..07 only (D-03) | Explicitly out of scope; a generic tokenizer would also need to "solve" the accepted blind spot (XMLV-07), adding complexity for a problem the project deliberately does not want solved |
| Extracting nested JSON fields from transcript lines | Regex/sed pattern matching into `tool_use.input.file_path` | `JSON.parse()` per JSONL line (Node built-in) | JSONL lines are complete, independent JSON objects — parsing them as JSON is strictly more robust than pattern-matching into nested structures, and costs nothing extra since Node is already in the pipeline (D-02) |
| Path-safety checks on discovered file paths | A bespoke traversal-check | Mirror `bin/cli.js`'s existing `removeFile()` pattern (`path.resolve` + verify against expected root before reading) | Existing, already-reviewed convention in this exact codebase; avoids inventing a second path-safety idiom |

**Key insight:** Everything in this phase that looks like "don't hand-roll a parser" cuts the OTHER way from usual advice — the user has already, deliberately, chosen the hand-rolled approach over `xmllint`/npm parsers (D-01, D-03). The genuine "don't hand-roll" risks here are one level down: don't hand-roll JSON field extraction with regex when `JSON.parse` is available, and don't hand-roll tag-boundary detection without word-boundary safety.

## Common Pitfalls

### Pitfall 1: Naive substring tag matching false-positives on `<agentes_disponiveis>`
**What goes wrong:** A root/nesting counter implemented as `content.match(/<agente/g)` (open) and `content.match(/<\/agente/g)` (close, without a trailing `>` requirement) reports 2 opens and 2 closes on `modelo/Recepcionista.md` — a perfectly valid file — because it legitimately contains `<agentes_disponiveis>...</agentes_disponiveis>` in its body.
**Why it happens:** `<agentes_disponiveis>` starts with the literal substring `<agente`, and `</agentes_disponiveis>` starts with the literal substring `</agente`. A regex without a word-boundary/whitespace-or-`>` lookahead treats these as tag-name matches.
**How to avoid:** Require a boundary after `agente`: open tag regex `/<agente(?=[\s>])/g`, close tag regex `/<\/agente>/g` (the closing form is safe as-is only because it requires the literal `>` immediately — verified this alone is sufficient. The OPEN form must use the lookahead since `<agente ...>` never has `>` immediately after the tag name).
**Warning signs:** Any validator that reports a false nesting/duplicate-root violation specifically on Recepcionista.md (or any future template that introduces a tag whose name is prefixed with `agente`) while every other template validates cleanly.
**Verification:** `[VERIFIED: empirical test this session]` — ran both the naive and corrected counters against real file content and synthetic nested/duplicate-root cases; naive counter falsely reported `{opens:2, closes:2}` on valid content, corrected counter reported `{opens:1, closes:1}` on the same content and correctly flagged the synthetic violations.

### Pitfall 2: Node's UTF-8 decoding does not strip a BOM
**What goes wrong:** `fs.readFileSync(path, "utf8")` decodes UTF-8 bytes into a JS string but leaves a leading BOM (`U+FEFF`) as the first character if present. A check like `content.startsWith("<?xml")` silently returns `false` with no indication of WHY — the resulting error message ("linha 1 não corresponde") would be technically correct but unhelpful (XMLV-06 requires actionable messages).
**Why it happens:** BOM stripping is an explicit opt-in in most Node text-processing APIs; `fs.readFileSync` with `"utf8"` encoding does not do it automatically.
**How to avoid:** Explicitly detect `content.charCodeAt(0) === 0xFEFF` before the line-1 check and, if present, report a specific error ("arquivo contém BOM (U+FEFF) antes da declaração XML — linha 1, coluna 1") rather than a generic mismatch. All 6 current `modelo/*.md` files have no BOM (confirmed via `xxd`), so this is a defensive check for future/client-generated files, not a current-state fix.
**Warning signs:** A file that "looks correct" when opened in a text editor still fails line-1 validation with no visible cause.
**Verification:** `[VERIFIED: empirical test this session]` — wrote a synthetic file with a UTF-8 BOM prefix, read it back with `fs.readFileSync(..., "utf8")`, confirmed `content.charCodeAt(0)` is `0xfeff` and `content.startsWith("<?xml")` is `false`.

### Pitfall 3: CRLF line endings leave a trailing `\r` after `split("\n")`
**What goes wrong:** `content.split("\n")[0]` on a CRLF file returns `"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r"` (39 chars, trailing `\r`), which fails an exact-match check against the 38-char declaration string even though the file is visually correct.
**Why it happens:** `.split("\n")` only splits on `\n`; a preceding `\r` (from Windows-style CRLF) stays attached to the end of the previous line.
**How to avoid:** Split with `content.split(/\r\n|\n/)`, or split on `\n` then `.replace(/\r$/, "")` per line. All 6 current `modelo/*.md` files are LF-only (confirmed via `file` command), so — like the BOM case — this defends against future/client-edited files (e.g. a Windows-based editor), not current-state content.
**Warning signs:** A file edited on Windows or with a CRLF-preserving tool fails line-1/line-2 checks despite looking byte-for-byte correct when viewed.
**Verification:** `[VERIFIED: empirical test this session]` — constructed a CRLF sample, confirmed `split("\n")[0]` retains a trailing `\r` and fails strict equality against the expected 38-character declaration.

### Pitfall 4: Copying the `stop_hook_active` early-exit guard breaks "always blocks" (XMLV-06/D-07)
**What goes wrong:** The two existing hooks check `stop_hook_active` and exit silently if true — correct for THEM, because their job is injecting a one-shot, stateful "please do the next pipeline step" instruction, and re-injecting it on every forced-continuation cycle would be redundant/harmful. If the new XML validator copies this guard, it will SKIP validation on the very next Stop/SubagentStop cycle after its own first block (since that block itself sets `stop_hook_active=true` for the following cycle) — silently letting a still-broken file pass through unchecked on retry.
**Why it happens:** Superficial pattern-matching against the two existing hooks (which is otherwise the right thing to mirror for stdin parsing, existence guards, etc.) without recognizing that THIS hook's blocking condition is a re-checkable fact ("is the file valid right now"), not a one-shot instruction.
**How to avoid:** Do not check `stop_hook_active` in the new hook at all (or only log it, never early-exit on it). Rely on Claude Code's own `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=8` as the safety net against a true infinite loop (which is the correct backstop here — if the AI genuinely cannot fix the file after 8 forced continuations, Claude Code itself gives up, which is acceptable; silently disabling the check on cycle 2 is not).
**Warning signs:** A broken file gets flagged once, the AI editor attempts (and fails) to fix it, and the SECOND Stop event does not re-block despite the file still being broken.

### Pitfall 5: Exit code must stay 0 even when blocking
**What goes wrong:** Following general "hooks return non-zero on failure" intuition (e.g. `exit 2`, which Claude Code's hook protocol does document as an alternate valid blocking mechanism for Stop events) diverges from this repo's established convention, where both existing hooks ALWAYS `exit 0` and communicate blocking purely through `{"decision":"block","reason":"..."}` printed to stdout.
**Why it happens:** Intuition from general shell-scripting conventions (`exit 1` = failure) conflicts with this specific hook protocol's dual mechanism (stdout JSON vs exit code 2), and the project has zero precedent for the exit-code-2 path.
**How to avoid:** Always `exit 0` from the bash wrapper, whether or not the Node validator found a violation. The JSON payload alone carries the block/no-block signal.
**Verification:** `[VERIFIED: codebase]` — read both `post-ajustes-fanout.sh` and `post-scaffolder-review.sh` end-to-end; both terminate with `exit 0` unconditionally, even in the branch that emits `decision:block`.

### Pitfall 6: `hookSpecificOutput.additionalContext` does not block
**What goes wrong:** `post-scaffolder-review.sh` (SubagentStop) uses `hookSpecificOutput.additionalContext` — copying that pattern for the new "always blocks" validator would make the hook informational-only, not actually preventing the stop.
**Why it happens:** Both patterns coexist in this codebase for different purposes (that hook's job is injecting advisory context for the main agent to act on voluntarily, not hard-blocking), and it's easy to copy the wrong sibling's schema.
**How to avoid:** Use `{"decision":"block","reason":"..."}` for BOTH the Stop and SubagentStop registrations of the new hook — this schema is confirmed valid for both event types `[CITED: code.claude.com/docs/en/hooks, fetched this session]`, so there is no need for event-specific output branching in the new hook (unlike the two existing hooks, which happen to use different schemas from each other for unrelated historical reasons).
**Verification:** `[CITED: official Claude Code hooks reference, fetched this session]` confirms `decision:"block"` is valid for both `Stop` and `SubagentStop`. Cross-checked against this repo's own working `post-ajustes-fanout.sh` (Stop, uses `decision:block`) as an existing proof point for the Stop side.

### Pitfall 7: Recepcionista and Orquestrador share the same `tipo` value
**What goes wrong:** A validator keyed only on `tipo` (not on filename + full attribute set) cannot distinguish `Recepcionista.md` (`tipo="orchestrator" origem="recepcionista"`) from `Orquestrador.md` (`tipo="orchestrator"`, no `origem`) — a bug that swaps their expected-attribute checks would incorrectly pass a Recepcionista file missing `origem`, or incorrectly demand `origem` on a plain Orquestrador file.
**Why it happens:** `tipo` alone is not a unique key across the 6 templates; the mapping must be keyed by **filename basename**, with `origem` as an additional required attribute ONLY for the `Recepcionista.md` entry.
**How to avoid:** Use the exact `TIPO_MAP` structure shown in Pattern 1 above (keyed by basename, `origem` present only in the Recepcionista entry), and validate attribute-by-attribute (tolerant of order, per D-04) rather than reconstructing and comparing a literal string.
**Verification:** `[VERIFIED: read all 6 modelo/*.md files this session]` — confirmed exact `tipo` values: Orquestrador→`orchestrator`, Qualifier→`qualifier`, Scheduler→`scheduler`, Protractor→`protractor`, Follow-Up→`followup`, Recepcionista→`orchestrator`+`origem="recepcionista"`.

## Code Examples

### Example 1: Attribute-order-tolerant line-2 parser (tested against all 6 real templates)
```javascript
// Source: designed and empirically verified this session against modelo/*.md line 2 content,
// synthetic reordered-attribute input, and synthetic missing-attribute input.
function parseAgenteLine(line) {
  const openMatch = line.match(/^<agente\b([^>]*)>$/);
  if (!openMatch) return { ok: false, reason: "linha 2 não é uma tag <agente ...> de linha única" };
  const attrs = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = attrRegex.exec(openMatch[1])) !== null) attrs[m[1]] = m[2];
  return { ok: true, attrs };
}
// Verified output against real modelo/Recepcionista.md line 2:
// { ok: true, attrs: { xmlns: "https://expertintegrado.com.br/super-sdr/prompt",
//                       versao: "1.0", tipo: "orchestrator", origem: "recepcionista" } }
```

### Example 2: BOM + CRLF-safe line splitting
```javascript
// Source: empirically verified this session (Pitfalls 2 & 3)
function normalizeAndSplit(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    // BOM found — this itself should be surfaced as a specific, actionable violation,
    // not silently stripped and ignored (D-07: always block on broken casca).
    // Recommend: detect and report before proceeding, do not just strip-and-continue.
  }
  return content.split(/\r\n|\n/);
}
```

### Example 3: Full per-file validation against a real template (end-to-end smoke test)
```javascript
// Ran this exact logic against all 6 real modelo/*.md files this session — all 6 passed.
const fs = require("fs");
const files = ["modelo/Orquestrador.md","modelo/Qualifier.md","modelo/Scheduler.md",
               "modelo/Protractor.md","modelo/Recepcionista.md","modelo/Follow-Up.md"];
for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split(/\r\n|\n/);
  const line1ok = lines[0] === '<?xml version="1.0" encoding="UTF-8"?>';
  const parsed = parseAgenteLine(lines[1]);
  // line1ok: true for all 6; parsed.ok: true for all 6, attrs match TIPO_MAP exactly
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Manual `docs/regras-validacao.md` checklist, checked by `docs-reviewer` LLM subagent on a best-effort basis | Deterministic Node.js hook, always invoked by Stop/SubagentStop | This phase | Casca breakage becomes impossible to silently miss — code enforces it every time, not "if the reviewer remembers" |
| `xmllint --noout modelo/*.md` (manual, human-run) | Same structural rules, re-implemented as targeted regex checks, run automatically | This phase | Removes the external-binary dependency (`xmllint` confirmed absent from this sandbox) while preserving the exact same rule set and the exact same accepted blind spot |

**Deprecated/outdated:** The `xmllint`-based manual verification step documented in `docs/regras-validacao.md` and `.planning/codebase/TESTING.md` §4 becomes redundant once this hook ships (though the docs mention keeping it as a fallback command is harmless — the planner should decide whether to update those docs to reference the new automated hook instead, out of this research's scope to mandate).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude Code transcript JSONL lines each contain a `message.content[]` array with `type:"tool_use"`, `name`, and `input.file_path` fields, matching the Anthropic Messages API tool_use content-block shape | Architecture Patterns, Pattern 2 | If the actual transcript field names/nesting differ, the file-discovery logic in the Node script will silently find zero touched files and the hook will never trigger validation. **Mitigate by smoke-testing against one real transcript file during Wave 0** (see Open Questions) before finalizing the discovery regex/parse path. |
| A2 | Every line of the transcript JSONL file is a single, complete, independently-parseable JSON object (true JSONL, not pretty-printed/multi-line JSON) | Architecture Patterns, Pattern 2 | If some lines are NOT complete JSON objects (e.g. streaming partial writes), `JSON.parse` per line would throw on those lines; the code already tolerates this with a `try/catch` per line, so the risk is bounded to "miss a file on this particular tail window" rather than a crash |

**If this table is empty:** N/A — see entries above; both concern the transcript-parsing layer, which the CONTEXT.md explicitly left to researcher/planner discretion (D-05).

## Open Questions

1. **Exact `message.content[]` shape inside this project's actual Claude Code transcripts**
   - What we know: The Agent SDK hooks documentation (fetched this session) references `tool_input.file_path` as an existing, real field name used in its own examples, and the general Claude API `tool_use` content-block shape (`type`, `name`, `input`) is a stable, well-known structure.
   - What's unclear: Whether this project's transcript files (produced by the Claude Code CLI, not the Agent SDK directly) nest tool_use blocks under `message.content[]` at exactly this same path, or use `type:"tool_use"` at the top level of each JSONL record, or some other shape specific to CLI transcripts vs SDK message objects.
   - Recommendation: Before finalizing the Node discovery function, the planner/implementer should run `tail -50 <any real transcript_path from a recent session> | node -e '...'` to `JSON.parse` a few real lines and print their structure — a 2-minute Wave 0 smoke-check that removes A1's risk entirely. This repo's own `.claude/hooks/*.sh` scripts prove `transcript_path` and `subagent_type` field names are correct at the top level; only the nested `tool_use` shape for Edit/Write calls remains unconfirmed against a REAL transcript in this session (no live transcript file was available to inspect directly in this research sandbox).

2. **Should the hook validate `modelo/*.md` itself, or only client-copied files?**
   - What we know: `modelo/*.md` is read-only and should never be edited by the automation pipeline (docs/proibido-fazer.md); the XMLV requirements don't explicitly exclude modelo files from validation.
   - What's unclear: If `docs-editor-conciso` or `client-project-scaffolder` were ever to (incorrectly) touch a `modelo/*.md` file, should the new hook also catch that as an XML violation, or is that a separate concern already covered by other rules?
   - Recommendation: Out of scope for this phase — validating modelo/*.md's XML casca doesn't hurt (it would pass, since all 6 are confirmed clean), so there's no reason to explicitly exclude modelo/ from the file-discovery filter. No special-casing needed either way.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Validator script execution | ✓ | v24.12.0 `[VERIFIED: node --version]` | — (already required by project `package.json engines.node >= 18`) |
| `xmllint` | Explicitly ruled out (D-01) | ✗ | — `[VERIFIED: command -v xmllint → not found]` | N/A — not used by this phase's design at all; confirms D-01's premise |
| Claude Code hook runtime (Stop/SubagentStop dispatch) | Automatic invocation (XMLV-05) | ✓ (implied) | — | This repo's own `post-ajustes-fanout.sh`/`post-scaffolder-review.sh` are confirmed working in production per code comments and `.claude/settings.json` registration — same runtime will dispatch the new hook |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — `xmllint`'s absence is not a gap, it's the confirmed premise behind D-01.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` + `node:assert` (no install; confirmed working: v24.12.0) |
| Config file | none — invoke by explicit file path |
| Quick run command | `node --test .claude/hooks/validate-xml-casca.test.js` |
| Full suite command | same (this phase introduces the project's only test file) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| XMLV-01 | Line 1 must be exact `<?xml version="1.0" encoding="UTF-8"?>` | unit | `node --test .claude/hooks/validate-xml-casca.test.js` | ❌ Wave 0 |
| XMLV-02 | Line 2 must be a single-line `<agente ...>` with required attrs | unit | same | ❌ Wave 0 |
| XMLV-03 | `tipo` (+`origem` for Recepcionista) must match filename | unit | same | ❌ Wave 0 |
| XMLV-04 | Single root, no nesting/duplication | unit | same | ❌ Wave 0 |
| XMLV-05 | Hook auto-runs on Stop/SubagentStop | integration/manual | synthetic stdin JSON piped into `validate-xml-casca.sh` directly (`echo '{"transcript_path":"..."}' | .claude/hooks/validate-xml-casca.sh`) | ❌ Wave 0 |
| XMLV-06 | Error message includes file + line/col | unit | same as XMLV-01..04 (assert message content, not just pass/fail) | ❌ Wave 0 |
| XMLV-07 | Raw `<`/`&` in content blocks WITHOUT escape/CDATA suggestion, no file mutation | unit | same suite; assert block occurs, assert message text excludes "escap"/"CDATA"/"cdata", assert file content unchanged after running validator | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test .claude/hooks/validate-xml-casca.test.js` (sub-second, no I/O beyond small fixture files)
- **Per wave merge:** same command (this is the entire automated suite for this phase)
- **Phase gate:** Full suite green, PLUS one manual end-to-end smoke test (echo synthetic stdin JSON through the real `.sh` wrapper against a fixture transcript) to prove the bash↔Node handoff itself works, since — per `.planning/codebase/TESTING.md` §5 — there is no existing automated harness for the hook-dispatch layer itself in this project, only for pure logic.

### Wave 0 Gaps
- [ ] `.claude/hooks/__fixtures__/xml-casca/*.md` — 10 fixture files (listed under Recommended Project Structure) covering all 7 XMLV requirements plus 2 valid baselines
- [ ] `.claude/hooks/validate-xml-casca.test.js` — unit tests importing `validate-xml-casca.js`'s exported functions
- [ ] No framework install needed — `node:test` is built in

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | No auth surface — this is a local dev-tool hook, not a network service |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A — runs with the same local filesystem permissions as the invoking Claude Code session |
| V5 Input Validation | yes | The validator's OWN job is input validation; additionally, the file paths it discovers from the transcript (an external-ish input source per the untrusted-input-boundary principle) must be existence/readability-checked before use, mirroring `bin/cli.js`'s `removeFile()` path-safety pattern |
| V6 Cryptography | no | No secrets, no crypto operations involved |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| ReDoS via crafted attribute-value strings (catastrophic regex backtracking) | Denial of Service | All regexes in this design use bounded, non-nested character classes (`[^>]*`, `[^"]*`, `[-a-zA-Z0-9_:.]*`) with no adjacent overlapping quantifiers — verified low ReDoS risk by construction; keep future regex additions to this same simple, anchored style |
| Path traversal via a maliciously-crafted `file_path` extracted from transcript content | Tampering | Before reading any discovered file path, verify it exists and is a regular file (`fs.statSync(...).isFile()`); this project already has a proven path-safety idiom in `bin/cli.js`'s `removeFile()` (resolve + verify against expected root) that can be mirrored if the discovered paths ever need to be constrained to a specific root |

## Sources

### Primary (HIGH confidence)
- `modelo/Orquestrador.md`, `modelo/Qualifier.md`, `modelo/Scheduler.md`, `modelo/Protractor.md`, `modelo/Recepcionista.md`, `modelo/Follow-Up.md` — read directly this session; exact `tipo`/`xmlns`/`versao`/`origem` values and line-1/line-2 content confirmed
- `.claude/hooks/post-ajustes-fanout.sh`, `.claude/hooks/post-scaffolder-review.sh` — read directly this session; exact stdin field names, guard patterns, output schemas, and `exit 0` convention confirmed
- `.claude/settings.json`, `manifest.json` — read directly this session; exact current registration/distribution shape confirmed
- `docs/regras-validacao.md`, `.planning/codebase/TESTING.md` — read directly this session; the manual checklist being replaced and the "no test framework, prefer node:test" recommendation confirmed
- Empirical Node.js tests run in this session's sandbox (BOM handling, CRLF splitting, attribute-order-tolerant parsing, word-boundary-safe tag counting, `node:test` smoke run) — all outputs captured and reported above

### Secondary (MEDIUM confidence)
- `code.claude.com/docs/en/hooks` (fetched via WebFetch this session) — Stop/SubagentStop common input fields and `decision:block` output schema for both event types `[CITED]`

### Tertiary (LOW confidence)
- `code.claude.com/docs/en/agent-sdk/hooks` (fetched via WebFetch this session) — Agent SDK-level hook shape (`agent_id`, `agent_transcript_path`); noted as a DIFFERENT surface from the shell-command hooks this project actually uses (`.claude/settings.json`), included only for the `tool_input.file_path` field-naming cross-reference `[ASSUMED — cross-surface inference, not confirmed against a real CLI transcript this session]`
- General Node.js BOM/CRLF/multi-byte parsing best practices via WebSearch — mostly CSV-parser-focused results; the specific claims used in this RESEARCH.md were independently verified empirically in this session's sandbox rather than relied upon from the search results alone

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero-dependency Node built-ins only, already the project's proven stack, confirmed installed and working
- Architecture: HIGH — hook stdin/stdout schema confirmed both by reading real production code in this repo AND by fetching official docs; file-discovery layer is MEDIUM (flagged as Open Question A1) pending a live-transcript smoke-test
- Pitfalls: HIGH — every pitfall in this document (except A1/A2) was empirically reproduced or verified against real repo content in this session, not merely theorized

**Research date:** 2026-07-04
**Valid until:** 30 days (stable domain — Node built-ins and this repo's own hook conventions change slowly; re-verify sooner only if Claude Code's hook schema changes, which would be a breaking change worth noticing independently)
