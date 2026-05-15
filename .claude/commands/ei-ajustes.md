---
description: Aplica ajuste em um agente de cliente já existente (procura a pasta pelo nome e delega ao docs-editor-conciso)
argument-hint: <cliente> <descrição> | "<cliente> <especialidade>" <descrição>
---

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

### Passo 3: Identificar qual agente ajustar
1. Liste os `.md` da pasta-alvo (ex: `Brunno Brandi/Consumidor/Orquestrador.md`, `.../Qualifier.md`, etc).
2. Analise a descrição do ajuste e inferir qual agente precisa de mudança:
   - menções a "qualificar/lead/desqualificar/valores/dívida/faturamento" → **Qualifier**
   - menções a "agendar/marcar/remarcar/horário/reunião" → **Scheduler**
   - menções a "encerrar/finalizar/transferir para humano/despedida" → **Protractor**
   - menções a "recepcionista/roteamento/transferir entre agentes/agentes disponíveis/multi-agente" → **Orquestrador** (dentro da subpasta `Recepcionista/`)
   - menções a "resposta inicial/cumprimento/fluxo geral/chamar agente/conhecimento" → **Orquestrador**
3. Se ambíguo ou múltiplos, pergunte ao usuário qual agente.

### Passo 4: Carregar contexto

**SEMPRE** rodar o hook de contexto antes de delegar ao editor (garante que CLAUDE.md está atualizado, pegando regras novas):

```bash
"$CLAUDE_PROJECT_DIR"/.claude/hooks/inject-ei-context.sh
```

Depois leia `CLAUDE.md` via Read (se ainda não leu nesta sessão).

### Passo 5: Delegar ao docs-editor-conciso

Construa o prompt para o agente **exatamente** neste formato (substitua os placeholders, mantenha a estrutura):

```
TAREFA: Edição (NÃO auditoria).

ARQUIVO ALVO (use este caminho LITERAL com Read, depois Edit/Write — caractere por caractere, incluindo espaços):
<CAMINHO_ABSOLUTO_DO_PASSO_2>

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
