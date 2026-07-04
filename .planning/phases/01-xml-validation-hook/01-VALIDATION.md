---
phase: 1
slug: xml-validation-hook
status: verified
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` + `node:assert` (no install; confirmed working: v24.12.0) |
| **Config file** | none — invoke by explicit file path |
| **Quick run command** | `node --test .claude/hooks/validate-xml-casca.test.js` |
| **Full suite command** | `node --test .claude/hooks/validate-xml-casca.test.js` (this phase introduces the project's only test file) |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/hooks/validate-xml-casca.test.js`
- **After every plan wave:** Run `node --test .claude/hooks/validate-xml-casca.test.js`
- **Before `/gsd-verify-work`:** Full suite must be green, plus one manual end-to-end smoke test (synthetic stdin JSON piped through the real `.sh` wrapper against a fixture transcript)
- **Max feedback latency:** ~2 seconds (sub-second test execution, no I/O beyond small fixture files)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (assigned at planning) | TBD | TBD | XMLV-01 | — | Line 1 exact-match against `<?xml version="1.0" encoding="UTF-8"?>`, BOM/CRLF-safe | unit | `node --test .claude/hooks/validate-xml-casca.test.js` | ❌ W0 | ⬜ pending |
| (assigned at planning) | TBD | TBD | XMLV-02 | T-1-01 | Line 2 `<agente ...>` attribute-order-tolerant parse; regexes bounded (no catastrophic backtracking) | unit | `node --test .claude/hooks/validate-xml-casca.test.js` | ❌ W0 | ⬜ pending |
| (assigned at planning) | TBD | TBD | XMLV-03 | T-1-01 | `tipo` (+`origem` for Recepcionista) matched against filename-keyed `TIPO_MAP`, not a literal string compare | unit | `node --test .claude/hooks/validate-xml-casca.test.js` | ❌ W0 | ⬜ pending |
| (assigned at planning) | TBD | TBD | XMLV-04 | — | Word-boundary-safe `<agente>`/`</agente>` counting (no false positive on `<agentes_disponiveis>`) | unit | `node --test .claude/hooks/validate-xml-casca.test.js` | ❌ W0 | ⬜ pending |
| (assigned at planning) | TBD | TBD | XMLV-05 | T-1-02 | Hook auto-runs on Stop/SubagentStop; discovered file paths existence/readability-checked before read | integration/manual | `echo '{"transcript_path":"..."}' \| .claude/hooks/validate-xml-casca.sh` | ❌ W0 | ⬜ pending |
| (assigned at planning) | TBD | TBD | XMLV-06 | — | Block message includes actionable file + line/column detail | unit | `node --test .claude/hooks/validate-xml-casca.test.js` (assert message content, not just pass/fail) | ❌ W0 | ⬜ pending |
| (assigned at planning) | TBD | TBD | XMLV-07 | — | Raw `<`/`&` in content blocks WITHOUT escape/CDATA suggestion; file not mutated | unit | `node --test .claude/hooks/validate-xml-casca.test.js` (assert block + message excludes "escap"/"cdata" + file unchanged) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Threat Refs** (Security Domain, ASVS L1 — see 01-RESEARCH.md "Security Domain"):
- **T-1-01** — ReDoS via crafted attribute-value strings (catastrophic regex backtracking). Mitigation: bounded, non-nested character classes only (`[^>]*`, `[^"]*`, `[-a-zA-Z0-9_:.]*`), no adjacent overlapping quantifiers.
- **T-1-02** — Path traversal via a maliciously-crafted `file_path` extracted from transcript content. Mitigation: verify discovered path exists and is a regular file (`fs.statSync(...).isFile()`) before reading, mirroring `bin/cli.js`'s `removeFile()` path-safety idiom.

---

## Wave 0 Requirements

- [ ] `.claude/hooks/__fixtures__/xml-casca/*.md` — 10 fixture files covering all 7 XMLV requirements plus 2 valid baselines (valid-orquestrador, valid-recepcionista, missing-declaration, wrong-declaration, wrong-tipo, missing-xmlns, missing-origem-recepcionista, nested-root, duplicate-root, raw-ampersand-in-content)
- [ ] `.claude/hooks/validate-xml-casca.test.js` — unit tests importing `validate-xml-casca.js`'s exported functions
- [ ] No framework install needed — `node:test` is built into Node ≥18 (confirmed on v24.12.0)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook fires automatically on real Stop/SubagentStop events without disturbing existing sentinel/anti-loop protocols | XMLV-05 | No existing automated harness for the hook-dispatch layer itself (only for pure validator logic) — per `.planning/codebase/TESTING.md` | Pipe a synthetic stdin JSON (with a `transcript_path` pointing at a fixture transcript) through `.claude/hooks/validate-xml-casca.sh` directly; confirm `exit 0` and correct `{"decision":"block",...}` (or no block) on stdout; confirm `post-ajustes-fanout.sh` / `post-scaffolder-review.sh` still behave unchanged when registered alongside |
| Real transcript `tool_use` shape matches the assumed `message.content[].input.file_path` structure (Open Question A1 in 01-RESEARCH.md) | XMLV-05 (file discovery) | Depends on live Claude Code CLI transcript format, not reproducible from fixtures alone | Wave 0: `tail -50 <a real transcript_path>` piped into a throwaway `JSON.parse`-per-line script; print the parsed shape and confirm `input.file_path` is reachable at the assumed path before finalizing the discovery parser |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the one exception, 01-03 Task 3, is `checkpoint:human-verify` — exempt by design)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (fixtures + test file built in 01-01 Task 1, RED before GREEN)
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-04 (gsd-plan-checker verification pass — see 01-01/02/03-PLAN.md)
