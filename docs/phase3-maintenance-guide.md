# Guia de Manutencao da Fase 3

## 1. Objetivo

Este guia resume como manter e evoluir a baseline da Fase 3 sem reabrir decisoes fundamentais ja fechadas.

Ele cobre:

- fundacao transversal de IA;
- analise de imagem assistiva;
- insights preditivos;
- contexto multiunidade;
- governanca consolidada da fase.

## 2. Invariantes que nao podem ser quebradas

### 2.1. IA

- `fail-closed` sempre;
- flags invalidas ou ausentes bloqueiam;
- quotas ausentes ou invalidas bloqueiam;
- provider real nao pode ser assumido por padrao;
- eventos, auditoria, consentimento e retention precisam continuar coerentes com o envelope;
- nenhuma automacao critica deve nascer sem gate novo.

### 2.2. Analise de imagem

- resultado continua assistivo;
- revisao humana continua obrigatoria no recorte atual;
- nenhuma leitura deve ser apresentada como diagnostico clinico;
- retencao de payload bruto continua conservadora.

### 2.3. Insights preditivos

- resultado continua recomendacao auditavel;
- horizonte, historico e confianca precisam ser explicitos;
- pouco historico nao pode fingir certeza;
- feedback operacional continua parte do fluxo.

### 2.4. Multiunidade

- servidor continua sendo a autoridade do contexto;
- leitura global depende de `GLOBAL_AUTHORIZED`;
- ausencia de contexto falha fechado;
- escrita estrutural cross-unit continua mais restrita que leitura;
- diagnostico administrativo nao substitui o enforcement.

## 3. Modulos principais

### 3.1. Fundacao transversal de IA

Arquivos centrais:

- `features/ai/domain.ts`
- `features/ai/schemas.ts`
- `features/ai/gating.ts`
- `features/ai/policy.ts`
- `features/ai/execution.ts`
- `features/ai/operational.ts`
- `features/ai/fallback.ts`
- `features/ai/consent.ts`
- `features/ai/retention.ts`
- `features/ai/events.ts`
- `features/ai/audit.ts`
- `features/ai/admin-diagnostics.ts`

### 3.2. Analise de imagem

Arquivos centrais:

- `features/ai/vision/contract.ts`
- `features/ai/vision/schemas.ts`
- `features/ai/vision/domain.ts`
- `features/ai/vision/adapter.ts`
- `features/ai/vision/services.ts`
- `features/ai/vision/actions.ts`

Dependencias principais:

- `MediaAsset`
- `ImageAnalysis`
- envelope de IA;
- consentimento por finalidade;
- auditoria e eventos.

### 3.3. Insights preditivos

Arquivos centrais:

- `features/insights/contract.ts`
- `features/insights/schemas.ts`
- `features/insights/domain.ts`
- `features/insights/adapter.ts`
- `features/insights/services.ts`
- `features/insights/actions.ts`

### 3.4. Multiunidade

Arquivos centrais:

- `features/multiunit/context.ts`
- `features/multiunit/schemas.ts`
- `features/multiunit/admin-diagnostics.ts`
- `server/authorization/scope.ts`

### 3.5. Governanca consolidada

Arquivos centrais:

- `features/phase3/governance.ts`
- `app/api/admin/system/phase3-governance/route.ts`
- `app/admin/sistema/page.tsx`

## 4. Onde tocar ao evoluir a Fase 3

### 4.1. Se a mudanca for em flags, quotas ou envelope

Revisar:

- `server/env.ts`
- `.env.example`
- `.env.staging.example`
- `features/ai/gating.ts`
- `features/ai/policy.ts`
- `features/ai/execution.ts`
- `docs/environment-contract.md`

### 4.2. Se a mudanca for em imagem

Revisar:

- `features/ai/vision/*`
- `features/documents/*` ou `features/report-cards/*` quando houver acoplamento;
- schema e migration, se houver persistencia nova;
- testes de IA e smoke do bloco correspondente.

### 4.3. Se a mudanca for em insight preditivo

Revisar:

- `features/insights/*`
- `app/admin/agenda/page.tsx` ou outra superficie administrativa minima;
- `PredictiveInsightSnapshot` e migration, se houver impacto estrutural;
- testes do bloco correspondente.

### 4.4. Se a mudanca for em multiunidade

Revisar:

- `server/authorization/scope.ts`
- `features/multiunit/*`
- services do dominio afetado;
- mapa de impacto do modulo;
- testes de isolamento cross-unit.

## 5. Checklist de manutencao segura

Antes de concluir uma mudanca de Fase 3:

1. confirmar que ela nao reabre MVP ou Fase 2 sem necessidade;
2. confirmar que nao quebra `fail-closed`;
3. confirmar que nao quebra ownership ou escopo por unidade;
4. confirmar que a trilha de auditoria permanece coerente;
5. confirmar que a documentacao do bloco ou da fase continua atualizada;
6. confirmar que o recorte continua assistivo quando esse era o contrato aprovado.

## 6. Suite e regressao

Referencias:

- `npm run test:phase3:block1`
- `npm run test:phase3:block2`
- `npm run test:phase3:block3`
- `npm run test:phase3:block4`
- `npm run test:phase3:block5`
- `npm run test:phase3`

Regra pratica:

- mudou fundacao transversal, rode ao menos o bloco correspondente e `test:phase3`;
- mudou escopo multiunidade, priorize testes server-side de isolamento;
- mudou governanca, mantenha coerencia entre snapshot, diagnostico e docs.

## 7. Documentacao que deve andar junto

Dependendo da mudanca, revisar:

- `docs/architecture.md`
- `docs/domain-rules.md`
- `docs/data-model.md`
- `docs/environment-contract.md`
- `docs/rbac-permission-matrix.md`
- `docs/internal-api-catalog.md`
- `docs/phase3-baseline.md`
- checklist e suite do bloco afetado

## 8. O que nao fazer por conveniencia

- nao introduzir provider real sem gate novo;
- nao tratar insight como decisao automatica;
- nao liberar escrita cross-unit ampla sem criterio explicito;
- nao duplicar trilha paralela de auditoria ou observabilidade;
- nao guardar payload bruto de IA por padrao.

## 9. Documentos complementares

Ler em conjunto com:

- `PHASE3_PLAN.md`
- `docs/phase3-baseline.md`
- `docs/phase3-block5-exit-checklist.md`
- `docs/phase3-decision-matrix.md`
