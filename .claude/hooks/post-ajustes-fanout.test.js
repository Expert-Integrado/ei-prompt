#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const HOOK_PATH = path.join(__dirname, "post-ajustes-fanout.sh");

// Mesmo padrão de check-claude-md-audience.test.js: cleanup via t.after
// para não vazar diretórios temporários entre execuções de `npm test`.
function makeTempDir(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "post-ajustes-fanout-test-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  return tempDir;
}

function jsonlLine(obj) {
  return JSON.stringify(obj);
}

function runHook(transcriptPath, extra = {}) {
  return execFileSync("bash", [HOOK_PATH], {
    input: JSON.stringify({ transcript_path: transcriptPath, ...extra }),
    encoding: "utf8",
  });
}

// Formato canônico exigido pela regex do passo 4 (REGRA INVIOLÁVEL HOOK-02):
// id="round-<unix_ts>-<3_alfanum>".
const ROUND_ID = "round-1700000000-abc";

// Reproduz deterministicamente o escopo exato do bug corrigido na Task 1:
// o marcador consumed fica mais de 400 linhas ANTES do fim do arquivo (fora
// da janela tail -n 400 usada só para extrair o ROUND_ID no passo 4),
// enquanto a reabertura da última linha garante que o ROUND_ID ainda é
// extraído dentro da janela.
function buildFanoutTranscript(tempDir, { consumed }) {
  const transcriptPath = path.join(tempDir, "transcript.jsonl");
  const lines = [];

  // 1) Abertura da rodada.
  lines.push(
    jsonlLine({
      type: "assistant",
      message: {
        content: [{ type: "text", text: `abrindo rodada <ei-ajustes-round id="${ROUND_ID}">` }],
      },
    }),
  );

  // 2) 450 linhas de preenchimento não-assistant (simula tool_result do fan-out).
  for (let i = 0; i < 450; i++) {
    lines.push(jsonlLine({ type: "user", message: { content: `padding pre-consumed ${i}` } }));
  }

  // 3) Marcador consumed (se aplicável) — antes do padding pós-consumed.
  if (consumed) {
    lines.push(
      jsonlLine({
        type: "assistant",
        message: {
          content: [{ type: "text", text: `<ei-ajustes-round-consumed id="${ROUND_ID}"/>` }],
        },
      }),
    );
  }

  // 4) Mais 450 linhas de preenchimento — simula o fan-out paralelo de M
  //    reviewers acontecendo DEPOIS do consumed.
  for (let i = 0; i < 450; i++) {
    lines.push(jsonlLine({ type: "user", message: { content: `padding post-consumed ${i}` } }));
  }

  // 5) Reabertura do mesmo sentinela — garante que o ROUND_ID ainda é
  //    extraído pela janela tail -n 400 (inalterada de propósito) no
  //    momento simulado do Stop event atual.
  lines.push(
    jsonlLine({
      type: "assistant",
      message: {
        content: [{ type: "text", text: `ainda em curso <ei-ajustes-round id="${ROUND_ID}">` }],
      },
    }),
  );

  fs.writeFileSync(transcriptPath, lines.join("\n"));
  return transcriptPath;
}

test("hotfix 260716-lv5: não re-bloqueia rodada já consumida quando o marcador cai fora da janela de 400 linhas", (t) => {
  const tempDir = makeTempDir(t);
  const transcriptPath = buildFanoutTranscript(tempDir, { consumed: true });

  const stdout = runHook(transcriptPath);

  assert.strictEqual(stdout, "");
});

test("ainda bloqueia quando a rodada genuinamente não tem marcador consumed em lugar nenhum", (t) => {
  const tempDir = makeTempDir(t);
  const transcriptPath = buildFanoutTranscript(tempDir, { consumed: false });

  const stdout = runHook(transcriptPath);

  assert.notStrictEqual(stdout, "");
  // post-ajustes-fanout.sh emite o JSON via heredoc pretty-printed
  // (multi-linha), diferente do printf de linha única de outros hooks —
  // parsear o stdout inteiro em vez de assumir uma única linha.
  const parsed = JSON.parse(stdout.trim());
  assert.strictEqual(parsed.decision, "block");
  assert.ok(parsed.reason.includes(ROUND_ID), `reason should mention ${ROUND_ID}, got: ${parsed.reason}`);
});

test("stop_hook_active continua encerrando antes de qualquer leitura do transcript", (t) => {
  const tempDir = makeTempDir(t);
  const transcriptPath = buildFanoutTranscript(tempDir, { consumed: false });

  const stdout = runHook(transcriptPath, { stop_hook_active: true });

  assert.strictEqual(stdout, "");
});

test("transcript pequeno com consumed dentro da janela normal continua funcionando", (t) => {
  const tempDir = makeTempDir(t);
  const transcriptPath = path.join(tempDir, "transcript-small.jsonl");
  const lines = [
    jsonlLine({
      type: "assistant",
      message: {
        content: [{ type: "text", text: `abrindo rodada <ei-ajustes-round id="${ROUND_ID}">` }],
      },
    }),
    jsonlLine({ type: "user", message: { content: "resultado do editor" } }),
    jsonlLine({
      type: "assistant",
      message: {
        content: [{ type: "text", text: `<ei-ajustes-round-consumed id="${ROUND_ID}"/>` }],
      },
    }),
  ];
  fs.writeFileSync(transcriptPath, lines.join("\n"));

  const stdout = runHook(transcriptPath);

  assert.strictEqual(stdout, "");
});
