# Proibido Fazer

> Limites duros do projeto. Violar qualquer um destes itens é erro grave.

## Regra Inviolável: `modelo/` é Read-Only

**NUNCA fazer alterações nos arquivos dentro da pasta `modelo/`.** Os templates base são imutáveis no fluxo distribuído.

- Todas as alterações vão na pasta do cliente específico (ex: `malu/`, `joao/`) via `/ei-ajustes <cliente> <descrição>`.
- Para criar novo cliente: `/ei-cria-cliente <nome>` — ele copia `modelo/` sem alterar.
- Edição de templates em `modelo/` (quando necessária) é feita pelo mantenedor diretamente no clone do repo source, fora dos comandos públicos.

## O que NÃO pode ser ajustado via prompts

Quando o usuário pedir esses ajustes, **informar que não é ajuste de prompt** e orientar para o local correto:

| Problema | Onde resolver |
|----------|---------------|
| Nome/apresentação da IA (como se apresenta) | Frontend → tela **Usuários** |
| Erro ao agendar / agendamento não funciona | Frontend → tela **Usuários** ou **Regras de Rodízio de Usuários** |
| Follow-ups / FUPs / Lembretes | **Fora do escopo** — não há treinamento para prompts de FUPs |
| IA parou de responder / não responde | **Time técnico** — verificar com a equipe tech da empresa |
| Ações automáticas no CRM (atualizar, mover, preencher) | Frontend → tela **Intenções** ou pedir ajuda ao time |

## O que NÃO pode entrar em `<conhecimento>`
- ❌ Conteúdo integral de documentos (transcrição completa de PDFs, manuais, FAQs)
- ❌ Textos longos que duplicam o que já está em `/base_conhecimento`
- ❌ Mídias com URLs de página (YouTube, Instagram, Google Drive, Dropbox) — só URL direta para o arquivo

## O que NÃO pode ser feito ao editar prompts
- ❌ **Adicionar campos novos** ao `<formato_resposta>` — só usar os campos originais
- ❌ **Duplicar regra** em seções diferentes do mesmo prompt
- ❌ Reescrever do zero quando dá pra reaproveitar texto/estrutura existente
- ❌ Encerrar/transferir sessão fora do Protractor (Orquestrador, Qualifier e Scheduler **não** podem)
- ❌ Qualifier encerrar conversa
- ❌ _(Multi-agente)_ Recepcionista qualificar ou agendar

## O que NÃO pode ser feito em commits
- ❌ Incluir assinatura "Generated with Claude Code" ou "Co-Authored-By"
