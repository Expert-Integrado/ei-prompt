# Multi-Agente — Transferência do Recepcionista (Personificação)

> Particularidade do fluxo multi-agente quando o Recepcionista transfere para um especialista.

## Regra

Após o Recepcionista identificar a intenção e acionar o Protractor com `TRANSFERIR_PARA_AGENT:[especialista]`, **quem envia a primeira mensagem ao lead em nome do especialista é o próprio Recepcionista** — personificando o especialista, sem informar ao lead que houve transferência.

Somente a **próxima mensagem do lead em diante** é de fato roteada para o agente especialista.

## Por quê

- A transferência técnica acontece no backend (router/orquestração), não no chat.
- Se o especialista mandasse a primeira mensagem, o lead veria um "salto" entre interlocutores (delay de roteamento, nova identidade aparecendo do nada).
- Personificar no Recepcionista mantém continuidade visual da conversa: o lead percebe um único atendente que assumiu o tema.

## Como aplicar

Editar **`<Recepcionista>/Orquestrador.md`** (NUNCA o `Orquestrador.md` do especialista):

1. Manter `<agentes_disponiveis>` com cada especialista e seus gatilhos.
2. Adicionar, para cada especialista, a **mensagem inicial de personificação** que o Recepcionista enviará no MESMO turno do `TRANSFERIR_PARA_AGENT`.
3. Em `<fluxo_recepcao>` Passo 4 (Transferir): após acionar o Protractor, enviar a mensagem inicial do especialista escolhido como se fosse ele.

### Sinais no chat

- ❌ "Vou te transferir para o nosso especialista em X."
- ❌ "Aguarde, estou te conectando."
- ❌ "Olá, sou o especialista X, recebi seu caso do recepcionista."
- ✅ Mensagem direta no tom/abordagem do especialista, como se ele já estivesse na conversa.

## O que NÃO mudar

- Os agentes da especialidade (`<Especialidade>/Orquestrador.md`, `Qualifier.md`, etc.) **não** mudam — não precisam de "mensagem de apresentação pós-transferência".
- O Protractor continua sendo o único responsável por executar a transferência (`TRANSFERIR_PARA_AGENT`). A personificação acontece NO Recepcionista, no MESMO turno em que o Protractor é acionado.
- `modelo/Recepcionista.md` é read-only — a mensagem de personificação por especialista entra no **cliente**, não no template.

## Como o `/ei-ajustes` deve tratar pedidos sobre isso

Pedidos típicos do usuário:
- "Depois da transferência, o próximo agente precisa se apresentar"
- "O agente X precisa abrir a conversa quando o recepcionista mandar pra ele"
- "Não quero que o lead perceba que mudou de agente"

→ Analyzer DEVE apontar para `<cliente>/Recepcionista/Orquestrador.md` (seção `<fluxo_recepcao>` ou `<agentes_disponiveis>`), **NÃO** para `<cliente>/<Especialidade>/Orquestrador.md`.
