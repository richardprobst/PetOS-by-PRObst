# Fase 3 - Bloco 3 - Checklist de Fechamento e Saida para o Bloco 4

## Objetivo do checklist

Este documento transforma os criterios de conclusao do **Bloco 3 - Analise de imagem** em um gate formal e auditavel de saida.

Ele registra:

- o que foi efetivamente entregue no primeiro corte assistivo de imagem;
- o que foi validado com smoke e suite reconhecivel;
- quais limitacoes continuam intencionais;
- quais condicoes sustentam a abertura do Bloco 4 sem reavaliacao ampla dos Blocos 1 e 2.

Ler em conjunto com:

- [PHASE3_PLAN.md](../PHASE3_PLAN.md)
- [docs/phase3-block1-exit-checklist.md](./phase3-block1-exit-checklist.md)
- [docs/phase3-block2-exit-checklist.md](./phase3-block2-exit-checklist.md)
- [docs/phase3-block3-test-suite.md](./phase3-block3-test-suite.md)
- [docs/phase3-approval-board.md](./phase3-approval-board.md)

## Itens obrigatorios de fechamento

### Primeiro corte funcional de imagem

- [x] o primeiro corte permanece restrito a `galeria/metadados` e `verificacao assistida pre/post-servico`
- [x] o fluxo de saude preliminar continua explicitamente fora do escopo
- [x] resultados de imagem continuam posicionados como apoio operacional e nao como diagnostico
- [x] revisao humana obrigatoria continua aplicada ao caminho concluido

### Integracao com a fundacao da Fase 3

- [x] a analise de imagem reutiliza o envelope provider-neutral da camada de IA
- [x] gating server-side e `fail-closed` continuam ativos
- [x] consentimento por finalidade continua exigido no fluxo de imagem
- [x] retencao e descarte por padrao do payload bruto continuam preservados
- [x] auditoria minima de uso e decisao humana continua sendo emitida
- [x] eventos operacionais continuam coerentes com o envelope

### Midia, persistencia e superficies internas

- [x] `media assets` agora suportam `captureStage` e `galleryLabel`
- [x] capturas `PRE_SERVICE` e `POST_SERVICE` exigem vinculo com atendimento
- [x] analises de imagem possuem persistencia propria e auditavel em banco
- [x] rotas internas administrativas de leitura, criacao e revisao de analises estao presentes
- [x] `/admin/documentos`, `/admin/report-cards` e `/admin/pets` exibem o recorte assistivo sem abrir UI final ao tutor

### Validacao tecnica

- [x] suite minima reconhecivel do Bloco 3 presente
- [x] smoke do bloco presente
- [x] migration do Bloco 3 presente
- [x] `npm run test:phase3:block3` verde
- [x] `npm run typecheck` verde
- [x] `npm test` verde
- [x] `npm run build` verde

## O que o Bloco 3 deliberadamente ainda NAO entrega

O fechamento do Bloco 3 nao significa:

- provider externo real de visao computacional;
- billing real de IA;
- fallback real entre vendors;
- fila externa ou worker real de producao;
- publicacao do fluxo final ao tutor;
- linguagem final juridica e de UX para publicacao externa do resultado;
- leitura clinica ou saude preliminar;
- painel final de imagem;
- Bloco 4 de analise preditiva e insights;
- Bloco 5 de observabilidade e governanca final de custo.

Esses itens continuam fora do escopo deste gate e nao devem ser confundidos com regressao do Bloco 3.

## Evidencias minimas de fechamento

### Suite minima

- script: `npm run test:phase3:block3`
- documento da suite: [docs/phase3-block3-test-suite.md](./phase3-block3-test-suite.md)
- smoke central: [tests/server/phase3-block3-smoke.test.ts](../tests/server/phase3-block3-smoke.test.ts)

### Checks obrigatorios

- `npm run test:phase3:block3`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Superficies e artefatos usados como evidencia

- [app/admin/documentos/page.tsx](../app/admin/documentos/page.tsx)
- [app/admin/report-cards/page.tsx](../app/admin/report-cards/page.tsx)
- [app/admin/pets/page.tsx](../app/admin/pets/page.tsx)
- [app/api/admin/image-analyses/route.ts](../app/api/admin/image-analyses/route.ts)
- [app/api/admin/image-analyses/[analysisId]/review/route.ts](../app/api/admin/image-analyses/[analysisId]/review/route.ts)
- [features/ai/vision/services.ts](../features/ai/vision/services.ts)
- [prisma/schema.prisma](../prisma/schema.prisma)
- changelog do repositorio

## Gate de saida para o Bloco 4

- `Bloco 3 encerrado`: `sim`
- `Bloco 4 pode abrir`: `sim com ressalvas`

### Condicoes minimas ja atendidas

- o sistema consegue disparar analise de imagem de forma controlada e auditavel;
- os resultados ficam registrados com metadado suficiente para auditoria e revisao humana;
- a UI administrativa deixa explicito que o resultado e assistivo;
- o fluxo cobre dois casos de uso reais e de baixo risco do PRD sem abrir leitura clinica perigosa.

### Ressalvas que nao reabrem o Bloco 3

- o provider real continua opcional para o primeiro corte interno e controlado;
- o tutor continua sem visibilidade do fluxo final de imagem;
- a linguagem final de publicacao externa continua dependente do fechamento de D3 para um fluxo publico.

### Condicoes que exigiriam verificacao adicional

- qualquer tentativa de transformar o resultado assistivo em diagnostico ou laudo;
- qualquer abertura do fluxo ao tutor sem texto final aprovado e sem revisao humana obrigatoria;
- qualquer mudanca que reabra persistencia de payload bruto ou ignore consentimento por finalidade.
