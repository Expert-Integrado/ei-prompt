# Preferências do Projeto

## Commits
- Não incluir a assinatura "Generated with Claude Code" e "Co-Authored-By" nos commits

## Arquitetura Padrão de Agentes

| Agente | Função |
|--------|--------|
| **Orquestrador.md** | Agente principal — responde ao cliente, controla a conversa e chama os outros agentes. **Nunca encerra ou transfere sozinho.** |
| **Qualifier.md** | Valida o lead (qualificado, desqualificado, informações insuficientes). Não encerra conversas. |
| **Scheduler.md** | Gerencia agenda — marca, remarca e cancela reuniões |
| **Protractor.md** | **Único responsável por encerrar sessões (FINALIZAR_SESSAO) e transferir para humano/agente.** O Orquestrador deve sempre acionar o Protractor para essas ações. |

## Limites do Ajuste de Prompts

### O que NÃO pode ser ajustado via prompts

| Problema | Onde resolver |
|----------|---------------|
| Nome/apresentação da IA (como se apresenta) | Frontend → tela **Usuários** |
| Erro ao agendar / agendamento não funciona | Frontend → tela **Usuários** ou **Regras de Rodízio de Usuários** |
| Follow-ups / FUPs / Lembretes | **Fora do escopo** — não há treinamento para prompts de FUPs |
| IA parou de responder / não responde | **Time técnico** — verificar com a equipe tech da empresa |
| Ações automáticas no CRM (atualizar, mover, preencher) | Frontend → tela **Intenções** ou pedir ajuda ao time |

**Quando o usuário pedir ajustes nesses itens:** Informar que não é ajuste de prompt e orientar para o local correto.

### O que PODE ser ajustado via prompts

- Comportamento conversacional da IA (tom, abordagem, perguntas)
- Regras de qualificação de leads
- Fluxo de conversa e decisões
- Base de conhecimento e respostas sobre produtos/serviços
- Envio de mídias (imagens, vídeos, PDFs)
- Critérios de encerramento e transferência

## Ajustes em Prompts de Agentes

**SEMPRE usar o agente `docs-editor-conciso`** para editar arquivos de agentes (Orquestrador.md, Qualifier.md, Scheduler.md, Protractor.md, etc.). Este agente garante que os princípios de otimização sejam seguidos.

## Regra Inviolável: `modelo/` é Read-Only

**NUNCA fazer alterações nos arquivos dentro da pasta `modelo/`.** Os templates base são imutáveis.

- Todas as alterações devem ser feitas na pasta do cliente específico (ex: `malu/`, `joao/`) via `/ei-ajustes <cliente> <descrição>`.
- Se precisar criar um novo cliente, use `/ei-cria-cliente <nome>` — ele copia `modelo/` sem alterar.
- `/ei-review` pode auditar `modelo/*.md` em modo leitura, mas nunca editar.

## Slash Commands do Projeto

| Comando | Uso |
|---------|-----|
| `/ei-cria-cliente <nome>` | Cria novo projeto de cliente (pasta + templates personalizados). Ex: `/ei-cria-cliente malu` |
| `/ei-ajustes <cliente> <descrição>` | Aplica ajuste em agente de cliente existente. Ex: `/ei-ajustes malu a ia esta falando sobre valores` |
| `/ei-edit <agente> <instrução>` | Edita um template em `modelo/*.md` (editor + auditoria automática) |
| `/ei-review <agente>` | Audita um template em `modelo/*.md` (somente leitura) |
| `/ei-ctx` | Recarrega contexto do projeto (CLAUDE.md + lista de modelos) |

## Otimização de Prompts (Orchestrators/Agentes)

### Princípios de Concisão
- **Eliminar redundância:** Nunca repetir a mesma regra em seções diferentes. Se uma regra aparece em `<objetivo>`, não repetir em `<regras_gerais>`.
- **Consolidar regras similares:** Agrupar regras relacionadas em uma única declaração concisa.
- **Usar referências:** Em vez de repetir, usar "conforme Passo X" ou "ver seção Y".
- **Priorizar listas:** Bullet points são mais econômicos que parágrafos explicativos.

### Estrutura Padrão de Prompts
1. `<objetivo>` — Apenas missão central (máx 5 itens)
2. `<fluxo>` — Passos sequenciais SEM repetir regras
3. `<regras>` — Regras únicas, sem duplicação
4. `<formato>` — Output esperado

### Ao Editar Prompts Existentes
1. **Antes de adicionar:** Verificar se a regra já existe em outra seção
2. **Se existe:** Apenas referenciar, não duplicar
3. **Se é nova:** Adicionar na seção mais apropriada APENAS
4. **Revisar:** Após editar, buscar e remover duplicações

### Padrões de Economia
- ❌ "NUNCA faça X. É CRÍTICO que você não faça X. REGRA: não fazer X."
- ✅ "NUNCA: X"
- ❌ Explicar o porquê de cada regra
- ✅ Regra direta, sem justificativa (a menos que essencial)
- ❌ Múltiplos exemplos para a mesma regra
- ✅ Um exemplo claro ou nenhum

### Checklist Pré-Commit de Prompt
- [ ] Nenhuma regra aparece mais de uma vez?
- [ ] Seções têm propósitos distintos sem sobreposição?
- [ ] Exemplos são mínimos e necessários?
- [ ] Texto pode ser reduzido sem perder clareza?

### Formato de Resposta de Agentes
- **NUNCA adicionar campos novos** ao `<formato_resposta>` — usar apenas os campos que já existem
- **Usar palavras-chave** no início de campos existentes para indicar ações
- **Sempre incluir `<exemplos_resposta>`** com exemplos para cada cenário possível

### Padrão de Ações no Campo "resume"
Usar palavras-chave que indiquem ao Orquestrador **qual agente acionar e o que fazer**:

| Ação | Significado |
|------|-------------|
| `IR_PARA_AGENDAMENTO` | Seguir fluxo de agendamento (Scheduler) |
| `ACIONAR_PROTRACTOR:FINALIZAR_SESSAO` | Encerrar conversa via Protractor |
| `ACIONAR_PROTRACTOR:TRANSFERIR_PARA_HUMANO` | Transferir via Protractor |
| `COLETAR:[campo]` | Perguntar informação que falta |

Exemplo:
```json
{"result": "qualificado", "resume": "IR_PARA_AGENDAMENTO. Dívida de R$ 120.000."}
{"result": "desqualificado", "resume": "ACIONAR_PROTRACTOR:FINALIZAR_SESSAO. Lead é MEI."}
{"result": "informacoes_insuficientes", "resume": "COLETAR:valor_divida. Falta valor."}
```

### Ao Fazer Ajustes em Prompts
- **Preferir reutilizar** texto/estruturas que já existem no arquivo
- **Evitar adicionar muito texto** — ser conciso, ir direto ao ponto
- **Modificar o mínimo necessário** para resolver o problema

## Envio de Mídia (imagens, vídeos, PDFs)

Agentes podem enviar mídias para o lead. As mídias ficam declaradas **dentro da seção `<conhecimento>`** do Orquestrador (template ou cliente).

### Formato do bloco de mídia
```
[Nome da mídia] → quando lead [gatilho]
mediaUrl: "[https://link-direto/arquivo.ext]"
mediaType: "image" | "video" | "file"
```

### Tipos válidos
| `mediaType` | Extensões aceitas |
|-------------|-------------------|
| `image` | .jpg, .jpeg, .png, .webp |
| `video` | .mp4, .mov |
| `file`  | .pdf, .docx, .xlsx |

### Regras do link
- ✅ URL **direta**, terminando na extensão do arquivo
- ✅ Arquivo **público** (qualquer um abre sem login)
- ❌ **Não funciona:** YouTube, Instagram, Google Drive, Dropbox (são páginas, não arquivos)
- **Validação rápida:** colar no navegador deve abrir/baixar o arquivo, não uma página

### Onde obter o link (`mediaUrl`)
Use o **Banco de Mídia** no frontend da **ExpertIntegrado** — lá o arquivo é hospedado e o link direto é gerado automaticamente (já no formato aceito).

### Onde aplicar
- **Cliente novo/ajuste:** adicionar blocos em `<conhecimento>` do Orquestrador do cliente via `/ei-ajustes <cliente> adicionar midia <descrição>`
- **Template base:** já contém instrução de comportamento; mídias concretas são sempre do cliente, nunca do `modelo/`

### Exemplo (empilhar quantas mídias forem necessárias)
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