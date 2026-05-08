---
description: Cria um novo projeto de cliente (single-agent ou multi-agente). Em multi, cria primeiro as especialidades (loop) e depois o Recepcionista. Suporta bypass para criar só o Recepcionista quando as especialidades já existem.
argument-hint: [nome do cliente opcional]
---

Crie um novo projeto de cliente. **Você (Claude principal) é o orquestrador** — pergunta o modo, coleta os dados e dispara o(s) agente(s) na ordem certa.

**Nome do cliente fornecido:** $ARGUMENTS

## Fluxo

### Passo 1 — Carregar contexto
1. Execute via Bash: `"$CLAUDE_PROJECT_DIR"/.claude/hooks/inject-ei-context.sh` (carrega `CLAUDE.md` + lista `modelo/*`).
2. Leia `CLAUDE.md` integralmente — atenção à seção "Arquitetura Multi-Agente (opcional — Recepcionista)".

### Passo 2 — Nome do cliente
Se `$ARGUMENTS` estiver preenchido, use como nome da pasta raiz. Caso contrário, pergunte ao usuário.

### Passo 3 — Modo (single-agent ou multi-agente)
**Use OBRIGATORIAMENTE a tool `AskUserQuestion`** (não pergunte em texto solto). Estrutura:

```json
{
  "questions": [{
    "question": "Esse cliente atende múltiplas frentes/áreas com fluxos distintos (ex: Consumidor + Trabalhista + Previdenciário)?",
    "header": "Modo",
    "multiSelect": false,
    "options": [
      {"label": "Single-agent", "description": "Cliente atende apenas 1 frente. Estrutura `cliente/*.md` direto na raiz (Orquestrador, Qualifier, Scheduler, Protractor, Follow-Up)."},
      {"label": "Multi-agente", "description": "Cliente atende 2+ frentes com fluxos distintos. Estrutura aninhada com Recepcionista/ + subpasta por especialidade."}
    ]
  }]
}
```

- **Single-agent** → Passo 4A.
- **Multi-agente** → Passo 4B.

### Passo 4A — Single-agent
Dispare via Agent tool o `client-project-scaffolder` com:
- `modo: single-agent`
- `nome_cliente: <valor>`

O agente segue o fluxo padrão (Fase 0 → Fase 5). Encerre. Pular Passo 4B/5.

### Passo 4B — Multi-agente
**Use OBRIGATORIAMENTE a tool `AskUserQuestion`** para escolher fluxo completo ou bypass:

```json
{
  "questions": [{
    "question": "As especialidades já existem (criar só o Recepcionista) ou precisamos criar tudo do zero?",
    "header": "Fluxo multi",
    "multiSelect": false,
    "options": [
      {"label": "Criar tudo do zero", "description": "Cria todas as pastas das especialidades (loop) e depois a Recepcionista. Use quando o cliente é novo."},
      {"label": "Só Recepcionista (bypass)", "description": "Pula a criação das especialidades — você fornece nome/descrição/gatilhos delas para o Recepcionista saber rotear. Use quando as especialidades já existem ou são gerenciadas fora."}
    ]
  }]
}
```

- **Criar tudo do zero** → Passo 4B.1.
- **Só Recepcionista (bypass)** → Passo 4B.2.

#### Passo 4B.1 — Fluxo completo (criar especialidades + Recepcionista)

**(a) Coletar quantidade e nomes das especialidades**
1. Pergunte: **"Quantas especialidades?"** e **"Liste os nomes das especialidades, separados por vírgula"** (ex: `Consumidor, Previdenciário, Trabalhista`).
2. Pergunte também o **nome da empresa** (usado depois pelo Recepcionista).

> Não colete `descricao` nem `gatilhos` agora — o `recepcionista-scaffolder` vai pedir esses dados depois, quando os agentes especialistas já existirem.

**(b) LOOP — criar cada especialidade via `client-project-scaffolder`**
Para **cada nome** da lista coletada em (a), dispare o `client-project-scaffolder` via Agent tool **uma vez**. Ou seja: N especialidades = N invocações do agente, em sequência (não em paralelo).

Cada invocação recebe:
- `modo: multi-agente-especialidade-unica`
- `nome_cliente: <valor>`
- `especialidade: <nome da especialidade dessa iteração>`

Instrução do prompt: "Crie a subpasta `<nome_cliente>/<especialidade>/` com `Orquestrador.md`, `Qualifier.md`, `Scheduler.md`, `Protractor.md` (com `TRANSFERIR_PARA_AGENT` ativo) e `Follow-Up.md`. Pergunte ao usuário TODOS os dados específicos dessa especialidade do zero (frases características, regras de qualificação, conhecimento, mídias, etc.) — não assuma contexto de chamadas anteriores. **NÃO** criar pasta `Recepcionista/`. **NÃO** criar outras especialidades."

> Aguarde cada iteração terminar antes de iniciar a próxima — escolha sequencial preserva o foco do usuário em uma especialidade por vez.

**(c) Criar Recepcionista — `recepcionista-scaffolder` DEPOIS DO LOOP**
Quando TODAS as especialidades estiverem criadas, dispare o `recepcionista-scaffolder` via Agent tool com:
- `nome_cliente: <valor>`
- `empresa: <valor>`
- `especialidades:` lista de nomes (sem descrição/gatilhos — o agente vai pedir ao usuário).

Instrução: "As pastas das especialidades já existem em `<nome_cliente>/<cada_especialidade>/`. Criar `<nome_cliente>/Recepcionista/` seguindo seu FLUXO OBRIGATÓRIO. **Pergunte ao usuário a `descricao` (do que cuida) e os `gatilhos` (palavras-chave) de cada especialidade** para preencher `<agentes_disponiveis>`. Pergunte também os dados institucionais (frases, regras críticas, pode/não pode informar)."

#### Passo 4B.2 — Bypass (criar só Recepcionista; especialidades já existem)

1. Pergunte: **"Liste os agentes especialistas existentes que o Recepcionista deve rotear"**. Para cada um, colete:
   - `nome` (deve bater com o identificador real do agente — confirmar com o usuário)
   - `descricao` — do que cuida
   - `gatilhos` — palavras-chave/temas
2. Pergunte o **nome da empresa**.
3. Dispare via Agent tool o `recepcionista-scaffolder` com `nome_cliente`, `empresa`, `especialidades` (lista coletada).

> O `client-project-scaffolder` **não é disparado** neste caminho.

### Passo 5 — Resumo final
Apresente ao usuário:
- Estrutura criada (árvore de pastas).
- Campos pendentes consolidados.
- Próximos passos (revisar pendências, testar prompt etc).

> A auditoria automática (`docs-reviewer`) é disparada via hook `SubagentStop` ao fim de cada agente.

## Regras

- **NUNCA** pular o Passo 1 (contexto).
- **NUNCA** disparar `recepcionista-scaffolder` em modo single-agent.
- **NUNCA** disparar `client-project-scaffolder` e `recepcionista-scaffolder` em paralelo no fluxo completo (4B.1) — a ordem é **especialidades → Recepcionista**, pois o Recepcionista precisa que a pasta raiz exista.
- No bypass (4B.2), o `client-project-scaffolder` **não roda**.
- Se o usuário não fornecer dados obrigatórios, peça antes de disparar os agentes.
