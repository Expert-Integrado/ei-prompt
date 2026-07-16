# Phase 3: Separar CLAUDE.md distribuído (cliente via npm) do CLAUDE.md interno do repo - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 03-separar-claude-md-distribuido-cliente-via-npm-do-claude-md-i
**Areas discussed:** Mecanismo de separação, Fronteira de conteúdo cliente vs. interno, Destino do conteúdo interno, Prevenção de regressão futura

---

## Mecanismo de separação

| Option | Description | Selected |
|--------|-------------|----------|
| Self-aware (mesmo arquivo) | Root CLAUDE.md continua sendo o mesmo arquivo fetch=dest; só ganha uma nota/guard no topo | |
| Separação física real (from/to) | Root CLAUDE.md vira 100% interno; novo arquivo vira fonte real do payload cliente; manifest.json + bin/cli.js ganham suporte a from/to | ✓ |
| You decide | | |

**User's choice:** Separação física real (from/to)
**Notes:** Decisão validada por pesquisa oficial ao vivo (code.claude.com/docs/en/memory) — Claude Code não tem mecanismo nativo pra diferenciar audiência de CLAUDE.md.

---

| Option | Description | Selected |
|--------|-------------|----------|
| docs/CLAUDE.md | Reaproveita a pasta docs/ já 100% payload cliente | |
| client/CLAUDE.md (pasta nova) | Pasta isolada, nada mais lido ali | ✓ |
| You decide | | |

**User's choice:** client/CLAUDE.md (pasta nova) — depois de considerar e descartar `docs/CLAUDE-CLIENTE.md` (nome não-reservado dentro de docs/) numa pergunta de síntese intermediária, o usuário preferiu isolamento físico total.
**Notes:** Pesquisa oficial revelou que CLAUDE.md em subpasta carrega sob-demanda quando qualquer arquivo daquela subpasta é lido — descartou docs/ como local seguro, mesmo com nome de arquivo diferente.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Formato misto (recomendado) | Entradas normais continuam string; só CLAUDE.md vira {from,to} | ✓ |
| Converter tudo pra objeto | Todas as ~28 entradas viram objeto | |
| You decide | | |

**User's choice:** Formato misto (recomendado)
**Notes:** Menor diff, formato antigo continua válido para as demais entradas.

---

## Fronteira de conteúdo cliente vs. interno

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo exceto 'Commits' é cliente | Todas as seções migram verbatim pra client/CLAUDE.md, exceto a seção Commits | ✓ |
| Revisão mais profunda necessária | Passar seção por seção antes de decidir | |

**User's choice:** Tudo exceto 'Commits' é cliente
**Notes:** Inclui a nota v1.8.9 sobre inject-ei-context.sh desativado — confirmado como client-facing de fato, pois o hook é distribuído ao cliente.

---

## Destino do conteúdo interno

| Option | Description | Selected |
|--------|-------------|----------|
| Nova seção em .claude/CLAUDE.md | Adiciona seção nova editada à mão | |
| Doc separado referenciado | Cria doc à parte não distribuído, referenciado por .claude/CLAUDE.md | |

**User's choice:** Nenhuma das duas diretamente — usuário pediu pra eu analisar primeiro ("não sei qual melhor, vai de analisar..."). Análise revelou que `.claude/CLAUDE.md` já tem uma linha herdada citando a regra de commits e referenciando o CLAUDE.md raiz como fonte. Representei essa síntese como pergunta de confirmação ("Sim, ajustar a linha existente" vs. "Não, quero doc separado mesmo") e o usuário confirmou a primeira.
**Notes:** Evita criar arquivo novo; `.claude/CLAUDE.md` continua sendo o único doc interno do repo.

---

## Prevenção de regressão futura

| Option | Description | Selected |
|--------|-------------|----------|
| Só convenção documentada | Anota a regra em .claude/CLAUDE.md, sem checagem de código | |
| Checagem determinística leve | Reaproveita/estende infra de hook existente com checagem extra | |
| You decide | | ✓ |

**User's choice:** You decide (delegado)
**Notes:** Claude decidiu por "checagem determinística leve" alinhada ao Core Value do milestone (código sempre checa, não só regra em prompt — mesmo racional da Fase 1), mas como guard NOVO e repo-local-only, separado do hook validate-xml-casca.sh/js existente (audiência/escopo diferentes: aquele é distribuído ao cliente e valida arquivos de agente do cliente).

---

## Claude's Discretion

- Formato final do CLAUDE.md raiz pós-migração (vazio/mínimo vs. removido)
- Wiring exato do guard de prevenção de regressão (regex, reaproveitamento de infra de sentinela, registro em settings.json)
- Texto exato da linha ajustada em .claude/CLAUDE.md
- Mecanismo de prevenção de regressão futura (delegado integralmente)

## Deferred Ideas

Nenhuma — discussão ficou inteiramente dentro do escopo da fase.
