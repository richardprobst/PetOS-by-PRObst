# Decisoes Arquiteturais do PetOS

## 1. Objetivo desta pasta

Esta pasta reune os ADRs do PetOS.

Os ADRs existem para registrar decisoes importantes de arquitetura, execucao e estrutura tecnica, preservando:

- contexto;
- alternativas consideradas;
- decisao adotada;
- justificativa;
- consequencias praticas.

Se houver conflito entre um ADR e o PRD, o PRD vence, a menos que o PRD tenha sido atualizado formalmente para refletir a decisao.

## 2. Como interpretar os ADRs

Cada ADR deve responder, no minimo:

- qual problema precisava ser resolvido;
- quais alternativas foram consideradas;
- qual decisao foi tomada;
- por que ela foi tomada;
- quais consequencias essa decisao traz.

## 3. Relacao com outros documentos

Os ADRs desta pasta devem conversar com:

- `PetOS_PRD.md`
- `AGENTS.md`
- `README.md`
- `docs/architecture.md`
- `docs/domain-rules.md`
- `docs/data-model.md`
- `docs/phase3-maintenance-guide.md`
- `PHASE4_PLAN.md`

## 4. Indice dos ADRs

### ADR 001 - WordPress nao sera a base do nucleo do PetOS
Arquivo: `001-no-wordpress-core.md`

### ADR 002 - Next.js App Router com Route Handlers sera a base fullstack do PetOS
Arquivo: `002-nextjs-app-router-route-handlers.md`

### ADR 003 - Regras criticas de negocio e autorizacao devem ser garantidas no servidor
Arquivo: `003-server-side-business-rules.md`

### ADR 004 - Prisma sera a camada oficial de acesso ao banco de dados
Arquivo: `004-prisma-as-single-db-access-layer.md`

### ADR 005 - next-auth com RBAC aplicado no servidor sera a estrategia oficial de autenticacao e autorizacao
Arquivo: `005-authjs-rbac-server-enforced.md`

### ADR 006 - Separacao conceitual entre status operacional e status financeiro
Arquivo: `006-status-operational-vs-financial-separation.md`

### ADR 007 - Documentos e midias terao armazenamento externo, com banco guardando referencias e metadados
Arquivo: `007-storage-for-documents-and-media-outside-db.md`

### ADR 008 - Webhooks devem ser idempotentes, validados, rastreaveis e auditaveis
Arquivo: `008-webhooks-must-be-idempotent-and-auditable.md`

### ADR 009 - Zod sera a camada oficial de contratos e validacao do PetOS
Arquivo: `009-zod-as-validation-contract-layer.md`

### ADR 010 - Prioridade absoluta para o MVP, sem antecipacao indevida de Fase 2 e Fase 3
Arquivo: `010-mvp-first-no-premature-phase-2-3-implementation.md`

### ADR 011 - Installer e updater integrados usam runtime state persistido e operacao controlada
Arquivo: `011-installer-updater-runtime-foundation.md`

### ADR 012 - Multiunidade usa contexto server-side com escopo fail-closed
Arquivo: `012-multiunit-server-side-scope-and-fail-closed-context.md`

### ADR 013 - A fundacao de IA da Fase 3 e provider-neutral, auditavel e fail-closed
Arquivo: `013-ai-foundation-fail-closed-provider-neutral.md`

### ADR 014 - A Fase 3 fecha com governanca consolidada e regressao reconhecivel
Arquivo: `014-phase3-governance-and-regression-baseline.md`

### ADR 015 - O assistente virtual usa transcript-only, provider-neutral e confirmacao explicita
Arquivo: `015-virtual-assistant-transcript-only-confirmation-first.md`

## 5. Como criar novos ADRs

Ao registrar uma nova decisao:

1. usar numeracao sequencial;
2. usar nome curto e descritivo;
3. registrar contexto, alternativas, decisao e consequencias;
4. relacionar o ADR aos documentos impactados;
5. atualizar este `README.md`.

## 6. Quando criar um novo ADR

Criar ADR quando a decisao impactar significativamente:

- arquitetura;
- stack;
- seguranca;
- autenticacao e autorizacao;
- modelagem de dados;
- storage;
- integracoes;
- estrategia de execucao;
- governanca de fase.

## 7. Regra de manutencao

Sempre que um ADR for criado, atualizado, substituido ou revogado, este indice deve ser revisado.

## 8. Resumo

Esta pasta existe para preservar a memoria arquitetural do PetOS e reduzir improviso entre produto, codigo e documentacao.
