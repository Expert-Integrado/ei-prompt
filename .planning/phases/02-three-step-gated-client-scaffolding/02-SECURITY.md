---
phase: 02
slug: three-step-gated-client-scaffolding
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-06
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Main command thread ↔ subagent context | Each subagent's declared `tools:` allowlist is the only hard technical boundary between "can ask a question" and "can write a file" — a subagent's prompt text is not a trust boundary by itself | Collected client field data, structural intent |
| Subagent prompt body ↔ platform capability | A subagent's own prompt cannot grant it a tool it wasn't declared with, but a prompt CAN falsely narrate having done something it structurally cannot do | Narrated (not actual) confirmation state |
| CLI/manifest distribution boundary | `bin/cli.js` unconditionally trusts `manifest.json`'s `files[]`/`deprecated_files[]` arrays when writing/deleting files in a user's project directory on every `npx` run | File paths, file contents |
| Transcript-parsing boundary | `post-scaffolder-review.sh` reads an on-disk JSONL transcript and pattern-matches subagent names from it to decide whether to inject an audit instruction | Subagent invocation names, sentinel markers |
| Human ↔ main command thread | The confirmation gate is the only point where an actual human decision authorizes writing client-specific content to disk; every other step in the chain is fully automated | Approval/Cancel decision |
| Main command thread ↔ subagent context (fill step) | `client-scaffold-fill` has zero memory of the Passo 2 conversation — the command thread is solely responsible for carrying the collected data across that boundary intact | Full collected-data block (`<dados_coletados>`) |
| Per-especialidade loop iteration boundary | Each especialidade's structure→collect→gate→fill cycle must complete (or be explicitly cancelled) independently before the next begins | Per-especialidade collected data, approval state |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-2-01a | Elevation of Privilege | client-scaffold-collect | medium | mitigate | `tools:` frontmatter restricted to `Read, Glob` (no Write/Edit/Bash) — subagent is structurally incapable of filling templates; confirmed in 02-01-SUMMARY | closed |
| T-2-01b | Spoofing (narrated fake confirmation) | client-scaffold-collect, client-scaffold-fill | high | mitigate | Neither subagent's prompt references the platform's structured confirmation-choice tool; the real hard gate lives exclusively in `/ei-cria-cliente.md`; confirmed in 02-01-SUMMARY | closed |
| T-2-02 | Tampering | `bin/cli.js` `writeFile()` path handling | medium | accept | Pre-existing gap (writeFile lacks the same CWD-boundary guard removeFile has); this phase only adds ordinary relative paths under `.claude/agents/` and does not touch writeFile()'s guard logic — fixing it is out of scope for this phase | closed |
| T-2-03 | Repudiation / Tampering | `post-scaffolder-review.sh` case statement | high | mitigate | Case branch renamed to `client-scaffold-fill)`, syntax-checked with `bash -n`; live-fire of the retargeted `docs-reviewer` audit against a real `client-scaffold-fill` run explicitly confirmed in 02-05-SUMMARY D2 | closed |
| T-2-01 | Tampering (bypassing the hard gate) | Gate de Confirmação subsection (both modes) | critical | mitigate | Fail-closed response mapping — any response other than the literal approval label is treated as Cancelar and `client-scaffold-fill` is never dispatched; verified live in both single-agent and multi-agent modes per 02-05-SUMMARY D2/D3 | closed |
| T-2-04 | Repudiation (ambiguous half-created/cancel state) | Gate de Confirmação Cancel path (single- and multi-agent) | low | mitigate | Cancel behavior documented as non-destructive; per-especialidade final status surfaced in the consolidated Passo 5 summary rather than silently lost; confirmed live in 02-05-SUMMARY D3 | closed |
| T-2-01-VERIFY | Tampering (bypassing the hard gate) | Gate de Confirmação (both modes) | critical | mitigate | Live-session confirmation that a Cancelar/empty/ambiguous response never dispatches `client-scaffold-fill`, exercised via a deliberate Cancel; confirmed in 02-05-SUMMARY D3 | closed |
| T-2-05 | Denial of Service (spurious hook re-trigger loop) | `post-scaffolder-review.sh` during Passo 2's multi-turn pauses | low | mitigate | Live-session confirmation that the anti-reinjection guard behaves correctly under the new dispatch cadence; confirmed absent in both Task 2 and Task 3 of 02-05-SUMMARY | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-2-01 | T-2-02 | Pre-existing gap in `bin/cli.js` `writeFile()` (lacks the same CWD-boundary guard `removeFile()` has, per 02-RESEARCH.md Security Domain). This phase only adds ordinary relative paths under `.claude/agents/` and does not touch `writeFile()`'s guard logic; fixing it is unrelated scope for this phase. | Phase 02 planning (02-02-PLAN.md) | 2026-07-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-06 | 8 | 8 | 0 | gsd-secure-phase (retrospective, register authored at plan time — L1/ASVS-1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-06
