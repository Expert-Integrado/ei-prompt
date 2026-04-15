---
description: Cria um novo projeto de cliente via client-project-scaffolder (carrega CLAUDE.md + modelos e segue o fluxo)
argument-hint: [nome do cliente opcional]
---

Dispare o agente `client-project-scaffolder` via Agent tool para criar um novo projeto de cliente.

**Nome do cliente fornecido:** $ARGUMENTS

Instruções ao agente:

1. Seguir o FLUXO OBRIGATÓRIO do agente, iniciando pela **Fase 0** (carregar `CLAUDE.md` + ler todos os templates em `modelo/`).
2. Se `$ARGUMENTS` estiver preenchido, usar como nome do projeto/cliente na Fase 1; caso contrário, perguntar ao usuário.
3. Prosseguir com as Fases 2 a 5 normalmente.

NÃO pule a Fase 0 sob nenhuma hipótese — o agente precisa ter o contexto completo antes de criar qualquer arquivo.
