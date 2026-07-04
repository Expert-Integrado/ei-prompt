#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const {
  TIPO_MAP,
  normalizeContent,
  offsetToLineCol,
  parseAgenteLine,
  countAgenteTags,
  validateCasca,
  validateFile,
} = require("./validate-xml-casca.js");

const FIXTURES_DIR = path.join(__dirname, "__fixtures__", "xml-casca");

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

function hasEscapeOrCdataWording(errors) {
  const pattern = /escap|cdata/i;
  return errors.some((e) => pattern.test(e.message));
}

test("TIPO_MAP has exactly 6 keys, Recepcionista.md is the only entry with origem", () => {
  const keys = Object.keys(TIPO_MAP);
  assert.strictEqual(keys.length, 6);
  assert.deepStrictEqual(
    keys.sort(),
    ["Follow-Up.md", "Orquestrador.md", "Protractor.md", "Qualifier.md", "Recepcionista.md", "Scheduler.md"].sort(),
  );
  for (const key of keys) {
    if (key === "Recepcionista.md") {
      assert.strictEqual(TIPO_MAP[key].origem, "recepcionista");
    } else {
      assert.strictEqual(TIPO_MAP[key].origem, undefined);
    }
  }
});

test("parseAgenteLine parses a line-2 tag regardless of attribute order", () => {
  const line = '<agente tipo="orchestrator" xmlns="https://expertintegrado.com.br/super-sdr/prompt" origem="recepcionista" versao="1.0">';
  const result = parseAgenteLine(line);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.attrs, {
    xmlns: "https://expertintegrado.com.br/super-sdr/prompt",
    versao: "1.0",
    tipo: "orchestrator",
    origem: "recepcionista",
  });
});

test("countAgenteTags does not false-positive on Recepcionista's agentes_disponiveis body tag", () => {
  const content = readFixture("valid-recepcionista.md");
  const counts = countAgenteTags(content);
  assert.deepStrictEqual(counts, { opens: 1, closes: 1 });
});

test("validateCasca reports missing XML declaration at line 1, col 1", () => {
  const content = readFixture("missing-declaration.md");
  const result = validateCasca(content, "Qualifier.md");
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((e) => e.line === 1 && e.col === 1),
    `expected an error at line 1 col 1, got: ${JSON.stringify(result.errors)}`,
  );
});

test("validateCasca reports wrong/incomplete declaration with a column at the divergence point", () => {
  const content = readFixture("wrong-declaration.md");
  const result = validateCasca(content, "Scheduler.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => e.line === 1);
  assert.ok(err, `expected a line-1 error, got: ${JSON.stringify(result.errors)}`);
  // "<?xml version="1.0"?>" diverges from the expected declaration right after `"1.0"` (index 19, col 20)
  assert.strictEqual(err.col, 20);
});

test("validateCasca reports XMLV-03 tipo mismatch naming expected vs found", () => {
  const content = readFixture("wrong-tipo.md");
  const result = validateCasca(content, "Qualifier.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /tipo/i.test(e.message));
  assert.ok(err, `expected a tipo-mismatch error, got: ${JSON.stringify(result.errors)}`);
  assert.ok(/qualifier/i.test(err.message), "message should name the expected tipo");
  assert.ok(/orchestrator/i.test(err.message), "message should name the found tipo");
});

test("validateCasca reports XMLV-02 missing xmlns attribute", () => {
  const content = readFixture("missing-xmlns.md");
  const result = validateCasca(content, "Protractor.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /xmlns/i.test(e.message));
  assert.ok(err, `expected an xmlns error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca reports XMLV-03 missing origem attribute for Recepcionista (Pitfall 7)", () => {
  const content = readFixture("missing-origem-recepcionista.md");
  const result = validateCasca(content, "Recepcionista.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /origem/i.test(e.message));
  assert.ok(err, `expected an origem error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca reports XMLV-04 for nested root", () => {
  const content = readFixture("nested-root.md");
  const result = validateCasca(content, "Scheduler.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /raiz|root|abert|fech/i.test(e.message));
  assert.ok(err, `expected a nesting/root-count error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca reports XMLV-04 for duplicate root", () => {
  const content = readFixture("duplicate-root.md");
  const result = validateCasca(content, "Follow-Up.md");
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /raiz|root|abert|fech/i.test(e.message));
  assert.ok(err, `expected a nesting/root-count error, got: ${JSON.stringify(result.errors)}`);
});

test("validateCasca blocks on raw ampersand/content-triggered break WITHOUT escape/CDATA wording (XMLV-07)", () => {
  const content = readFixture("raw-ampersand-in-content.md");
  const result = validateCasca(content, "Qualifier.md");
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0, "expected at least one error");
  assert.strictEqual(
    hasEscapeOrCdataWording(result.errors),
    false,
    `no error message may mention escape/CDATA, got: ${JSON.stringify(result.errors)}`,
  );
});

test("validateFile() does not mutate the raw-ampersand-in-content.md fixture", () => {
  const fixturePath = path.join(FIXTURES_DIR, "raw-ampersand-in-content.md");
  const before = fs.readFileSync(fixturePath);
  validateFile(fixturePath);
  const after = fs.readFileSync(fixturePath);
  assert.ok(before.equals(after), "fixture bytes must be unchanged after validateFile()");
});
