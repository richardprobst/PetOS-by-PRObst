# ADR 013 - A fundacao de IA da Fase 3 e provider-neutral, auditavel e fail-closed

- **Status:** Aceito
- **Data:** 2026-04-09
- **Decisores:** Mantenedor do projeto / consolidacao da Fase 3
- **Relacionados:** `PHASE3_PLAN.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/phase3-maintenance-guide.md`

---

## 1. Contexto

O PetOS abriu IA na Fase 3 apenas em recortes assistivos e controlados.

Era necessario evitar:

- acoplamento prematuro a um vendor;
- execucao silenciosa quando configuracao ou quota faltarem;
- ausencia de auditoria, consentimento e retention;
- confusao entre recomendacao assistiva e regra automatica.

## 2. Problema

A decisao precisava responder:

> Como estruturar IA no PetOS sem provider real obrigatorio, preservando governanca e capacidade de evolucao?

## 3. Alternativas consideradas

### A. Integrar diretamente um provider e propagar o formato pelo sistema

Desvantagens:

- forte acoplamento;
- pior governanca;
- maior retrabalho para imagem e insights.

### B. Abrir uma fundacao provider-neutral, auditavel e fail-closed

Vantagens:

- separacao de contratos;
- gating, policy e envelope unificados;
- espaco para evoluir imagem e insights sem quebrar a base.

## 4. Decisao

O PetOS adota uma fundacao de IA com:

- contrato provider-neutral;
- gating server-side fail-closed;
- quotas e politica por modulo;
- envelope de execucao;
- consentimento, retention, eventos e auditoria;
- adaptadores internos separados para imagem e insights.

## 5. Consequencias praticas

- provider real nao e requisito para a baseline existir;
- flags e quotas ausentes bloqueiam;
- imagem continua assistiva e com revisao humana;
- insight continua recomendacao e feedback operacional;
- toda expansao futura de IA precisa preservar essa fundacao ou registrar nova decisao.
