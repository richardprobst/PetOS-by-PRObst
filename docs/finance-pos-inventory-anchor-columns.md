# Decisao Tecnica: Colunas-ancora para `REVENUE` e `SALE_OUT`

## Objetivo

Este documento registra a decisao tecnica e o rollout em duas etapas das colunas-ancora dedicadas para reforco estrutural de duas invariantes condicionais que hoje continuam protegidas no service layer:

- uma `FinancialTransaction` de `REVENUE` por `posSaleId`;
- um `InventoryMovement` de `SALE_OUT` por `posSaleItemId`.

## Status atual

- **Trilha encerrada nos ambientes acessiveis**:
  - `local`: `GO`;
  - `producao`: `GO`;
  - `staging`: `NO-GO` por inacessibilidade, nao por falha tecnica da trilha.
- **Etapa 1 implementada**:
  - colunas nullable adicionadas ao schema;
  - write paths do PDV e do estoque passam a preencher as ancoras novas;
  - guards do service layer continuam ativos;
  - preflight tecnico da Etapa 2 foi preparado.
- **Etapa 2 implementada parcialmente, com gate por ambiente**:
  - `local`: `GO`, backfill executado como no-op e `UNIQUE` promovido;
  - `staging`: `NO-GO`, sem credencial real disponivel no repositorio;
  - `producao` acessivel via `.env.hostinger`: `GO`, depois de rollout controlado por etapas.

## Resultado operacional da Etapa 2 em 2026-04-14

### `local`

- preflight limpo;
- backfill executado sem alterar linhas, porque as ancoras ja estavam preenchidas;
- pos-check limpo;
- migration `20260414154000_promote_pos_effect_anchor_uniques_stage2` aplicada com sucesso;
- `UNIQUE(revenuePosSaleId)` e `UNIQUE(saleOutPosSaleItemId)` ativos localmente.

### `staging`

- o repositorio possui apenas `.env.staging.example`;
- nao ha `.env.staging` nem outra credencial real versionada para esse ambiente;
- a Etapa 2 nao foi executada em staging;
- classificacao operacional: `NO-GO` por ambiente inacessivel;
- a trilha nao esta tecnicamente falha em staging; ela esta apenas bloqueada por falta de acesso real ao ambiente.

### `producao`

- estado inicial revalidado:
  - quatro migrations pendentes;
  - colunas-ancora ausentes;
  - preflight remoto bloqueado com `STAGE1_SCHEMA_MISSING`;
- estrategia aplicada:
  - precheck remoto de duplicidade para garantir que as constraints de referencias externas e `ClientCredit` nao quebrariam em producao;
  - execucao manual do SQL exato de `20260413170000_enforce_external_reference_uniques`, `20260413224500_enforce_client_credit_origin_uniques` e `20260414123000_add_pos_effect_anchor_columns_stage1`;
  - registro coerente dessas tres migrations com `migrate resolve --applied`, porque o Prisma nao oferece deploy parcial ate a Etapa 1;
  - reexecucao do preflight das ancoras;
  - backfill idempotente executado como no-op (`0/0`);
  - pos-check limpo;
  - aplicacao da `20260414154000_promote_pos_effect_anchor_uniques_stage2` pela via nativa do Prisma, quando ela passou a ser a unica migration pendente;
- estado final:
  - `migrate status` remoto limpo;
  - colunas-ancora presentes;
  - `UNIQUE(revenuePosSaleId)` e `UNIQUE(saleOutPosSaleItemId)` ativas;
  - classificacao operacional: `GO`.

## Encerramento operacional

No estado atual, a trilha das colunas-ancora esta operacionalmente encerrada onde havia acesso real:

- `local`: `GO`;
- `producao`: `GO`;
- `staging`: `NO-GO` por ausencia de credencial/acesso real, sem evidencia de falha tecnica da trilha.

Mesmo com `UNIQUE` ativa nas duas ancoras em `local` e `producao`, os guards do service layer permanecem obrigatorios como protecao de dominio, ergonomia de erro e defesa adicional contra write paths futuros.

## Protocolo futuro minimo para `staging`

Se `staging` vier a existir como ambiente acessivel, o procedimento minimo ja esta definido e nao precisa ser redesenhado:

1. rodar precheck estrutural das migrations pre-Etapa 1;
2. aplicar somente os pre-requisitos ate a Etapa 1;
3. rodar o preflight das ancoras;
4. executar backfill apenas se o ambiente estiver `GO`;
5. rerodar pos-check e validacao limpa;
6. aplicar a Etapa 2 com promocao de `UNIQUE`;
7. confirmar `migrate status`, preflight final e classificacao operacional do ambiente.

## Revalidacao do estado atual

### Onde a regra e garantida hoje

- `features/pos/services.ts` concentra o fechamento de venda e a criacao do efeito economico do PDV.
- `features/inventory/services.ts` concentra a criacao do efeito fisico `SALE_OUT`.
- `features/pos/effect-guards.ts` centraliza os guards:
  - `ensurePosSaleHasNoRegisteredEffects`
  - `ensurePosSaleRevenueEffectIsUnique`
  - `ensurePosSaleItemSaleOutEffectIsUnique`

### Write paths reais hoje

No codigo atual:

- `FinancialTransaction.posSaleId` so e escrito no fechamento do PDV para `transactionType = REVENUE`;
- `InventoryMovement.posSaleItemId` so e escrito no fechamento do PDV para `movementType = SALE_OUT`;
- `recordInventoryMovement` nao aceita `SALE_OUT` manual;
- nao ha outro write path de producao que grave `posSaleId` ou `posSaleItemId` fora desses boundaries.

### Estabilidade de regra de produto

As fontes atuais (`docs/domain-rules.md`, `docs/payments.md`, `PHASE2_PLAN.md`) sustentam que:

- venda concluida reflete financeiro e estoque na mesma operacao;
- `FinancialTransaction` continua sendo a autoridade economica;
- `InventoryMovement` registra o efeito fisico do item vendido;
- nao existe caso legitimo documentado em que a mesma venda deva gerar duas receitas distintas de `REVENUE` para o mesmo `posSaleId`;
- nao existe caso legitimo documentado em que o mesmo item de venda deva gerar dois movimentos `SALE_OUT`.

Conclusao: as duas unicidades se comportam como invariantes estruturais estaveis, nao como regra temporaria de implementacao.

## Proposta minima de modelagem

### `FinancialTransaction`

Coluna nullable e dedicada:

- `revenuePosSaleId String?`

Semantica:

- preencher apenas quando a linha representar a receita do fechamento de uma `PosSale`;
- manter `posSaleId` como relacao generica existente;
- usar `revenuePosSaleId` como ancora estrutural do subconjunto `transactionType = REVENUE`.

Reforco futuro desejado:

- relacao para `PosSale`;
- `UNIQUE(revenuePosSaleId)`.

### `InventoryMovement`

Coluna nullable e dedicada:

- `saleOutPosSaleItemId String?`

Semantica:

- preencher apenas quando a linha representar o movimento fisico `SALE_OUT` do item vendido;
- manter `posSaleItemId` como relacao generica existente;
- usar `saleOutPosSaleItemId` como ancora estrutural do subconjunto `movementType = SALE_OUT`.

Reforco futuro desejado:

- relacao para `PosSaleItem`;
- `UNIQUE(saleOutPosSaleItemId)`.

## Prova de viabilidade de backfill

### Verificacoes executadas no banco local

As consultas de preflight retornaram vazio para todos os casos que inviabilizariam um backfill simples:

- linhas com `FinancialTransaction.posSaleId` preenchido fora de `transactionType = REVENUE`;
- duplicidades de `REVENUE` por `posSaleId`;
- receitas de PDV aparentes sem `posSaleId`;
- linhas com `InventoryMovement.posSaleItemId` preenchido fora de `movementType = SALE_OUT`;
- duplicidades de `SALE_OUT` por `posSaleItemId`;
- `SALE_OUT` sem `posSaleItemId`;
- `SALE_OUT` com `posSaleItemId` mas sem `posSaleId`;
- movimentos com `posSaleId` mas sem `posSaleItemId`.

### Preflight operacional preparado para a Etapa 2

O repositorio agora possui os comandos:

- `npm run ops:preflight:anchor-columns`
- `npm run ops:check:anchor-columns`
- `npm run ops:backfill:anchor-columns -- --apply`

Uso esperado:

1. rodar `npm run ops:preflight:anchor-columns` para inspecionar o ambiente;
2. executar `npm run ops:backfill:anchor-columns -- --apply` apenas se o relatorio fizer sentido para aquele banco;
3. rodar `npm run ops:check:anchor-columns` para exigir ambiente limpo antes da promocao de `UNIQUE`.

### Leitura tecnica do resultado

No estado atual, o backfill e:

- simples;
- deterministico;
- semanticamente claro;
- de baixo risco no modelo atual.

Backfill proposto:

1. manter a Etapa 1 aplicada: colunas nullable existentes e write paths novos preenchendo as ancoras;
2. preencher `revenuePosSaleId = posSaleId` onde `transactionType = REVENUE` e `posSaleId IS NOT NULL`;
3. preencher `saleOutPosSaleItemId = posSaleItemId` onde `movementType = SALE_OUT` e `posSaleItemId IS NOT NULL`;
4. reexecutar as validacoes de duplicidade, tipo indevido, mismatch e orfandade;
5. promover `UNIQUE` nas duas colunas;
6. manter os guards atuais durante e depois da promocao.

## Decisao

## GO

Vale materializar agora as colunas-ancora, desde que a rollout siga uma migration pequena e controlada.

### Por que o custo vale agora

- a regra de negocio ja esta estavel;
- os write paths sao estreitos e conhecidos;
- o banco local nao mostrou ambiguidade de backfill;
- o ganho estrutural e real: a unicidade deixa de depender apenas de guardas logicos para dois efeitos centrais do PDV.

### Estado da decisao depois da Etapa 2

- a decisao continua **GO**;
- o repositorio ja executou a rollout completa em `local` e `producao`;
- o que falta agora nao e modelagem nem producao, e sim acesso real a `staging` caso esse ambiente precise do mesmo gate.

### O que ainda precisa ser respeitado nos ambientes restantes

- nao aplicar a migration cegamente sem repetir o mesmo preflight nos ambientes alvo;
- nao remover os guards do service layer logo apos a migration;
- nao confundir a ancora unica com substituicao imediata das colunas relacionais genericas existentes.

## Gatilho para reabrir como `NO-GO`

Esta decisao deve ser reavaliada se, antes da migration:

- surgir ambiente com dados duplicados ou ambiguos;
- aparecer fluxo legitimo de produto que exija multiplicidade real;
- o dominio passar a usar `posSaleId` ou `posSaleItemId` para novos tipos de efeito sem separar a semantica.

## Resultado pratico esperado

Quando a migration e executada corretamente em cada ambiente:

- `REVENUE por posSaleId` passa a ter reforco fisico real no MySQL;
- `SALE_OUT por posSaleItemId` passa a ter reforco fisico real no MySQL;
- o service layer continua como defesa adicional, mas deixa de ser a unica barreira;
- o residuo estrutural mais importante entre `finance`, `pos` e `inventory` fica significativamente reduzido.
