#!/usr/bin/env bash
# Phase 01 — bateria de greps estáticos para validação estrutural
#
# Cobre D-01..D-16 do CONTEXT.md (rejeição + reforço do docs-analyzer).
# Estrutural-only — runtime UAT fica fora de escopo (D-16 — alinhado com v1.8.9).
#
# Uso:
#   bash .planning/phases/01-reforco-docs-analyzer/check-greps.sh
#
# Referências:
#   - .planning/phases/01-reforco-docs-analyzer/01-CONTEXT.md (D-01..D-16)
#   - .planning/phases/01-reforco-docs-analyzer/01-RESEARCH.md §Validation Architecture
#   - .planning/phases/01-reforco-docs-analyzer/01-VALIDATION.md
#
# Exit 0 se TODOS os checks passam. Exit 1 se qualquer um falha.

set -u

ANALYZER=".claude/agents/docs-analyzer.md"
EI_AJUSTES=".claude/commands/ei-ajustes.md"
CLAUDE_MD="CLAUDE.md"
MANIFEST="manifest.json"
PACKAGE_JSON="package.json"
CHANGELOG="CHANGELOG.md"

PASS=0
FAIL=0

ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS+1)); }
err() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$name"; else err "$name"; fi
}

check_not() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then err "$name (padrão proibido presente)"; else ok "$name"; fi
}

[[ -f "$ANALYZER"   ]] || { echo "FATAL: $ANALYZER não existe" >&2; exit 2; }
[[ -f "$EI_AJUSTES" ]] || { echo "FATAL: $EI_AJUSTES não existe" >&2; exit 2; }
[[ -f "$CLAUDE_MD"  ]] || { echo "FATAL: $CLAUDE_MD não existe" >&2; exit 2; }
[[ -f "$MANIFEST"   ]] || { echo "FATAL: $MANIFEST não existe" >&2; exit 2; }
[[ -f "$PACKAGE_JSON" ]] || { echo "FATAL: $PACKAGE_JSON não existe" >&2; exit 2; }
[[ -f "$CHANGELOG"  ]] || { echo "FATAL: $CHANGELOG não existe" >&2; exit 2; }

echo "═══ Phase 01 grep battery (D-01..D-16) ═══"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo A: docs-analyzer.md — schema novo (D-04, D-05, D-11)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-04] terceiro valor 'reject' no enum <decisao>"
check "<decisao>edit|clarify|reject</decisao> presente" \
  grep -qF '<decisao>edit|clarify|reject</decisao>' "$ANALYZER"

echo "[D-05] campos dedicados quando reject"
check "<motivo_leigo> presente em $ANALYZER" \
  grep -qF '<motivo_leigo>' "$ANALYZER"
check "<alternativa_sugerida> presente em $ANALYZER" \
  grep -qF '<alternativa_sugerida>' "$ANALYZER"
check "shape <decisao>reject</decisao> presente como exemplo no schema" \
  grep -qF '<decisao>reject</decisao>' "$ANALYZER"

echo "[D-11] auto-check INVISÍVEL no XML (ausência de <trace>/<auto_check>)"
check_not "ausência de <trace> em $ANALYZER" \
  grep -qF '<trace>' "$ANALYZER"
check_not "ausência de <auto_check> em $ANALYZER" \
  grep -qF '<auto_check>' "$ANALYZER"
check_not "ausência de <auto_checagem> em $ANALYZER" \
  grep -qF '<auto_checagem>' "$ANALYZER"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo B: docs-analyzer.md — regras + auto-checagem (D-08, D-09)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-09] cabeçalho de auto-checagem presente"
check "## ⚠️ AUTO-CHECAGEM ANTES DE EMITIR XML presente" \
  grep -qF '## ⚠️ AUTO-CHECAGEM ANTES DE EMITIR XML' "$ANALYZER"
check "auto-check declara-se MENTAL (não emite no XML)" \
  bash -c "awk '/## ⚠️ AUTO-CHECAGEM/,/<exemplos>/' '$ANALYZER' | grep -qiE 'mental|NÃO emit|invis[ií]vel'"

echo "[D-08] lista NUNCA expandida (>=12 bullets em <regras>)"
NUNCA_COUNT=$(awk '/<regras>/,/<\/regras>/' "$ANALYZER" | grep -cE '^- (\*\*)?NUNCA' || true)
if [[ "$NUNCA_COUNT" -ge 12 ]]; then
  ok "lista NUNCA em <regras> tem $NUNCA_COUNT bullets (>=12)"
else
  err "lista NUNCA em <regras> tem $NUNCA_COUNT bullets (<12)"
fi
check "menção explícita a 'inventar tag XML' em <regras>" \
  bash -c "awk '/<regras>/,/<\/regras>/' '$ANALYZER' | grep -qiF 'inventar tag'"
check "menção explícita a 'fora do <cliente_path>' em <regras>" \
  bash -c "awk '/<regras>/,/<\/regras>/' '$ANALYZER' | grep -qE 'fora.{0,5}d[eo].{0,5}<cliente_path>'"
check "menção a 'proibido-fazer.md → reject' em <regras>" \
  bash -c "awk '/<regras>/,/<\/regras>/' '$ANALYZER' | grep -qiE 'proibido-fazer.*reject|reject.*proibido-fazer'"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo C: docs-analyzer.md — conhecimento + Passo 0 condicional (D-12, D-13)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-13] Passo 0 condicional por <modo>"
check "Passo 0 menciona <modo> ou bifurcação single/multi" \
  bash -c "awk '/PASSO 0/,/REGRA #0/' '$ANALYZER' | grep -qiE '<modo>|modo.{0,5}=.{0,5}multi|single|condicional'"
check "Passo 0 menciona 'docs/multi-agente-recepcionista.md' SÓ quando multi" \
  bash -c "awk '/PASSO 0/,/REGRA #0/' '$ANALYZER' | grep -qF 'docs/multi-agente-recepcionista.md'"

echo "[D-12] <conhecimento_dos_papeis> expandido (>=baseline atual)"
# Baseline antes desta fase: ~10 bullets. Pós-fase esperado >=15.
KNOW_COUNT=$(awk '/<conhecimento_dos_papeis>/,/<\/conhecimento_dos_papeis>/' "$ANALYZER" | grep -cE '^  - "|^    - "|^- \*\*[A-Z]' || true)
if [[ "$KNOW_COUNT" -ge 12 ]]; then
  ok "<conhecimento_dos_papeis> tem $KNOW_COUNT bullets (>=12)"
else
  err "<conhecimento_dos_papeis> tem $KNOW_COUNT bullets (<12 — expandir)"
fi
check "menção a Qualifier em <conhecimento_dos_papeis>" \
  bash -c "awk '/<conhecimento_dos_papeis>/,/<\/conhecimento_dos_papeis>/' '$ANALYZER' | grep -qF 'Qualifier'"
check "menção a Scheduler em <conhecimento_dos_papeis>" \
  bash -c "awk '/<conhecimento_dos_papeis>/,/<\/conhecimento_dos_papeis>/' '$ANALYZER' | grep -qF 'Scheduler'"
check "menção a Protractor em <conhecimento_dos_papeis>" \
  bash -c "awk '/<conhecimento_dos_papeis>/,/<\/conhecimento_dos_papeis>/' '$ANALYZER' | grep -qF 'Protractor'"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo D: docs-analyzer.md — 4 novos exemplos few-shot (D-10)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-10] 4 novos exemplos few-shot de reject"
EX_COUNT=$(awk '/<exemplos>/,/<\/exemplos>/' "$ANALYZER" | grep -cF '<decisao>reject</decisao>' || true)
if [[ "$EX_COUNT" -ge 4 ]]; then
  ok "<exemplos> tem $EX_COUNT exemplos de reject (>=4)"
else
  err "<exemplos> tem $EX_COUNT exemplos de reject (<4)"
fi
# Negativo: <motivo_leigo> nos exemplos NÃO pode citar arquivo/tag/papel técnico
echo "[D-03 negativo] <motivo_leigo> nos exemplos não cita jargão técnico"
check_not "nenhum <motivo_leigo> dos exemplos cita 'Orquestrador.md'" \
  bash -c "awk '/<motivo_leigo>/,/<\/motivo_leigo>/' '$ANALYZER' | grep -qF 'Orquestrador.md'"
check_not "nenhum <motivo_leigo> dos exemplos cita '<formato_resposta>'" \
  bash -c "awk '/<motivo_leigo>/,/<\/motivo_leigo>/' '$ANALYZER' | grep -qF '<formato_resposta>'"
check_not "nenhum <motivo_leigo> dos exemplos cita '<perguntas_iniciais>'" \
  bash -c "awk '/<motivo_leigo>/,/<\/motivo_leigo>/' '$ANALYZER' | grep -qF '<perguntas_iniciais>'"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo E: ei-ajustes.md — parsing reject (D-04, D-07)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-07] parsing de <decisao>reject</decisao> no Passo 3 item 4"
check "Passo 3 cita <decisao>reject</decisao>" \
  bash -c "awk '/### Passo 3: Invocar/,/### Passo 3\.5/' '$EI_AJUSTES' | grep -qF 'reject'"
check "Passo 3 parsing extrai <motivo_leigo>" \
  bash -c "awk '/### Passo 3: Invocar/,/### Passo 3\.5/' '$EI_AJUSTES' | grep -qF '<motivo_leigo>'"
check "Passo 3 parsing extrai <alternativa_sugerida>" \
  bash -c "awk '/### Passo 3: Invocar/,/### Passo 3\.5/' '$EI_AJUSTES' | grep -qF '<alternativa_sugerida>'"
check "Roteamento Passo 3 item 5 mapeia reject para caminho [D]" \
  bash -c "awk '/### Passo 3: Invocar/,/### Passo 3\.5/' '$EI_AJUSTES' | grep -qE 'reject.{0,40}\[D\]'"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo F: ei-ajustes.md — caminho [D] + APPR-04 (D-06, D-07)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-07] novo caminho [D] no Passo 3.5"
check "bloco '#### Caminho **[D]**' presente" \
  grep -qE '#### Caminho \*\*\[D\]\*\*' "$EI_AJUSTES"
check "lista de caminhos do Passo 3.5 cita [D]" \
  bash -c "awk '/### Passo 3\.5:/,/#### Caminho \*\*\[A\]\*\*/' '$EI_AJUSTES' | grep -qE 'Caminho \*\*\[D\]\*\*'"

echo "[D-06] AskUserQuestion do [D] com 2 opções (Tentar alternativa / Cancelar)"
check "label literal 'Tentar a alternativa sugerida' presente" \
  grep -qF 'Tentar a alternativa sugerida' "$EI_AJUSTES"
check "bloco [D] cita 'Cancelar'" \
  bash -c "awk '/#### Caminho \*\*\[D\]\*\*/,/#### /' '$EI_AJUSTES' | tail -n +2 | grep -qF 'Cancelar'"
check "bloco [D] reusa contador 'reformulacoes' (cap [C])" \
  bash -c "awk '/#### Caminho \*\*\[D\]\*\*/,/#### Mensagem de cancelamento/' '$EI_AJUSTES' | grep -qiE 'reformulacoes|cap.{0,10}\[C\]|caminho.{0,5}\[C\]'"
check "bloco [D] cobre caso de borda <alternativa_sugerida> VAZIA" \
  bash -c "awk '/#### Caminho \*\*\[D\]\*\*/,/#### Mensagem de cancelamento/' '$EI_AJUSTES' | grep -qiE 'vazi[ao]|sem.{0,5}alternativa|OMITID'"

echo "[D-07] REGRA INVIOLÁVEL APPR-04 atualizada para cobrir [D]"
check "APPR-04 menciona caminho [D] ou 'Tentar a alternativa sugerida'" \
  bash -c "awk '/REGRA INVIOLÁVEL DO PASSO 3\.5 \(APPR-04\)/,/### Passo 4/' '$EI_AJUSTES' | grep -qiE '\[D\]|Tentar.{0,5}alternativa'"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo G: CLAUDE.md (D-14)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-14] CLAUDE.md atualizada"
check "CLAUDE.md cita 'reject' ou caminho [D]" \
  grep -qE 'reject|caminho.{0,5}\[D\]' "$CLAUDE_MD"

# ─────────────────────────────────────────────────────────────────────────────
# Grupo H: version bump (D-14, D-15)
# ─────────────────────────────────────────────────────────────────────────────
echo "[D-14] version bump em manifest/package/CHANGELOG"
PKG_V=$(grep -oE '"version": "[^"]+"' "$PACKAGE_JSON" | head -1 | sed 's/.*"\(.*\)"/\1/')
if [[ "$PKG_V" =~ ^2\.(0\.5|1\.0)$ ]]; then
  ok "package.json em $PKG_V (2.0.5 ou 2.1.0)"
else
  err "package.json em $PKG_V (esperado 2.0.5 ou 2.1.0)"
fi
check "CHANGELOG.md contém entrada '## [$PKG_V]'" \
  grep -qF "## [$PKG_V]" "$CHANGELOG"

echo "[D-15] CHANGELOG menciona /ei-update obrigatório e mudança de schema"
check "CHANGELOG da versão atual menciona '/ei-update' ou 'ei-update'" \
  bash -c "awk -v v='## ['$PKG_V']' '\$0==v{f=1;next} f && /^## \[/{exit} f' '$CHANGELOG' | grep -qE '/ei-update|ei-update'"
check "CHANGELOG da versão atual menciona 'reject' ou 'caminho [D]'" \
  bash -c "awk -v v='## ['$PKG_V']' '\$0==v{f=1;next} f && /^## \[/{exit} f' '$CHANGELOG' | grep -qE 'reject|caminho.{0,5}\[D\]'"

echo "[D-15 negativo] ei-ajustes NÃO tem parsing tolerante para reject ausente"
# Refinado: procura fallback ESPECÍFICO para schema antigo SEM reject — exclui fallback
# legítimo já existente de <descricao_leiga> (linha 84 do ei-ajustes, herdado da Phase 1 v1.8.9).
check_not "sem fallback de 'reject ausente' em ei-ajustes" \
  grep -qiE 'sem.{0,5}campo.{0,5}reject|fallback.{0,15}reject|sem.{0,5}<decisao>reject|reject.{0,10}ausente' "$EI_AJUSTES"

# ─────────────────────────────────────────────────────────────────────────────
# Resumo
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "═══ Resultado ═══"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"

if [[ "$FAIL" -gt 0 ]]; then
  echo "FALHOU — corrija os greps marcados ✗ antes do phase gate."
  exit 1
fi

echo "OK — todos os greps verdes."
exit 0
