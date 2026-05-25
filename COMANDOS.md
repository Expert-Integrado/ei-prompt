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
1. Dispara o agente `client-project-scaffolder`
2. **Fase 0:** carrega `CLAUDE.md` + lê todos os templates em `modelo/`
3. **Fase 1:** valida/pergunta nome do cliente
4. **Fase 2:** copia `modelo/*.md` para `<cliente>/`
5. **Fase 3:** identifica campos `{{variavel}}` nos templates
6. **Fase 4:** coleta dados do usuário (um a um ou em bloco)
7. **Fase 5:** personaliza os arquivos copiados; campos sem info ficam marcados `[PENDENTE]`

**Saída:** nova pasta `<cliente>/` na raiz com os 4 agentes personalizados.

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
| `SubagentStop` | Quando um subagente encerra | `post-scaffolder-review.sh` revisa scaffolding do `client-project-scaffolder` automaticamente; guarda silenciosa (D-11) para coexistência com o pipeline `/ei-ajustes` |

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
| `client-project-scaffolder` | Cria novos projetos de cliente (Fase 0 carrega contexto) |
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
