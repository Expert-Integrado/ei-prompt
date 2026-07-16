#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const manifest = require("../manifest.json");

const RAW_BASE = `https://raw.githubusercontent.com/${manifest.repo}/${manifest.branch}`;

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(color, prefix, msg) {
  console.log(`${COLORS[color]}${prefix}${COLORS.reset} ${msg}`);
}

function normalizeEntry(entry) {
  if (typeof entry === "string") return { from: entry, to: entry };
  if (entry && typeof entry.from === "string" && typeof entry.to === "string") return entry;
  throw new Error(`entrada de manifest inválida: ${JSON.stringify(entry)}`);
}

function formatManifestEntry(entry) {
  if (typeof entry === "string") return entry;
  return entry.to;
}

async function fetchFile(relPath) {
  const url = `${RAW_BASE}/${relPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${url}`);
  }
  return await res.text();
}

async function writeFile(relPath, content, { overwrite }) {
  const dest = path.join(process.cwd(), relPath);
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });

  const exists = fs.existsSync(dest);
  if (exists && !overwrite) {
    log("yellow", "skip", `${relPath} ${COLORS.dim}(já existe)${COLORS.reset}`);
    return "skipped";
  }

  if (exists) {
    const current = fs.readFileSync(dest, "utf8");
    if (current === content) {
      log("dim", "same  ", `${relPath} ${COLORS.dim}(sem mudanças)${COLORS.reset}`);
      return "unchanged";
    }
  }

  fs.writeFileSync(dest, content);
  if (relPath.endsWith(".sh")) {
    fs.chmodSync(dest, 0o755);
  }
  log(exists ? "cyan" : "green", exists ? "update" : "add   ", relPath);
  return exists ? "updated" : "added";
}

function removeFile(relPath) {
  const cwd = process.cwd();
  const dest = path.resolve(cwd, relPath);
  // Defense-in-depth: bloqueia path traversal via '..' em manifest comprometido
  if (!dest.startsWith(cwd + path.sep) && dest !== cwd) {
    log("yellow", "warn  ", `path fora do CWD ignorado: ${relPath} ${COLORS.dim}(continuando)${COLORS.reset}`);
    return "warn";
  }
  if (!fs.existsSync(dest)) {
    return "absent";
  }
  try {
    fs.unlinkSync(dest);
    log("red", "remove", `${relPath} ${COLORS.dim}(deprecated)${COLORS.reset}`);
    return "removed";
  } catch (err) {
    log("yellow", "warn  ", `não removi ${relPath}: ${err.message} ${COLORS.dim}(continuando)${COLORS.reset}`);
    return "warn";
  }
}

async function run({ overwrite }) {
  log("cyan", "ei-prompt", `baixando de ${manifest.repo}@${manifest.branch}`);
  console.log();

  const results = { added: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0, removed: 0 };

  const deprecated = Array.isArray(manifest.deprecated_files) ? manifest.deprecated_files : [];
  for (const file of deprecated) {
    const status = removeFile(file);
    if (status === "removed") results.removed++;
    // status === "absent" ou "warn" não conta no agregador (silencioso ou já logou warning)
  }

  for (const rawEntry of manifest.files) {
    try {
      const { from, to } = normalizeEntry(rawEntry);
      const content = await fetchFile(from);
      const result = await writeFile(to, content, { overwrite });
      results[result]++;
    } catch (err) {
      const label = typeof rawEntry === "string" ? rawEntry : (rawEntry && rawEntry.to) || JSON.stringify(rawEntry);
      log("red", "fail  ", `${label} — ${err.message}`);
      results.failed++;
    }
  }

  console.log();
  log(
    "green",
    "pronto",
    `${results.added} adicionados, ${results.updated} atualizados, ${results.unchanged} sem mudanças, ${results.skipped} ignorados, ${results.removed} removidos, ${results.failed} falhas`,
  );

  if (results.failed > 0) process.exit(1);
}

function help() {
  console.log(`
${COLORS.cyan}ei-prompt${COLORS.reset} — baixa/atualiza agentes EiPrompt no projeto atual

${COLORS.yellow}Uso:${COLORS.reset}
  npx @expertzinhointegrado/ei-prompt@latest           Baixa tudo e sobrescreve arquivos existentes
  npx @expertzinhointegrado/ei-prompt@latest --help    Mostra esta ajuda

${COLORS.yellow}Arquivos instalados/atualizados:${COLORS.reset}
${manifest.files.map((f) => `  - ${formatManifestEntry(f)}`).join("\n")}
${manifest.deprecated_files && manifest.deprecated_files.length ? `
${COLORS.yellow}Arquivos removidos (legados):${COLORS.reset}
${manifest.deprecated_files.map((f) => `  - ${formatManifestEntry(f)}`).join("\n")}
` : ""}`);
}

module.exports = { normalizeEntry, formatManifestEntry, fetchFile, writeFile, removeFile, run, help };

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    help();
  } else if (!cmd || cmd === "install" || cmd === "update") {
    run({ overwrite: true }).catch((err) => {
      log("red", "erro", err.message);
      process.exit(1);
    });
  } else {
    log("red", "erro", `comando desconhecido: ${cmd}`);
    help();
    process.exit(1);
  }
}
