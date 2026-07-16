# Requirements: ei-prompt — Validação de XML + Scaffolding em 3 Passos

**Defined:** 2026-07-04
**Core Value:** Um editor/scaffolder de IA nunca deve conseguir gerar/deixar um arquivo de cliente com a casca XML quebrada sem que isso seja pego automaticamente por código, não só por regra em prompt.

## v1 Requirements

### Validação de XML (Hook)

- [x] **XMLV-01**: Hook determinístico valida que cada arquivo de cliente (`.md` derivado de `modelo/`) começa com a declaração `<?xml version="1.0" encoding="UTF-8"?>` na 1ª linha
- [x] **XMLV-02**: Hook valida que a 2ª linha é `<agente xmlns="https://expertintegrado.com.br/super-sdr/prompt" versao="1.0" tipo="…">` com atributos corretos numa linha só
- [x] **XMLV-03**: Hook valida que o atributo `tipo` corresponde ao arquivo — mapeamento fixo: Orquestrador→`orchestrator`, Qualifier→`qualifier`, Scheduler→`scheduler`, Protractor→`protractor`, Follow-Up→`followup`, Recepcionista→`orchestrator` + `origem="recepcionista"`
- [x] **XMLV-04**: Hook valida raiz única sem aninhamento — todo o conteúdo dentro de um único par `<agente>…</agente>`
- [x] **XMLV-05**: Hook roda automaticamente no pipeline de review (integrado aos hooks `Stop`/`SubagentStop` existentes — `post-ajustes-fanout.sh`, `post-scaffolder-review.sh`), sem exigir invocação manual
- [x] **XMLV-06**: Falha do hook reporta arquivo + linha/coluna do problema (mensagem acionável, não só "falhou")
- [x] **XMLV-07**: Ponto cego aceito preservado — conteúdo variável do cliente com `<`/`&` cru pode quebrar o parse; isso é esperado e não deve ser "consertado" com escaping/CDATA nem tratado como falha do hook em si

### Scaffolding de Cliente em 3 Passos

- [x] **SCAF-01**: `client-project-scaffolder` dividido em 3 passos distintos e auditáveis: (1) criar pastas/arquivos/compor template, (2) levantar informações do cliente, (3) preencher o template
- [x] **SCAF-02**: Passo 1 não coleta nenhum dado do cliente — só estrutura de pastas/arquivos, sem perguntas
- [x] **SCAF-03**: Passo 2 coleta todos os campos obrigatórios identificados nos templates, incluindo mídias (atual Fase 4.5)
- [x] **SCAF-04**: Gate duro entre Passo 2 e Passo 3 — só avança pro preenchimento com confirmação explícita de que todo campo obrigatório foi coletado (ou conscientemente marcado como pendente), no mesmo padrão do gate humano já usado em `/ei-ajustes` (Passo 3.5)
- [x] **SCAF-05**: Split aplica-se aos dois modos existentes do scaffolder (`single-agent` e `multi-agente-especialidade-unica`)
- [x] **SCAF-06**: Passo 3 preenche os arquivos com os dados coletados, preservando o padrão de placeholders `{{variavel}}` e a marcação `[PENDENTE - informação não fornecida]` já em uso

### Separação CLAUDE.md Cliente/Interno

- [x] **CLMD-01**: `client/CLAUDE.md` existe como novo arquivo-fonte isolado, contendo (verbatim, exceto a seção "Commits") todo o conteúdo cliente hoje em `CLAUDE.md` raiz: banner de índice + nota v1.8.9, Mapa de Regras, Arquitetura Padrão de Agentes, Arquitetura Multi-Agente, tabela Slash Commands, Regras Básicas
- [x] **CLMD-02**: `manifest.json`'s `files` array usa `{"from": "client/CLAUDE.md", "to": "CLAUDE.md"}` para a entrada do CLAUDE.md; as ~28 outras entradas (incluindo `deprecated_files`, sem mudança de schema) permanecem strings simples
- [x] **CLMD-03**: `bin/cli.js` normaliza cada entrada de `manifest.files` (string → `{from,to}`) antes de usar; `fetchFile` usa `.from`, `writeFile` usa `.to`; `help()` renderiza corretamente ambos os formatos (sem `[object Object]`)
- [ ] **CLMD-04**: `CLAUDE.md` raiz deste repo não contém mais nenhum conteúdo client-facing; é removido inteiramente, e `.claude/CLAUDE.md` permanece o único doc "Project instructions" funcional do repo
- [ ] **CLMD-05**: A linha de `.claude/CLAUDE.md` que hoje cita `CLAUDE.md` raiz como fonte da regra de commits é corrigida para não referenciar mais o raiz
- [x] **CLMD-06**: Todo subagente/comando distribuído que hoje lê `CLAUDE.md` assumindo que ali está o payload cliente passa a preferir `client/CLAUDE.md` quando presente, com fallback para `CLAUDE.md` quando ausente — preservando o comportamento correto tanto no repo-fonte (testes do mantenedor) quanto em projetos de cliente distribuídos
- [ ] **CLMD-07**: Um guard determinístico repo-local-only detecta, via `Stop`/`SubagentStop`, quando `CLAUDE.md` raiz ou `.claude/CLAUDE.md` são tocados no turno e sinaliza se algum dos 5 cabeçalhos migrados aparecer fora de `client/CLAUDE.md`; o registro do hook vive **apenas** em `.claude/settings.local.json` — nunca em `.claude/settings.json` nem em `manifest.json`
- [ ] **CLMD-08**: Distribuição fim-a-fim continua funcionando: `bin/cli.js` contra o `manifest.json` atualizado busca `client/CLAUDE.md` no GitHub e grava `CLAUDE.md` na raiz do projeto instalador, com conteúdo idêntico ao anterior (sem regressão para clientes existentes)

## v2 Requirements

(Nenhum — escopo enxuto, 2 frentes bem definidas para este milestone; Phase 3 é uma reorganização estrutural, não uma 3ª frente de produto)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cleanup adicional de comandos legados (`/ei-ctx`, `/ei-edit`, `/ei-review`) | Mecanismo `deprecated_files` já cobre isso, confirmado em `bin/cli.js:86-91` |
| Escaping/CDATA para "consertar" quebra de parse por conteúdo variável do cliente | Ponto cego aceito por design (`docs/regras-validacao.md:49`) |
| Mudar o CONTEÚDO das regras de cliente ou das regras internas | Phase 3 é reorganização estrutural (onde cada regra mora), não revisão do que cada regra diz (CONTEXT.md `<domain>`) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| XMLV-01 | Phase 1 | Complete |
| XMLV-02 | Phase 1 | Complete |
| XMLV-03 | Phase 1 | Complete |
| XMLV-04 | Phase 1 | Complete |
| XMLV-05 | Phase 1 | Complete |
| XMLV-06 | Phase 1 | Complete |
| XMLV-07 | Phase 1 | Complete |
| SCAF-01 | Phase 2 | Complete |
| SCAF-02 | Phase 2 | Complete |
| SCAF-03 | Phase 2 | Complete |
| SCAF-04 | Phase 2 | Complete |
| SCAF-05 | Phase 2 | Complete |
| SCAF-06 | Phase 2 | Complete |
| CLMD-01 | Phase 3 | Planned |
| CLMD-02 | Phase 3 | Planned |
| CLMD-03 | Phase 3 | Planned |
| CLMD-04 | Phase 3 | Planned |
| CLMD-05 | Phase 3 | Planned |
| CLMD-06 | Phase 3 | Planned |
| CLMD-07 | Phase 3 | Planned |
| CLMD-08 | Phase 3 | Planned |

**Coverage:**

- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-04*
*Last updated: 2026-07-06 after Phase 3 research (21/21 requirements mapped across 3 phases; CLMD-01..08 added per 03-RESEARCH.md `<phase_requirements>`)*
</content>
