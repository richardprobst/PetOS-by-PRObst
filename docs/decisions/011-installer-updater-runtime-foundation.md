# ADR 011 - Installer e updater integrados usam runtime state persistido e operacao controlada

- **Status:** Aceito
- **Data:** 2026-04-09
- **Decisores:** Mantenedor do projeto / consolidacao da frente installer-updater
- **Relacionados:** `docs/architecture.md`, `docs/data-model.md`, `docs/environment-contract.md`, `docs/installer-updater-baseline.md`

---

## 1. Contexto

O PetOS passou a incluir setup inicial guiado, runtime state de ciclo de vida e updater controlado no proprio sistema.

Era necessario evitar:

- setup reaberto por acidente;
- update sem trilha persistida;
- manutencao e repair tratados apenas como estado visual;
- divergencia entre o estado real do runtime e a interface administrativa.

## 2. Problema

A decisao precisava responder:

> Como representar instalacao, manutencao, repair e update de forma auditavel e segura no proprio dominio do sistema?

## 3. Alternativas consideradas

### A. Tratar setup e update apenas como scripts externos

Desvantagens:

- baixa auditabilidade;
- pouca visibilidade administrativa;
- estado real do runtime dificil de consultar.

### B. Persistir runtime state, incidentes e execucoes de update

Vantagens:

- trilha operacional consistente;
- preflight e recovery mais seguros;
- UI administrativa alinhada ao estado real.

## 4. Decisao

O PetOS passa a usar runtime state persistido e operacao controlada para setup e update, com entidades dedicadas para:

- estado de ciclo de vida;
- incidentes de recovery;
- execucoes de update;
- passos de update.

## 5. Consequencias praticas

- setup depende de gating explicito;
- updater opera com lock, preflight e trilha persistida;
- falha operacional nao fica invisivel;
- `/admin/sistema` pode refletir o runtime real;
- futuras evolucoes da frente continuam apoiadas em entidades do proprio dominio.
