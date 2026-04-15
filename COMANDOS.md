# Comandos `/ei-*` do EiPrompt

> **Nota:** este arquivo é documentação interna do repositório. **Não é publicado no npm nem distribuído via `ei-prompt install`.**

Todos os comandos rodam dentro do Claude Code (após instalar o pacote via `npx @expertzinhointegrado/ei-prompt@latest`).

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

> ⚠️ **Aviso:** edita arquivos em `modelo/`. O CLAUDE.md marca `modelo/` como read-only, então prefira `/ei-ajustes` para mudanças de cliente. Use `/ei-edit` apenas quando quiser mudar o template base (raro).

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

## `/ei-ctx`

Recarrega manualmente o contexto EiPrompt: re-injeta `CLAUDE.md` + lista de agentes em `modelo/`.

**Uso:**
```
/ei-ctx
```

**Quando usar:**
- Depois de compactação da janela de contexto
- Quando suspeitar que o Claude "esqueceu" as regras
- Início de sessão (redundante, pois o hook `SessionStart` já faz isso automaticamente)

---

## Hooks automáticos (rodam sem comando)

Além dos slash commands, existem hooks configurados em `.claude/settings.json` que injetam contexto automaticamente:

| Evento | Quando dispara | Ação |
|--------|----------------|------|
| `SessionStart` | Abrir/resumir/compactar sessão | Injeta `CLAUDE.md` + lista `modelo/` |
| `UserPromptSubmit` | Cada prompt enviado | Injeta contexto SE prompt mencionar agentes/modelo/CLAUDE.md |
| `PreToolUse` (Edit/Write em `modelo/*.md`) | Antes de editar template | Injeta contexto |

Scripts dos hooks ficam em `.claude/hooks/`:
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
