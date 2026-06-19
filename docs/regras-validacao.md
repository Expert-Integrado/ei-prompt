# Regras de Validação

> Checklists e verificações aplicáveis **após** qualquer edição de prompt de agente.

## Checklist Pré-Commit de Prompt
- [ ] Nenhuma regra aparece mais de uma vez?
- [ ] Seções têm propósitos distintos sem sobreposição?
- [ ] Exemplos são mínimos e necessários?
- [ ] Texto pode ser reduzido sem perder clareza?
- [ ] `<formato_resposta>` mantém apenas os campos originais (nenhum campo novo)?
- [ ] `<exemplos_resposta>` cobre todos os cenários possíveis do `result`?

## Validação de Ações no Campo `resume`
- [ ] Usa apenas palavras-chave do padrão (`IR_PARA_AGENDAMENTO`, `ACIONAR_PROTRACTOR:*`, `COLETAR:*`)?
- [ ] Ações de encerramento/transferência delegam ao Protractor (não fazem direto)?

## Validação de Base de Conhecimento
- [ ] `<conhecimento>` contém apenas resumo/índice + nome dos documentos?
- [ ] Não há conteúdo integral de PDFs, manuais ou FAQs colado dentro do prompt?
- [ ] Blocos de mídia seguem o formato (`mediaUrl` + `mediaType` válidos)?
- [ ] Links de mídia são URLs **diretas** terminando na extensão do arquivo?

## Validação de Arquitetura
- [ ] Orquestrador **não** encerra nem transfere sozinho (sempre via Protractor)?
- [ ] Qualifier **não** encerra conversas?
- [ ] _(Multi-agente)_ Recepcionista **não** qualifica nem agenda — só roteia?
- [ ] _(Multi-agente)_ Protractor da especialidade tem `TRANSFERIR_PARA_AGENT` ativo?

## Validação do `<fluxo_de_conversa>` (Orquestrador)
- [ ] Segue ETAPAS numeradas: `## ETAPA 1` (Abertura) → `2` (Qualificação) → `3` (Pós-Qualificação) → `4` (Agendamento, só se agenda)?
- [ ] Cabeçalho `# ETAPAS DO ATENDIMENTO` + linha `REGRA FUNDAMENTAL` presentes?
- [ ] Rótulos preservados (`**Mensagem Inicial:**`, `**Perfil do Lead:**`, `**Mensagem:**`, `**Ação:**`) e ações via `>> AÇÃO: Chamar Tool ...`?
- [ ] ETAPA 3 tem os 3 ramos (`qualificado` / `desqualificado` / `informacoes_insuficientes`)?
- [ ] **NÃO** há "etapa de transferência final" (a transferência é ação da ETAPA 3)?
- [ ] Detalhes de agendamento/transferência ficam em `<regras_agendamento>`/`<regras_protractor>`, sem duplicar no fluxo?

## Auditoria Automática
Após edição via `docs-editor-conciso`, o `docs-reviewer` valida automaticamente:
- Respeito aos princípios de otimização (`docs/regras-edicao.md`)
- Não-violação das regras de proibição (`docs/proibido-fazer.md`)
- Conformidade com esta checklist
