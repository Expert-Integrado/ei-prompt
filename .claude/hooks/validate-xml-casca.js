#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const XMLNS_VALUE = "https://expertintegrado.com.br/super-sdr/prompt";
const VERSAO_VALUE = "1.0";

const TIPO_MAP = {
  "Orquestrador.md": { tipo: "orchestrator" },
  "Qualifier.md": { tipo: "qualifier" },
  "Scheduler.md": { tipo: "scheduler" },
  "Protractor.md": { tipo: "protractor" },
  "Follow-Up.md": { tipo: "followup" },
  "Recepcionista.md": { tipo: "orchestrator", origem: "recepcionista" },
};

function normalizeContent(content) {
  // CRLF-safe splitting (Pitfall 3) — does NOT strip a leading BOM (Pitfall 2/D-07).
  return content.replace(/\r\n/g, "\n");
}

function offsetToLineCol(content, offset) {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }
  const col = offset - lastNewline;
  return { line, col };
}

function parseAgenteLine(line) {
  const openMatch = (line || "").match(/^<agente\b([^>]*)>$/);
  if (!openMatch) {
    return { ok: false, reason: "linha 2 não é uma tag <agente ...> de linha única" };
  }
  const attrs = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = attrRegex.exec(openMatch[1])) !== null) {
    attrs[m[1]] = m[2];
  }
  return { ok: true, attrs };
}

// Word-boundary-safe: does NOT match <agentes_disponiveis> (Pitfall 1).
function countAgenteTags(content) {
  const opens = (content.match(/<agente(?=[\s>])/g) || []).length;
  const closes = (content.match(/<\/agente>/g) || []).length;
  return { opens, closes };
}

function validateCasca(content, basename) {
  const errors = [];
  let working = content;

  // BOM check (Pitfall 2) — reported, never silently stripped.
  if (working.charCodeAt(0) === 0xfeff) {
    errors.push({ line: 1, col: 1, message: "arquivo contém BOM (U+FEFF) antes da declaração XML" });
    working = working.slice(1);
  }

  const normalized = normalizeContent(working);
  const lines = normalized.split("\n");

  // XMLV-01: exact declaration on line 1.
  const line1 = lines[0] || "";
  if (line1 !== XML_DECLARATION) {
    if (!line1.startsWith("<?xml")) {
      // Line 1 isn't a declaration at all (e.g. the agente tag jumped straight to line 1) —
      // report a blunt col 1 rather than an incidental character-overlap column.
      errors.push({
        line: 1,
        col: 1,
        message: "linha 1 não contém a declaração XML esperada",
      });
    } else {
      let diffIndex = 0;
      const minLen = Math.min(line1.length, XML_DECLARATION.length);
      while (diffIndex < minLen && line1[diffIndex] === XML_DECLARATION[diffIndex]) {
        diffIndex++;
      }
      errors.push({
        line: 1,
        col: diffIndex + 1,
        message: "linha 1 não corresponde à declaração XML esperada",
      });
    }
  }

  // XMLV-02/03: line 2 attribute checks.
  const line2 = lines[1] || "";
  const parsed = parseAgenteLine(line2);
  if (!parsed.ok) {
    errors.push({ line: 2, col: 1, message: parsed.reason });
  } else {
    const expected = TIPO_MAP[basename];
    if (expected) {
      const attrs = parsed.attrs;

      if (attrs.xmlns === undefined) {
        errors.push({ line: 2, col: 1, message: "atributo xmlns ausente na linha 2" });
      } else if (attrs.xmlns !== XMLNS_VALUE) {
        const idx = line2.indexOf(attrs.xmlns);
        errors.push({
          line: 2,
          col: idx >= 0 ? idx + 1 : 1,
          message: `atributo xmlns incorreto: esperado "${XMLNS_VALUE}", encontrado "${attrs.xmlns}"`,
        });
      }

      if (attrs.versao === undefined) {
        errors.push({ line: 2, col: 1, message: "atributo versao ausente na linha 2" });
      } else if (attrs.versao !== VERSAO_VALUE) {
        const idx = line2.indexOf(attrs.versao);
        errors.push({
          line: 2,
          col: idx >= 0 ? idx + 1 : 1,
          message: `atributo versao incorreto: esperado "${VERSAO_VALUE}", encontrado "${attrs.versao}"`,
        });
      }

      if (attrs.tipo === undefined) {
        errors.push({ line: 2, col: 1, message: `atributo tipo ausente na linha 2 (esperado "${expected.tipo}")` });
      } else if (attrs.tipo !== expected.tipo) {
        const idx = line2.indexOf(attrs.tipo);
        errors.push({
          line: 2,
          col: idx >= 0 ? idx + 1 : 1,
          message: `atributo tipo incorreto: esperado "${expected.tipo}", encontrado "${attrs.tipo}"`,
        });
      }

      if (expected.origem !== undefined) {
        if (attrs.origem === undefined) {
          errors.push({
            line: 2,
            col: 1,
            message: `atributo origem ausente na linha 2 (esperado "${expected.origem}")`,
          });
        } else if (attrs.origem !== expected.origem) {
          const idx = line2.indexOf(attrs.origem);
          errors.push({
            line: 2,
            col: idx >= 0 ? idx + 1 : 1,
            message: `atributo origem incorreto: esperado "${expected.origem}", encontrado "${attrs.origem}"`,
          });
        }
      }
    }
  }

  // XMLV-04: single root, no nesting/duplication.
  const { opens, closes } = countAgenteTags(working);
  if (opens !== 1 || closes !== 1) {
    const openRegex = /<agente(?=[\s>])/g;
    let secondOpenOffset = -1;
    let match;
    let count = 0;
    while ((match = openRegex.exec(working)) !== null) {
      count++;
      if (count === 2) {
        secondOpenOffset = match.index;
        break;
      }
    }
    const fallbackOffset = secondOpenOffset >= 0 ? secondOpenOffset : working.length;
    const { line, col } = offsetToLineCol(normalizeContent(working), fallbackOffset);
    errors.push({
      line,
      col,
      message: `raiz agente encontrada ${opens} vez(es) aberta e ${closes} vez(es) fechada — esperado exatamente 1 abertura e 1 fechamento`,
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateFile(filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    return { valid: false, errors: [{ message: `arquivo inacessível: ${filePath}`, code: err.code }] };
  }

  if (!stat.isFile()) {
    return { valid: false, errors: [{ message: `não é um arquivo regular: ${filePath}` }] };
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return { valid: false, errors: [{ message: `arquivo inacessível: ${filePath}`, code: err.code }] };
  }
  const result = validateCasca(content, path.basename(filePath));

  const errors = result.errors.map((e) => {
    if (e.line !== undefined && e.col !== undefined) {
      return { ...e, message: `${filePath} linha ${e.line} coluna ${e.col}: ${e.message}` };
    }
    return { ...e, message: `${filePath}: ${e.message}` };
  });

  return { valid: result.valid, errors };
}

// Distinguishes a genuine human/slash-command turn start from Claude Code's synthetic
// tool_result-carrier "type":"user" messages — empirically confirmed against this repo's
// own real transcripts that the large majority of "type":"user" lines are pure tool_result
// relays, not new turns (D-06/WR-02).
function isGenuineUserTurnStart(parsed) {
  if (!parsed || parsed.type !== "user") return false;
  const content = parsed.message && parsed.message.content;
  if (typeof content === "string") return true;
  if (Array.isArray(content)) {
    return content.some((block) => block && block.type !== "tool_result");
  }
  return false;
}

function discoverTouchedFiles(transcriptPath, tailLines = 400) {
  let content;
  try {
    content = fs.readFileSync(transcriptPath, "utf8");
  } catch (err) {
    return [];
  }

  const allLines = content.split("\n");
  const lines = allLines.slice(-tailLines);
  const found = new Set();

  // Scan backward for the most recent genuine user-turn-start line to scope discovery
  // to the current turn only (D-06). Fail open to the full window if none is found —
  // detection must never be silently narrower-than-intended just because a boundary
  // couldn't be identified.
  let turnStart = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      continue;
    }
    if (isGenuineUserTurnStart(parsed)) {
      turnStart = i;
      break;
    }
  }

  for (const line of lines.slice(turnStart)) {
    if (!line.trim()) continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      continue;
    }

    if (!parsed || parsed.type !== "assistant") continue;

    const messageContent = parsed.message && parsed.message.content;
    if (!Array.isArray(messageContent)) continue;

    for (const entry of messageContent) {
      if (!entry || entry.type !== "tool_use") continue;
      if (entry.name !== "Edit" && entry.name !== "Write") continue;
      const filePath = entry.input && entry.input.file_path;
      if (!filePath) continue;
      found.add(filePath);
    }
  }

  return Array.from(found).filter((fp) =>
    Object.prototype.hasOwnProperty.call(TIPO_MAP, path.basename(fp)),
  );
}

function runCli(argv) {
  const flagIndex = argv.indexOf("--transcript");
  if (flagIndex === -1 || flagIndex + 1 >= argv.length) {
    return {};
  }
  const transcriptPath = argv[flagIndex + 1];

  const files = discoverTouchedFiles(transcriptPath);
  if (files.length === 0) {
    return {};
  }

  const errors = [];
  for (const filePath of files) {
    const result = validateFile(filePath);
    if (result.valid === false && result.errors.every((e) => e.code === "ENOENT")) {
      // File discovered as touched in the current turn but since deleted from disk —
      // "nothing to validate", not a casca violation (WR-02). Does not weaken D-07's
      // "always blocks on a broken casca" for files that still exist.
      continue;
    }
    errors.push(...result.errors);
  }

  if (errors.length === 0) {
    return {};
  }

  return { decision: "block", reason: errors.map((e) => e.message).join("\n") };
}

module.exports = {
  TIPO_MAP,
  normalizeContent,
  offsetToLineCol,
  parseAgenteLine,
  countAgenteTags,
  validateCasca,
  validateFile,
  discoverTouchedFiles,
  runCli,
};

if (require.main === module) {
  const result = runCli(process.argv.slice(2));
  console.log(JSON.stringify(result));
}
