# ADR 014 - A Fase 3 fecha com governanca consolidada e regressao reconhecivel

- **Status:** Aceito
- **Data:** 2026-04-09
- **Decisores:** Mantenedor do projeto / fechamento da Fase 3
- **Relacionados:** `docs/phase3-baseline.md`, `docs/phase3-block5-exit-checklist.md`, `docs/phase3-block5-test-suite.md`, `features/phase3/governance.ts`

---

## 1. Contexto

Depois do fechamento dos blocos 1 a 4, a Fase 3 precisava de um gate final claro para:

- nao confundir baseline tecnica com produto final amplo;
- consolidar leituras administrativas minimas;
- registrar regressao reconhecivel da fase;
- evitar que novas expansoes reabrissem silenciosamente a fundacao.

## 2. Problema

A decisao precisava responder:

> Como marcar a Fase 3 como baseline tecnica sem prometer provider real, billing real, painel final ou multiunidade irrestrita?

## 3. Alternativas consideradas

### A. Considerar a fase encerrada apenas por changelog e codigo

Desvantagens:

- pouco auditavel;
- dificil de manter como gate futuro;
- fraco para onboarding e regressao.

### B. Fechar a fase com governanca consolidada, docs e suite reconhecivel

Vantagens:

- criterio de saida objetivo;
- snapshot administrativo unico;
- regressao tecnica reutilizavel.

## 4. Decisao

O fechamento da Fase 3 passa a depender de:

- snapshot consolidado de governanca;
- rota administrativa protegida;
- secao minima em `/admin/sistema`;
- suite reconhecivel da fase;
- checklist formal de saida e baseline documental.

## 5. Consequencias praticas

- a Fase 3 fica fechada como baseline tecnica conservadora;
- novas expansoes precisam de gate proprio;
- a governanca da fase deixa de depender de leitura espalhada por varios blocos;
- o repositorio ganha uma regressao reconhecivel para preservar os invariantes da fase.
