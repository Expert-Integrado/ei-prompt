# Regras de Edição de Prompts

> Aplicam-se a **toda edição** de agentes (templates em `modelo/` ou pastas de cliente). Sempre usar o agente `docs-editor-conciso`.

## Princípios de Concisão
- **Eliminar redundância:** Nunca repetir a mesma regra em seções diferentes. Se já aparece em `<objetivo>`, não repetir em `<regras_gerais>`.
- **Consolidar regras similares:** Agrupar regras relacionadas em uma única declaração concisa.
- **Usar referências:** Em vez de repetir, usar "conforme Passo X" ou "ver seção Y".
- **Priorizar listas:** Bullet points são mais econômicos que parágrafos.

## Estrutura Padrão de Prompts
1. `<objetivo>` — Missão central (máx 5 itens)
2. `<fluxo>` — Passos sequenciais SEM repetir regras. No **Orquestrador**, é o `<fluxo_de_conversa>` em ETAPAS numeradas (ver seção abaixo)
3. `<regras>` — Regras únicas, sem duplicação
4. `<formato>` — Output esperado

## Casca XML (`<agente>`)

Todo prompt gerado (templates de `modelo/` e prompts de cliente) é envolvido numa **casca XML de raiz única**, para permitir validação automatizada de boa-formação e intercâmbio com o Prompt Builder (mesmo formato byte-compatível).

**Formato exato** (não alterar):
```
<?xml version="1.0" encoding="UTF-8"?>
<agente xmlns="https://expertintegrado.com.br/super-sdr/prompt" versao="1.0" tipo="{TIPO}">

{TODO O CONTEÚDO DO PROMPT — intacto, incluindo os separadores "---"}

</agente>
```
Declaração na 1ª linha; `<agente>` na 2ª (atributos numa linha, separados por espaço); uma linha em branco; conteúdo; uma linha em branco; `</agente>` na última.

**Atributos:**
| Atributo | Valor |
|----------|-------|
| `xmlns` | `https://expertintegrado.com.br/super-sdr/prompt` (constante) |
| `versao` | `1.0` — sobe só se a ESTRUTURA da casca mudar |
| `tipo` | identificador do prompt (mapa abaixo) |
| `origem` | _(opcional)_ rastreio de origem — ex.: `recepcionista` |
| `agente_id` | id do agente, se houver; **omitir o atributo** se não houver (EI hoje omite) |
| `gerado_em` | ISO 8601 do tagueamento; **omitir** se não souber (EI hoje omite) |

**Mapa de `tipo`** (valores em inglês, iguais ao `PromptType` do builder):

| Template | `tipo` |
|----------|--------|
| Orquestrador | `orchestrator` |
| Qualifier | `qualifier` |
| Protractor | `protractor` |
| Scheduler | `scheduler` |
| Follow-Up | `followup` |
| Recepcionista | `orchestrator` + `origem="recepcionista"` (materializa como `Orquestrador.md` do stack router) |

**Regras invioláveis da casca:**
- **Raiz única:** todo o prompt fica dentro de um único par `<agente>…</agente>`.
- **Conteúdo intacto:** não reordenar, não remover; as tags internas (`<objetivo>`, `<fluxo_de_conversa>`, etc.) não mudam.
- **Sem escaping / sem CDATA:** o conteúdo é texto para a LLM e fica literal. `&`/`<` **não** são escapados.
- **Idempotência:** ao re-gerar um prompt que já tem casca, **remover a casca antiga antes** de reaplicar — nunca aninhar `<agente><agente>`.
- **Ao re-ler/parsear:** remover a casca (miolo entre `<agente …>` e `</agente>`) antes de processar; conteúdo **legado sem casca também é válido**.

**Boilerplate sem `<`/`&` crus:** como o conteúdo não é escapado, o texto FIXO do template não pode conter `<` ou `&` crus (quebram a boa-formação). Ao editar regras/boilerplate: escreva "sinais de menor/maior" em vez de `<>`, e refira seções por nome em crases (`` `conhecimento` ``) em vez de `<conhecimento>`. (`>`, `[ ]`, `{ }` são texto comum e podem ficar.)

## Estrutura do `<fluxo_de_conversa>` (Orquestrador)

O fluxo do Orquestrador segue ETAPAS numeradas, no MESMO formato gerado pelo Prompt Builder (prompts intercambiáveis):

1. **Cabeçalho fixo:** `# ETAPAS DO ATENDIMENTO` + a linha `REGRA FUNDAMENTAL: ...` (siga em ordem, não pule, não repita pergunta).
2. **`## ETAPA 1: Abertura`** — `**Mensagem Inicial:**` com a primeira fala ao lead.
3. **`## ETAPA 2: Qualificação`** — `**Perfil do Lead:**` + perguntas numeradas (`1. "..."`, quantas o atendimento exigir) + `>> AÇÃO: Chamar Tool Qualifier para avaliar qualificação`.
4. **`## ETAPA 3: Pós-Qualificação`** — três ramos: `### Se result = "qualificado"`, `### Se result = "desqualificado"`, `### Se result = "informacoes_insuficientes"`, cada um com `**Mensagem:**` e `**Ação:**` (`>> AÇÃO: ...`).
5. **`## ETAPA 4: Agendamento`** — SOMENTE se o lead qualificado for agendar. Nesse caso, a **Ação** do ramo `qualificado` (ETAPA 3) é `>> AÇÃO: Prosseguir para ETAPA 4 (Agendamento)` e a chamada ao Scheduler fica AQUI (não na ETAPA 3). Se o atendimento NÃO agenda, a Ação do `qualificado` resolve na própria ETAPA 3 (ex.: `>> AÇÃO: Chamar Tool Protractor para transferir para humano`) e **não existe ETAPA 4**. **Não existe "etapa de transferência final".**

**Ao preencher/editar:** preserve os títulos `## ETAPA N:`, os rótulos (`**Mensagem Inicial:**`, `**Perfil do Lead:**`, `**Mensagem:**`, `**Ação:**`) e os marcadores `>> AÇÃO:`. O conteúdo (mensagens, perfil, perguntas) é livre, em prosa adaptada ao cliente. As ações apenas **referenciam** os agentes auxiliares — os detalhes operacionais ficam em `<regras_qualificacao>`, `<regras_agendamento>`, `<regras_protractor>` (NÃO duplicar no fluxo).

## Ao Editar Prompts Existentes
1. **Antes de adicionar:** Verificar se a regra já existe em outra seção
2. **Se existe:** Apenas referenciar, não duplicar
3. **Se é nova:** Adicionar na seção mais apropriada APENAS
4. **Revisar:** Após editar, buscar e remover duplicações

## Padrões de Economia
- ❌ "NUNCA faça X. É CRÍTICO que você não faça X. REGRA: não fazer X."
- ✅ "NUNCA: X"
- ❌ Explicar o porquê de cada regra
- ✅ Regra direta, sem justificativa (a menos que essencial)
- ❌ Múltiplos exemplos para a mesma regra
- ✅ Um exemplo claro ou nenhum

## Ao Fazer Ajustes em Prompts
- **Preferir reutilizar** texto/estruturas que já existem no arquivo
- **Evitar adicionar muito texto** — ser conciso, ir direto ao ponto
- **Modificar o mínimo necessário** para resolver o problema

## Formato de Resposta de Agentes
- **NUNCA adicionar campos novos** ao `<formato_resposta>` — usar apenas os campos que já existem
- **Usar palavras-chave** no início de campos existentes para indicar ações
- **Sempre incluir `<exemplos_resposta>`** com exemplos para cada cenário possível

## Padrão de Ações no Campo `resume`
Palavras-chave que indicam ao Orquestrador **qual agente acionar e o que fazer**:

| Ação | Significado |
|------|-------------|
| `IR_PARA_AGENDAMENTO` | Seguir fluxo de agendamento (Scheduler) |
| `ACIONAR_PROTRACTOR:FINALIZAR_SESSAO` | Encerrar conversa via Protractor |
| `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_HUMANO` | Transferir para humano via Protractor |
| `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_AGENT:[nome]` | _(Multi-agente)_ Transferir para outro agente automatizado |
| `COLETAR:[campo]` | Perguntar informação que falta |

Exemplo:
```json
{"result": "qualificado", "resume": "IR_PARA_AGENDAMENTO. Dívida de R$ 120.000."}
{"result": "desqualificado", "resume": "ACIONAR_PROTRACTOR:FINALIZAR_SESSAO. Lead é MEI."}
{"result": "informacoes_insuficientes", "resume": "COLETAR:valor_divida. Falta valor."}
```

## Base de Conhecimento (`<conhecimento>` do Orquestrador)

A seção `<conhecimento>` **NÃO é o repositório completo da base de conhecimento** — é apenas um **índice/resumo** do que existe no Banco de Conhecimento real.

### Onde mora cada coisa
| Conteúdo | Lugar correto |
|----------|---------------|
| Base de conhecimento **completa** (documentos, textos longos, FAQs detalhados) | **Frontend → tela `/base_conhecimento`** |
| **Resumo/índice** do que existe na base | `<conhecimento>` do Orquestrador (do cliente) |

### O que PODE entrar em `<conhecimento>`
- **Resumo curto** de cada documento disponível, com o **nome do documento**. Ex: `Documento "Sobre a Empresa" — histórico, missão e portfólio.`
- **Lista de produtos/serviços** (bullets curtos).
- **Blocos de mídia** (ver seção abaixo).

### Quando o usuário pedir para "colocar a base inteira no prompt"
Orientar: o lugar correto é a tela **`/base_conhecimento`** no frontend. No prompt do Orquestrador entra apenas resumo + nome dos documentos.

## Envio de Mídia (imagens, vídeos, PDFs)

Mídias ficam dentro de `<conhecimento>` do Orquestrador (template ou cliente).

### Formato do bloco
```
[Nome da mídia] → quando lead [gatilho]
mediaUrl: "[https://link-direto/arquivo.ext]"
mediaType: "image" | "video" | "file"
```

### Tipos válidos
| `mediaType` | Extensões |
|-------------|-----------|
| `image` | .jpg, .jpeg, .png, .webp |
| `video` | .mp4, .mov |
| `file`  | .pdf, .docx, .xlsx |

### Regras do link
- ✅ URL **direta**, terminando na extensão
- ✅ Arquivo **público** (qualquer um abre sem login)
- ❌ Não funciona: YouTube, Instagram, Google Drive, Dropbox (são páginas, não arquivos)
- **Validar:** colar no navegador deve abrir/baixar o arquivo

### Onde obter o link
**Banco de Mídia** no frontend da **ExpertIntegrado** — gera link direto já no formato aceito.

### Onde aplicar
- **Cliente novo/ajuste:** adicionar em `<conhecimento>` do Orquestrador do cliente via `/ei-ajustes <cliente> adicionar midia <descrição>`
- **Template base (`modelo/`):** já contém instrução de comportamento; mídias concretas são sempre do cliente

### Exemplo
```
<conhecimento>
# Base de conhecimento sobre [Cliente]
- [produto/serviço 1]
- [produto/serviço 2]

Apresentação dos fundos → quando lead pedir detalhes dos fundos
mediaUrl: "https://site.com/apresentacao.pdf"
mediaType: "file"

Vídeo institucional → quando lead quiser conhecer a empresa
mediaUrl: "https://site.com/video.mp4"
mediaType: "video"
</conhecimento>
```
