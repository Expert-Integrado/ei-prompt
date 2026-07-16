#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert");

const { normalizeEntry, formatManifestEntry } = require("./cli.js");

test("normalizeEntry('CLAUDE.md') returns {from,to} both equal to the string", () => {
  const result = normalizeEntry("CLAUDE.md");
  assert.deepStrictEqual(result, { from: "CLAUDE.md", to: "CLAUDE.md" });
});

test("normalizeEntry({from,to}) passes an already-correct object through unchanged", () => {
  const entry = { from: "client/CLAUDE.md", to: "CLAUDE.md" };
  const result = normalizeEntry(entry);
  assert.strictEqual(result, entry);
});

test("normalizeEntry({from}) missing 'to' throws an Error", () => {
  assert.throws(() => normalizeEntry({ from: "x" }), /entrada de manifest inválida/);
});

test("normalizeEntry({to}) missing 'from' throws an Error", () => {
  assert.throws(() => normalizeEntry({ to: "x" }), /entrada de manifest inválida/);
});

test("normalizeEntry(null) throws an Error", () => {
  assert.throws(() => normalizeEntry(null), /entrada de manifest inválida/);
});

test("normalizeEntry(42) throws an Error", () => {
  assert.throws(() => normalizeEntry(42), /entrada de manifest inválida/);
});

test("formatManifestEntry('CHANGELOG.md') returns the string unchanged", () => {
  assert.strictEqual(formatManifestEntry("CHANGELOG.md"), "CHANGELOG.md");
});

test("formatManifestEntry({from,to}) returns the .to path, never '[object Object]'", () => {
  const result = formatManifestEntry({ from: "client/CLAUDE.md", to: "CLAUDE.md" });
  assert.strictEqual(result, "CLAUDE.md");
  assert.notStrictEqual(result, "[object Object]");
});
