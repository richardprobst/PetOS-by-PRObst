# Phase 3 Block 1 Sprint 1 Exit Gate

Data da ultima revisao: 2026-04-07

## 1. Objetivo do gate

Este documento registra a avaliacao formal de saida do Sprint 1 do Bloco 1 da Fase 3 antes da abertura do Sprint 2.

Ele existe para responder, com base no que foi implementado e validado:

- se o Sprint 1 esta estruturalmente fechado;
- se a fundacao da camada de IA continua coerente com o plano aprovado;
- se existem gaps que ainda bloqueiam a sequencia do bloco;
- se o proximo passo pode ser a abertura controlada do Sprint 2.

Referencia principal:

- [docs/phase3-block1-sprint1-plan.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-sprint1-plan.md)
- [docs/phase3-block1-technical-backlog.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-technical-backlog.md)

---

## 2. Itens avaliados

- `B1-T01` - contrato interno central da camada de IA
- `B1-T02` - hierarquia de flags e politica `fail-closed` server-side
- `B1-T03` - quotas base por modulo e previsao por unidade

Arquivos-base da avaliacao:

- [features/ai/domain.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/features/ai/domain.ts)
- [features/ai/gating.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/features/ai/gating.ts)
- [features/ai/policy.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/features/ai/policy.ts)
- [features/ai/schemas.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/features/ai/schemas.ts)
- [server/integrations/ai/contract.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/server/integrations/ai/contract.ts)
- [server/env.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/server/env.ts)

---

## 3. O que foi validado

### 3.1. Contrato interno

Foi validado que o `B1-T01` preserva a funcao esperada do sprint:

- `features/ai` concentra o contrato interno e o outcome provider-neutral;
- `server/integrations/ai` permanece como fronteira futura de adaptadores;
- o dominio nao esta acoplado a HTTP, UI ou payload cru de provider;
- a camada continua assistiva, com `humanReviewRequired` e sem automacao decisoria.

Conclusao:

- `B1-T01` ficou coerente com a ordem prevista do sprint;
- nao houve abertura indevida de provider real, job real, persistencia definitiva ou casos finais de imagem/preditivo.

### 3.2. Gating

Foi validado que o `B1-T02` implementa a autoridade central de gating server-side:

- hierarquia minima de flags avaliada em um unico funil;
- `ai.enabled=false` bloqueia tudo;
- flags ausentes ou invalidas falham fechado;
- inferencia nao suportada falha fechada;
- a decisao sai padronizada e integrada ao contrato interno.

Conclusao:

- o comportamento `fail-closed` deixou de ser apenas conceitual;
- nao ha evidencia de gating espalhado entre modulos do Sprint 1;
- o backend continua como autoridade da decisao.

### 3.3. Quota e politica

Foi validado que o `B1-T03` fecha a fundacao minima de governanca de custo:

- quota base por modulo para `IMAGE_ANALYSIS` e `PREDICTIVE_INSIGHTS`;
- distincao clara entre bloqueio por flag e bloqueio por quota/politica;
- previsao explicita de quota por unidade como `NOT_EVALUATED`;
- motivos padronizados para quota ausente, excedida ou indisponibilidade operacional.

Conclusao:

- o sprint nao abriu billing real, consumo real, provider real ou persistencia de custo;
- a camada ja evita o desenho perigoso em que IA habilitada implica consumo sem teto.

### 3.4. Testes executados

Checks executados nesta avaliacao:

- `cmd /c npm run build`
- `cmd /c npm run typecheck`
- `cmd /c npm test`

Resultado:

- `build` verde;
- `typecheck` verde;
- suite ampla verde com `166` testes passando e `0` falhando.

Checks relevantes ja executados no recorte do sprint durante a implementacao:

- testes focados de `domain`
- testes focados de `contract`
- testes focados de `gating`
- testes focados de `policy`
- lint do recorte alterado

### 3.5. Checks ainda nao executados

Nao ficou faltando nenhum check tecnico minimo definido como necessario para a decisao deste gate.

Os pontos abaixo continuam fora do escopo do Sprint 1 e, por isso, nao entram como validacao faltante deste fechamento:

- provider real;
- job real;
- persistencia definitiva;
- superficie administrativa final;
- politica operacional completa por unidade.

---

## 4. Gaps restantes

O Sprint 1 fecha a fundacao, mas ainda deixa gaps esperados para os itens seguintes do bloco:

- a previsao por unidade existe, mas ainda nao tem efeito operacional;
- a rastreabilidade esta pronta no contrato, mas ainda nao emite auditoria persistida;
- a politica de quota existe, mas ainda depende de fonte futura de consumo persistido;
- o contrato de `inferenceKey` ainda e propositalmente generico e sera refinado pelos casos reais dos blocos seguintes;
- ainda nao existe superficie administrativa minima para diagnostico da camada.

Esses gaps sao reais, mas estao coerentes com o recorte do Sprint 1 e nao configuram, por si so, desvio de escopo ou retrabalho estrutural obrigatorio.

---

## 5. Classificacao final

**Classificacao:** `GO COM RESSALVAS`

Justificativa:

- a ordem prevista do sprint foi preservada;
- a fundacao da camada de IA ficou coerente;
- nao houve acoplamento indevido a provider, UI ou HTTP;
- `build`, `typecheck` e suite ampla passaram;
- a saida do sprint ainda carrega riscos residuais normais de uma fundacao sem persistencia, sem observabilidade final e sem politica por unidade ativa.

---

## 6. Condicao para abrir o Sprint 2

**Decisao:** pode abrir agora, com ressalvas.

Leitura objetiva:

- Sprint 1 esta estruturalmente fechado: `sim`
- Pode abrir o Sprint 2: `sim com ressalvas`

Ressalvas obrigatorias para a abertura:

- manter a separacao entre contrato, gating e politica;
- nao puxar provider real, billing real ou jobs reais antes do item apropriado;
- nao transformar previsao por unidade em regra parcial espalhada;
- carregar para o Sprint 2 a necessidade de observabilidade e persistencia minima sem reescrever a fundacao.

Se essas ressalvas forem desrespeitadas, o risco principal deixa de ser "falta do Sprint 1" e passa a ser contaminacao indevida do Sprint 2.
