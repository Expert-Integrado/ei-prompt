---
description: Cria um novo projeto de cliente (single-agent ou multi-agente). Em multi, cria primeiro as especialidades (loop) e depois o Recepcionista. Suporta bypass para criar só o Recepcionista quando as especialidades já existem.
argument-hint: [nome do cliente opcional]
---

Crie um novo projeto de cliente. **Você (Claude principal) é o orquestrador** — pergunta o modo, coleta os dados e dispara o(s) agente(s) na ordem certa.

**Nome do cliente fornecido:** $ARGUMENTS

## Fluxo

### Passo 1 — Carregar contexto

> Injeção automática desativada em v1.8.9 (manutenção). Carregue manualmente.

1. Leia `CLAUDE.md` integralmente — atenção à seção "Arquitetura Multi-Agente (opcional — Recepcionista)".
2. Leia `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`.
3. Liste `modelo/*.md` para saber quais templates estão disponíveis.

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

### Gate de Confirmação (Passo 2→3)

Subseção reutilizável — referenciada (não duplicada) tanto pelo Passo 4A (single-agent, abaixo) quanto pelo Passo 4B.1(b) (multi-agente, loop por especialidade). Espelha **exatamente** o padrão de `.claude/commands/ei-ajustes.md` Passo 3.5 caminho [A] (D-06/D-07).

**Entrada:** o bloco `<dados_coletados>` que `client-scaffold-collect` acabou de devolver para o cliente atual (ou para a especialidade atual, em modo multi).

**Use OBRIGATORIAMENTE a tool `AskUserQuestion`** (não pergunte em texto solto, não imprima markdown de resumo antes). Construa o campo `question` como uma lista numerada — uma linha por `<campo>`/`<midia>` do bloco recebido, mostrando o valor coletado ou o marcador de pendência — terminando com a pergunta se deve prosseguir para o preenchimento:

```json
{
  "questions": [{
    "question": "Campos coletados para <cliente>[/<especialidade>]:\n\n1. Nome do Cliente: Maria Silva\n2. CNPJ: [PENDENTE - informação não fornecida]\n3. Telefone: (11) 99999-0000\n...\n\nPreencher os templates com esses dados agora?",
    "header": "Confirmação",
    "multiSelect": false,
    "options": [
      {"label": "Aprovar e preencher", "description": "Despacha o preenchimento dos templates com os dados acima."},
      {"label": "Cancelar", "description": "Encerra sem preencher. A estrutura de pastas criada permanece em disco."}
    ]
  }]
}
```

- NÃO listar `"Outro"` nas `options` — a UI da `AskUserQuestion` adiciona automaticamente.
- Exatamente duas opções, com os labels literais acima (D-06): `"Aprovar e preencher"` / `"Cancelar"`.

> **Runtime / no-TTY:** A tool `AskUserQuestion` é built-in do Claude Code >= v2.0.21. Em ambiente headless/no-TTY (SDK Python, CI, Docker sem TTY) ela auto-resolve com `answers={}` em ~37ms — a REGRA INVIOLÁVEL abaixo trata resposta vazia / não-"Aprovar e preencher" como Cancelar (fail-closed automático). Se você executar via SDK ou `--text` mode sem TTY interativo, este gate SEMPRE encerra o ciclo sem preencher — comportamento correto, não bug.

**Interpretação da resposta (fail-closed, D-07):**
- Resposta = `"Aprovar e preencher"` → prossiga para o despacho de `client-scaffold-fill`, embutindo o bloco `<dados_coletados>` COMPLETO e literal (nunca resumido ou encurtado — Pitfall 2 do RESEARCH.md) no prompt de invocação.
- Resposta = `"Cancelar"`, resposta vazia, `answers={}`, `"Outro"`, ou qualquer coisa diferente do label exato de aprovação → tratar como Cancelar. `client-scaffold-fill` NUNCA é despachado nesse caso.

**Comportamento de Cancelamento (não-destrutivo):** ao cancelar, NÃO apague nem modifique a estrutura já criada por `client-scaffold-structure` — ela permanece em disco exatamente como está, com `{{variavel}}` e marcadores de pendência ainda não preenchidos (recomendação de RESEARCH.md Open Question 1 / Pitfall 5: non-destructive default). Informe a quem chamou este gate (Passo 4A ou Passo 4B.1(b)) que este ciclo terminou sem preencher — a decisão do que fazer a seguir (encerrar, seguir para a próxima especialidade, etc.) cabe a quem chamou, não a este gate.

#### ⚠️ REGRA INVIOLÁVEL DO GATE DE CONFIRMAÇÃO

NUNCA invoque `client-scaffold-fill` sem que este gate tenha produzido a resposta EXATA do label de aprovação (`"Aprovar e preencher"`) primeiro.
- Sem caminho alternativo. Sem heurística. Sem rota de exceção em erro.
- Mesmo se `client-scaffold-collect` tiver retornado com algum campo pendente, isso NÃO dispensa o gate — pendências aparecem listadas na `question` para o humano decidir com informação completa, mas a decisão de prosseguir é sempre humana.

### Passo 4A — Single-agent

Fluxo em 4 etapas sequenciais, encadeando os 3 subagents do Plan 02-01 com o Gate de Confirmação no meio:

1. **Dispare `client-scaffold-structure`** via Agent tool com:
   - `modo: single-agent`
   - `nome_cliente: <valor>`

   Aguarde o retorno com o caminho da pasta criada.

2. **Dispare `client-scaffold-collect`** via Agent tool com:
   - `cliente_path: <caminho retornado no passo anterior>`
   - `modo: single`

   Aguarde o retorno com o bloco `<dados_coletados>`.

3. **Invoque a subseção "Gate de Confirmação (Passo 2→3)"** acima, usando o `<dados_coletados>` recebido.

4. **Conforme o resultado do gate:**
   - Aprovação → **ANTES** de disparar `client-scaffold-fill`, emita em UMA linha de texto livre o sentinela `<scaffolder-fill-round id="fill-<UNIX_TIMESTAMP>-<3_ALFANUM>"/>` (gere um `<UNIX_TIMESTAMP>` e `<3_ALFANUM>` novos agora — mesma convenção de id de `.claude/commands/ei-ajustes.md` Passo 5, ver hook `post-scaffolder-review.sh`). Só então dispare `client-scaffold-fill` via Agent tool com `cliente_path: <mesmo caminho>` e o bloco `<dados_coletados>` COMPLETO embutido literalmente no prompt de invocação.
   - Cancelar → encerre este fluxo sem despachar `client-scaffold-fill` (e sem emitir o sentinela acima), seguindo o comportamento não-destrutivo documentado no Gate de Confirmação.

Em ambos os casos (aprovação ou cancelamento), prossiga para o **Passo 5** (resumo final) — NUNCA pule o Passo 5, mesmo em Cancelamento, já que o resumo deve reportar a estrutura criada mesmo que ainda não preenchida.

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

**(b) LOOP — para cada especialidade, encadear os 3 subagents + Gate de Confirmação**
Para **cada nome** da lista coletada em (a), execute o mesmo ciclo de 4 etapas sequenciais do Passo 4A — estrutura → coleta → gate → preenchimento — antes de passar para a próxima especialidade. Ou seja: N especialidades = N ciclos completos, em sequência (não em paralelo), nunca reaproveitando contexto/respostas entre iterações.

Para a especialidade da iteração atual:

1. **Dispare `client-scaffold-structure`** via Agent tool com:
   - `modo: multi-agente-especialidade-unica`
   - `nome_cliente: <valor>`
   - `especialidade: <nome da especialidade dessa iteração>`

   Instrução do prompt: "Crie a subpasta `<nome_cliente>/<especialidade>/` com `Orquestrador.md`, `Qualifier.md`, `Scheduler.md`, `Protractor.md` (com `TRANSFERIR_PARA_AGENT` ativo) e `Follow-Up.md`. **NÃO** criar pasta `Recepcionista/`. **NÃO** criar outras especialidades."

   Aguarde o retorno com o caminho da subpasta criada.

2. **Dispare `client-scaffold-collect`** via Agent tool com:
   - `cliente_path: <caminho retornado no passo anterior>`
   - `modo: multi`
   - `especialidade: <nome da especialidade dessa iteração>`

   Instrução do prompt: "Pergunte ao usuário TODOS os dados específicos desta especialidade do zero (frases características, regras de qualificação, conhecimento, mídias, etc.) — não assuma contexto de iterações anteriores do loop, mesmo que outra especialidade já tenha respondido perguntas parecidas."

   Aguarde o retorno com o bloco `<dados_coletados>` **desta especialidade**.

3. **Invoque a subseção "Gate de Confirmação (Passo 2→3)"** acima, usando o `<dados_coletados>` desta especialidade (o texto da `question` deve identificar a especialidade atual, ex: `Campos coletados para <cliente>/<especialidade>:`).

4. **Conforme o resultado do gate:**
   - Aprovação → **ANTES** de disparar `client-scaffold-fill`, emita em UMA linha de texto livre o sentinela `<scaffolder-fill-round id="fill-<UNIX_TIMESTAMP>-<3_ALFANUM>"/>` com um `id` NOVO para ESTA especialidade (nunca reuse o id de uma especialidade anterior do loop — mesma convenção de `.claude/commands/ei-ajustes.md` Passo 5, ver hook `post-scaffolder-review.sh`; isso garante que o hook audite cada especialidade individualmente em vez de suprimir a auditoria das especialidades seguintes). Só então dispare `client-scaffold-fill` via Agent tool com `cliente_path: <mesmo caminho da subpasta>` e o bloco `<dados_coletados>` COMPLETO embutido literalmente. Registre o status desta especialidade como **preenchida**.
   - Cancelar → **NÃO** despache `client-scaffold-fill` para esta especialidade (e não emita o sentinela acima), seguindo o comportamento não-destrutivo do Gate de Confirmação (a subpasta criada no passo 1 permanece em disco, sem preenchimento). Registre o status desta especialidade como **cancelada-e-não-preenchida**.

   Em ambos os casos, **CONTINUE o loop para a próxima especialidade da lista** — o cancelamento de uma especialidade nunca aborta o restante do fluxo `/ei-cria-cliente`. Isso é um default deliberado e documentado (não um silêncio ambíguo): cada ciclo por especialidade é independente (D-03), e o status final de cada uma (preenchida ou cancelada-e-não-preenchida) é reportado no Passo 5 consolidado, nunca perdido silenciosamente.

> Aguarde cada ciclo completo (estrutura → coleta → gate → preenchimento/cancelamento) terminar antes de iniciar o próximo — escolha sequencial preserva o foco do usuário em uma especialidade por vez e garante que cada uma seja perguntada do zero.

**(c) Criar Recepcionista — `recepcionista-scaffolder` DEPOIS DO LOOP**
Quando TODAS as especialidades estiverem criadas, dispare o `recepcionista-scaffolder` via Agent tool com:
- `nome_cliente: <valor>`
- `empresa: <valor>`
- `especialidades:` lista de nomes (sem descrição/gatilhos — o agente vai pedir ao usuário).

Instrução: "As pastas das especialidades já existem em `<nome_cliente>/<cada_especialidade>/`. Criar `<nome_cliente>/Recepcionista/` seguindo seu FLUXO OBRIGATÓRIO. **Pergunte ao usuário a `descricao` (do que cuida) e os `gatilhos` (palavras-chave) de cada especialidade** para preencher `<agentes_disponiveis>`. Pergunte também os dados institucionais (frases, regras críticas, pode/não pode informar) e o **fluxo de conversa** (via `AskUserQuestion`: se quer perguntas específicas antes de identificar o agente ou pergunta aberta padrão; se sim, quais perguntas) — Fase 1 (c) do scaffolder."

#### Passo 4B.2 — Bypass (criar só Recepcionista; especialidades já existem)

1. Pergunte: **"Liste os agentes especialistas existentes que o Recepcionista deve rotear"**. Para cada um, colete:
   - `nome` (deve bater com o identificador real do agente — confirmar com o usuário)
   - `descricao` — do que cuida
   - `gatilhos` — palavras-chave/temas
2. Pergunte o **nome da empresa**.
3. Dispare via Agent tool o `recepcionista-scaffolder` com `nome_cliente`, `empresa`, `especialidades` (lista coletada).

> O loop de especialidades (`client-scaffold-structure`/`client-scaffold-collect`/`client-scaffold-fill`) **não é disparado** neste caminho.

### Passo 5 — Resumo final
Apresente ao usuário, em **um único resumo consolidado ao final de todo o fluxo** (D-04 — nunca um resumo por especialidade):
- Estrutura criada (árvore de pastas).
- Em modo multi-agente (4B.1), o status de cada ciclo por especialidade — **preenchida** ou **cancelada-e-não-preenchida** (ver Passo 4B.1(b)) — lado a lado com os campos pendentes.
- Campos pendentes consolidados (de todos os agentes/especialidades preenchidos).
- Próximos passos (revisar pendências, preencher manualmente as especialidades canceladas se desejado, testar prompt etc).

> A auditoria automática (`docs-reviewer`) é disparada via hook `SubagentStop` ao fim de cada agente.

## Regras

- **NUNCA** pular o Passo 1 (contexto).
- **NUNCA** disparar `recepcionista-scaffolder` em modo single-agent.
- **NUNCA** disparar o loop de especialidades (4B.1(b)) e o `recepcionista-scaffolder` em paralelo no fluxo completo (4B.1) — a ordem é **especialidades → Recepcionista**, pois o Recepcionista precisa que a pasta raiz exista.
- No bypass (4B.2), o loop de especialidades (`client-scaffold-structure`/`client-scaffold-collect`/`client-scaffold-fill`) **não roda**.
- Se o usuário não fornecer dados obrigatórios, peça antes de disparar os agentes.
- **REGRA DO LOOP (4B.1(b)):** entre uma iteração e a próxima (ex: "Consumidor preenchida. Iniciando especialidade 2/2: Trabalhista"), cada iteração executa o ciclo completo `client-scaffold-structure` → `client-scaffold-collect` → Gate de Confirmação → `client-scaffold-fill` (ou cancelamento) descrito no Passo 4B.1(b), sempre sequencial (nunca em paralelo) e sempre perguntando **TODOS os dados específicos da nova especialidade do zero** (frases, regras de qualificação, conhecimento, mídias) — NUNCA disparar a próxima iteração esperando que o agente reaproveite respostas de uma especialidade anterior. Um cancelamento no Gate de uma especialidade **não interrompe o loop**: a especialidade fica registrada como cancelada-e-não-preenchida e a próxima da lista é iniciada normalmente. Só avance para a próxima especialidade quando o ciclo da atual (preenchimento ou cancelamento) estiver concluído.
