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
