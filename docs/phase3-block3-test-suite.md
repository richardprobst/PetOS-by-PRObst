# Fase 3 - Bloco 3 - Suite Minima de Testes

## Objetivo

Este documento registra a suite minima reconhecivel do **Bloco 3 da Fase 3**, cobrindo o primeiro corte assistivo de analise de imagem sobre a fundacao de IA, documentos e multiunidade ja entregue.

Ele existe para deixar explicito:

- qual recorte de testes protege o Bloco 3;
- quais invariantes do fluxo assistivo de imagem continuam obrigatorios;
- quais superficies administrativas entram no smoke do bloco;
- o que ainda nao e coberto como fluxo final do tutor, provider real ou diagnostico.

## Script reconhecivel do bloco

- `npm run test:phase3:block3`

## Recorte executado pelo script

- `tests/server/ai/*.test.ts`
- `tests/server/documents/*.test.ts`
- `tests/server/phase3-block3-smoke.test.ts`

## O que a suite cobre

### Fundacao assistiva de imagem

- contrato do primeiro corte restrito a `GALLERY_METADATA` e `PRE_POST_ASSISTED`;
- adaptador interno provider-neutral de imagem assistiva;
- integracao do fluxo de imagem com gating, quota, consentimento, retencao, auditoria e eventos;
- persistencia de analises com snapshot de envelope e metadados suficientes para auditoria;
- revisao humana obrigatoria dos resultados concluidos.

### Midia e metadados operacionais

- enriquecimento de `media assets` com `captureStage` e `galleryLabel`;
- validacao de capturas `PRE_SERVICE` e `POST_SERVICE` ligadas ao atendimento;
- comparacao pre/post impedida quando imagens, atendimento, pet ou unidade ficam inconsistentes;
- protecao do descarte por padrao do payload bruto do provider.

### Superficies administrativas minimas

- leitura protegida de analises assistivas no admin;
- acionamento controlado de analise em documentos e report cards;
- resumo assistivo interno em pets sem abertura de visibilidade final ao tutor.

## Invariantes protegidos

- o primeiro corte continua limitado a galeria/metadados e verificacao assistida pre/post-servico;
- resultado de imagem continua assistivo e nunca se apresenta como diagnostico;
- revisao humana permanece obrigatoria no caminho concluido;
- sem provider real, sem billing real e sem payload bruto persistido por padrao;
- leitura de analises continua respeitando contexto de unidade resolvido no servidor;
- o fluxo do tutor continua fora do escopo deste bloco.

## O que a suite ainda NAO cobre

- provider externo real de visao computacional;
- publicacao do fluxo final para tutor;
- caso clinico ou leitura de saude preliminar;
- dashboard final de imagem;
- Bloco 4 de analise preditiva e insights;
- Bloco 5 de observabilidade e governanca final de custo.

## Evidencias complementares

- [PHASE3_PLAN.md](../PHASE3_PLAN.md)
- [docs/phase3-decision-matrix.md](./phase3-decision-matrix.md)
- [docs/phase3-approval-board.md](./phase3-approval-board.md)
- [docs/phase3-block3-exit-checklist.md](./phase3-block3-exit-checklist.md)
