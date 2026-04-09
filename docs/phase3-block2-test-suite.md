# Fase 3 - Bloco 2 - Suite Minima de Testes

## Objetivo

Este documento registra a suite minima reconhecivel do **Bloco 2 da Fase 3**, cobrindo a abertura operacional multiunidade sobre a fundacao entregue no Bloco 1.

Ele existe para deixar explicito:

- qual recorte de testes protege o Bloco 2;
- quais invariantes multiunidade continuam obrigatorios;
- quais superficies operacionais entram no smoke do bloco;
- o que ainda nao e coberto como UX final ou consolidado global completo.

## Script reconhecivel do bloco

- `npm run test:phase3:block2`

## Recorte executado pelo script

- `tests/server/multiunit/*.test.ts`
- `tests/server/appointments/multiunit-read.test.ts`
- `tests/server/documents/*.test.ts`
- `tests/server/tutor/*.test.ts`
- `tests/server/phase3-block2-smoke.test.ts`

## O que a suite cobre

### Contexto e isolamento

- contexto de unidade resolvido server-side;
- distincao entre `LOCAL` e `GLOBAL_AUTHORIZED`;
- fail-closed quando o contexto nao e valido;
- bloqueio de escrita estrutural cross-unit sem permissao global explicita.

### Modulos operacionais com leitura multiunidade controlada

- agenda e agendamentos;
- financeiro e fiscal minimo;
- estoque;
- comunicacao manual e CRM;
- equipe, escalas, ponto e folha;
- PDV;
- report cards;
- documentos, midia e eventos de integracao;
- waitlist e Taxi Dog;
- catalogo de servicos e comissoes.

### Guardrails do tutor

- o portal do tutor continua derivado do ownership do proprio tutor;
- alertas do portal permanecem restritos a documentos, pre-check-in, financeiro, waitlist e Taxi Dog;
- o portal nao abre CRM cross-unit nem experiencia operacional administrativa.

## Invariantes protegidos

- comportamento single-unit continua estavel por padrao;
- leitura global so existe quando o papel ja chega com `GLOBAL_AUTHORIZED`;
- mudancas do Bloco 2 nao reabrem `actor.unitId` como filtro cego de service layer;
- pages e rotas administrativas continuam dependentes do backend como autoridade;
- leitura cross-unit nao libera escrita estrutural;
- o portal do tutor nao vaza escopo cross-unit administrativo.

## O que a suite ainda NAO cobre

- UI final de troca de contexto de unidade;
- dashboards globais finais consolidados;
- automacao completa de mutacoes cross-unit;
- Bloco 3 de analise de imagem;
- Bloco 4 de analise preditiva.

## Evidencias complementares

- [PHASE3_PLAN.md](../PHASE3_PLAN.md)
- [docs/phase3-block1-exit-checklist.md](./phase3-block1-exit-checklist.md)
- [docs/phase3-block1-multiunit-impact-map.md](./phase3-block1-multiunit-impact-map.md)
- [docs/phase3-block2-exit-checklist.md](./phase3-block2-exit-checklist.md)
