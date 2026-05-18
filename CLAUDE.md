# Preferências do Projeto

> CLAUDE.md é o **índice geral**. Regras detalhadas estão fracionadas em `docs/`. Os 3 arquivos são injetados automaticamente pelo hook `inject-ei-context.sh`.

## Mapa de Regras

| Arquivo | Conteúdo |
|---------|----------|
| [`docs/regras-edicao.md`](docs/regras-edicao.md) | Como editar prompts: concisão, estrutura, formato de resposta, `<conhecimento>`, envio de mídia |
| [`docs/regras-validacao.md`](docs/regras-validacao.md) | Checklists pós-edição e validação de arquitetura |
| [`docs/proibido-fazer.md`](docs/proibido-fazer.md) | Limites duros: `modelo/` read-only, o que não pode ser ajustado, o que não entra em `<conhecimento>` |

## Commits
- Não incluir assinatura "Generated with Claude Code" nem "Co-Authored-By"

## Arquitetura Padrão de Agentes

| Agente | Função |
|--------|--------|
| **Orquestrador.md** | Agente principal — responde ao cliente, controla a conversa e chama os outros agentes. **Nunca encerra ou transfere sozinho.** |
| **Qualifier.md** | Valida o lead (qualificado, desqualificado, informações insuficientes). Não encerra conversas. |
| **Scheduler.md** | Gerencia agenda — marca, remarca e cancela reuniões |
| **Protractor.md** | **Único responsável por encerrar sessões (FINALIZAR_SESSAO) e transferir para humano/agente.** O Orquestrador sempre aciona o Protractor para essas ações. |
| **Recepcionista.md** | _(Opcional, multi-agente)_ Router — recebe o lead, identifica intenção e transfere para o especialista via Protractor. **Não qualifica nem agenda.** |

## Arquitetura Multi-Agente (opcional — Recepcionista)

Use quando o cliente atende **múltiplas frentes/áreas com fluxos distintos** (ex: Consumidor + Trabalhista + Previdenciário).

### Estrutura de pasta
```
Cliente Multi/
├── Recepcionista/                  ← router (não qualifica, não agenda)
│   ├── Orquestrador.md             ← gerado a partir de modelo/Recepcionista.md
│   ├── Qualifier.md                ← stub neutralizado (não atua)
│   ├── Scheduler.md                ← stub neutralizado (não atua)
│   └── Protractor.md               ← com TRANSFERIR_PARA_AGENT ATIVO
├── [Especialidade-1]/              ← stack completo single-agent
│   ├── Orquestrador.md
│   ├── Qualifier.md
│   ├── Scheduler.md
│   ├── Protractor.md               ← TRANSFERIR_PARA_AGENT ativo (permite re-roteamento)
│   └── Follow-Up.md
├── [Especialidade-2]/              ← idem
└── ...
```

### Fluxo
1. Lead chega → **Recepcionista** apresenta a empresa de forma neutra e identifica intenção.
2. Mapeia a intenção contra `<agentes_disponiveis>` e aciona Protractor com `TRANSFERIR_PARA_AGENT:[especialidade]`.
3. A especialidade assume a conversa via `mensagem_inicial_sugerida` retornada pelo Protractor.

### Quando usar
- Cliente com 2+ frentes que exigem qualificação ou fluxo distintos.
- Sempre que o atendimento precisar de "filtragem" antes do fluxo.

**Não usar** quando o cliente tem só 1 frente — single-agent (`cliente/*.md`) basta.

## Slash Commands

| Comando | Uso |
|---------|-----|
| `/ei-cria-cliente <nome>` | Cria novo projeto de cliente (single ou multi-agente). Ex: `/ei-cria-cliente malu` |
| `/ei-ajustes <cliente> <descrição>` | Aplica ajuste em agente de cliente existente. Ex: `/ei-ajustes malu a ia esta falando sobre valores` |
| `/ei-ajustes "<cliente> <especialidade>" <descrição>` | _(Multi-agente)_ Aspas em volta de cliente+especialidade. Ex: `/ei-ajustes "Brunno Brandi Consumidor" a IA está falando sobre valores` |
| `/ei-edit <agente> <instrução>` | Edita template em `modelo/*.md` (editor + auditoria automática) |
| `/ei-review <agente>` | Audita um agente (template ou cliente) — somente leitura |
| `/ei-ctx` | Recarrega contexto do projeto (CLAUDE.md + docs/ + lista de modelos) |

## Regras Básicas

- **Edição de agentes:** sempre via `docs-editor-conciso`. Caminho exato recebido, sem trocar extensão (`.md` e `.txt` são iguais).
- **Auditoria:** sempre via `docs-reviewer` após edição.
- **`modelo/` é read-only.** Detalhes em [`docs/proibido-fazer.md`](docs/proibido-fazer.md).
- **Princípios de edição:** ver [`docs/regras-edicao.md`](docs/regras-edicao.md).
- **Validação pós-edição:** ver [`docs/regras-validacao.md`](docs/regras-validacao.md).
