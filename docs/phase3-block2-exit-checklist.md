# Fase 3 - Bloco 2 - Checklist de Fechamento e Saida para o Bloco 3

## Objetivo do checklist

Este documento transforma os criterios de conclusao do **Bloco 2 - Multiunidade operacional completa** em um gate formal e auditavel de saida.

Ele registra:

- o que foi efetivamente entregue no Bloco 2;
- o que foi validado com smoke e suite reconhecivel;
- quais limitacoes continuam intencionais;
- quais condicoes sustentam a abertura do Bloco 3 sem reavaliacao ampla da fundacao multiunidade.

Ler em conjunto com:

- [PHASE3_PLAN.md](../PHASE3_PLAN.md)
- [docs/phase3-block1-exit-checklist.md](./phase3-block1-exit-checklist.md)
- [docs/phase3-block1-multiunit-impact-map.md](./phase3-block1-multiunit-impact-map.md)
- [docs/phase3-block2-test-suite.md](./phase3-block2-test-suite.md)

## Itens obrigatorios de fechamento

### Contexto e autorizacao

- [x] contexto de unidade continua autoritativo na sessao e no servidor
- [x] distincao `LOCAL` vs `GLOBAL_AUTHORIZED` continua explicita e validada
- [x] leitura cross-unit continua fail-closed por padrao
- [x] escrita estrutural cross-unit continua bloqueada sem permissao global explicita
- [x] ownership base de cliente/pet continua sendo a referencia do dominio

### Modulos operacionais aderentes ao contexto central

- [x] `appointments` e agenda administrativa respeitam o contexto multiunidade resolvido
- [x] `finance` e `fiscal` respeitam o contexto multiunidade resolvido
- [x] `inventory` respeita o contexto multiunidade resolvido
- [x] `messages` e `crm` respeitam o contexto multiunidade resolvido
- [x] `employees`, `team-operations`, `commissions` e `services` respeitam o contexto multiunidade resolvido
- [x] `waitlist`, `taxi-dog`, `pos` e `report-cards` respeitam o contexto multiunidade resolvido
- [x] `documents`, `media` e `integration-events` respeitam o contexto multiunidade resolvido

### Superficies administrativas minimas

- [x] layout administrativo exibe o contexto multiunidade ativo de forma protegida e somente leitura
- [x] superficies administrativas continuam dependentes do service layer central, sem duplicar regra no client
- [x] portal do tutor permanece separado do escopo administrativo e sem vazamento cross-unit

### Validacao tecnica

- [x] suite minima reconhecivel do Bloco 2 presente
- [x] smoke do bloco presente
- [x] `npm run test:phase3:block2` verde
- [x] `npm run typecheck` verde
- [x] `npm test` verde
- [x] `npm run build` verde

## O que o Bloco 2 deliberadamente ainda NAO entrega

O fechamento do Bloco 2 nao significa:

- UI final de troca de contexto de unidade;
- dashboards globais finais consolidados;
- experiencia completa de tutor compartilhado entre unidades;
- automacao ampla de mutacoes cross-unit;
- provider real de IA;
- billing real de IA;
- Bloco 3 de analise de imagem;
- Bloco 4 de analise preditiva;
- Bloco 5 de observabilidade/custo final da Fase 3.

Esses itens continuam fora do escopo deste gate e nao devem ser confundidos com regressao do Bloco 2.

## Evidencias minimas de fechamento

### Suite minima

- script: `npm run test:phase3:block2`
- documento da suite: [docs/phase3-block2-test-suite.md](./phase3-block2-test-suite.md)
- smoke central: [tests/server/phase3-block2-smoke.test.ts](../tests/server/phase3-block2-smoke.test.ts)

### Checks obrigatorios

- `npm run test:phase3:block2`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Superficies e artefatos usados como evidencia

- service layer multiunidade dos modulos operacionais
- snapshot de contexto multiunidade no layout administrativo
- roteiro tecnico do impacto multiunidade do Bloco 1
- changelog do repositorio

## Gate de saida para o Bloco 3

- `Bloco 2 encerrado`: `sim`
- `Bloco 3 pode abrir`: `sim com ressalvas`

### Condicoes minimas ja atendidas

- o contexto multiunidade agora percorre os modulos operacionais centrais sem depender de filtros cegos por `actor.unitId`;
- perfis locais e globais ficam semanticamente separados no backend;
- o portal do tutor continua protegido e fora do escopo administrativo cross-unit;
- a suite reconhecivel do bloco protege agenda, financeiro, estoque, comunicacao e tutor.

### Ressalvas que nao reabrem o Bloco 2

- a experiencia final de troca de contexto continua fora deste bloco;
- dashboards globais finais continuam dependentes de modelagem especifica de consolidacao;
- os blocos de IA ainda devem crescer sobre este escopo multiunidade pronto, nao em paralelo a ele.

### Condicoes que exigiriam verificacao adicional

- qualquer regressao que reabra leitura cross-unit por default;
- qualquer tentativa de liberar escrita estrutural cross-unit por conveniencia;
- qualquer abertura do Bloco 3 que ignore consentimento, retencao ou ownership por unidade.
