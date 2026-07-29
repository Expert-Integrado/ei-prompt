---
phase: quick-260729-stk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/agents/client-scaffold-collect.md
  - .claude/agents/client-scaffold-fill.md
  - .claude/agents/docs-analyzer.md
  - .claude/agents/docs-editor-conciso.md
  - .claude/agents/docs-reviewer.md
  - .claude/agents/client-scaffold-structure.md
  - .claude/agents/recepcionista-scaffolder.md
  - .claude/commands/ei-cria-cliente.md
  - .claude/commands/ei-ajustes.md
  - package.json
  - CHANGELOG.md
autonomous: true
requirements: [QUICK-260729-stk]

must_haves:
  truths:
    - "Nas 10 linhas remanescentes que citam o caminho interno em `.claude/agents/` e `.claude/commands/`, `CLAUDE.md` é mencionado ANTES do caminho `client/`-prefixado — o caminho da raiz é o normal/esperado."
    - "O template de prompt do reviewer dentro de `.claude/commands/ei-ajustes.md` (Passo 6) cita apenas `CLAUDE.md` — nenhum caminho `client/`-prefixado é injetado no prompt de um subagente que roda no projeto do cliente."
    - "As 6 linhas de bullet de carregamento de contexto (Passo 0 / Passo 4) usam uma única redação canônica byte-idêntica, ignorando indentação."
    - "As 9 linhas de instrução de carregamento dizem explicitamente que a ausência do arquivo do repo-fonte é o caso NORMAL e que o agente não reporta erro, não avisa e não pergunta por ele."
    - "A semântica dual-contexto continua funcionando: no repo-fonte do ei-prompt, o arquivo em `client/` mantém precedência de leitura quando existe (o CLAUDE.md da raiz do repo é doc interno de dev, não o payload do cliente)."
    - "`package.json` está na versão `2.2.1` e `CHANGELOG.md` tem a entrada `[2.2.1]` no topo, no mesmo formato das entradas existentes."
    - "`npm test` continua verde (47/47) e `manifest.json` + `modelo/` seguem intocados."
  artifacts:
    - .claude/agents/client-scaffold-collect.md
    - .claude/agents/client-scaffold-fill.md
    - .claude/agents/docs-analyzer.md
    - .claude/agents/docs-editor-conciso.md
    - .claude/agents/docs-reviewer.md
    - .claude/agents/client-scaffold-structure.md
    - .claude/agents/recepcionista-scaffolder.md
    - .claude/commands/ei-cria-cliente.md
    - .claude/commands/ei-ajustes.md
    - package.json
    - CHANGELOG.md
  key_links:
    - "`manifest.json` linha 5 — `{ \"from\": \"client/CLAUDE.md\", \"to\": \"CLAUDE.md\" }` é a CAUSA-RAIZ do bug e deve permanecer EXATAMENTE como está; é o mapeamento correto, não o defeito."
    - "`.claude/agents/docs-reviewer.md` Passo 0 — é o único lugar que continua resolvendo a precedência dual-contexto para o reviewer depois que a linha do template de prompt em `ei-ajustes.md` for limpa. Se o Passo 0 do docs-reviewer perder a exceção do repo-fonte, o reviewer passa a ler o doc interno errado quando rodando dentro deste repo."
    - "`CHANGELOG.md` está no `files` do `manifest.json` — a entrada `[2.2.1]` é distribuída aos clientes e é o que `/ei-update` mostra."
---

<!-- planner-discipline-allow: client/CLAUDE.md -->

<objective>
Inverter a precedência das referências ao arquivo de regras nos 9 arquivos de agente/comando distribuídos pelo `manifest.json`: `CLAUDE.md` (raiz do projeto) passa a ser a referência canônica citada PRIMEIRO, e o caminho interno `client/`-prefixado vira apenas exceção declarada do repo-fonte. Preparar a release (bump de patch + entrada de CHANGELOG) para que o merge em `main` possa publicar.

Purpose: o instalador npx grava o payload como `CLAUDE.md` na raiz do projeto do cliente (`manifest.json` linha 5 é o único `{from,to}` do manifest). Logo, num projeto instalado o caminho `client/`-prefixado NUNCA existe — mas hoje 11 pontos de prompt o citam primeiro, fazendo um path inexistente vazar para dentro de prompts de subagente (pior caso: o template que `/ei-ajustes` cola no `docs-reviewer`) e para o que é mostrado ao usuário.

Output: 11 linhas reescritas em 9 arquivos, `package.json` em `2.2.1`, entrada `[2.2.1]` no topo do `CHANGELOG.md`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

Fatos já levantados e confirmados — NÃO re-descobrir, NÃO reabrir a decisão:

1. `manifest.json` linha 5 é `{ "from": "client/CLAUDE.md", "to": "CLAUDE.md" }` — o único arquivo renomeado na instalação. `manifest.json` NÃO deve ser tocado por este plano; o mapeamento é justamente o correto.
2. Grep confirmado: existem EXATAMENTE 11 ocorrências em arquivos distribuídos de agente/comando, listadas com `path:linha` nas tasks abaixo. Não existe nenhuma outra ocorrência em `client/`, `docs/`, `modelo/`, `README.md` ou `RELEASE.md` (grep retornou vazio).
3. `package.json` está em `2.2.0`; a última entrada do `CHANGELOG.md` é `## [2.2.0] - 2026-07-23`. Data de hoje: `2026-07-29`.
4. Baseline de teste: `npm test` = 47 passando / 0 falhando.

Arquivos que TAMBÉM citam o caminho interno e devem ficar **INTOCADOS** — justificativa para o executor não "consertar por conta própria":

- `.claude/hooks/check-claude-md-audience.sh` e `.claude/hooks/check-claude-md-audience.test.js` — guarda de regressão de dev, repo-local-only por design: NÃO está no `manifest.json`, NÃO está registrado em `.claude/settings.json` (só no `.claude/settings.local.json` gitignorado). O caminho interno ali é o alvo legítimo da exclusão do hook. Além disso o hook só dispara em Edit/Write sobre arquivos `CLAUDE.md` — as edições deste plano são em `.md` de agente/comando, então ele não vai disparar.
- `.claude/hooks/inject-ei-context.sh:13` — hook desativado em v1.8.9; está no `manifest.json` mas não registrado em `.claude/settings.json`. Fora de escopo (risco latente apenas), deixar como está.
- `manifest.json` — o `from` é correto por definição.
- `modelo/*.md` — read-only por regra dura do projeto (`docs/proibido-fazer.md`). Nenhuma task toca ali.
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Redação canônica nos 5 agentes de bullet (6 pontos de edição)</name>
  <files>.claude/agents/client-scaffold-collect.md, .claude/agents/client-scaffold-fill.md, .claude/agents/docs-analyzer.md, .claude/agents/docs-editor-conciso.md, .claude/agents/docs-reviewer.md</files>
  <action>
Esta é a fatia tracer: estabelece a REDAÇÃO CANÔNICA que as Tasks seguintes reutilizam, e prova o gate de ordenação end-to-end num subconjunto real antes de espalhar.

Defina a redação canônica de bullet (chame de CANON-B). Ela é UMA linha, e deve ser byte-idêntica nos 5 pontos de bullet abaixo (a única variação permitida é a indentação preexistente da linha):

CANON-B (substituir a partir do hífen; preservar a indentação original da linha):
"- `CLAUDE.md` (raiz do projeto) — referência canônica. Exceção só no repo-fonte do ei-prompt: se `client/CLAUDE.md` existir (Glob), leia esse em vez do da raiz; a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele."

Aplique CANON-B, uma linha por vez, via Edit, nestes 5 pontos. Em cada um, a linha atual a ser substituída é a que hoje começa com "- `client/CLAUDE.md` se existir (Glob)":

1. `.claude/agents/client-scaffold-collect.md` linha 19 (sem indentação — bullet de "## Passo 0 — Carregar Regras")
2. `.claude/agents/client-scaffold-fill.md` linha 19 (sem indentação — bullet de "## Passo 0 — Carregar Contexto")
3. `.claude/agents/docs-analyzer.md` linha 18 (sem indentação — bullet de "## PASSO 0 — CARREGAR REGRAS")
4. `.claude/agents/docs-editor-conciso.md` linha 14 (sem indentação — bullet de "## PASSO 0 — CARREGAR REGRAS DE EDIÇÃO")
5. `.claude/agents/docs-reviewer.md` linha 19 — ATENÇÃO: esta linha é um sub-bullet aninhado sob o item numerado "1. **Ler via `Read`**" e tem EXATAMENTE 3 espaços de indentação. Preserve os 3 espaços antes do hífen.

Nesses 5 pontos, note que as redações atuais divergem entre si: quatro delas terminam com o gloss longo "(fallback dual-contexto: repo-fonte do ei-prompt vs. projeto de cliente instalado)" e a de `docs-reviewer.md` termina com o gloss curto "(fallback dual-contexto)". CANON-B substitui as duas variantes — a convergência para uma redação única é intencional e é verificada pelo gate de unicidade.

6º ponto de edição, no MESMO arquivo do item 4 — `.claude/agents/docs-editor-conciso.md` linha 95, dentro de "## VERIFICAÇÃO DE ESCOPO". Esta linha NÃO é uma instrução de carregamento, é uma referência cruzada de volta ao arquivo já carregado no PASSO 0, então NÃO leva a cláusula de ausência-é-normal (repeti-la aqui duplicaria uma regra, o que a convenção do projeto proíbe). Só inverta a ordem de citação dentro do parêntese, mantendo o resto da frase intacto: o parêntese "(`client/CLAUDE.md` ou `CLAUDE.md`, conforme o Glob determinou)" passa a ser "(`CLAUDE.md` da raiz, ou `client/CLAUDE.md` se o Glob do PASSO 0 tiver encontrado esse)".

Não altere nenhuma outra linha desses 5 arquivos. Não crie seção nova. Não mexa no frontmatter YAML (a tool `Glob` já está declarada em todos eles — verifique, mas não adicione se já estiver lá).
  </action>
  <verify>
    <automated>F1=".claude/agents/client-scaffold-collect.md .claude/agents/client-scaffold-fill.md .claude/agents/docs-analyzer.md .claude/agents/docs-editor-conciso.md .claude/agents/docs-reviewer.md"; test "$(grep -h 'client/CLAUDE\.md' $F1 | wc -l)" = "6" && grep -n 'client/CLAUDE\.md' $F1 | awk -F'client/CLAUDE.md' 'index($1,"CLAUDE.md")==0{b++} END{if(b>0) exit 1}' && test "$(grep -h '^[[:space:]]*- `CLAUDE\.md`' $F1 | sed 's/^[[:space:]]*//' | sort -u | wc -l)" = "1" && test "$(grep -h '^[[:space:]]*- `CLAUDE\.md`' $F1 | wc -l)" = "5" && test "$(grep -h 'client/CLAUDE\.md' $F1 | grep -c 'não reporte erro')" = "5" && echo GATE1-OK</automated>
  </verify>
  <done>Os 6 pontos citam `CLAUDE.md` antes do caminho interno; as 5 linhas de bullet são uma única redação idêntica (modulo indentação) e todas carregam a cláusula de ausência-é-normal; a 6ª (referência cruzada em `docs-editor-conciso.md`) inverteu só a ordem no parêntese. `docs-reviewer.md` linha 19 mantém os 3 espaços de indentação.</done>
</task>

<task type="auto">
  <name>Task 2: Inverter as 3 instruções em prosa + limpar o template de prompt do reviewer (5 pontos)</name>
  <files>.claude/agents/client-scaffold-structure.md, .claude/agents/recepcionista-scaffolder.md, .claude/commands/ei-cria-cliente.md, .claude/commands/ei-ajustes.md</files>
  <action>
Expande a redação canônica da Task 1 para os pontos que não são bullet. Reutilize literalmente a cláusula final estabelecida na Task 1 — "Exceção só no repo-fonte do ei-prompt: se `client/CLAUDE.md` existir (Glob), leia esse em vez do da raiz; a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele." — anexada ao fim de cada frase reescrita.

Ponto A — `.claude/agents/client-scaffold-structure.md` linha 20 (item "1." de "## Fase 0: Carregar Contexto do Projeto"). A frase atual abre com "Verifique se `client/CLAUDE.md` existe (Glob)". Reescreva para abrir com a leitura da raiz, preservando o gloss de conteúdo que já está na linha ("é a fonte real das regras do projeto (arquitetura dos agentes, naming patterns, arquitetura multi-agente)"), e anexe a cláusula de exceção ao fim. Resultado:
"1. Leia `CLAUDE.md` (raiz do projeto) via Read — é a fonte real das regras do projeto (arquitetura dos agentes, naming patterns, arquitetura multi-agente). Exceção só no repo-fonte do ei-prompt: se `client/CLAUDE.md` existir (Glob), leia esse em vez do da raiz; a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele."

Ponto B — `.claude/agents/recepcionista-scaffolder.md` linha 40 (item "1." de "### Fase 0: Carregar Contexto"). Mesmo tratamento, preservando o gloss de seção que já está na linha:
"1. Leia `CLAUDE.md` (raiz do projeto) via Read — internalize a seção \"Arquitetura Multi-Agente (opcional — Recepcionista)\". Exceção só no repo-fonte do ei-prompt: se `client/CLAUDE.md` existir (Glob), leia esse em vez do da raiz; a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele."

Ponto C — `.claude/commands/ei-cria-cliente.md` linha 16 (item "1." de "### Passo 1 — Carregar contexto"). Mesmo tratamento, preservando o "integralmente" e o gloss de seção:
"1. Leia `CLAUDE.md` (raiz do projeto) integralmente via Read — atenção à seção \"Arquitetura Multi-Agente (opcional — Recepcionista)\". Exceção só no repo-fonte do ei-prompt: se `client/CLAUDE.md` existir (Glob), leia esse em vez do da raiz; a ausência dele é o caso NORMAL, então não reporte erro, não avise o usuário e não pergunte por ele."

Ponto D — `.claude/commands/ei-ajustes.md` linha 265 (bullet de "### Passo 4: Carregar contexto"). Aplique CANON-B da Task 1, byte-idêntica, sem indentação. A linha atual é a variante de gloss curto "(fallback dual-contexto)".

Ponto E — `.claude/commands/ei-ajustes.md` linha 553. ESTE É O PONTO CRÍTICO: a linha vive DENTRO do template de prompt que o comando cola no `docs-reviewer` no fan-out do Passo 6, ou seja, o texto é literalmente injetado no prompt de um subagente que roda no projeto do cliente. A linha deve citar SÓ o arquivo da raiz — nenhum segmento `client/` pode aparecer nela. Reescreva a linha (que hoje é "- `client/CLAUDE.md` (ou `CLAUDE.md`, conforme o Passo 4 determinou) + docs/regras-validacao.md + docs/proibido-fazer.md (re-ler se ainda não leu nesta sessão)") para:
"- `CLAUDE.md` + docs/regras-validacao.md + docs/proibido-fazer.md (re-ler se ainda não leu nesta sessão)"

Nada de semântica é perdido no Ponto E: a resolução dual-contexto continua acontecendo no Passo 0 do próprio `.claude/agents/docs-reviewer.md`, que a Task 1 já deixou com a exceção do repo-fonte. Confirme isso por leitura antes de aplicar E — se o Passo 0 do docs-reviewer não tiver a exceção, pare e reporte.

Não altere nenhuma outra linha desses 4 arquivos. Em particular, não mexa em nenhuma outra parte do template de prompt do Passo 6 nem nas regras invioláveis PARL-02 / REVW-03 / REVW-05 vizinhas.
  </action>
  <verify>
    <automated>F2=".claude/agents/client-scaffold-structure.md .claude/agents/recepcionista-scaffolder.md .claude/commands/ei-cria-cliente.md .claude/commands/ei-ajustes.md"; test "$(grep -h 'client/CLAUDE\.md' $F2 | wc -l)" = "4" && test "$(grep -c 'client/CLAUDE\.md' .claude/commands/ei-ajustes.md)" = "1" && grep -n 'client/CLAUDE\.md' $F2 | awk -F'client/CLAUDE.md' 'index($1,"CLAUDE.md")==0{b++} END{if(b>0) exit 1}' && test "$(grep -h 'client/CLAUDE\.md' $F2 | grep -c 'não reporte erro')" = "4" && grep -q '^- `CLAUDE\.md` + docs/regras-validacao\.md + docs/proibido-fazer\.md' .claude/commands/ei-ajustes.md && echo GATE2-OK</automated>
  </verify>
  <done>Os 3 pontos em prosa (A, B, C) abrem pela leitura da raiz e carregam a cláusula de exceção; o Ponto D é CANON-B byte-idêntica; `ei-ajustes.md` tem exatamente 1 ocorrência do caminho interno (linha 265 / Ponto D) e a linha do template de prompt do reviewer cita só `CLAUDE.md`.</done>
</task>

<task type="auto">
  <name>Task 3: Release prep — bump de patch + entrada de CHANGELOG</name>
  <files>package.json, CHANGELOG.md</files>
  <action>
Obrigatório por `RELEASE.md`: o push em `main` dispara `npm publish` via `.github/workflows/publish.yml`, então o bump e o CHANGELOG têm que estar no branch ANTES do merge.

1. `package.json`: bump de patch, `"version": "2.2.0"` → `"version": "2.2.1"`. Só esse campo; mantenha 2 espaços de indentação e aspas duplas.

2. `CHANGELOG.md`: inserir uma nova entrada IMEDIATAMENTE depois da linha `# Changelog` (linha 1) e da linha em branco, ou seja ACIMA de `## [2.2.0] - 2026-07-23`. Siga exatamente o formato das entradas existentes: cabeçalho `## [versão] - AAAA-MM-DD`, depois uma linha em negrito de resumo voltado ao usuário final, depois bullets — os primeiros em linguagem de usuário (o que mudou na prática, começando com um trecho em negrito), os seguintes técnicos com o path do arquivo em negrito + crases, e o último sempre o bullet de `package.json`. Texto em PT-BR. Conteúdo:

```
## [2.2.1] - 2026-07-29

**Os agentes não citam mais um arquivo que nunca existe no seu projeto.**

- **As instruções internas dos agentes apontavam para o caminho errado primeiro.** O arquivo de regras que o instalador grava no seu projeto é sempre o `CLAUDE.md` na raiz — mas as instruções dos agentes citavam antes um caminho que só existe no repositório interno do ei-prompt. Isso fazia esse caminho inexistente vazar para dentro dos prompts dos subagentes e, às vezes, para as mensagens mostradas a você. Agora `CLAUDE.md` é a referência canônica em todos os pontos, e o caminho interno só aparece como exceção explícita do repositório-fonte, com instrução clara de que a ausência dele é o caso normal — nenhum agente reporta erro, avisa ou pergunta pelo arquivo quando não o encontra.
- **`.claude/agents/client-scaffold-collect.md`, `.claude/agents/client-scaffold-fill.md`, `.claude/agents/docs-analyzer.md`, `.claude/agents/docs-editor-conciso.md`, `.claude/agents/docs-reviewer.md`, `.claude/commands/ei-ajustes.md`**: a linha de carregamento de contexto do Passo 0 (Passo 4 no `/ei-ajustes`) passa a usar uma redação canônica única e idêntica nos 6 arquivos, com `CLAUDE.md` primeiro.
- **`.claude/agents/client-scaffold-structure.md`, `.claude/agents/recepcionista-scaffolder.md`, `.claude/commands/ei-cria-cliente.md`**: mesma inversão de precedência na instrução numerada da Fase/Passo 0, preservando os glosses de seção que cada uma já trazia.
- **`.claude/agents/docs-editor-conciso.md`**: a referência cruzada da "VERIFICAÇÃO DE ESCOPO" ao arquivo carregado no PASSO 0 também cita `CLAUDE.md` primeiro.
- **`.claude/commands/ei-ajustes.md`**: no template de prompt colado no `docs-reviewer` durante o fan-out do Passo 6, a checklist de regras agora cita só `CLAUDE.md` — o caminho interno deixa de ser injetado no prompt de um subagente que roda dentro do projeto do cliente. A resolução dual-contexto continua acontecendo no Passo 0 do próprio `docs-reviewer`.
- **Sem mudança de comportamento no repositório-fonte** e sem mudança em `manifest.json`: quando o arquivo interno existe, ele mantém a precedência de leitura.
- **`package.json`**: version `2.2.0` → `2.2.1`.
```

NÃO abra PR e NÃO faça merge em `main` — isso é decisão do orquestrador depois, fora deste plano. Commit no branch atual (`dev`) apenas.

Regra dura do projeto: a mensagem de commit NUNCA inclui assinatura de geração automática nem linha de co-autoria.
  </action>
  <verify>
    <automated>node -e 'const v=require("./package.json").version; if(v!=="2.2.1"){console.error("version="+v);process.exit(1)}' && head -3 CHANGELOG.md | grep -q '^## \[2\.2\.1\] - 2026-07-29$' && grep -q '`2\.2\.0` → `2\.2\.1`' CHANGELOG.md && test "$(grep -n '^## \[2\.2\.1\]' CHANGELOG.md | cut -d: -f1)" -lt "$(grep -n '^## \[2\.2\.0\]' CHANGELOG.md | cut -d: -f1)" && npm test >/dev/null 2>&1 && echo GATE3-OK</automated>
  </verify>
  <done>`package.json` em `2.2.1`; `CHANGELOG.md` tem `## [2.2.1] - 2026-07-29` no topo (acima da entrada 2.2.0) com o bullet de bump de versão; `npm test` continua verde. Nenhum PR aberto, nenhum merge em `main`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo-fonte `ei-prompt` → projeto do cliente (via `npx`) | Todo `.md` listado em `manifest.json.files` atravessa esta fronteira e passa a ser lido como instrução dentro do projeto de um terceiro. Texto de prompt aqui é payload, não documentação interna. |
| comando `/ei-ajustes` → prompt de subagente (`docs-reviewer`) | O comando cola um template de texto no prompt de um subagente. Qualquer path errado no template é executado como instrução por um agente rodando no projeto do cliente. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick260729stk-01 | Information Disclosure | `.claude/commands/ei-ajustes.md` linha 553 (template de prompt do reviewer) | medium | mitigate | Task 2 Ponto E remove o caminho interno do template; gate de Task 2 força `grep -c` = 1 ocorrência em todo o arquivo (só a linha 265, que é instrução local do comando, não texto injetado em subagente). |
| T-quick260729stk-02 | Information Disclosure | 10 linhas de instrução nos 9 arquivos distribuídos | low | mitigate | Tasks 1 e 2 invertem a precedência e adicionam a cláusula explícita de não-reportar / não-avisar / não-perguntar, evitando que o path interno chegue ao usuário final como erro ou pergunta. |
| T-quick260729stk-03 | Tampering | `.claude/agents/docs-reviewer.md` Passo 0 (último resolvedor dual-contexto após a limpeza do Ponto E) | medium | mitigate | Task 2 exige leitura-confirmação do Passo 0 do `docs-reviewer` antes de aplicar o Ponto E, com parada e report se a exceção do repo-fonte não estiver presente; gate de Task 1 prova a presença da cláusula naquele arquivo. |
| T-quick260729stk-04 | Tampering | `manifest.json` / `modelo/*.md` (zonas read-only) | low | mitigate | Nenhuma task os lista em `<files>`; a `<verification>` do plano exige diff vazio para ambos. |
| T-quick260729stk-SC | Tampering | npm/pip/cargo installs | low | accept | Nenhuma task instala pacote — o plano só edita `.md`, `package.json` (campo `version`) e `CHANGELOG.md`. Projeto permanece zero-dependency, `npm test` roda apenas `node --test` (built-in). Sem superfície de supply chain nesta mudança, logo sem necessidade de gate de legitimidade de pacote. |
</threat_model>

<verification>
Rodar na raiz do repo depois das 3 tasks:

1. Escopo completo — ordem invertida em TODAS as ocorrências remanescentes de agentes/comandos (nenhuma linha cita o caminho interno antes de `CLAUDE.md`):
   `grep -rn 'client/CLAUDE\.md' .claude/agents/ .claude/commands/ | awk -F'client/CLAUDE.md' 'index($1,"CLAUDE.md")==0{b++} END{if(b>0){print "VIOLACOES: " b; exit 1}}'`

2. Contagem total caiu de 11 para 10 (o Ponto E foi removido, os outros 10 permanecem como exceção declarada):
   `test "$(grep -rh 'client/CLAUDE\.md' .claude/agents/ .claude/commands/ | wc -l)" = "10"`

3. Redação canônica reutilizada — as 6 linhas de bullet colapsam numa única forma:
   `test "$(grep -rh '^[[:space:]]*- \`CLAUDE\.md\`' .claude/agents/ .claude/commands/ | sed 's/^[[:space:]]*//' | sort -u | wc -l)" = "1" && test "$(grep -rh '^[[:space:]]*- \`CLAUDE\.md\`' .claude/agents/ .claude/commands/ | wc -l)" = "6"`

4. Cláusula de ausência-é-normal presente nas 9 linhas de instrução de carregamento (a 10ª é a referência cruzada em `docs-editor-conciso.md`, que deliberadamente não a repete):
   `test "$(grep -rh 'client/CLAUDE\.md' .claude/agents/ .claude/commands/ | grep -c 'não reporte erro')" = "9"`

5. Zonas read-only intocadas:
   `test -z "$(git diff --name-only -- manifest.json modelo/)"`

6. Nenhuma regressão de código:
   `npm test` → 47 passando, 0 falhando.

7. Diff total confinado aos 11 arquivos esperados:
   `git diff --name-only | sort` deve conter exatamente os 9 `.md` de agente/comando + `package.json` + `CHANGELOG.md` (fora de `.planning/`).
</verification>

<success_criteria>
- [ ] 11 pontos de edição aplicados em 9 arquivos; nenhuma linha extra alterada.
- [ ] `CLAUDE.md` citado primeiro em 100% das ocorrências remanescentes (gate 1 passa com 0 violações).
- [ ] `.claude/commands/ei-ajustes.md` tem exatamente 1 ocorrência do caminho interno, e ela NÃO está dentro do template de prompt do reviewer.
- [ ] As 6 linhas de bullet são uma única redação canônica (gate 3 = 1 forma única / 6 linhas).
- [ ] As 9 instruções de carregamento afirmam explicitamente que a ausência do arquivo do repo-fonte é normal e proíbem erro/aviso/pergunta.
- [ ] `manifest.json` e `modelo/` com diff vazio.
- [ ] `package.json` = `2.2.1`; `CHANGELOG.md` com entrada `[2.2.1] - 2026-07-29` no topo.
- [ ] `npm test` verde (47/47).
- [ ] Commits sem assinatura de geração automática nem co-autoria.
- [ ] Nenhum PR aberto e nenhum merge em `main` (fora de escopo deste plano).
</success_criteria>

<output>
Create `.planning/quick/260729-stk-corrigir-referencias-a-client-claude-md-/260729-stk-SUMMARY.md` when done
</output>
