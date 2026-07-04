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
    return { valid: false, errors: [{ message: `arquivo inacessível: ${filePath}` }] };
  }

  if (!stat.isFile()) {
    return { valid: false, errors: [{ message: `não é um arquivo regular: ${filePath}` }] };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const result = validateCasca(content, path.basename(filePath));

  const errors = result.errors.map((e) => {
    if (e.line !== undefined && e.col !== undefined) {
      return { ...e, message: `${filePath} linha ${e.line} coluna ${e.col}: ${e.message}` };
    }
    return { ...e, message: `${filePath}: ${e.message}` };
  });

  return { valid: result.valid, errors };
}

module.exports = {
  TIPO_MAP,
  normalizeContent,
  offsetToLineCol,
  parseAgenteLine,
  countAgenteTags,
  validateCasca,
  validateFile,
};
