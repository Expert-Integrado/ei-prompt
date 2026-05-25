# Preferências do Projeto

> CLAUDE.md é o **índice geral**. Regras detalhadas estão fracionadas em `docs/`.
>
> ⚠️ **v1.8.9:** Sistema de injeção automática de contexto (hook `inject-ei-context.sh`) **desativado para manutenção**. Carregue manualmente via `Read` os arquivos da tabela abaixo + `CLAUDE.md`.

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
| `/ei-update` | Re-executa `npx @expertzinhointegrado/ei-prompt@latest` na pasta atual e mostra o CHANGELOG da versão mais nova |

## Regras Básicas

- **Edição de agentes:** sempre via `docs-editor-conciso`. Caminho exato recebido, sem trocar extensão (`.md` e `.txt` são iguais).
- **Análise pré-edição:** `/ei-ajustes` invoca o subagente `docs-analyzer` (modelo opus, read-only) para identificar arquivo+seção a partir da descrição livre. Substitui a heurística por keywords. Detalhe em `.claude/agents/docs-analyzer.md`.
- **Aprovação humana (gate-duro):** entre análise e edição, `/ei-ajustes` apresenta um `AskUserQuestion` (Passo 3.5) com a recomendação do analyzer; sem resposta explícita de "Aprovar e editar" (caminho edit) ou "Confirmar" (caminho clarify/gate duplo), nenhum `docs-editor-conciso` é acionado. Detalhe em `.claude/commands/ei-ajustes.md` (Passo 3.5).
- **Edição paralela (fan-out v3):** quando a aprovação envolve N≥1 arquivos, `/ei-ajustes` despacha N instâncias paralelas de `docs-editor-conciso` em UMA única resposta (Passo 5). Cada editor emite `<resultado>OK</resultado>` ou `<resultado>ERRO: …</resultado>`; falhas oferecem retry isolado (cap de 2 retries por arquivo). Detalhe em `.claude/commands/ei-ajustes.md` (Passo 5).
- **Revisão paralela cross-context:** após o fan-out de editores (Passo 5), `/ei-ajustes` despacha M instâncias paralelas de `docs-reviewer` em UMA única resposta (Passo 6), cada uma recebendo `<contexto_cruzado>` com os M-1 irmãos da rodada. Cada reviewer emite `<veredito>OK|CORRECAO|BLOQUEAR</veredito>` + `<feedback>`; CORRECAO dispara re-edit + re-fan-out COMPLETO dos M reviewers (cap de 2 correções por arquivo). Detalhe em `.claude/commands/ei-ajustes.md` (Passo 6).
- **Pipeline via hook (Stop event):** ao fim do fan-out de editores no Passo 5, o hook `.claude/hooks/post-ajustes-fanout.sh` (registrado no `.claude/settings.json` no evento `Stop`) detecta o sentinela `<ei-ajustes-round id=...>` no transcript e injeta `reason` (schema correto do Stop event — não `additionalContext`) instruindo o main Claude a emitir `<ei-ajustes-round-consumed id=...>` e prosseguir ao Passo 6. Protocolo sentinela ↔ consumed é stateless (zero arquivo de estado), idempotente, e re-dispara em CADA novo dispatch (retry PARL-04, correção REVW-04). Fallback é o **ESTADO PADRÃO**: se o hook não acionar (desabilitado / com bug / settings sem o bloco Stop), o `/ei-ajustes` continua manual como Phase 4 e adiciona a nota D-17 no resumo final. Hook antigo `.claude/hooks/post-scaffolder-review.sh` (SubagentStop, `client-project-scaffolder`) ganha guarda silenciosa que detecta o sentinela e sai exit 0 (D-11 — coexistência sem conflito). Detalhe em `.claude/commands/ei-ajustes.md` (Passo 5 REGRA INVIOLÁVEL HOOK-02 + Passo 6 REGRA INVIOLÁVEL HOOK-02).
- **Auditoria:** sempre via `docs-reviewer` após edição.
- **`modelo/` é read-only.** Detalhes em [`docs/proibido-fazer.md`](docs/proibido-fazer.md).
- **Princípios de edição:** ver [`docs/regras-edicao.md`](docs/regras-edicao.md).
- **Validação pós-edição:** ver [`docs/regras-validacao.md`](docs/regras-validacao.md).
