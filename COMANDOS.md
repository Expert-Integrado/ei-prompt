# Comandos `/ei-*` do EiPrompt

> **Nota:** este arquivo é documentação interna do repositório. **Não é publicado no npm nem distribuído via `ei-prompt install`.**

Todos os comandos rodam dentro do Claude Code. Os comandos públicos vêm instalados via `npx @expertzinhointegrado/ei-prompt@latest`; os comandos internos (mantenedor) ficam disponíveis quando o Claude Code é aberto dentro do clone do repo source.

## Comandos públicos (distribuídos via `npx ei-prompt`)

- [`/ei-cria-cliente`](#ei-cria-cliente-nome) — cria novo projeto de cliente
- [`/ei-ajustes`](#ei-ajustes-cliente-descrição) — aplica ajuste em agente de cliente existente
- [`/ei-update`](#ei-update) — re-executa o CLI e mostra o CHANGELOG da versão mais nova

## Comandos internos (mantenedor)

> Estes comandos **não são distribuídos via `npx ei-prompt`**. Permanecem no repositório (`.claude/commands/ei-edit.md`, `ei-review.md`, `ei-ctx.md`) e são invocados **operando dentro do clone do repo source** (`~/EiPrompt/` ou onde o mantenedor tenha clonado). Quando o mantenedor abre o Claude Code no clone, os comandos aparecem na paleta normalmente.

- [`/ei-edit`](#ei-edit-agente-instrução) — edita template em `modelo/*.md`
- [`/ei-review`](#ei-review-agente) — audita agente (read-only)
- [`/ei-ctx`](#ei-ctx--desativado-em-v189) — DESATIVADO em v1.8.9 (manutenção)

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
/ei-ajustes empresa-abc         ← se omitir descrição, pergunta
```

**Fluxo:**
1. Parseia input: primeira palavra = cliente, resto = descrição
2. **Localiza a pasta** do cliente via Glob (match exato → case-insensitive → substring)
   - Se não achar, lista pastas disponíveis e pergunta
3. **Infere qual agente** ajustar pela descrição:
   - "valores/dívida/qualificar" → `Qualifier.md`
   - "agendar/horário/reunião" → `Scheduler.md`
   - "encerrar/finalizar/transferir" → `Protractor.md`
   - "cumprimento/fluxo geral" → `Orquestrador.md`
   - Se ambíguo, pergunta ao usuário
4. **Delega ao `docs-editor-conciso`** apontando para `<cliente>/<Agente>.md`
5. `docs-editor-conciso` aciona `docs-reviewer` automaticamente (fluxo anti-loop)
6. Repassa o veredicto (APROVADO/REPROVADO)

**Guard rails:**
- Nunca edita `modelo/*.md` (essa pasta é read-only)
- Se pasta do cliente não existir, sugere `/ei-cria-cliente <nome>`

---

## `/ei-edit <agente> <instrução>`

> ⚠️ **Comando interno (mantenedor).** Não distribuído via `npx ei-prompt`; só disponível no clone do repo source. Edita arquivos em `modelo/` (CLAUDE.md marca como read-only no fluxo de cliente). Use apenas quando quiser mudar o template base — para ajustes em cliente, use `/ei-ajustes`.

**Uso:**
```
/ei-edit Qualifier consolidar regras duplicadas sobre MEI
/ei-edit Orquestrador adicionar fluxo de saudação noturna
```

**Fluxo:**
1. Lê `CLAUDE.md` + `modelo/<agente>.md`
2. Delega ao `docs-editor-conciso` com instrução do usuário
3. `docs-editor-conciso` aplica edição e invoca `docs-reviewer` automaticamente
4. Se REPROVADO, `docs-reviewer` invoca editor com tag `[CICLO_CORRECAO=1]` (1 ciclo apenas, anti-loop)
5. Veredicto final repassado ao usuário

---

## `/ei-review <agente>`

> ⚠️ **Comando interno (mantenedor).** Não distribuído via `npx ei-prompt`; só disponível no clone do repo source.

Auditoria **somente-leitura** de um template em `modelo/`. Não edita nada.

**Uso:**
```
/ei-review Qualifier
/ei-review Orquestrador
```

**Fluxo:**
1. Lê `CLAUDE.md` + `modelo/<agente>.md`
2. Delega ao `docs-reviewer`
3. Retorna APROVADO ou REPROVADO com lista de problemas
4. Se REPROVADO, sugere `/ei-edit <agente> <correção>` (mas não aplica)

---

## ~~`/ei-ctx`~~ — DESATIVADO em v1.8.9

> ⚠️ **Comando interno (mantenedor).** Não distribuído via `npx ei-prompt`; só disponível no clone do repo source.
>
> Sistema de injeção automática de contexto está em **manutenção** desde v1.8.9. O slash command `/ei-ctx` e os hooks que chamavam `inject-ei-context.sh` foram temporariamente desligados.

**Substituição manual:** carregue via `Read` os arquivos:
- `CLAUDE.md`
- `docs/regras-edicao.md`
- `docs/regras-validacao.md`
- `docs/proibido-fazer.md`
- Liste `modelo/*.md` via Glob para ver os templates.

---

## Hooks automáticos (rodam sem comando)

> ⚠️ **v1.8.9:** Os hooks de injeção de contexto (`SessionStart`, `UserPromptSubmit`, `PreToolUse` em `modelo/*.md`) estão **desativados** em `.claude/settings.json` durante a manutenção. Apenas `SubagentStop` (auditoria pós-scaffolder) continua ativo.

Após a manutenção, voltarão a operar:

| Evento | Quando dispara | Ação |
|--------|----------------|------|
| `SessionStart` | Abrir/resumir/compactar sessão | Injeta `CLAUDE.md` + lista `modelo/` |
| `UserPromptSubmit` | Cada prompt enviado | Injeta contexto SE prompt mencionar agentes/modelo/CLAUDE.md |
| `PreToolUse` (Edit/Write em `modelo/*.md`) | Antes de editar template | Injeta contexto |

Scripts dos hooks (mantidos no disco, mas não invocados):
- `inject-ei-context.sh` — lê e imprime contexto
- `prompt-matches-agent.sh` — filtra prompts relevantes

---

## Fluxo recomendado (workflow padrão)

```
1. Instalar uma vez:
   npx @expertzinhointegrado/ei-prompt@latest

2. Criar cada cliente:
   /ei-cria-cliente nome-cliente

3. Ajustar um cliente quando descobrir algo:
   /ei-ajustes nome-cliente <descrição do problema/mudança>

4. (Raro) Mudar template base para TODOS os futuros clientes:
   /ei-edit <agente> <mudança estrutural>
```

---

## Agentes envolvidos

| Agente | Papel |
|--------|-------|
| `client-project-scaffolder` | Cria novos projetos de cliente (Fase 0 carrega contexto) |
| `docs-editor-conciso` | Edita arquivos `.md` de agentes, preserva `<response_format>` |
| `docs-reviewer` | Audita alterações; pode chamar editor em 1 ciclo de correção |

## Arquivos de configuração

| Arquivo | Função |
|---------|--------|
| `CLAUDE.md` | Regras do projeto (sempre carregado) |
| `.claude/settings.json` | Configura hooks |
| `.claude/hooks/*.sh` | Scripts de injeção de contexto |
| `.claude/commands/ei-*.md` | Definições dos slash commands |
| `.claude/agents/*.md` | Definições dos subagentes |
| `manifest.json` | Lista de arquivos que o CLI baixa do GitHub |
