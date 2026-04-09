# Fase 3 - Bloco 1 - Checklist de Fechamento e Saida para o Bloco 2

## Objetivo do checklist

Este documento transforma os criterios de pronto do Bloco 1 em um checklist objetivo de encerramento e em um gate formal de saida para o Bloco 2.

Ele existe para registrar:

- o que foi efetivamente entregue entre `B1-T01` e `B1-T18`;
- o que foi validado com evidencia objetiva;
- o que continua fora do escopo por decisao intencional do bloco;
- quais sinais minimos sustentam a abertura do Bloco 2 sem reavaliacao ampla da fundacao.

Ele deve ser lido em conjunto com:

- [docs/phase3-block1-technical-backlog.md](./phase3-block1-technical-backlog.md)
- [docs/phase3-block1-operational-plan.md](./phase3-block1-operational-plan.md)
- [docs/phase3-block1-test-suite.md](./phase3-block1-test-suite.md)

## Itens obrigatorios de fechamento

### Fundacao de IA

- [x] contrato interno central implementado
- [x] gating server-side unico implementado
- [x] `fail-closed` validado
- [x] quotas base por modulo presentes
- [x] envelope de execucao presente
- [x] retencao e descarte minimos definidos
- [x] metadados operacionais minimos definidos
- [x] adaptador interno normalizado presente
- [x] lifecycle minimo assincrono presente
- [x] fallback conceitual presente
- [x] auditoria minima presente
- [x] trilha de consentimento e retencao presente
- [x] eventos minimos de custo, erro e desligamento presentes
- [x] superficie administrativa minima de diagnostico presente

### Fundacao multiunidade

- [x] contexto de unidade server-side presente
- [x] distincao `LOCAL` vs `GLOBAL_AUTHORIZED` validada
- [x] ownership e visibilidade base de cliente/pet presentes
- [x] isolamento cross-unit por padrao validado
- [x] superficie interna minima de contexto multiunidade presente
- [x] mapa de impacto multiunidade documentado

### Validacao tecnica

- [x] suite minima do Bloco 1 presente
- [x] smoke minimo do bloco presente
- [x] `npm run test:phase3:block1` verde
- [x] `npm run typecheck` verde
- [x] `npm test` verde
- [x] `npm run build` verde

## O que o Bloco 1 deliberadamente ainda NAO entrega

O Bloco 1 foi fechado como fundacao. Ele deliberadamente ainda nao entrega:

- provider real ativo;
- billing real;
- fallback real entre vendors;
- fila externa ou worker real de producao;
- persistencia definitiva ampla;
- painel final de IA;
- UI final de consentimento;
- multiunidade operacional completa;
- dashboards globais finais;
- caso final de analise de imagem;
- caso final de insights preditivos;
- abertura funcional ampla do Bloco 2.

Esses itens continuam fora do escopo do bloco e nao devem ser confundidos com lacuna acidental de implementacao.

## Evidencias minimas de fechamento

### Suite minima do bloco

- script reconhecivel: `npm run test:phase3:block1`
- documento da suite: [docs/phase3-block1-test-suite.md](./phase3-block1-test-suite.md)
- smoke final reaproveitado: [tests/server/phase3-block1-smoke.test.ts](../tests/server/phase3-block1-smoke.test.ts)

### Checks que devem estar verdes

- `npm run test:phase3:block1`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Superficies minimas administrativas usadas como evidencia

- diagnostico minimo da fundacao da IA em `/admin/sistema`
- rota interna `app/api/admin/system/phase3-foundation-diagnostics`
- contexto multiunidade interno com unidade ativa, papel global e ownership base

### Documentos de handoff do bloco

- [docs/phase3-block1-technical-backlog.md](./phase3-block1-technical-backlog.md)
- [docs/phase3-block1-operational-plan.md](./phase3-block1-operational-plan.md)
- [docs/phase3-block1-test-suite.md](./phase3-block1-test-suite.md)
- [docs/phase3-block1-multiunit-impact-map.md](./phase3-block1-multiunit-impact-map.md)
- [docs/phase3-block1-exit-checklist.md](./phase3-block1-exit-checklist.md)
- [CHANGELOG.md](../CHANGELOG.md)

## Smoke final administrativo ou interno registrado

O smoke final registrado para o fechamento do bloco e o recorte:

- `tests/server/phase3-block1-smoke.test.ts`

Esse smoke prova, no minimo:

- leitura administrativa minima da fundacao da IA;
- leitura administrativa minima do contexto multiunidade;
- bloqueio da superficie interna sem permissao alta;
- coerencia do payload protegido da fundacao;
- leitura global autorizada sem liberar escrita estrutural cross-unit por padrao.

## Gate de saida para o Bloco 2

- `Bloco 1 encerrado`: `sim`
- `Bloco 2 pode abrir`: `sim com ressalvas`

### Condicoes minimas ja atendidas

- contexto de unidade autoritativo na sessao e no servidor;
- ownership e visibilidade base de cliente/pet estabilizados;
- gating e quotas de IA governados no servidor com `fail-closed`;
- integracao interna de IA isolada e rastreavel;
- eventos minimos de auditoria, custo e erro emitidos;
- superficie administrativa minima permitindo validar o estado da fundacao;
- suite minima do bloco consolidada e executavel.

### Ressalvas que nao reabrem o Bloco 1

- o Bloco 2 deve partir da fundacao pronta, nao reavaliar toda a base de IA e multiunidade;
- os modulos do Bloco 2 ainda precisam aplicar as regras ja mapeadas no impacto multiunidade;
- provider real, billing real, painel final e multiunidade operacional completa continuam fora deste gate;
- qualquer abertura de Bloco 2 deve preservar a regra de nao furar `fail-closed`, quota, consentimento e isolamento cross-unit.

### Condicoes que exigiriam verificacao adicional

- aparicao de pendencia critica nova em LGPD, custo ou isolamento cross-unit;
- regressao na suite minima do bloco;
- tentativa de abrir Bloco 2 com provider real, billing real ou UI final acoplados por conveniencia.
