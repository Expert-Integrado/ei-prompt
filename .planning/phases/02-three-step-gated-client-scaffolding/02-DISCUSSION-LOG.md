# Phase 2: 3-Step Gated Client Scaffolding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 02-3-step-gated-client-scaffolding
**Areas discussed:** Granularidade dos passos, Escopo do split no modo multi-agente, Recepcionista entra no split?, UX do gate duro (Passo 2→3)

---

## Granularidade dos passos

| Option | Description | Selected |
|--------|-------------|----------|
| 1 subagent com param `passo` | client-project-scaffolder.md ganha parâmetro `passo: 1\|2\|3`, invocado 3x pelo comando | |
| 3 subagents dedicados | Arquivos separados por passo, cada um com escopo/tools próprios | ✓ |
| Você decide (Claude) | Deixa a granularidade para o planner/researcher | |

**User's choice:** 3 subagents dedicados.
**Notes:** Usuário pediu para pesquisar o que a documentação oficial da Claude Code (code.claude.com/docs) recomenda antes de decidir. WebFetch em `code.claude.com/docs/en/sub-agents` confirmou o padrão "chain subagents" para workflows multi-etapa, com restrição de tools por etapa como racional válido — usado para justificar a escolha.

**Follow-up — Naming:**

| Option | Description | Selected |
|--------|-------------|----------|
| client-scaffolder-step1/2/3 | Sufixo numérico, ordem óbvia | |
| client-scaffolder-{scaffold,collect,fill} | Nome descreve a função | |
| Você decide (Claude) | Planner escolhe seguindo CONVENTIONS.md | ✓ |

**User's choice:** Você decide (Claude).

---

## Escopo do split no modo multi-agente

| Option | Description | Selected |
|--------|-------------|----------|
| Por especialidade (ciclo completo) | Cada especialidade passa pelo próprio Passo1→Passo2→gate→Passo3 antes da próxima | ✓ |
| Agregado (uma passada só) | Passo 1 cria tudo, Passo 2 coleta tudo, 1 gate único, Passo 3 preenche tudo | |

**User's choice:** Por especialidade (ciclo completo).
**Notes:** Preserva o loop sequencial já existente hoje em `ei-cria-cliente.md` Passo 4B.1(b).

**Follow-up — Resumo final:**

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, manter resumo final consolidado | Árvore + pendências agregadas de todas as especialidades ao final | ✓ |
| Não precisa, gate por especialidade já basta | | |

**User's choice:** Sim, manter resumo final consolidado.

---

## Recepcionista entra no split?

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, aplicar o mesmo split | Recepcionista também vira 3 passos com gate | |
| Não, só client-project-scaffolder muda | Recepcionista fica fora, possível fase futura | ✓ (decisão de Claude) |

**User's choice:** Usuário delegou a decisão ("vc quem saber nao tenho ideia qual o melhor").
**Notes:** Claude decidiu por "Não" — SCAF-01..06 e o Core Value do PROJECT.md nomeiam explicitamente `client-project-scaffolder`, não `recepcionista-scaffolder`. Expandir seria scope creep sobre requisitos já travados. Registrado como ideia adiada.

---

## UX do gate duro (Passo 2→3)

| Option | Description | Selected |
|--------|-------------|----------|
| Espelhar /ei-ajustes Passo 3.5 exatamente | AskUserQuestion com "Aprovar e preencher"/"Cancelar" | ✓ |
| Checklist campo a campo mais rico | Mostra status de cada campo antes de confirmar | |
| Você decide (Claude) | Planner define o formato | |

**User's choice:** Espelhar /ei-ajustes Passo 3.5 exatamente.

**Follow-up — Fail-closed:**

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, mesmo fail-closed do /ei-ajustes | Qualquer resposta ≠ "Aprovar e preencher" explícito = Cancelar | ✓ |
| Você decide (Claude) | | |

**User's choice:** Sim, mesmo fail-closed do /ei-ajustes.

---

## Claude's Discretion

- Nome exato dos 3 novos arquivos de subagent (seguir CONVENTIONS.md kebab-case function-first).
- Detalhes finos de implementação interna de cada subagent (contrato de entrada/saída entre os 3 passos).

## Deferred Ideas

- Aplicar o mesmo split de 3 passos + gate duro ao `recepcionista-scaffolder` — fora do escopo da Fase 2, candidato a fase futura.
