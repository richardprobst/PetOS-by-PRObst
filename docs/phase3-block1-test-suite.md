# Fase 3 — Bloco 1 — Suite Minima de Testes

## Objetivo

Este documento registra a suite minima reconhecivel do `B1-T18`, usada para proteger a fundacao do Bloco 1 antes do handoff para o Bloco 2.

Ela nao abre feature nova. Ela consolida a rede minima de protecao sobre a base ja entregue entre `B1-T01` e `B1-T17`.

## Comando da suite

Rodar a suite minima do bloco:

```bash
npm run test:phase3:block1
```

Esse recorte executa:

- `tests/server/ai/*.test.ts`
- `tests/server/multiunit/*.test.ts`
- `tests/server/phase3-block1-smoke.test.ts`

No `B1-T19`, este comando passou a ser gate documental explicito de saida do Bloco 1 junto com `npm run typecheck`, `npm test` e `npm run build`.

## O que a suite cobre

### IA

- contrato interno provider-neutral;
- gating server-side com `fail-closed`;
- quotas e policy por modulo;
- envelope de execucao;
- lifecycle minimo assincrono;
- fallback conceitual;
- consentimento por finalidade;
- retencao minima e descarte por padrao;
- auditoria minima;
- eventos minimos de custo, erro e desligamento rapido;
- superficie administrativa minima de diagnostico.

### Multiunidade

- contexto de unidade resolvido server-side;
- distincao entre `LOCAL` e `GLOBAL_AUTHORIZED`;
- ownership e visibilidade real de cliente/pet;
- bloqueio de leitura e escrita cross-unit por padrao;
- superficie interna minima de contexto multiunidade.

### Smoke administrativo do bloco

- superficie protegida para atores sem permissao alta;
- coerencia minima do payload administrativo interno da fundacao;
- leitura administrativa local;
- leitura global autorizada sem abrir escrita estrutural cross-unit por padrao.

## Invariantes protegidos

### Governanca de IA

- IA desligada ou mal configurada bloqueia, nunca executa.
- bloqueio por flag ou policy nao vira fallback.
- bloqueio por quota nao vira execucao permissiva.
- consentimento e exigido quando aplicavel.
- payload bruto nao passa a ser retido por padrao.
- eventos operacionais e auditoria continuam coerentes com o envelope.

### Isolamento multiunidade

- contexto ausente falha fechado.
- contexto local preserva o comportamento single-unit.
- leitura cross-unit exige papel global autorizado.
- edicao estrutural cross-unit exige permissao global explicita.
- superficies internas nao devem vazar escopo alem do permitido.

## O que esta fora da cobertura desta suite

- provider real;
- billing real;
- fila externa;
- retry operacional completo;
- UI final de IA;
- multiunidade operacional completa;
- dashboards finais do Bloco 2;
- historico persistido final de observabilidade.

## Sinal minimo para handoff do Bloco 1

O Bloco 1 pode seguir para handoff tecnico quando:

- `npm run test:phase3:block1` estiver verde;
- `npm run typecheck` estiver verde;
- `npm test` estiver verde;
- `npm run build` estiver verde;
- os bloqueios `fail-closed`, quota, consentimento, auditoria e isolamento por unidade continuarem explicitamente cobertos.

## Vinculo com o B1-T19

Esta suite e a evidencia tecnica principal usada pelo checklist formal de saida do bloco em [docs/phase3-block1-exit-checklist.md](./phase3-block1-exit-checklist.md).

O smoke final administrativo ou interno reaproveitado no fechamento do bloco e:

- `tests/server/phase3-block1-smoke.test.ts`
