# Phase 3: Separar CLAUDE.md distribuído (cliente via npm) do CLAUDE.md interno do repo - Research

**Researched:** 2026-07-06
**Domain:** Repo restructuring / distribution-pipeline schema change (Node.js CLI, zero-dependency, Claude Code hooks/settings)
**Confidence:** HIGH (all core mechanics read directly from source in this repo; one MEDIUM item — official Claude Code settings/memory docs, WebFetch-confirmed)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Separação física real, não "self-aware" — root `CLAUDE.md` e `.claude/CLAUDE.md` passam a conter só conteúdo interno; um arquivo novo é a fonte real do payload cliente.
- **D-02:** O arquivo-fonte do payload cliente é `client/CLAUDE.md` — pasta nova, isolada, sem mais nenhum arquivo dentro (descartado `docs/` por causa do autoload sob-demanda de CLAUDE.md em subpastas tocadas por qualquer subagente).
- **D-03:** `manifest.json` ganha suporte a formato misto: entradas normais continuam string simples; só a entrada do CLAUDE.md vira objeto `{"from": "client/CLAUDE.md", "to": "CLAUDE.md"}`. `bin/cli.js` normaliza internamente (string → `{from: x, to: x}`), usa `from` em `fetchFile` / `to` em `writeFile`. As ~28 entradas restantes NÃO viram objeto.
- **D-04:** `deprecated_files` não muda de schema.
- **D-05:** Todo o conteúdo atual do `CLAUDE.md` raiz migra **verbatim** para `client/CLAUDE.md`: Mapa de Regras, Arquitetura Padrão de Agentes, Arquitetura Multi-Agente (Recepcionista), tabela de Slash Commands, Regras Básicas, e a nota v1.8.9 sobre `inject-ei-context.sh`.
- **D-06:** ÚNICA exceção: a seção "Commits" NÃO migra — vira conteúdo interno.
- **D-07 (Claude's Discretion):** Após a migração, decidir se o `CLAUDE.md` raiz fica vazio/mínimo (ponteiro) ou é removido.
- **D-08:** `.claude/CLAUDE.md` já cita a regra de commits referenciando `CLAUDE.md` raiz como fonte — só ajustar essa linha (não referenciar mais o raiz), sem criar arquivo novo.
- **D-09:** Guard de regressão determinístico, repo-local-only (NÃO em `manifest.json`, não distribuído), dispara em `Stop`/`SubagentStop` quando `CLAUDE.md` raiz ou `.claude/CLAUDE.md` são tocados no turno, avisa/bloqueia se o diff introduzir padrões de regra-de-cliente fora de `client/CLAUDE.md`.
- **D-10 (Claude's Discretion):** Wiring exato do guard (regex, reaproveitamento de sentinela, registro em settings.json) fica para research/planning.

### Claude's Discretion

- Formato final do `CLAUDE.md` raiz pós-migração (vazio/mínimo vs. removido) — D-07.
- Wiring exato do guard de prevenção de regressão (D-09/D-10).
- Texto exato da linha ajustada em `.claude/CLAUDE.md` (D-08).

### Deferred Ideas (OUT OF SCOPE)

Nenhuma — discussão ficou inteiramente dentro do escopo da fase.

</user_constraints>

<phase_requirements>
## Phase Requirements

No REQUIREMENTS.md section exists yet for Phase 3 (confirmed — `.planning/REQUIREMENTS.md` only has XMLV-\* and SCAF-\* entries for Phases 1–2). Per CONTEXT.md's explicit instruction, this research proposes a v1 requirements list using a new `CLMD-` prefix, in the same style as the existing table. The planner should add these to `.planning/REQUIREMENTS.md` under a new "### Separação CLAUDE.md Cliente/Interno" heading and a `CLMD-*` traceability row for Phase 3.

| ID | Description | Research Support |
|----|-------------|------------------|
| **CLMD-01** | `client/CLAUDE.md` existe como novo arquivo-fonte isolado, contendo (verbatim, exceto a seção "Commits") todo o conteúdo cliente hoje em `CLAUDE.md` raiz: banner de índice + nota v1.8.9, Mapa de Regras, Arquitetura Padrão de Agentes, Arquitetura Multi-Agente, tabela Slash Commands, Regras Básicas | D-02, D-05; ver §Architecture Patterns / Sequencing |
| **CLMD-02** | `manifest.json`'s `files` array usa `{"from": "client/CLAUDE.md", "to": "CLAUDE.md"}` para a entrada do CLAUDE.md; as ~28 outras entradas permanecem strings simples | D-03; ver §Code Examples |
| **CLMD-03** | `bin/cli.js` normaliza cada entrada de `manifest.files` (string → `{from,to}`) antes de usar; `fetchFile` usa `.from`, `writeFile` usa `.to`; `help()` renderiza corretamente ambos os formatos (sem `[object Object]`) | D-03; ver §Code Examples, §Common Pitfalls Pitfall 1 |
| **CLMD-04** | `CLAUDE.md` raiz deste repo não contém mais nenhum conteúdo client-facing; é removido inteiramente (recomendação) ou reduzido a um ponteiro mínimo, e `.claude/CLAUDE.md` permanece o único doc "Project instructions" funcional do repo | D-01, D-07; ver §State of the Art (Claude Code docs) |
| **CLMD-05** | A linha de `.claude/CLAUDE.md` que hoje cita `CLAUDE.md` raiz como fonte da regra de commits é corrigida para não referenciar mais o raiz (apontar só para `docs/proibido-fazer.md` ou remover a referência cruzada) | D-08 |
| **CLMD-06** | Todo subagente/comando distribuído que hoje lê `CLAUDE.md` assumindo que ali está o payload cliente (Fase 0 dos scaffolders, Passo 0/4 do pipeline de edição) passa a preferir `client/CLAUDE.md` quando presente, com fallback para `CLAUDE.md` quando ausente — preservando o comportamento correto tanto no repo-fonte (testes do mantenedor) quanto em projetos de cliente distribuídos | Ask #7 do prompt; ver §Common Pitfalls Pitfall 2 (achado crítico) |
| **CLMD-07** | Um guard determinístico repo-local-only detecta, via `Stop`/`SubagentStop`, quando `CLAUDE.md` raiz ou `.claude/CLAUDE.md` são tocados no turno e sinaliza se algum dos 5 cabeçalhos migrados (ou padrão `<agente ...>`) aparecer fora de `client/CLAUDE.md`; o registro do hook vive **apenas** em `.claude/settings.local.json` (gitignored) — nunca em `.claude/settings.json` (que É distribuído) nem em `manifest.json` | D-09, D-10; ver §Common Pitfalls Pitfall 3 (achado crítico), §Code Examples |
| **CLMD-08** | Distribuição fim-a-fim continua funcionando: `bin/cli.js` contra o `manifest.json` atualizado busca `client/CLAUDE.md` no GitHub e grava `CLAUDE.md` na raiz do projeto instalador, com conteúdo idêntico ao anterior (sem regressão para clientes existentes) | D-03, D-05; ver §Validation Architecture |

</phase_requirements>

## Summary

Hoje `CLAUDE.md` na raiz do repo tem dupla função incompatível: é o payload distribuído a todo cliente via `manifest.json`/`bin/cli.js`, e é também o "Project instructions" carregado automaticamente por qualquer sessão Claude Code que trabalhe *neste* repo (competindo com `.claude/CLAUDE.md`, que já existe e é o doc interno gerado por convenção GSD). A fase separa fisicamente essas duas audiências: um novo arquivo-fonte `client/CLAUDE.md` passa a ser a origem real do payload cliente; `manifest.json` ganha uma entrada em formato `{from, to}` (só para essa entrada); `bin/cli.js` normaliza internamente; e o `CLAUDE.md` raiz deste repo é esvaziado/removido.

A investigação de código encontrou **dois achados críticos que não estavam explícitos no CONTEXT.md** e que mudam a superfície de implementação real desta fase:

1. **~10 arquivos distribuídos (subagentes/comandos) leem `CLAUDE.md` assumindo que ali está o conteúdo cliente** (arquitetura de agentes, naming, `<agente>` tags) — não apenas para carregar "regras vigentes" em abstrato, mas porque o mantenedor **testa o scaffolding rodando `/ei-cria-cliente` dentro deste próprio repo** (confirmado em `02-05-SUMMARY.md`: "throwaway test client", "cleaned up"). Depois da migração, `CLAUDE.md` raiz não tem mais esse conteúdo — essas leituras quebram silenciosamente para o fluxo de teste interno do mantenedor, a menos que sejam redirecionadas para `client/CLAUDE.md` com fallback. Ver Pitfall 2.
2. **`.claude/settings.json` tem exatamente o mesmo problema de dupla-audiência que `CLAUDE.md`** — é ao mesmo tempo a configuração de hooks deste repo E o arquivo que `manifest.json` distribui verbatim a todo cliente. Registrar o novo guard (D-09) editando `.claude/settings.json` diretamente faria esse hook **ser distribuído por referência** (a entrada no JSON some, mas se ficasse lá o cliente teria uma referência a um script que nunca chega, via `manifest.json`, causando erro de hook ausente em toda sessão do cliente). A solução correta é registrar o guard em `.claude/settings.local.json` (arquivo local, gitignorado, nunca tocado por `manifest.json`/`bin/cli.js`). Ver Pitfall 3.

**Primary recommendation:** Sequenciar a migração em 8 passos aditivos-primeiro (criar `client/CLAUDE.md` → estender `bin/cli.js` → apontar `manifest.json` → corrigir as ~10 leituras hardcoded com fallback → só então esvaziar/remover `CLAUDE.md` raiz → corrigir `.claude/CLAUDE.md` → adicionar o guard em `settings.local.json`), de forma que o repo nunca fique num estado intermediário em que nenhum arquivo é uma fonte válida — ver §Architecture Patterns / Sequencing.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fonte do payload cliente (regras de arquitetura de agentes, naming, multi-agente) | Distribution source (`client/CLAUDE.md`, novo) | — | Novo arquivo isolado; nunca lido implicitamente por Claude Code exceto quando este repo o lê explicitamente ou quando distribuído vira `CLAUDE.md` no projeto do cliente |
| Fetch/write do CLAUDE.md distribuído | CLI entrypoint (`bin/cli.js`) | Manifest (`manifest.json`) | `bin/cli.js` é o único ponto que lê `manifest.files` e decide de onde buscar (`from`) e onde gravar (`to`) |
| Instruções internas de manutenção do próprio ei-prompt | Internal docs (`.claude/CLAUDE.md`) | Root `CLAUDE.md` (pós-fase: vazio/removido) | GSD já trata `.claude/CLAUDE.md` como canônico (`config.json: claude_md_path`) |
| Regra "modelo/ é read-only" e limites de edição client-facing | Distribution source (`client/CLAUDE.md` + `docs/proibido-fazer.md`) | — | Regra sobre como a IA do CLIENTE deve se comportar, não sobre como o mantenedor edita `modelo/` |
| Prevenção de regressão (guard) | Repo-local hook config (`.claude/settings.local.json`, novo) | — | Deve nunca aparecer em `.claude/settings.json` nem `manifest.json` — audiência é só o mantenedor, nunca o cliente |
| Leitura de "CLAUDE.md" pelos subagentes/comandos distribuídos | Ambíguo por design — depende do cwd em runtime | Distribution source OU projeto-cliente instalado | Mesmo texto de instrução roda em dois contextos físicos diferentes (repo-fonte do mantenedor vs. projeto de cliente já instalado); precisa de lógica de fallback, não de um único "dono" fixo — ver Pitfall 2 |

## Standard Stack

Esta fase não introduz nenhuma dependência de runtime nova. Tudo é feito com Node.js built-in (`fs`, `path`, `require`), JSON, Markdown e bash — consistente com a constraint "zero dependências novas" do projeto.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| Node.js `fs`/`path` (built-in) | Node >=18 (repo já usa; ambiente local tem v24.12.0) [VERIFIED: node --version] | Ler/normalizar `manifest.json`, gravar `client/CLAUDE.md`-derivado como `CLAUDE.md` | Já é a única stack usada em `bin/cli.js`; convenção do projeto |
| `node:test` (built-in) | Node >=18 | Testes unitários da função de normalização `{from,to}` | Já é o framework usado por `.claude/hooks/validate-xml-casca.test.js` (Phase 1) — zero-dependência, mesmo padrão |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bash + grep/sed (POSIX) | shell já instalado | Novo hook de regressão (`Stop`/`SubagentStop`) | Mesmo idioma de `post-ajustes-fanout.sh`/`post-scaffolder-review.sh`/`validate-xml-casca.sh` — sem jq, extração de `transcript_path` via grep/sed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Normalização manual string→`{from,to}` em `bin/cli.js` | Biblioteca de schema validation (zod/ajv) | Violaria a constraint zero-dependency para um caso de uso trivial (1 campo opcional) — descartado |
| Guard em `.claude/settings.local.json` | Extrair um `client/settings.json` fonte + entrada `{from,to}` no manifest (mesmo padrão do CLAUDE.md) | Funciona e é "commitável"/team-wide, mas exige tocar `bin/cli.js` de novo e criar mais um arquivo espelho; overkill para um projeto solo-mantenedor (git user único, `biellil`) — ver Pitfall 3 para os dois caminhos documentados |

**Installation:** N/A — nenhum pacote novo.

**Version verification:** N/A — nenhum pacote externo. Node.js já presente: `node --version` → `v24.12.0` [VERIFIED: node --version local]; `git --version` → `2.43.0` [VERIFIED: git --version local].

## Package Legitimacy Audit

**Não aplicável.** Esta fase não instala nenhum pacote npm/pip/cargo novo — é reorganização de arquivos existentes dentro do próprio repo, usando apenas Node.js built-in. Nenhum item para auditar.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────┐
                         │   ei-prompt repo (source)    │
                         │                              │
   maintainer session ──▶  CLAUDE.md (raiz)             │  ← pós-fase: vazio/removido,
   (this repo, cwd=/)     │  (interno, manutenção CLI)   │     só conteúdo de mantenedor
                         │  .claude/CLAUDE.md            │  ← único "Project instructions"
                         │  (interno, GSD-gerado)        │     funcional deste repo
                         │                              │
                         │  client/CLAUDE.md  (NOVO) ────┼──┐  fonte real do payload cliente
                         │  (payload cliente, isolado)   │  │  (D-02: pasta só com este arquivo)
                         │                              │  │
                         │  manifest.json                │  │
                         │   files: [..., {from:         │  │
                         │     "client/CLAUDE.md",        │  │
                         │     to: "CLAUDE.md"}, ...]     │  │
                         └──────────────┬───────────────┘  │
                                        │ git push          │
                                        ▼                   │
                         raw.githubusercontent.com/.../main │
                                        │                   │
                                        │ npx @expertzinho.../ei-prompt@latest
                                        ▼                   │
                         ┌──────────────────────────────┐   │
                         │  bin/cli.js (fetchFile/from) ◀───┘
                         │  writeFile(to) ──────────────▶  CLAUDE.md (raiz do projeto CLIENTE)
                         └──────────────────────────────┘
                                        │
                                        ▼
                         client session (cwd = client project)
                         ── lê "CLAUDE.md" (correto: é o único CLAUDE.md ali) ──▶
                         .claude/commands/ei-cria-cliente.md, agents/* (também
                         distribuídos) usam esse CLAUDE.md sem problema

   ── caminho de teste interno do mantenedor (Pitfall 2) ──
   maintainer roda /ei-cria-cliente DENTRO do repo-fonte (throwaway test client,
   ver 02-05-SUMMARY.md) → os mesmos agents/commands acima leem "CLAUDE.md"
   mas o cwd é o repo-fonte, onde CLAUDE.md raiz agora está vazio → PRECISAM
   preferir client/CLAUDE.md quando presente (fallback), senão quebram.
```

### Recommended Project Structure

```
EiPrompt/
├── CLAUDE.md                # pós-fase: removido OU ponteiro mínimo (D-07) — nunca mais conteúdo cliente
├── client/                  # NOVO — pasta isolada (D-02), NUNCA mais nenhum outro arquivo aqui
│   └── CLAUDE.md            # fonte real do payload distribuído ao cliente (verbatim, sem "Commits")
├── .claude/
│   ├── CLAUDE.md            # único doc interno funcional pós-fase (já existe, D-08 ajusta 1 linha)
│   ├── settings.json        # inalterado — continua distribuído, SEM o novo guard
│   ├── settings.local.json  # NOVO bloco hooks aqui — guard repo-local, gitignorado (D-09/D-10)
│   └── hooks/
│       └── check-claude-md-audience.sh   # NOVO — guard determinístico, NÃO listado em manifest.json
├── manifest.json             # entrada CLAUDE.md vira {from,to}; ~28 outras entradas inalteradas
└── bin/cli.js                 # normaliza entradas antes de fetchFile/writeFile
```

### Pattern 1: Normalização string→objeto no ponto de uso (não no manifest)

**What:** `manifest.json` mistura strings simples e um único objeto `{from,to}`. `bin/cli.js` normaliza cada entrada no início do loop, não exige que o resto do código saiba lidar com dois formatos.
**When to use:** Sempre que uma extensão pontual de schema precisa conviver com N-1 entradas legadas sem forçar migração delas.
**Example:**
```javascript
// bin/cli.js — dentro do loop `for (const file of manifest.files)`
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
A validação de shape (`normalizeEntry` lançando erro) fica **dentro** do `try/catch` por arquivo já existente — preserva a convenção do projeto de "uma falha não aborta o lote" (ver `.claude/CLAUDE.md` §Error Handling).

### Pattern 2: `help()` com entradas mistas

**What:** `help()` hoje faz `manifest.files.map(f => \`  - ${f}\`)`. Com entradas-objeto isso produziria `- [object Object]`.
**When to use:** Sempre que `help()`/qualquer exibição textual iterar `manifest.files`.
**Example:**
```javascript
// bin/cli.js — help()
${manifest.files.map((f) => `  - ${typeof f === "string" ? f : f.to}`).join("\n")}
```
Mostrar `.to` (o caminho final no projeto instalado) é o que interessa ao usuário final rodando `--help` — o `from` é um detalhe de implementação do repo-fonte.

### Pattern 3: Leitura com fallback dual-contexto (client/CLAUDE.md → CLAUDE.md)

**What:** Nos ~10 pontos identificados (ver Pitfall 2), a instrução "Leia `CLAUDE.md`" deve virar "prefira `client/CLAUDE.md` se existir; senão leia `CLAUDE.md`".
**When to use:** Em todo subagente/comando distribuído cujo Fase/Passo 0 hoje lê `CLAUDE.md` esperando o conteúdo do payload cliente.
**Example (texto de instrução, não código):**
```markdown
## Fase 0: Carregar Contexto do Projeto (OBRIGATÓRIO antes de tudo)

1. Verifique se `client/CLAUDE.md` existe (Glob). Se existir (você está rodando no
   repo-fonte do ei-prompt, testando o scaffolding), leia-o via Read — é a fonte
   real das regras de arquitetura de agentes/naming/multi-agente.
2. Se `client/CLAUDE.md` NÃO existir (você está rodando num projeto de cliente já
   instalado via npx), leia `CLAUDE.md` normalmente — ali está o conteúdo correto.
```
Este padrão funciona nos dois contextos sem exigir nenhuma mudança em `manifest.json`/`bin/cli.js` além do já planejado, porque `client/` nunca é distribuído (D-02 — pasta isolada, não está em `manifest.files`).

### Pattern 4: Guard determinístico que reavalia um fato estático (não uma instrução one-shot)

**What:** O guard de D-09 deve seguir o modelo de `.claude/hooks/validate-xml-casca.sh`/`.js` (reavalia "este arquivo está com conteúdo correto agora?" a cada invocação), **não** o modelo de `post-ajustes-fanout.sh`/`post-scaffolder-review.sh` (instrução one-shot com guarda `stop_hook_active`/sentinela anti-loop). Isso importa porque o guard precisa disparar em TODA vez que `CLAUDE.md`/`.claude/CLAUDE.md` são tocados, mesmo em retries — nunca deve ser suprimido por `stop_hook_active`.
**When to use:** Qualquer novo hook cuja responsabilidade seja "validar um invariante estático do arquivo", não "disparar uma instrução de workflow uma vez por rodada".
**Example:** Ver `.claude/hooks/validate-xml-casca.sh` linhas 18–26 (comentário "DESIGN DELIBERADO — NENHUMA guarda de stop_hook_active") como referência direta de por que a omissão da guarda é intencional, não esquecimento.

### Anti-Patterns to Avoid

- **Editar `.claude/settings.json` diretamente para registrar o guard:** esse arquivo é distribuído verbatim via `manifest.json` (`files: [..., ".claude/settings.json", ...]`). Adicionar a entrada do hook ali faria o JSON shipado referenciar um script (`check-claude-md-audience.sh`) que nunca é copiado (não está em `manifest.files`) — toda sessão de cliente dispararia um hook apontando para um arquivo inexistente em `Stop`/`SubagentStop`. Ver Pitfall 3.
- **Confiar que "não listar o script em `manifest.json`" já é suficiente para D-09:** é necessário E insuficiente — o wiring (onde o hook é *registrado*) importa tanto quanto o arquivo do script em si.
- **Regex de detecção baseada em palavras-chave soltas ("Recepcionista", "modelo/"):** produz falso-positivo em `.claude/CLAUDE.md`, que legitimamente menciona esses termos ao descrever a arquitetura interna do próprio pipeline (ex: tabela "Component Responsibilities" já cita `recepcionista-scaffolder`, `docs-editor-conciso` etc. como componentes do CLI). Preferir match nos 5 cabeçalhos H2 exatos que migram (ver Code Examples) — alta precisão, zero overlap conhecido com o vocabulário de `.claude/CLAUDE.md`.
- **Assumir que só a entrada `manifest.files` do CLAUDE.md precisa de tratamento especial e esquecer `help()`:** `help()` itera `manifest.files` independentemente do loop de instalação — os dois pontos de iteração precisam ser corrigidos juntos (CONTEXT.md já cita as duas linhas: 93-102 e 114-128).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Validação de schema de `manifest.json` | Parser/validador de schema JSON customizado ou lib (zod/ajv) | Uma função `normalizeEntry()` de ~5 linhas com `typeof` checks | Único campo variável (`from`/`to`) opcional; constraint zero-dependency; qualquer lib seria overkill |
| Sincronizar `client/CLAUDE.md` com `CLAUDE.md` raiz "automaticamente" | Script de build/template que gera um a partir do outro | Dois arquivos independentes, cada um mantido manualmente na sua audiência | Não há "conteúdo compartilhado" real pós-migração (D-01/D-06 já separam o que é de cada um) — automatizar a sincronização recriaria acoplamento que a fase existe para eliminar |
| Guard de regressão "inteligente" (NLP/LLM-based) para detectar vazamento de conteúdo | Um segundo agente Claude revisando o diff via API | grep/sed determinístico sobre os 5 cabeçalhos migrados, mesmo idioma de `validate-xml-casca.sh` | Core Value do milestone inteiro é "código sempre checa, não regra em prompt/LLM" — usar um LLM para auditar outro LLM contradiz o motivo de existir da fase |

**Key insight:** Esta fase é puramente estrutural — o instinto de "automatizar mais" (build step, schema validator, guard baseado em LLM) tende a reintroduzir acoplamento ou dependências que o projeto deliberadamente evita. A superfície de mudança real cabe inteiramente em Node.js built-in + bash + Markdown.

## Runtime State Inventory

> Fase envolve migração de conteúdo (CLAUDE.md raiz → client/CLAUDE.md) e mudança de schema (manifest.json). Aplicando o inventário por transparência, mesmo que a maioria das categorias não se aplique.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Nenhum — projeto não tem banco de dados/datastore. Clientes já instalados têm um `CLAUDE.md` físico no próprio projeto (arquivo comum, não um registro em sistema externo); o próximo `npx ei-prompt`/`/ei-update` simplesmente sobrescreve com conteúdo idêntico (D-05 é verbatim) — nenhuma migração de dado necessária | Nenhuma |
| Live service config | Nenhum — sem serviços externos com config fora do git (nem n8n, nem Datadog, etc. neste projeto) | Nenhuma |
| OS-registered state | Nenhum — sem Task Scheduler/pm2/launchd/systemd envolvidos neste projeto | Nenhuma |
| Secrets/env vars | Nenhum — `.env` presente no repo não referencia `CLAUDE.md` nem `manifest.json` (confirmado: `bin/cli.js` não lê `.env`) | Nenhuma |
| Build artifacts / instalados | `.claude/settings.local.json` **já existe** neste ambiente (permissions allowlist) — a fase ACRESCENTA um bloco `hooks` a ele, não recria o arquivo. Nenhum outro artefato de build (sem egg-info, sem binário compilado) | Editar o arquivo existente, preservando o bloco `permissions` já presente |

**Nada além disso foi encontrado** — a "migração" real desta fase é markdown + JSON schema, não estado de runtime.

## Common Pitfalls

### Pitfall 1: `help()` e o loop de instalação quebram silenciosamente com entradas mistas

**What goes wrong:** `manifest.files.map(f => ...)` (linha ~123) e `fetchFile(file)`/`writeFile(file, ...)` (linhas 93-102) tratam cada entrada como string. Ao introduzir `{from,to}` só para o CLAUDE.md sem tocar esses dois pontos, `help()` imprime `- [object Object]` e o loop de instalação chama `fetchFile({from:...,to:...})` — que faz `${RAW_BASE}/${relPath}` produzir uma URL malformada (`.../[object Object]`), resultando em 404 silencioso capturado pelo `try/catch` (loga `fail`, mas não trava o resto do lote).
**Why it happens:** `bin/cli.js` foi escrito assumindo string uniforme (era verdade até esta fase) — CONTEXT.md já identifica as duas linhas certas (93-102, 114-128), mas é fácil corrigir só uma e esquecer a outra, já que são fisicamente distantes no arquivo (help() vem depois de run()).
**How to avoid:** Corrigir os dois pontos na MESMA task/commit; escrever um teste `node:test` que cobre especificamente `help()` com uma entrada-objeto no meio de um array de strings (fixture manifest mockado), não só a função de normalização isolada.
**Warning signs:** `node bin/cli.js --help` mostrando `[object Object]` em qualquer linha; `results.failed > 0` para o CLAUDE.md especificamente ao rodar `install`.

### Pitfall 2 (achado crítico, não estava no CONTEXT.md): ~10 leituras hardcoded de "CLAUDE.md" assumem que ali está o payload cliente

**What goes wrong:** Os seguintes arquivos distribuídos (todos em `manifest.files`) instruem "Leia `CLAUDE.md`" na Fase/Passo 0, esperando encontrar arquitetura de agentes, naming patterns, arquitetura multi-agente — exatamente o conteúdo que D-05 migra para `client/CLAUDE.md`:

| Arquivo | Linha | Contexto |
|---------|-------|----------|
| `.claude/agents/client-scaffold-structure.md` | 20 | "Leia `CLAUDE.md` integralmente... arquitetura dos agentes, naming patterns, arquitetura multi-agente" |
| `.claude/agents/client-scaffold-collect.md` | 19 | Passo 0 — lista `CLAUDE.md` entre os arquivos a ler |
| `.claude/agents/docs-analyzer.md` | 18 | Passo 0 — idem, "fonte da verdade sobre arquitetura de agentes" |
| `.claude/agents/docs-editor-conciso.md` | 14, 95 | Passo 0 + "Consultar a seção 'Limites do Ajuste de Prompts' no CLAUDE.md" |
| `.claude/agents/docs-reviewer.md` | 19 (+ várias menções de prosa) | Passo 0 — "fonte da verdade... modelo/ read-only, multi-agente" |
| `.claude/agents/recepcionista-scaffolder.md` | 40 | "Leia `CLAUDE.md` (raiz do projeto) — internalize a seção 'Arquitetura Multi-Agente'" |
| `.claude/commands/ei-cria-cliente.md` | 16 | Passo 1 — "atenção à seção 'Arquitetura Multi-Agente'" |
| `.claude/commands/ei-ajustes.md` | 265, 555 | Passo 4 (editor) e checklist do reviewer fan-out |

Todos esses arquivos rodam em DOIS contextos físicos diferentes: (a) dentro de projetos de clientes já instalados via `npx ei-prompt` — ali `CLAUDE.md` na raiz do projeto do cliente foi corretamente populado a partir de `client/CLAUDE.md` no momento da instalação, então a leitura continua correta sem nenhuma mudança; (b) **dentro do próprio repo-fonte do ei-prompt**, quando o mantenedor testa o scaffolding rodando `/ei-cria-cliente` diretamente neste repo — confirmado que isso acontece de fato: `.planning/phases/02-three-step-gated-client-scaffolding/02-05-SUMMARY.md` documenta sessões live com "throwaway test client" criado e depois limpo, dentro deste mesmo repo. Nesse segundo contexto, depois da migração, `CLAUDE.md` raiz não terá mais o conteúdo — a leitura aponta para o arquivo errado (vazio/removido/só-interno).
**Why it happens:** O texto de instrução foi escrito quando `CLAUDE.md` raiz ainda tinha dupla função — a mudança estrutural desta fase invalida a suposição implícita ("CLAUDE.md sempre tem as regras do cliente") sem que nenhum desses ~10 arquivos precise ser tocado para a distribuição em si funcionar (o cliente final não é afetado).
**How to avoid:** Aplicar o Pattern 3 (leitura com fallback `client/CLAUDE.md` → `CLAUDE.md`) em todos os pontos da tabela acima, ANTES de esvaziar/remover `CLAUDE.md` raiz (ver sequência em Architecture Patterns).
**Warning signs:** Rodar `/ei-cria-cliente` dentro deste repo pós-migração e o scaffolder criar uma pasta de cliente sem saber da arquitetura multi-agente (ex: não reconhecer o padrão Recepcionista), ou o `docs-reviewer` aprovar uma violação de "modelo/ read-only" porque nunca carregou a regra.

### Pitfall 3 (achado crítico, não estava no CONTEXT.md): registrar o guard em `.claude/settings.json` distribui a referência a um hook ausente para todo cliente

**What goes wrong:** `.claude/settings.json` está listado em `manifest.json` (`files`) e é copiado **verbatim** para todo projeto que roda `npx ei-prompt`. Se o novo guard hook (D-09) for registrado adicionando uma entrada `Stop`/`SubagentStop` diretamente em `.claude/settings.json` — mesmo que o SCRIPT (`check-claude-md-audience.sh`) não seja adicionado a `manifest.json` — o CLIENTE recebe um `settings.json` que referencia `"$CLAUDE_PROJECT_DIR"/.claude/hooks/check-claude-md-audience.sh`, arquivo que nunca é baixado. Toda sessão do cliente dispararia esse hook em `Stop`/`SubagentStop` contra um comando inexistente.
**Why it happens:** É o MESMO padrão de dupla-audiência que motivou a fase inteira (CLAUDE.md), só que em `.claude/settings.json` — não foi mencionado no CONTEXT.md porque o D-09 focou em "o script não pode estar em manifest.json", sem notar que o *registro* do script (não o script em si) é o que efetivamente é distribuído.
**How to avoid:** Registrar o guard **apenas** em `.claude/settings.local.json` — arquivo que já existe neste ambiente (confirmado: 11.854 bytes, contém `permissions.allow`), é gitignorado globalmente neste ambiente (`/root/.config/git/ignore: **/.claude/settings.local.json`) [VERIFIED: git check-ignore -v local], e — segundo a documentação oficial — hooks de `settings.local.json` e `settings.json` **se concatenam** (não se sobrescrevem), então o guard dispara normalmente nas sessões deste mantenedor sem nunca tocar o arquivo distribuído [CITED: code.claude.com/docs/en/settings]. Recomendação adicional de defesa em profundidade: adicionar explicitamente `.claude/settings.local.json` ao `.gitignore` do próprio repo (o `.gitignore` atual não lista essa entrada — hoje ela só está protegida por uma configuração *global* de git deste ambiente específico, não por algo commitado no repo; outro clone/CI não teria essa proteção automaticamente, já que "Claude Code auto-gitignora apenas quando é ELE quem cria o arquivo pela primeira vez", não quando um agente/Write tool o cria manualmente) [CITED: code.claude.com/docs/en/settings].
**Warning signs:** Um cliente reportando erro/ruído de hook a cada `Stop`/`SubagentStop` ("command not found: check-claude-md-audience.sh") depois de atualizar via `npx ei-prompt`.

### Pitfall 4: regex de detecção genérico demais gera falso-positivo em `.claude/CLAUDE.md`

**What goes wrong:** Um guard que procura palavras como "modelo/", "Recepcionista", "read-only" dispara mesmo quando `.claude/CLAUDE.md` está legitimamente descrevendo a arquitetura interna do pipeline (que MENCIONA esses componentes/conceitos do ponto de vista de "como o CLI funciona", não "como a IA do cliente deve se comportar").
**Why it happens:** Confundir "menciona o conceito" com "é conteúdo destinado ao cliente".
**How to avoid:** Usar os 5 cabeçalhos H2 exatos migrados por D-05 como assinatura de alta precisão (ver Code Examples) — nenhum deles colide com os cabeçalhos já existentes em `.claude/CLAUDE.md` (`## Technology Stack`, `## Conventions`, `## Architecture`, etc.).
**Warning signs:** Guard bloqueando edições legítimas em `.claude/CLAUDE.md` que apenas atualizam a tabela "Component Responsibilities".

## Code Examples

### Exemplo 1 — `manifest.json` com entrada mista (D-03)

```json
{
  "repo": "Expert-Integrado/ei-prompt",
  "branch": "main",
  "files": [
    { "from": "client/CLAUDE.md", "to": "CLAUDE.md" },
    "CHANGELOG.md",
    "docs/regras-edicao.md"
  ]
}
```
Apenas a entrada do CLAUDE.md muda de forma — as demais ~28 entradas do `manifest.json` atual permanecem strings simples.

### Exemplo 2 — Guard determinístico em `.claude/settings.local.json` (D-09/D-10, Pitfall 3)

```json
{
  "permissions": { "allow": [ "... (bloco já existente preservado) ..." ] },
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
O script `check-claude-md-audience.sh` mora em `.claude/hooks/` (mesma pasta dos outros hooks, por consistência de path), mas **não** entra em `manifest.json` `files` — igual ao design de `.claude/worktrees/` (path existente mas não distribuído), só que aqui é o REGISTRO em settings que também precisa ficar de fora do arquivo distribuído.

### Exemplo 3 — Detecção de alta precisão via cabeçalhos migrados (Pitfall 4)

```bash
# Dentro de check-claude-md-audience.sh, após extrair transcript_path e
# descobrir arquivos tocados (Edit/Write) cujo path termina em "CLAUDE.md"
# E não contém "/client/" (mesmo idioma de discoverTouchedFiles em
# validate-xml-casca.js — filtra por basename/path, escopo por turno):

BANNED_HEADINGS='^## Mapa de Regras$|^## Arquitetura Padrão de Agentes$|^## Arquitetura Multi-Agente|^## Slash Commands$|^## Regras Básicas$'

for f in "${TOUCHED_ROOT_OR_INTERNAL_CLAUDE_MD[@]}"; do
  if grep -Eq "$BANNED_HEADINGS" "$f"; then
    echo "{\"decision\":\"block\",\"reason\":\"$f contém um cabeçalho migrado para client/CLAUDE.md (D-05) — conteúdo de cliente vazando para doc interno.\"}"
    exit 0
  fi
done
exit 0
```
Segue o mesmo "wrapper fino delega ao Node" que `validate-xml-casca.sh` usa, ou pode ficar 100% em bash dado que a checagem é um grep simples (decisão de implementação, não de produto).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `CLAUDE.md` raiz com dupla função (interno + cliente), competindo com `.claude/CLAUDE.md` | Separação física: `client/CLAUDE.md` (cliente) vs. `.claude/CLAUDE.md` (interno); `CLAUDE.md` raiz vazio/removido | Esta fase | Elimina a ambiguidade que fazia regras de cliente ("modelo/ read-only") aparecerem como regra para o próprio mantenedor |

**Deprecated/outdated:**
- A suposição (documentada no próprio `CLAUDE.md` atual, linha 3) de que "`CLAUDE.md` é o índice geral" para QUALQUER sessão neste repo deixa de valer — pós-fase, `.claude/CLAUDE.md` é o único índice funcional para sessões deste repo. [CITED: code.claude.com/docs/en/memory — "Project instructions | Location: `./CLAUDE.md` or `./.claude/CLAUDE.md`" são listados como localizações alternativas equivalentes na mesma linha da tabela oficial; nada na documentação exige que ambos existam simultaneamente.]
- A documentação oficial confirma que **remover `CLAUDE.md` raiz inteiramente é uma configuração suportada e comum** (não apenas "esvaziar/apontar") — reforça D-07 na direção de remoção total em vez de stub. [CITED: code.claude.com/docs/en/memory]
- Nuance nova (não coberta no CONTEXT.md original): comentários HTML em bloco (`<!-- ... -->`) dentro de um CLAUDE.md são removidos antes de entrar no contexto — útil apenas se a equipe optar pelo "ponteiro mínimo" em vez de remoção total, para deixar uma nota histórica sem custo de contexto. [CITED: code.claude.com/docs/en/memory]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | O guard deve rodar tanto em `Stop` quanto `SubagentStop` (espelhando `validate-xml-casca.sh`, que também registra nos dois eventos) | Architecture Patterns Pattern 4, Code Examples Exemplo 2 | Se edições ao CLAUDE.md raiz/.claude/CLAUDE.md só acontecerem via agente principal (nunca via subagente), registrar em `SubagentStop` seria redundante mas inofensivo — risco baixo |
| A2 | O projeto é efetivamente mantido por um único desenvolvedor (`biellil`), o que torna `settings.local.json` (não git-tracked) uma opção aceitável para D-09/D-10, em vez do padrão "commitável" via `client/settings.json` + manifest `{from,to}` | Pitfall 3, Alternatives Considered | Se houver múltiplos contribuidores no futuro, cada um precisaria criar seu próprio `.claude/settings.local.json` manualmente para ter o guard ativo — planner deve decidir se documenta esse passo manual em README/CLAUDE.md interno ou migra para o padrão commitável |
| A3 | Recomendação de REMOVER `CLAUDE.md` raiz inteiramente (não deixar ponteiro) é a melhor opção para D-07 | State of the Art, Phase Requirements CLMD-04 | Se algum tooling externo (não encontrado nesta pesquisa) espera especificamente um `CLAUDE.md` na raiz (ex: outro CLI de IA, ou um humano procurando "onde ficam as regras" sem saber de `.claude/`), a remoção total reduz descobribilidade — mitigável com uma linha em `README.md` apontando para `.claude/CLAUDE.md` |

**Risco geral:** nenhum destes é uma claim de compliance/segurança — são decisões de ergonomia de projeto, com fallback documentado em cada linha.

## Open Questions

1. **O script do guard deve ser bash puro ou delegar a um `.js` (como `validate-xml-casca.sh` faz)?**
   - What we know: a checagem é um grep simples sobre 5 strings fixas — não precisa de parsing complexo como a validação de casca XML.
   - What's unclear: se o projeto prefere manter TODOS os hooks decisórios delegando a Node (consistência de padrão) mesmo quando bash puro bastaria.
   - Recommendation: bash puro é suficiente e mais simples; delegar a Node só se a lógica crescer (ex: parsing de diff estruturado). Deixar para o planner decidir na criação da task.

2. **`docs-reviewer.md` e outros arquivos com MENÇÕES de prosa a "CLAUDE.md" (não instruções de leitura, ex: "seguir CLAUDE.md" dentro de um lembrete) precisam do mesmo tratamento de fallback?**
   - What we know: essas menções aparecem DEPOIS do Passo 0 (que já fez a leitura correta, com ou sem fallback) — são só lembretes textuais, não uma segunda leitura de arquivo.
   - What's unclear: se vale a pena trocá-las por "siga as regras carregadas no Passo 0" para não fixar o nome do arquivo em múltiplos lugares.
   - Recommendation: fora de escopo — não são leituras de arquivo, não quebram funcionalmente; ajuste cosmético opcional, não crítico para CLMD-06.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js | `bin/cli.js`, `node:test` | ✓ | v24.12.0 [VERIFIED: node --version] | — |
| git | commits, push para o branch fetched por `manifest.json` | ✓ | 2.43.0 [VERIFIED: git --version] | — |
| npm | publicação (fora do escopo desta fase — só afeta `bin/`) | ✓ | 11.6.2 [VERIFIED: npm --version] | — |

**Missing dependencies with no fallback:** nenhuma.
**Missing dependencies with fallback:** nenhuma.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node >=18) — mesmo usado em `.claude/hooks/validate-xml-casca.test.js` (Phase 1) |
| Config file | Nenhum — `package.json` não tem bloco `scripts` nem `"test"` definido [VERIFIED: leitura de package.json] |
| Quick run command | `node --test .claude/hooks/validate-xml-casca.test.js` (regressão Phase 1, deve continuar 27/27) |
| Full suite command | `node --test .claude/hooks/*.test.js bin/*.test.js` (novo arquivo `bin/cli.test.js` proposto abaixo) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| CLMD-03 | `normalizeEntry()` converte string→`{from,to}` e passa objeto adiante inalterado | unit | `node --test bin/cli.test.js` | ❌ Wave 0 |
| CLMD-03 | `help()` não imprime `[object Object]` com manifest misto | unit/manual | `node bin/cli.js --help \| grep -qv '\[object Object\]'` | ❌ Wave 0 (script inline, não precisa de arquivo) |
| CLMD-08 | Instalação fim-a-fim busca `client/CLAUDE.md` e grava `CLAUDE.md`, conteúdo idêntico ao anterior | manual (sem mock de rede neste projeto zero-dependency) | rodar `npx github:Expert-Integrado/ei-prompt#<branch-da-fase>` (ou apontar `manifest.branch` temporariamente) numa pasta scratch e comparar `diff` do `CLAUDE.md` resultante contra o `CLAUDE.md` pré-fase salvo | manual — sem automação nova necessária, mesmo padrão de "throwaway test" já usado em 02-05-SUMMARY.md |
| CLMD-04/CLMD-06 | Nenhum dos 5 cabeçalhos migrados aparece em `CLAUDE.md` raiz nem `.claude/CLAUDE.md` pós-fase | automated (grep) | `! grep -E '^## (Mapa de Regras|Arquitetura Padrão de Agentes|Arquitetura Multi-Agente|Slash Commands|Regras Básicas)' CLAUDE.md .claude/CLAUDE.md 2>/dev/null` | ❌ Wave 0 — vira um passo de verificação inline no plano, não precisa virar arquivo de teste |
| CLMD-07 | Guard bloqueia quando um cabeçalho migrado é reintroduzido em `CLAUDE.md`/`.claude/CLAUDE.md` | manual (fixture de transcript, mesmo padrão de `validate-xml-casca.test.js`) | criar transcript JSONL fixture com um `tool_use Edit` em `CLAUDE.md` inserindo "## Slash Commands" e confirmar que o script emite `decision:block` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test .claude/hooks/validate-xml-casca.test.js` (regressão barata, já existe) + `node bin/cli.js --help` (sanity manual)
- **Per wave merge:** full suite acima + grep dos 5 cabeçalhos banidos
- **Phase gate:** todos os itens da tabela "Phase Requirements → Test Map" verdes antes de `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `bin/cli.test.js` (novo) — cobre `normalizeEntry()`/equivalente e `help()` com manifest misto (CLMD-03)
- [ ] Fixture de transcript JSONL para o guard (CLMD-07) — mesmo padrão de fixtures já usado em `validate-xml-casca.test.js`
- [ ] `package.json` não tem script `"test"` — considerar adicionar `"test": "node --test bin/*.test.js .claude/hooks/*.test.js"` nesta fase para consolidar o comando de regressão (não bloqueia a fase, mas evita cada plano reinventar o comando completo)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | não | Sem autenticação neste CLI |
| V3 Session Management | não | Sem sessão/estado persistente |
| V4 Access Control | sim | `writeFile()`/`removeFile()` em `bin/cli.js` — escopo de escrita restrito ao CWD do projeto instalador |
| V5 Input Validation | sim | `manifest.json` é o "input" que dita `from`/`to`; `normalizeEntry()` deve rejeitar shapes inválidos com erro claro em vez de deixar `TypeError` não tratado propagar |
| V6 Cryptography | não | Sem segredo/criptografia envolvidos |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Entrada de manifest malformada (`{from}` sem `to`, ou tipos errados) derruba o loop inteiro em vez de só aquele arquivo | Denial of Service (do próprio CLI, self-inflicted) | `normalizeEntry()` deve lançar dentro do `try/catch` por-arquivo já existente (Pattern 1) — nunca fora dele, preservando a resiliência "uma falha não aborta o lote" já documentada em `.claude/CLAUDE.md` §Error Handling |
| Path traversal via `to` de uma entrada de manifest comprometida (`{"to": "../../etc/passwd"}`) | Tampering | `writeFile()` **hoje não tem** o mesmo guard de CWD-boundary que `removeFile()` já tem — isso é um risco pré-existente e aceito (T-2-02, documentado em `02-SECURITY.md` como fora de escopo da Phase 2). Esta fase NÃO piora esse risco (manifest.json continua sendo um arquivo confiável, controlado só pelo mantenedor via git, não input externo/de usuário) mas TAMBÉM não deveria estender o padrão `{from,to}` como pretexto para introduzir um caminho de escrita novo sem ao menos reafirmar/documentar que o risco pré-existente permanece aceito e não cresceu |

## Sources

### Primary (HIGH confidence)
- `bin/cli.js`, `manifest.json`, `.claude/settings.json`, `.claude/hooks/post-ajustes-fanout.sh`, `.claude/hooks/post-scaffolder-review.sh`, `.claude/hooks/validate-xml-casca.sh`/`.js`, `docs/proibido-fazer.md`, `.claude/CLAUDE.md`, `CLAUDE.md` — lidos diretamente nesta sessão via Read tool
- `.planning/phases/02-three-step-gated-client-scaffolding/02-05-SUMMARY.md` — confirma que scaffolding é testado ao vivo dentro deste próprio repo (base do Pitfall 2)
- `git check-ignore -v .claude/settings.local.json` — confirma ignore global ativo neste ambiente (base do Pitfall 3)

### Secondary (MEDIUM confidence)
- [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings) — WebFetch, confirma hierarquia settings.json/settings.local.json, merge de hooks, e que auto-gitignore só ocorre quando Claude Code cria o arquivo (não quando é criado manualmente)
- [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) — WebFetch, confirma que `./CLAUDE.md` e `./.claude/CLAUDE.md` são localizações alternativas para "Project instructions" (nenhuma obrigatoriedade de ambas existirem), e o comportamento de comentários HTML/imports

### Tertiary (LOW confidence)
- Nenhum — todos os achados de arquitetura foram verificados diretamente no código-fonte ou na documentação oficial.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — projeto zero-dependency, nada a inferir além do que já está em uso
- Architecture (sequenciamento, Pitfalls 2/3): HIGH — confirmado lendo os ~10 arquivos e o `manifest.json`/`settings.json` diretamente, não inferido
- D-07 (remover vs. esvaziar CLAUDE.md raiz): MEDIUM — recomendação apoiada em doc oficial, mas é uma escolha de ergonomia sem "resposta certa" única
- Pitfalls: HIGH — dois achados novos derivados de leitura de código real, não de suposição

**Research date:** 2026-07-06
**Valid until:** 30 dias (mudança estrutural interna, não depende de API externa que muda rápido) — mas revalidar se a versão do Claude Code mudar o comportamento de `settings.local.json`/merge de hooks antes da fase ser executada
