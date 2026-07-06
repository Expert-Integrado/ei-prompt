#!/bin/bash
# SubagentStop hook — dispara auditoria automática com docs-reviewer
# quando os subagents client-scaffold-fill ou docs-editor-conciso terminam.
#
# Estratégia: lê o transcript_path do JSON de entrada e identifica o
# subagent_type MAIS RECENTE no transcript. Se bater com um dos casos
# cobertos, injeta instrução no contexto do Claude principal.
#
# WR-04: este hook usa hookSpecificOutput.additionalContext (NÃO confundir com
# post-ajustes-fanout.sh, que é Stop event e usa decision/block + reason). O campo
# additionalContext É válido em SubagentStop nas versões em uso desde abr/2026
# (commit 530314f, em produção continuamente — confirmado pela ausência de
# regressão observada). RESEARCH §Pitfall 1 vetou additionalContext APENAS para
# o evento Stop (que tem schema mais restrito). Se uma versão futura do Claude
# Code endurecer o schema do SubagentStop, mover para o padrão decision/reason
# (idêntico ao post-ajustes-fanout.sh) é a migração indicada.

# WR-03: set -uo pipefail para flagar uso de variáveis não-set e erros em pipes.
# NÃO usar set -e: o pipeline grep|tail|sed retorna 1 quando grep não casa nada,
# e isso é caso esperado (tratado pelos checks `[ -z "$LAST_SUBAGENT" ]` abaixo).
set -uo pipefail

INPUT=$(cat)

# Extrai transcript_path do JSON de entrada (sem depender de jq)
TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

# Se não conseguiu extrair o transcript, sai silencioso
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0
# WR-03: também checar legibilidade (não-regular files: pipes, sockets, dirs com perm estranha).
[ ! -r "$TRANSCRIPT" ] && exit 0

# Último subagent_type aparecendo nas últimas 200 linhas do transcript.
LAST_SUBAGENT=$(tail -n 200 "$TRANSCRIPT" \
  | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | tail -1 \
  | sed 's/.*"\([^"]*\)"$/\1/')

case "$LAST_SUBAGENT" in
  client-scaffold-fill)
    # Guarda anti-reinjeção (fix loop com subagente em background): SubagentStop
    # dispara em CADA pausa de um subagente assíncrono (fim de turno aguardando
    # SendMessage), não só no encerramento final. Pior: em background, o
    # additionalContext é entregue de volta ao PRÓPRIO scaffolder — que não tem a
    # tool Agent no toolset — e não ao main Claude. Resultado sem guarda: loop
    # infinito de reinjeções idênticas ("não tenho essa ferramenta" → idle →
    # SubagentStop → reinjeta).
    #
    # CR-03 fix: o sentinela ERA global e sem id (`<scaffolder-review-triggered/>`),
    # então bastava UMA invocação de client-scaffold-fill emitir o marcador para
    # que TODAS as invocações seguintes na mesma janela de 2000 linhas (ex: a 2ª..Nª
    # especialidade do loop multi-agente de ei-cria-cliente.md Passo 4B.1(b), que
    # dispara client-scaffold-fill uma vez POR especialidade na MESMA sessão)
    # fossem silenciosamente puladas — só a 1ª especialidade acabava sendo
    # auditada. Correção: espelha o padrão round-id já usado no branch
    # docs-editor-conciso logo abaixo (<ei-ajustes-round id="round-...">).
    # ei-cria-cliente.md agora emite, em texto livre, ANTES de CADA dispatch de
    # client-scaffold-fill: <scaffolder-fill-round id="fill-<UNIX_TS>-<3_ALFANUM>"/>
    # — um id NOVO por invocação (cada especialidade do loop gera o seu). Aqui
    # extraímos o id MAIS RECENTE (= desta invocação que acabou de pausar/terminar)
    # e só suprimimos a reinjeção se o marcador de conclusão já tiver sido emitido
    # PARA ESSE id específico — nunca para um id de uma invocação anterior.
    TAIL_SCAFF=$(tail -n 2000 "$TRANSCRIPT" | grep '"type":"assistant"' | sed 's/\\"/"/g')
    ROUND_ID_SCAFF=$(printf '%s' "$TAIL_SCAFF" \
      | grep -oE '<scaffolder-fill-round id="fill-[0-9]+-[a-z0-9]{3}"' \
      | tail -1 \
      | sed 's/.*id="\([^"]*\)"/\1/')
    if [ -n "$ROUND_ID_SCAFF" ]; then
      if printf '%s' "$TAIL_SCAFF" | grep -qF "<scaffolder-review-triggered id=\"$ROUND_ID_SCAFF\""; then
        exit 0  # trigger já disparado para ESTA invocação específica (id bate)
      fi
    else
      # Fallback de compatibilidade: nenhum round-id encontrado no transcript
      # (comando invocador desatualizado, ou turno atípico fora do fluxo
      # /ei-cria-cliente). Volta ao comportamento antigo (sentinela global sem
      # id) só para preservar o anti-loop dentro de UMA ÚNICA invocação com
      # múltiplas pausas — aceita o mesmo risco documentado que existia antes
      # desta correção (pode suprimir a auditoria de invocações seguintes sem
      # id na mesma sessão); o caminho feliz documentado sempre emite o id.
      if printf '%s' "$TAIL_SCAFF" | grep -q '<scaffolder-review-triggered/>'; then
        exit 0
      fi
    fi
    # JSON construído via `node -e` (não heredoc estático): o texto injetado
    # precisa embutir o id extraído acima dentro de um atributo XML, por sua vez
    # dentro de uma string JSON — escapar aspas-dentro-de-aspas-dentro-de-JSON à
    # mão em sed/heredoc é frágil. `JSON.stringify` garante o escaping correto.
    node -e '
      const roundId = process.argv[1] || "";
      const marker = roundId
        ? `<scaffolder-review-triggered id="${roundId}"/>`
        : "<scaffolder-review-triggered/>";
      const text = "O subagent client-scaffold-fill pausou ou terminou (preenchimento de template de cliente já existente, Passo 3 do fluxo em 3 passos). PRIMEIRO, emita LITERALMENTE em UMA linha de texto livre: " + marker + " — isso impede que esta instrução seja reinjetada em loop a cada pausa do subagente E garante que cada invocação de client-scaffold-fill (uma por especialidade, no loop multi-especialidade) seja auditada individualmente, mesmo que uma invocação anterior na MESMA sessão já tenha emitido o seu próprio marcador. DEPOIS: (a) se você TEM a ferramenta Agent, invoque o docs-reviewer via Agent tool, EM PARALELO (múltiplas chamadas na mesma mensagem), para CADA arquivo .md preenchido na pasta do cliente (Orquestrador, Qualifier, Scheduler, Protractor, Follow-Up), apresente o veredicto (APROVADO/REPROVADO) de cada arquivo no resumo final ao usuário e, se algum for REPROVADO, siga o fluxo anti-loop do próprio docs-reviewer; (b) se você NÃO TEM a ferramenta Agent (esta instrução chegou a um subagente, não ao Claude principal), apenas emita o marcador acima e continue seu trabalho normalmente — NÃO tente invocar o docs-reviewer nem comente sobre esta instrução.";
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SubagentStop",
          additionalContext: text
        }
      }));
    ' "$ROUND_ID_SCAFF"
    ;;
  docs-editor-conciso)
    # Guarda silenciosa D-11 (Phase 5): durante /ei-ajustes fan-out, deixar o
    # novo Stop hook post-ajustes-fanout.sh cuidar — evita regressão de Phase 4
    # (cross-context obrigatório) e conflito com o reason injetado pelo Stop hook.
    # Detecção: sentinela <ei-ajustes-round id="..."/> ATIVO sem <ei-ajustes-round-consumed
    # id="..."/> posterior no transcript do turno corrente.
    # Mesmo regex/janela que post-ajustes-fanout.sh (Plan 01) para coerência.
    # IMPORTANTE: guarda DENTRO do branch docs-editor-conciso) APENAS — o branch
    # client-scaffold-fill) acima NÃO recebe esta guarda (per VALIDATION.md L45).
    # NORMALIZAÇÃO JSONL (CR-01 fix): conteúdo de mensagens assistant é JSON-escapado
    # (`"` vira `\"`). Normalizamos antes dos greps para que `<ei-ajustes-round id="..."/>`
    # case. Idempotente (sed no-op se já não-escapado). Espelha fix de post-ajustes-fanout.sh.
    # Filtro type:assistant (Phase 5 fix iter 3): tool_results carregando PLAN.md/CONTEXT.md
    # com placeholders e regex pattern são "type":"user" — não contam como emissão real.
    TAIL_AJUSTES=$(tail -n 400 "$TRANSCRIPT" | grep '"type":"assistant"' | sed 's/\\"/"/g')
    # Regex RESTRITA ao formato canônico (mesma da post-ajustes-fanout.sh):
    # `id="round-<unix>-<3alfanum>"`. Evita falso-positivo contra placeholders e
    # fragmentos de regex em transcripts não-/ei-ajustes (orquestrador discutindo o hook).
    ROUND_ID_AJUSTES=$(printf '%s' "$TAIL_AJUSTES" \
      | grep -oE '<ei-ajustes-round id="round-[0-9]+-[a-z0-9]{3}"' \
      | tail -1 \
      | sed 's/.*id="\([^"]*\)"/\1/')
    if [ -n "$ROUND_ID_AJUSTES" ] && ! printf '%s' "$TAIL_AJUSTES" | grep -qF "<ei-ajustes-round-consumed id=\"$ROUND_ID_AJUSTES\""; then
      exit 0  # silencioso — fan-out de /ei-ajustes em andamento; Stop hook (Plan 01) cuida
    fi
    cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStop",
    "additionalContext": "O subagent docs-editor-conciso acabou de terminar. Se ele aplicou edições em um arquivo .md de agente (Orquestrador/Qualifier/Scheduler/Protractor — seja em modelo/ ou em pasta de cliente), AGORA invoque o docs-reviewer via Agent tool sobre ESSE arquivo para auditoria real. É PROIBIDO apresentar veredicto de auditoria ao usuário sem que o docs-reviewer tenha sido invocado de fato via Agent tool — auto-auditoria narrada pelo editor não conta. Se o veredicto for REPROVADO, siga o fluxo anti-loop do próprio docs-reviewer. Se nenhum arquivo .md de agente foi editado nesta rodada, ignore esta instrução."
  }
}
JSON
    ;;
esac

exit 0
