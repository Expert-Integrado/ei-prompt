# Phase 1: XML Validation Hook - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 1-XML Validation Hook
**Areas discussed:** Motor de validação, Descoberta de arquivos, Bloqueio vs aviso, Onde o hook mora

---

## Motor de validação

| Option | Description | Selected |
|--------|-------------|----------|
| Node.js puro (regex/string) | Zero dependência, sempre disponível | ✓ |
| xmllint com fallback | Tenta xmllint, cai pra Node se ausente | |
| xmllint obrigatório | Falha se xmllint não estiver no PATH | |

**User's choice:** Pediu recomendação ("não sei qual é melhor / qual o padrão do Claude"). Recomendei Node.js puro dado o constraint de zero-dependência do projeto e a ausência confirmada de `xmllint` neste sandbox.
**Notes:** Decisão adotada sem objeção.

| Option | Description | Selected |
|--------|-------------|----------|
| Script .js dedicado + wrapper bash fino | Node para lógica estrutural, bash pro wrapper padrão | ✓ |
| Tudo em bash (grep/awk/sed) | 100% consistente com estilo atual dos hooks | |

**User's choice:** Script .js dedicado + wrapper bash fino.

| Option | Description | Selected |
|--------|-------------|----------|
| Checagens estruturais direcionadas | Regex/split por linha, sem parser XML genérico | ✓ |
| Tokenizer XML feito à mão | Mais robusto genericamente, mais código | |

**User's choice:** Checagens estruturais direcionadas.

| Option | Description | Selected |
|--------|-------------|----------|
| Tolerante à ordem | Extrai cada atributo individualmente | ✓ |
| Formato exato (string literal) | Exige linha idêntica byte a byte | |

**User's choice:** Tolerante à ordem (garantir que todos os atributos obrigatórios existem e estão corretos, independente de ordem).
**Notes:** Resposta em texto livre um pouco ambígua ("olha os modelos... garantir que todos os XMLs estão existentes") — interpretada como confirmação da opção "tolerante à ordem" com foco em garantir presença/correção de cada atributo.

---

## Descoberta de arquivos

| Option | Description | Selected |
|--------|-------------|----------|
| Parsear transcript por Edit/Write | Igual ao post-scaffolder-review.sh | |
| Checar por nome de arquivo conhecido | Filtra por basename conhecido | |
| Você decide | Delega ao pesquisador/planner | ✓ |

**User's choice:** Você decide.
**Notes:** Registrado em Claude's Discretion — provável abordagem é parsear transcript por Edit/Write.

| Option | Description | Selected |
|--------|-------------|----------|
| Só os arquivos tocados | Mais rápido, requisitos são por arquivo | ✓ |
| Pasta inteira do cliente | Mais redundante, mais lento, mais ruído | |

**User's choice:** Só os arquivos tocados.

---

## Bloqueio vs aviso

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear (decision:block + reason) | Mesmo padrão do post-ajustes-fanout.sh | ✓ |
| Avisar sem bloquear | Reporta mas deixa prosseguir | |

**User's choice:** Bloquear.
**Notes:** Resposta em texto livre confirmando que o hook deve bloquear e retornar o que está errado — consistente com XMLV-06 (mensagem acionável).

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueia igual, sem tentar corrigir | Ponto cego aceito (XMLV-07) também bloqueia | ✓ |
| Não bloqueia nesse caso específico | Tenta distinguir quebra estrutural de quebra por conteúdo | |

**User's choice:** Bloqueia igual, sem tentar corrigir.

---

## Onde o hook mora

| Option | Description | Selected |
|--------|-------------|----------|
| Script novo e dedicado | Registrado ao lado dos hooks existentes em settings.json | ✓ |
| Embutir nos hooks existentes | Mexe no código já estável do post-ajustes-fanout.sh/post-scaffolder-review.sh | |

**User's choice:** Script novo e dedicado.

| Option | Description | Selected |
|--------|-------------|----------|
| Distribuir via manifest.json | Todo usuário via npx ganha a proteção | ✓ |
| Só ferramenta interna deste repo | Fica só em .claude/ deste repo | |

**User's choice:** Distribuir via manifest.json.

---

## Claude's Discretion

- **Descoberta de arquivos (mecanismo exato):** usuário delegou a decisão técnica de como o hook descobre quais arquivos validar. Recomendação registrada em CONTEXT.md (D-05): parsear transcript por chamadas Edit/Write, no padrão do post-scaffolder-review.sh.

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
