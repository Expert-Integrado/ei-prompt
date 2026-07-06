---
status: testing
phase: 02-three-step-gated-client-scaffolding
source: [02-VERIFICATION.md]
started: 2026-07-06T02:30:00Z
updated: 2026-07-06T02:30:00Z
---

## Current Test

number: 1
name: Live re-verification of CR-02's field-routing contract
expected: |
  Run `/ei-cria-cliente` against the current code (post-CR-02 fix), approve the confirmation gate,
  and confirm `client-scaffold-collect` emits the mandatory `arquivo` attribute on every `<campo>`,
  and `client-scaffold-fill` routes each field to the correct target file and fills it correctly —
  without hitting its new defensive "stop and report" branch (which fires only if `arquivo` is missing).
  Result should match what was already confirmed live under the pre-CR-02 schema in 02-05-SUMMARY.md
  Tasks 2/3, now exercising the new `arquivo`-based routing instead of the old placeholder-inference logic.
awaiting: user response

## Tests

### 1. Live re-verification of CR-02's field-routing contract
expected: `client-scaffold-collect` emits `arquivo` on every collected field; `client-scaffold-fill` routes/fills correctly by that attribute without triggering the missing-attribute defensive branch.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
