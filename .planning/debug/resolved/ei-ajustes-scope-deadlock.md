---
status: resolved
trigger: "Auditoria do /ei-ajustes não rodou limpa de primeira; correção do reviewer travou (Rodada 3) porque o guard de escopo D-06 recusou uma correção cross-section legítima. Resolvido manualmente na Rodada 4 re-aprovando com escopo ampliado."
created: 2026-07-23
updated: 2026-07-23
resolution: "Adicionada válvula REVW-05 (gate de escalonamento de escopo) em .claude/commands/ei-ajustes.md — quando o re-edit de correção retorna ERRO 'fora do escopo declarado', abre AskUserQuestion pedindo ao humano ampliar o escopo às seções que o reviewer citou, e re-despacha a MESMA correção com secao_tag ampliado. Automatiza o workaround manual da Rodada 4; D-06 permanece intacto."
files_changed:
  - .claude/commands/ei-ajustes.md
---

## Symptoms

- Rodada 1: 5 editores; 3 retornaram `<resultado>OK</resultado>`, 2 (AA Orquestrador + AA Qualifier) sem marcador → fail-closed (marcador ausente = FALHO) mesmo com diff provando edição aplicada. Usuário escolheu "Pular falhos e seguir".
- Rodada 2: 3 reviewers → todos `CORRECAO` (resíduos de `TRANSFERIR_PARA_AGENT` em `<objetivo>`, `<instrucoes_pos_transferencia>`, `<response_format>` — seções fora do `secao_tag` do analyzer — + inversão de domínio).
- Rodada 3 (TRAVOU): re-editores presos ao `secao_tag` original; correção exigia outras seções → recusaram com `<resultado>ERRO: correção fora do escopo declarado</resultado>` (D-06). Ciclo encerrou sem auditoria limpa.
- Rodada 4 (resolveu, manual): re-aprovação com escopo ampliado às seções apontadas pelo reviewer → editores aplicaram → auditoria cross-context passou.

## Root Cause (CONFIRMED — direto no fonte)

Assimetria de autoridade entre reviewer e editor no loop de correção do Passo 6:

- `docs-reviewer` audita **cross-context / o arquivo inteiro** e pode emitir `CORRECAO` cujo `<feedback>` exige mexer em seções FORA do `secao_tag` que o `docs-analyzer` declarou (ei-ajustes.md:556-557 confirma que o reviewer sinaliza problemas em qualquer seção/irmão).
- Mas o re-dispatch do editor (REVW-04, `.claude/commands/ei-ajustes.md:696`) **re-clampa o editor ao `secao_tag` original** e instrui: "Se a correção pedida exigir mexer fora desse ESCOPO, NÃO edite — encerre com `<resultado>ERRO: correção pedida está fora do escopo declarado>`".
- Esse ERRO cai no ramo (d) do parsing (`.claude/commands/ei-ajustes.md:712`) → tratado como falha genérica de editor → cap de retry → arquivo termina em `FALHO_EDITOR_NA_CORRECAO`.

Resultado: **toda CORRECAO cross-section é um deadlock estrutural** — o reviewer tem autoridade para pedir a correção, o editor não tem autoridade para aplicá-la, e não existe válvula de escalonamento. Não é bug de código; é lacuna de design no protocolo do Passo 6. O guard D-06 funcionou como projetado; o que falta é uma rota legítima para ampliar escopo quando o reviewer justifica.

### Localização
- `.claude/commands/ei-ajustes.md:696` — clamp de escopo no re-edit de correção
- `.claude/commands/ei-ajustes.md:712-715` — ERRO de escopo tratado como falha terminal, sem escalonamento

## Escopo de conserto
- **Fixável NESTE repo (ei-prompt):** o deadlock do pipeline (`ei-ajustes.md`). É o único item que vive aqui.
- **NÃO fixável aqui (precisa da pasta do cliente, que não está neste repo):**
  - Bug estrutural do conteúdo `Auxílio Acidente/` (conteúdo é de Aposentadoria/Previdenciário).
  - Fechar auditoria formal de AA Orquestrador + AA Qualifier via `/ei-ajustes`.

## Fix candidato (não aplicado ainda — aguardando decisão)
Opção A (recomendada, alinhada à cultura de gate humano do projeto): quando um re-edit de correção retornar o ERRO específico "fora do escopo declarado", NÃO cair direto em FALHO — abrir um AskUserQuestion de escalonamento ("O reviewer quer corrigir a seção X, fora do escopo aprovado Y. Ampliar escopo para incluir X?"). Se aprovado, re-despachar a correção com `secao_tag` ampliado. Espelha exatamente o que foi feito manualmente na Rodada 4.
