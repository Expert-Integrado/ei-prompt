# Comandos `/ei-*` do EiPrompt

> **Nota:** este arquivo é documentação interna do repositório. **Não é publicado no npm nem distribuído via `ei-prompt install`.**

Todos os comandos rodam dentro do Claude Code. Vêm instalados via `npx @expertzinhointegrado/ei-prompt@latest`.

- [`/ei-cria-cliente`](#ei-cria-cliente-nome) — cria novo projeto de cliente
- [`/ei-ajustes`](#ei-ajustes-cliente-descrição) — aplica ajuste em agente de cliente existente
- [`/ei-update`](#ei-update) — re-executa o CLI e mostra o CHANGELOG da versão mais nova

---

## `/ei-cria-cliente <nome>`

Cria um novo projeto de cliente a partir dos templates em `modelo/`.

**Uso:**
```
/ei-cria-cliente malu
/ei-cria-cliente João da Silva
/ei-cria-cliente            ← se omitir, pergunta o nome
```

**Fluxo:**
1. Pergunta o modo via `AskUserQuestion`: **single-agent** (1 frente) ou **multi-agente** (2+ frentes com fluxos distintos).
2. **Single-agent:**
   1. `client-scaffold-structure` cria a pasta `<cliente>/` e copia `modelo/*.md` verbatim.
   2. `client-scaffold-collect` coleta todos os campos obrigatórios (incl. mídia) via conversa e devolve `<dados_coletados>`.
   3. **Gate de Confirmação** (`AskUserQuestion`: "Aprovar e preencher" / "Cancelar") — só avança para o preenchimento com aprovação explícita.
   4. `client-scaffold-fill` preenche os templates com os dados aprovados.
3. **Multi-agente (fluxo completo):** repete o ciclo estrutura → coleta → gate → preenchimento (item 2 acima) uma vez por especialidade, sempre sequencial, nunca em paralelo. Depois que todas as especialidades foram criadas (preenchidas ou canceladas), dispara `recepcionista-scaffolder` uma única vez para montar `Recepcionista/`.
4. **Multi-agente (bypass):** pula o loop de especialidades inteiro — dispara só o `recepcionista-scaffolder`, que pede nome/descrição/gatilhos de cada especialidade já existente.
5. **Resumo final:** um único resumo consolidado ao fim de todo o fluxo (não por especialidade), com o status de cada ciclo (**preenchida** ou **cancelada-e-não-preenchida**) e os campos pendentes.

**Saída:** nova pasta `<cliente>/` (single-agent) ou `<cliente>/<especialidade>/` + `<cliente>/Recepcionista/` (multi-agente) com os agentes preenchidos (ou marcados como pendentes/cancelados).

---

## `/ei-ajustes <cliente> <descrição>`

Aplica um ajuste em um agente de cliente **já existente** (não em `modelo/`).

**Uso:**
```
/ei-ajustes malu a ia esta falando sobre valores
/ei-ajustes joao adicionar regra de nao agendar aos domingos
/ei-ajustes "Brunno Brandi Consumidor" perguntas iniciais devem mencionar X     ← multi-agente (aspas)
/ei-ajustes empresa-abc         ← se omitir descrição, pergunta
```

**Fluxo:**
1. **Localiza a pasta** do cliente via Glob (match exato → case-insensitive → substring).
2. **Analyzer (`docs-analyzer`)** lê os `.md` do cliente e identifica arquivo+seção a partir da descrição.
3. **Gate humano (`AskUserQuestion`)** apresenta a recomendação. Sem "Aprovar e editar" / "Confirmar", nenhum editor roda.
4. **Fan-out paralelo** de N instâncias de `docs-editor-conciso` em UMA resposta (Passo 5).
5. **Fan-out paralelo** de M instâncias de `docs-reviewer` com `<contexto_cruzado>` (Passo 6) — disparado automaticamente via hook `Stop` (`post-ajustes-fanout.sh`).
6. Resumo final consolidado.

**Guard rails:**
- Nunca edita `modelo/*.md` (templates read-only no fluxo distribuído).
- Se a pasta do cliente não existir, sugere `/ei-cria-cliente <nome>`.

---

## `/ei-update`

Re-executa `npx @expertzinhointegrado/ei-prompt@latest` na pasta atual e mostra o CHANGELOG da versão mais nova. Use para atualizar os agentes em uma pasta de cliente sem precisar lembrar o comando completo.

---

## Hooks automáticos (rodam sem comando)

| Evento | Quando dispara | Ação |
|--------|----------------|------|
| `Stop` | Ao fim do fan-out de editores no `/ei-ajustes` Passo 5 | `post-ajustes-fanout.sh` detecta sentinela `<ei-ajustes-round id=...>` e injeta `reason` para o main Claude prosseguir ao Passo 6 |
| `SubagentStop` | Quando um subagente encerra | `post-scaffolder-review.sh` revisa scaffolding do `client-scaffold-fill` automaticamente; guarda silenciosa (D-11) para coexistência com o pipeline `/ei-ajustes` |

> ⚠️ **v1.8.9:** Hooks de injeção de contexto (`SessionStart`, `UserPromptSubmit`, `PreToolUse` em `modelo/*.md`) estão **desativados** em `.claude/settings.json` durante a manutenção. Scripts mantidos no disco para reativação futura: `inject-ei-context.sh`, `prompt-matches-agent.sh`.

---

## Fluxo recomendado (workflow padrão)

```
1. Instalar uma vez:
   npx @expertzinhointegrado/ei-prompt@latest

2. Criar cada cliente:
   /ei-cria-cliente nome-cliente

3. Ajustar um cliente quando descobrir algo:
   /ei-ajustes nome-cliente <descrição do problema/mudança>

4. Atualizar EiPrompt em uma pasta:
   /ei-update
```

---

## Agentes envolvidos

| Agente | Papel |
|--------|-------|
| `client-scaffold-structure` | Passo 1 — cria a pasta do cliente e copia os templates de `modelo/` verbatim, sem perguntar nada |
| `client-scaffold-collect` | Passo 2 — lê os templates copiados e coleta todo campo obrigatório (incl. mídia) via conversa; read-only |
| `client-scaffold-fill` | Passo 3 — preenche os templates com os dados coletados, preservando `{{variavel}}` e o marcador `[PENDENTE]`; não-interativo |
| `recepcionista-scaffolder` | (Multi-agente) Cria a pasta `Recepcionista/` (router) |
| `docs-analyzer` | (Opus, read-only) Identifica arquivo+seção a partir de descrição livre |
| `docs-editor-conciso` | Edita arquivos `.md` de agentes, preserva `<response_format>` |
| `docs-reviewer` | Audita alterações; cross-context M≥2 |

## Arquivos de configuração

| Arquivo | Função |
|---------|--------|
| `CLAUDE.md` | Regras do projeto (sempre carregado) |
| `.claude/settings.json` | Configura hooks |
| `.claude/hooks/*.sh` | Scripts de hooks |
| `.claude/commands/ei-*.md` | Definições dos slash commands |
| `.claude/agents/*.md` | Definições dos subagentes |
| `manifest.json` | Lista de arquivos que o CLI baixa do GitHub |
