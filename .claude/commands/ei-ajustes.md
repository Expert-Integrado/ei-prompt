---
description: Aplica ajuste em um agente de cliente já existente (procura a pasta pelo nome e delega ao docs-editor-conciso)
argument-hint: <cliente> <descrição> | "<cliente> <especialidade>" <descrição>
---

> ⚠️ **v2 (Phase 1):** Passo 3 agora invoca o subagente `docs-analyzer` (modelo opus, read-only) em vez de heurística por keywords. O analyzer lê todos os `.md` do cliente e devolve XML estruturado (`<decisao>edit|clarify</decisao>`). Gate de aprovação formal via `AskUserQuestion` entra em Phase 2.

Você vai aplicar um ajuste em um projeto de cliente já existente.

**Input bruto:** $ARGUMENTS

## Fluxo

### Passo 1: Parsear o input
Suporta dois formatos:

**A) Cliente single-agent** (legado): `/ei-ajustes <cliente> <descrição>`
- **Primeira palavra** = cliente (ex: `malu`)
- **Restante** = descrição

**B) Cliente multi-agente** (com Recepcionista + especialidades): `/ei-ajustes "<cliente> <especialidade>" <descrição>`
- **Tudo entre as primeiras aspas** = identificador composto (ex: `"Brunno Brandi Consumidor"`)
- **Restante depois das aspas** = descrição

Detecção:
- Se o input começa com `"` → modo B (extrair string entre aspas)
- Caso contrário → modo A (primeira palavra)

Se o input estiver vazio ou incompleto, pergunte:
- Qual cliente (e especialidade, se multi-agente)?
- Qual ajuste precisa ser feito?

### Passo 2: Localizar a pasta-alvo

**Modo A (single):**
1. Use Glob para listar diretórios na raiz do projeto (ignorando `modelo/`, `.claude/`, `bin/`, `node_modules/`, `.git/`).
2. Procure uma pasta cujo nome faça match com o cliente (match exato → case-insensitive → substring).
3. Se a pasta encontrada **contém subpastas** (ex: `Recepcionista/`, `Consumidor/`, etc — sinal de cliente multi-agente), informe ao usuário:
   > "Esse cliente é multi-agente. Use o formato `/ei-ajustes \"<cliente> <especialidade>\" <descrição>`. Subpastas disponíveis: [...]"
4. Se nenhuma pasta for encontrada, liste as pastas disponíveis e pergunte qual é.
5. Se múltiplas combinarem, pergunte qual.

**Modo B (multi):**
1. Resolva o identificador composto `"X Y Z W"` para um path `<cliente>/<especialidade>`:
   - Primeiro tente como pasta direta (raro mas possível: `X Y Z W/`).
   - Caso contrário, divida progressivamente em prefix+suffix:
     - `X` + `Y Z W`, `X Y` + `Z W`, `X Y Z` + `W`
     - Para cada divisão, verifique se `<prefix>/<suffix>/` existe como diretório.
   - Se exatamente uma divisão resolver → use ela.
   - Se múltiplas resolverem → pergunte qual.
   - Se nenhuma → liste todas as combinações `cliente/especialidade` disponíveis e pergunte.
2. O path resolvido (ex: `Brunno Brandi/Consumidor/`) é a pasta-alvo.

### Passo 3: Invocar `docs-analyzer` para identificar arquivo + seção

A heurística antiga por keywords foi substituída pelo subagente `docs-analyzer` (modelo opus, read-only). Ele lê TODOS os `.md` da pasta-alvo e devolve decisão estruturada em XML.

1. **Determinar `<modo>`:** `single` (Modo A do Passo 1) ou `multi` (Modo B do Passo 1).
2. **Construir o prompt do analyzer** EXATAMENTE neste formato (substituir placeholders, manter estrutura):

```
TAREFA: Análise (NÃO edição). Você é o docs-analyzer.

<descricao_ajuste>
<DESCRIÇÃO_DO_USUÁRIO_DO_PASSO_1>
</descricao_ajuste>

<cliente_path>
<PATH_ABSOLUTO_RESOLVIDO_NO_PASSO_2>
</cliente_path>

<modo>
<single OU multi>
</modo>

Aplique seu fluxo de análise e devolva APENAS o XML conforme seu <formato_resposta>. Sem texto livre fora do XML.
```

3. **Invocar via Agent tool** com `subagent_type: docs-analyzer` e o prompt acima preenchido.
4. **Parsear a resposta XML** do analyzer:
   - Extrair `<decisao>` (`edit` ou `clarify`).
   - Extrair `<confianca>` (`alta`, `media`, `baixa`).
   - Se `<decisao>edit</decisao>`: extrair **TODOS** os elementos `<arquivo>` em ordem (não apenas o primeiro). Para cada um, capturar `<path>`, `<secao_tag>`, `<secao_descricao>`, `<justificativa>`. Esta lista completa vai inteira para o Passo 3.5 e é apresentada ao usuário em UMA única tela (APPR-03 — D-04 tudo-ou-nada).
   - Se `<decisao>clarify</decisao>`: extrair TODAS as `<opcao>` dentro de `<opcoes_correcao>` (id, titulo, arquivo, secao_tag). Ignore a opção `id="outro"` ao construir as options do AskUserQuestion — a UI adiciona "Outro" automaticamente (D-05).
   - Se a resposta NÃO for XML parseável, estiver vazia, ou não contiver `<decisao>` → **PARAR aqui** e seguir para o caminho ERRO do Passo 3.5 (falha-fechado D-13).

5. **Roteamento para o Passo 3.5 (gate de aprovação):**
   - `<decisao>edit</decisao>` + `<confianca>alta</confianca>` → Passo 3.5 caminho **[A]** (edit aprovação).
   - `<decisao>edit</decisao>` + `<confianca>` ≠ `alta` → Passo 3.5 caminho **[C]** (re-rodada; D-09 — trata como bug de contrato do analyzer; mostra mensagem "Confiança insuficiente para edição direta — reformule a descrição" antes de re-invocar).
   - `<decisao>clarify</decisao>` → Passo 3.5 caminho **[B]** (clarify com opções).
   - Erro / XML inválido / resposta vazia / `<arquivos>` vazia em decisao=edit → Passo 3.5 caminho **ERRO** (falha-fechado D-13).

NÃO prosseguir direto para Passo 4. NÃO imprimir markdown da recomendação. Toda apresentação ao usuário acontece DENTRO do AskUserQuestion no Passo 3.5 (D-01).

### Passo 3.5: Aprovação humana via AskUserQuestion (gate-duro)

Bifurcação obrigatória entre o Passo 3 (analyzer) e o Passo 4 (carregar contexto). Sem aprovação explícita aqui, NENHUM `docs-editor-conciso` é spawnado (APPR-04).

A escolha do caminho vem do roteamento do Passo 3 item 5:

- Caminho **[A]** — `decisao=edit` + `confianca=alta` (este bloco abaixo)
- Caminho **[B]** — `decisao=clarify` (ver bloco mais adiante neste Passo 3.5)
- Caminho **[B.2]** — gate duplo após escolha de opção 1-3 do clarify
- Caminho **[C]** — re-rodada do analyzer com cap de 2 reformulações
- Caminho **ERRO** — falha-fechado em erro do analyzer

> **Runtime / no-TTY:** A tool `AskUserQuestion` é built-in do Claude Code >= v2.0.21. Em ambiente headless/no-TTY (SDK Python, CI, Docker sem TTY) ela auto-resolve com `answers={}` em ~37ms — a REGRA INVIOLÁVEL desta seção trata resposta vazia / não-"Aprovar" como Cancelar (fail-closed automático). Se você executar via SDK ou `--text` mode sem TTY interativo, o `/ei-ajustes` SEMPRE encerra com mensagem de cancelamento — comportamento correto, não bug. Em VSCode `vscode_askquestions` a UI renderiza normalmente; nenhuma adaptação necessária.

#### Caminho **[A]** — edit + confianca=alta

**Use OBRIGATORIAMENTE a tool `AskUserQuestion`** (não pergunte em texto solto, não imprima markdown antes — D-01).

Construa o campo `question` como uma lista numerada com UM bullet por `<arquivo>` extraído no Passo 3 (D-02 — formato: ``N. `<path>` → `<secao_tag>` — <justificativa>``). Use UMA única chamada à tool, com UMA única question — mesmo se N>=2 arquivos (D-04 tudo-ou-nada, APPR-03).

Estrutura literal (substitua os placeholders `<path_N>`, `<secao_tag_N>`, `<justificativa_N>` pelos valores reais; gere quantas linhas numeradas quantos forem os arquivos):

```json
{
  "questions": [{
    "question": "O `docs-analyzer` recomenda editar:\n\n1. `<path_1>` → `<secao_tag_1>` — <justificativa_1>\n2. `<path_2>` → `<secao_tag_2>` — <justificativa_2>\n\nAplicar essas alterações?",
    "header": "Aprovação",
    "multiSelect": false,
    "options": [
      {"label": "Aprovar e editar", "description": "Despacha o docs-editor-conciso para todos os arquivos listados acima."},
      {"label": "Cancelar", "description": "Encerra sem editar. Você pode re-rodar /ei-ajustes com descrição refinada."}
    ]
  }]
}
```

Notas críticas:
- NÃO listar `"Outro"` nas `options` — a UI da `AskUserQuestion` adiciona automaticamente.
- Se a `<justificativa>` original do analyzer for muito longa para uma linha confortável, ENXUGUE para <=120 caracteres preservando o sentido (D-15). NÃO faça wrap dentro do bullet.
- `header` deve ter <=12 caracteres; cada `label` deve ter 1-5 palavras; `options` deve ter 2-4 itens (schema da tool).

**Interpretação da resposta do [A]:**
- Resposta = `"Aprovar e editar"` → segue para Passo 4 com a lista COMPLETA de arquivos parseados no Passo 3.
- Resposta = `"Cancelar"` → encerra com a mensagem de cancelamento (ver subseção "Mensagem de cancelamento" mais adiante neste Passo 3.5).
- Resposta = `"Outro"` (texto livre via UI) → **NO CAMINHO [A], tratar como Cancelar** (encerra com mensagem de cancelamento). Reformulação só é suportada no caminho [B] (clarify). Para reformular após edit+alta, o usuário re-roda `/ei-ajustes` manualmente.
- Resposta vazia / answers={} / qualquer coisa diferente das acima → **tratar como Cancelar** (REGRA INVIOLÁVEL — fail-closed).

#### Caminho **[B]** — clarify (analyzer retornou opções de correção)

Quando `<decisao>clarify</decisao>` (confiança media ou baixa), o analyzer já devolveu 3 `<opcao>` concretas em `<opcoes_correcao>`. Mapeie cada uma para uma `option` do AskUserQuestion (D-05):

- `label` = `<titulo>` da opção (ENXUGUE para <=5 palavras se necessário, preservando o verbo de ação — ex: "Remover menção a valores")
- `description` = `<arquivo> → <secao_tag>` (formato literal: ``Orquestrador.md` → `<perguntas_iniciais>``)

Adicione UMA opção fixa `"Cancelar"` no final. NÃO liste `"Outro"` — a UI adiciona automaticamente.

```json
{
  "questions": [{
    "question": "O `docs-analyzer` não tem certeza do ajuste. Escolha a ação:",
    "header": "Esclarecer",
    "multiSelect": false,
    "options": [
      {"label": "<titulo opção 1>", "description": "`<arquivo1>` → `<secao_tag1>`"},
      {"label": "<titulo opção 2>", "description": "`<arquivo2>` → `<secao_tag2>`"},
      {"label": "<titulo opção 3>", "description": "`<arquivo3>` → `<secao_tag3>`"},
      {"label": "Cancelar", "description": "Encerra sem editar."}
    ]
  }]
}
```

**Interpretação da resposta do [B]:**
- Resposta = label de uma das opções 1-3 → segue para caminho **[B.2]** (gate duplo) usando `<arquivo>` + `<secao_tag>` + `<titulo>` da opção escolhida.
- Resposta = `"Cancelar"` → encerra com a mensagem de cancelamento.
- Resposta = `"Outro"` (texto livre via UI) → captura o texto digitado pelo usuário, segue para caminho **[C]** (re-rodada — D-07) usando o texto como nova `<descricao_ajuste>`.
- Resposta vazia / não-mapeável → tratar como Cancelar (REGRA INVIOLÁVEL — fail-closed).

**ANTES de abrir o AskUserQuestion do [B], armazene MENTALMENTE no contexto desta execução** as 3 opções originais (id, titulo, arquivo, secao_tag) — você precisa delas se o usuário escolher "Voltar" no [B.2] (D-17 — reabrir o [B] sem re-invocar o analyzer).

#### Caminho **[B.2]** — gate duplo (defesa em profundidade)

Após o usuário escolher uma opção 1-3 no [B], abra um SEGUNDO AskUserQuestion confirmando o alvo técnico (D-06). Use os valores literais da opção escolhida:

```json
{
  "questions": [{
    "question": "Confirmar edição:\n\n- Arquivo: `<arquivo>`\n- Seção: `<secao_tag>`\n- Ação: <titulo>",
    "header": "Confirmar",
    "multiSelect": false,
    "options": [
      {"label": "Confirmar", "description": "Despacha o docs-editor-conciso para a edição acima."},
      {"label": "Voltar", "description": "Volta para a lista de opções anterior."},
      {"label": "Cancelar", "description": "Encerra sem editar."}
    ]
  }]
}
```

**Interpretação da resposta do [B.2]:**
- Resposta = `"Confirmar"` → segue para Passo 4 com 1 arquivo: `{ path: <arquivo>, secao_tag: <secao_tag>, justificativa: <titulo da opção escolhida> }`. Note que no caminho [B] sempre N=1 (gate duplo escolhe UMA ação por vez).
- Resposta = `"Voltar"` → reabra o AskUserQuestion do caminho [B] usando as `<opcoes_correcao>` originais armazenadas no contexto. **NÃO re-invocar o `docs-analyzer`** (D-17 — Voltar é navegação local, não reformulação; contador de re-rodadas NÃO incrementa).
- Resposta = `"Cancelar"` → encerra com mensagem de cancelamento.
- Resposta = `"Outro"` (texto livre) → tratar como Cancelar (no [B.2] não há re-rodada — para reformular, o usuário precisa Voltar e escolher "Outro" no [B]).
- Resposta vazia / não-mapeável → tratar como Cancelar (fail-closed).

### Passo 4: Carregar contexto

> Injeção automática desativada em v1.8.9 (manutenção). Carregue manualmente.

Leia via Read (se ainda não leu nesta sessão):
- `CLAUDE.md`
- `docs/regras-edicao.md`, `docs/regras-validacao.md`, `docs/proibido-fazer.md`

### Passo 5: Delegar ao docs-editor-conciso

Construa o prompt para o agente **exatamente** neste formato (substitua os placeholders, mantenha a estrutura):

```
TAREFA: Edição (NÃO auditoria).

ARQUIVO ALVO (vindo do docs-analyzer no Passo 3, use este caminho LITERAL com Read, depois Edit/Write):
<PATH_DO_ANALYZER>

SEÇÃO ALVO (tag XML literal identificada pelo docs-analyzer):
<SECAO_TAG_DO_ANALYZER>

JUSTIFICATIVA DO ANALYZER (contexto da escolha):
<JUSTIFICATIVA_DO_ANALYZER>

⚠️ NÃO transformar o caminho. NÃO prefixar com `modelo/`. NÃO extrair palavras do nome da pasta. Use o caminho EXATAMENTE como aparece acima.

INSTRUÇÃO DO USUÁRIO:
<DESCRIÇÃO_DO_AJUSTE>

OBJETIVO DO AJUSTE (resumo em 3 linha do que deve mudar):
<OBJETIVO_DERIVADO_DA_DESCRIÇÃO>

LEMBRETE: preservar `<response_format>` (REGRA INVIOLÁVEL), seguir CLAUDE.md, modificar o mínimo necessário, NUNCA duplicar regras existentes. Aplicar a edição com Edit/Write — não responder em modo review.

AO FINALIZAR (OVERRIDE do Modo A do FINALIZAÇÃO): NÃO invoque o `docs-reviewer` nesta chamada. Em vez disso, encerre sua resposta com EXATAMENTE este aviso ao agente principal:

> Edição concluída em `<CAMINHO_ABSOLUTO_DO_PASSO_2>`. Para validar, ative `/ei-review <ALVO> <AGENTE>` — o `docs-reviewer` fará a auditoria.

(Substitua `<ALVO>` pelo cliente — ou `"<cliente> <especialidade>"` (com aspas) se multi-agente — e `<AGENTE>` pelo nome do agente. Ex single: `/ei-review malu Qualifier`. Ex multi: `/ei-review "Brunno Brandi Consumidor" Qualifier`.)
```

Invoque via Agent tool com `subagent_type: docs-editor-conciso` e o prompt acima preenchido.

### Passo 6: Ativar `/ei-review` automaticamente
O editor terminará com a mensagem `Edição concluída ... Para validar, ative /ei-review <ALVO> <AGENTE>`. **Você (agente principal) deve então executar `/ei-review <alvo> <agente>` automaticamente** — substitua pelos valores reais. Para multi-agente, use aspas envolvendo cliente+especialidade. Exemplos: `/ei-review malu Qualifier` (single) ou `/ei-review "Brunno Brandi Consumidor" Qualifier` (multi). O `/ei-review` delega ao `docs-reviewer` e retorna o veredicto (APROVADO/REPROVADO).

Apresente ao usuário no final: resumo das alterações + veredicto da auditoria.

## Regras

- NUNCA edite o arquivo diretamente — sempre via `docs-editor-conciso`.
- NUNCA aplique ajuste em `modelo/*.md` neste comando (use `/ei-edit` para isso).
- Se a pasta do cliente não existir, sugerir `/ei-cria-cliente <nome>` antes.
