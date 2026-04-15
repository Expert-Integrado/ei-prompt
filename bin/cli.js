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

  fs.writeFileSync(dest, content);
  if (relPath.endsWith(".sh")) {
    fs.chmodSync(dest, 0o755);
  }
  log(exists ? "cyan" : "green", exists ? "update" : "add   ", relPath);
  return exists ? "updated" : "added";
}

async function run({ overwrite }) {
  log("cyan", "ei-prompt", `baixando de ${manifest.repo}@${manifest.branch}`);
  console.log();

  const results = { added: 0, updated: 0, skipped: 0, failed: 0 };

  for (const file of manifest.files) {
    try {
      const content = await fetchFile(file);
      const result = await writeFile(file, content, { overwrite });
      results[result]++;
    } catch (err) {
      log("red", "fail  ", `${file} — ${err.message}`);
      results.failed++;
    }
  }

  console.log();
  log(
    "green",
    "pronto",
    `${results.added} adicionados, ${results.updated} atualizados, ${results.skipped} ignorados, ${results.failed} falhas`,
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
${manifest.files.map((f) => `  - ${f}`).join("\n")}
`);
}

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
