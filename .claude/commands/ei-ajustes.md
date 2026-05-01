---
description: Aplica ajuste em um agente de cliente já existente (procura a pasta pelo nome e delega ao docs-editor-conciso)
argument-hint: <cliente> <descrição do ajuste>
---

Você vai aplicar um ajuste em um projeto de cliente já existente.

**Input bruto:** $ARGUMENTS

## Fluxo

### Passo 1: Parsear o input
- **Primeira palavra** = nome do cliente (ex: `malu`, `joao`, `empresa-abc`)
- **Restante** = descrição do ajuste solicitado (ex: "a ia esta falando sobre valores")

Se o input estiver vazio ou incompleto, pergunte ao usuário:
- Qual cliente? (nome da pasta)
- Qual ajuste precisa ser feito?

### Passo 2: Localizar a pasta do cliente
1. Use Glob para listar diretórios na raiz do projeto (ignorando `modelo/`, `.claude/`, `bin/`, `node_modules/`, `.git/`).
2. Procure uma pasta cujo nome faça match com o cliente (match exato primeiro, depois case-insensitive, depois substring).
3. Se nenhuma pasta for encontrada, informe ao usuário as pastas disponíveis e pergunte qual é.
4. Se múltiplas combinarem, pergunte qual.

### Passo 3: Identificar qual agente ajustar
1. Liste os `.md` da pasta do cliente (ex: `malu/Orquestrador.md`, `malu/Qualifier.md` etc).
2. Analise a descrição do ajuste e inferir qual agente precisa de mudança:
   - menções a "qualificar/lead/desqualificar/valores/dívida/faturamento" → **Qualifier**
   - menções a "agendar/marcar/remarcar/horário/reunião" → **Scheduler**
   - menções a "encerrar/finalizar/transferir/despedida" → **Protractor**
   - menções a "resposta inicial/cumprimento/fluxo geral/chamar agente" → **Orquestrador**
3. Se ambíguo ou múltiplos, pergunte ao usuário qual agente.

### Passo 4: Carregar contexto
- Leia `CLAUDE.md` via Read (se ainda não leu nesta sessão).
- Leia o arquivo do agente que será ajustado: `<cliente>/<Agente>.md`.

### Passo 5: Delegar ao docs-editor-conciso

Construa o prompt para o agente **exatamente** neste formato (substitua os placeholders, mantenha a estrutura):

```
TAREFA: Edição (NÃO auditoria).

ARQUIVO ALVO (use este caminho LITERAL com Read, depois Edit/Write — caractere por caractere, incluindo espaços):
<CAMINHO_ABSOLUTO_DO_PASSO_2>

⚠️ NÃO transformar o caminho. NÃO prefixar com `modelo/`. NÃO extrair palavras do nome da pasta. Use o caminho EXATAMENTE como aparece acima.

INSTRUÇÃO DO USUÁRIO:
<DESCRIÇÃO_DO_AJUSTE>

CONTEÚDO ATUAL DO ARQUIVO (já carregado via Read no Passo 4 — referência para você editar com precisão):
<conteudo_atual>
<COLE_AQUI_O_CONTEÚDO_INTEGRAL_LIDO_NO_PASSO_4>
</conteudo_atual>

LEMBRETE: preservar `<response_format>` (REGRA INVIOLÁVEL), seguir CLAUDE.md, modificar o mínimo necessário, NUNCA duplicar regras existentes. Aplicar a edição com Edit/Write — não responder em modo review.

AO FINALIZAR (OVERRIDE do Modo A do FINALIZAÇÃO): NÃO invoque o `docs-reviewer` nesta chamada. Em vez disso, encerre sua resposta com EXATAMENTE este aviso ao agente principal:

> Edição concluída em `<CAMINHO_ABSOLUTO_DO_PASSO_2>`. Para validar, ative `/ei-review <CLIENTE> <AGENTE>` — o `docs-reviewer` fará a auditoria.

(Substitua `<CLIENTE>` e `<AGENTE>` pelos valores reais — ex: `/ei-review malu Qualifier`.)
```

Invoque via Agent tool com `subagent_type: docs-editor-conciso` e o prompt acima preenchido.

### Passo 6: Ativar `/ei-review` automaticamente
O editor terminará com a mensagem `Edição concluída ... Para validar, ative /ei-review <CLIENTE> <AGENTE>`. **Você (agente principal) deve então executar `/ei-review <cliente> <agente>` automaticamente** — substitua `<cliente>` e `<agente>` pelos valores reais (ex: `/ei-review malu Qualifier`). O `/ei-review` delega ao `docs-reviewer` e retorna o veredicto (APROVADO/REPROVADO).

Apresente ao usuário no final: resumo das alterações + veredicto da auditoria.

## Regras

- NUNCA edite o arquivo diretamente — sempre via `docs-editor-conciso`.
- NUNCA aplique ajuste em `modelo/*.md` neste comando (use `/ei-edit` para isso).
- Se a pasta do cliente não existir, sugerir `/ei-cria-cliente <nome>` antes.
