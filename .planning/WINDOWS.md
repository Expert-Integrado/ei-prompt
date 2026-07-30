---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-07-29T23:57:34.820Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | quick-260729-stk | deviation | .planning/quick/260729-stk-corrigir-referencias-a-client-claude-md-/260729-stk-PLAN.md | 211 | Gate 3 da <verification> e over-broad: o regex '^[[:space:]]*- `CLAUDE.md`' tambem casa a linha exigida pelo Ponto E da Task 2 (ei-ajustes.md:553), fazendo o gate esperar 6/1 quando o real e 7/2. Intent satisfeito; validado com check preciso escopado a CANON-B. | open |  | 2026-07-29T23:57:34.820Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "quick-260729-stk",
    "file": ".planning/quick/260729-stk-corrigir-referencias-a-client-claude-md-/260729-stk-PLAN.md",
    "line": 211,
    "description": "Gate 3 da <verification> e over-broad: o regex '^[[:space:]]*- `CLAUDE.md`' tambem casa a linha exigida pelo Ponto E da Task 2 (ei-ajustes.md:553), fazendo o gate esperar 6/1 quando o real e 7/2. Intent satisfeito; validado com check preciso escopado a CANON-B.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-29T23:57:34.820Z",
    "resolved_at": null
  }
]
````
