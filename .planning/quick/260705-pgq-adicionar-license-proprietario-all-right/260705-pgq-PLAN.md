---
phase: quick-260705-pgq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [LICENSE, package.json]
autonomous: true
requirements: [LICENSE-PROPRIETARY-01]

must_haves:
  truths:
    - "O repositório possui um arquivo LICENSE na raiz com aviso de licença proprietária ('all rights reserved'), proibindo explicitamente cópia, redistribuição, modificação e uso do código sem autorização por escrito do titular."
    - "O campo license em package.json deixa de declarar MIT e passa a declarar UNLICENSED, sinalizando (convenção npm) que o pacote não é open-source e está alinhado ao conteúdo do LICENSE."
    - "Nenhum outro arquivo do repositório é alterado; nenhuma outra chave de package.json muda de valor."
  artifacts:
    - path: "LICENSE"
      provides: "Texto de licença proprietária (all rights reserved), titular Expert-Integrado, ano 2026"
    - path: "package.json"
      provides: "Campo license atualizado para UNLICENSED; demais campos inalterados"
  key_links:
    - from: "package.json license field"
      to: "LICENSE file na raiz do repo"
      via: "os dois comunicam o mesmo status proprietário/não-open-source; o npm empacota o LICENSE da raiz automaticamente mesmo sem estar listado em 'files'"
      pattern: "UNLICENSED|All Rights Reserved"
---

<objective>
Adicionar um arquivo `LICENSE` proprietário ("all rights reserved") na raiz do repositório e atualizar `package.json` para refletir que o pacote não é open-source.

Purpose: Hoje `package.json` declara `"license": "MIT"` mas não existe nenhum arquivo `LICENSE` no repo. Essa combinação (campo MIT + ausência de texto de licença) pode ser lida como concessão implícita de uso/redistribuição sob termos MIT, o que não reflete a intenção real do titular (Expert-Integrado) de reservar todos os direitos sobre o código.
Output: Arquivo `LICENSE` na raiz com aviso proprietário completo; `package.json` com `"license": "UNLICENSED"`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar arquivo LICENSE proprietário</name>
  <files>LICENSE</files>
  <action>
    Criar um novo arquivo chamado exatamente `LICENSE` (sem extensão) na raiz do repositório. Escrever um aviso de licença proprietária autônomo ("all rights reserved") — não um template de licença open-source ou copyleft de qualquer tipo (nem permissiva, nem share-alike). O texto deve conter, nesta ordem: (1) uma linha de copyright no formato "Copyright (c) 2026 Expert-Integrado. All Rights Reserved."; (2) um parágrafo proibindo explicitamente cópia, redistribuição, modificação, sublicenciamento e uso do software (em forma de código-fonte ou compilada) por terceiros sem autorização prévia por escrito da Expert-Integrado; (3) um parágrafo afirmando que nenhuma licença ou direito de propriedade intelectual é concedido ou implícito pela mera existência ou acessibilidade do repositório; (4) um parágrafo padrão de isenção de garantia e limitação de responsabilidade ("AS IS" — sem garantia de comercialização, adequação a propósito específico ou não violação; sem responsabilidade por danos decorrentes do uso); (5) uma linha final convidando quem tiver interesse em obter autorização/licenciamento a entrar em contato com a Expert-Integrado. Texto plano, sem cabeçalhos markdown, sem XML/HTML.
  </action>
  <verify>
    <automated>test -f LICENSE && grep -q "Expert-Integrado" LICENSE && grep -q "2026" LICENSE && grep -qi "all rights reserved" LICENSE && grep -qi "written" LICENSE && ! grep -qi "permission is hereby granted" LICENSE && echo PASS</automated>
  </verify>
  <done>LICENSE existe na raiz do repo, nomeia Expert-Integrado e o ano 2026 como titular, contém "All Rights Reserved" e linguagem explícita de proibição de cópia/redistribuição/uso sem autorização por escrito, mais um parágrafo de isenção de garantia — e não contém a abertura característica de um template de licença permissiva open-source.</done>
</task>

<task type="auto">
  <name>Task 2: Atualizar campo license em package.json para UNLICENSED</name>
  <files>package.json</files>
  <action>
    Editar o campo de nível superior `"license"` em `package.json`: mudar seu valor de `"MIT"` para `"UNLICENSED"` (convenção npm para pacotes privados/proprietários que não são distribuídos sob licença open-source), alinhando-o ao novo arquivo `LICENSE` criado na Task 1. Alterar apenas o valor deste único campo — manter todos os demais campos (`name`, `version`, `description`, `bin`, `files`, `engines`, `keywords`, `repository`) e a formatação/indentação de 2 espaços existente intocados.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const raw=fs.readFileSync('package.json','utf8'); const p=JSON.parse(raw); if(p.license!=='UNLICENSED'){console.error('license field is', p.license); process.exit(1)} if(raw.includes('\"MIT\"')){console.error('MIT string still present'); process.exit(1)} console.log('PASS')"</automated>
  </verify>
  <done>package.json permanece JSON válido, `"license"` é igual a `"UNLICENSED"`, nenhum outro campo mudou de valor, e a string `"MIT"` não aparece mais em nenhum lugar do arquivo.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A — mudança estática | Este plano apenas adiciona um arquivo de texto (LICENSE) e edita uma string de metadado em package.json (campo "license"). Não introduz nem altera código executável, endpoint, entrada de usuário, ou qualquer fronteira de confiança. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|------------------|
| T-quick260705pgq-01 | Tampering | package.json (`license` field) / LICENSE (conteúdo textual) | low | accept | Ambos os arquivos são texto estático revisado no próprio diff deste plano antes do commit; nenhum passo de build, script ou instalação consome o conteúdo desses arquivos, então um valor incorreto não tem efeito executável — o pior caso é uma inconsistência cosmética de metadado, já coberta pelos comandos de verify automatizados das duas tasks. |

Nenhuma task de instalação via npm/pip/cargo faz parte deste plano, então o Package Legitimacy Gate (T-{phase}-SC) não se aplica.
</threat_model>

<verification>
- `LICENSE` existe na raiz do repo com texto de licença proprietária (all rights reserved), titular "Expert-Integrado", ano "2026", e nenhum template de licença open-source/copyleft.
- `package.json` continua JSON válido, `"license"` é `"UNLICENSED"`, e nenhum outro campo foi alterado.
- `git diff` fica restrito a: um novo arquivo `LICENSE` e uma única linha alterada em `package.json` (o valor do campo `license`).
</verification>

<success_criteria>
- Quem inspeciona a raiz do repositório encontra um `LICENSE` que declara, sem ambiguidade, que todos os direitos são reservados e que cópia/redistribuição/modificação/uso exigem autorização por escrito da Expert-Integrado.
- Os metadados do pacote (`package.json`) reportam `"license": "UNLICENSED"`, consistente com o `LICENSE`, comunicando que o pacote não é open-source.
- Nenhum outro arquivo do repositório foi modificado.
</success_criteria>

<output>
Criar `.planning/quick/260705-pgq-adicionar-license-proprietario-all-right/260705-pgq-SUMMARY.md` ao concluir.
</output>
