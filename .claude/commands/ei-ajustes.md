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
Invoque o agente `docs-editor-conciso` via Agent tool passando:
- **arquivo alvo:** caminho absoluto completo conforme localizado no Passo 2 (ex: `/root/EiPrompt/malu/Qualifier.md`). NÃO usar caminho relativo. NÃO prefixar com `modelo/`.
- **instrução:** a descrição do ajuste fornecida pelo usuário
- **lembrete:** preservar `<response_format>`, seguir CLAUDE.md, modificar o mínimo necessário

O `docs-editor-conciso` vai acionar o `docs-reviewer` automaticamente ao finalizar (conforme fluxo anti-loop já definido). Apenas repasse o veredicto ao usuário.

## Regras

- NUNCA edite o arquivo diretamente — sempre via `docs-editor-conciso`.
- NUNCA aplique ajuste em `modelo/*.md` neste comando (use `/ei-edit` para isso).
- Se a pasta do cliente não existir, sugerir `/ei-cria-cliente <nome>` antes.
