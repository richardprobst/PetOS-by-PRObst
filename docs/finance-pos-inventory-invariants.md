# Invariantes Estruturais e Logicas de Finance, POS e Inventory

## Objetivo

Este documento consolida o estado atual das garantias de integridade cruzando:

- `finance`
- `pos`
- `inventory`

Ele existe para deixar explicito:

- o que ja esta reforcado fisicamente no banco;
- o que ainda depende de guardas do service layer;
- o que ainda nao pode virar constraint fisica com seguranca no MySQL atual;
- qual trilha operacional-financeira hoje permite explicar os efeitos produzidos pelo sistema.

Em caso de divergencia:

1. `prisma/schema.prisma` vence como estado tecnico;
2. os services vencem como comportamento atual implementado;
3. este documento deve refletir ambos, sem inventar politica de produto.

## Trilha auditavel atualmente disponivel

Para explicar o ciclo economico e fisico, o repositorio hoje combina:

- `FinancialTransaction`: ledger central, `paymentStatus`, `integrationProvider`, `externalReference`, `occurredAt` e `metadata`;
- `Deposit` e `Refund`: entidades operacionais vinculadas ao ledger quando ha efeito financeiro real;
- `PosSale` e `PosSaleItem`: venda e itens que originam efeito economico e fisico;
- `InventoryMovement`: trilha fisica com `movementType`, `quantityBefore`, `quantityAfter`, `posSaleId` e `posSaleItemId`;
- `IntegrationEvent`: trilha de entrada/saida externa, idempotencia e reprocessamento;
- `AuditLog`: camada transversal de explicabilidade do actor e da acao.

No estado atual, os eventos de auditoria mais uteis para reconciliação cruzada incluem:

- `financial_transaction.create`
- `financial_transaction.update`
- `deposit.create`
- `deposit.status.update`
- `refund.create`
- `client_credit.create`
- `client_credit.apply`
- `appointment.no_show_charge`
- `appointment.financial_status.sync`
- `pos_sale.create`
- `pos_sale.create_and_complete`
- `pos_sale.complete`
- `inventory_movement.create`
- `integration_event.process`
- `integration_event.reprocess`

## Rollout operacional atual das ancoras dedicadas

- `local`: `GO`, com preflight limpo, backfill no-op, pos-check limpo e `UNIQUE` promovido nas duas ancoras.
- `staging`: `NO-GO`, porque o repositorio so possui `.env.staging.example`, sem acesso real para executar o gate.
- `producao` acessivel por `.env.hostinger`: `GO`, com precheck estrutural das migrations pre-Etapa 1, backfill no-op, pos-check limpo e `UNIQUE` promovido nas duas ancoras.

Nos ambientes acessiveis, esta trilha esta encerrada. O unico pendente remanescente e operacional: repetir o mesmo gate em `staging` apenas se esse ambiente passar a existir com acesso real.

## Invariantes ja reforcadas fisicamente

### Ledger e referencias externas

- `IntegrationEvent(provider, externalEventId)` e unico.
- `FinancialTransaction(integrationProvider, externalReference)` agora e unico.
- `Deposit.externalReference` agora e unico.
- `Refund.externalReference` agora e unico.
- `FiscalDocument(providerName, externalReference)` agora e unico.

### Vínculos 1:1 ja protegidos

- `Deposit.financialTransactionId` e unico.
- `Refund.financialTransactionId` e unico.
- `ClientCredit.originRefundId` agora e unico.
- `ClientCredit.originDepositId` agora e unico.
- `InventoryStock(unitId, productId)` e unico.

Essas constraints ja sairam do campo de "boa logica" e passaram a ser reforcadas no banco.

## Invariantes ainda protegidas so no service layer

### Um unico efeito economico de receita por venda PDV concluida

Estado atual:

- a venda concluida nao deve gerar multiplas `FinancialTransaction` de receita para o mesmo `posSaleId`;
- a Etapa 1 ja materializou `FinancialTransaction.revenuePosSaleId` como ancora nullable e os novos writes do PDV passam a preenchê-la;
- isso continua guardado por `ensurePosSaleHasNoRegisteredEffects`, por `ensurePosSaleRevenueEffectIsUnique` e pelo fluxo transacional de `completePosSale`.

Por que ainda nao virou constraint fisica:

- a tabela `FinancialTransaction` tambem recebe outros tipos de efeito para `posSaleId`;
- o que precisa ser unico e, na pratica, o subconjunto `transactionType = REVENUE`;
- MySQL atual nao oferece indice parcial/condicional que expresse essa regra de forma direta.

Risco residual:

- o banco sozinho ainda nao impede uma segunda receita porque a promocao de `UNIQUE(revenuePosSaleId)` ainda depende de preflight e backfill por ambiente;
- o risco atual fica mitigado por transacao serializavel, guardas de reprocessamento e auditoria.

### Um unico movimento fisico `SALE_OUT` por item de venda

Estado atual:

- cada `PosSaleItem` vendido com controle de estoque deve gerar no maximo um `InventoryMovement` de `SALE_OUT`;
- a Etapa 1 ja materializou `InventoryMovement.saleOutPosSaleItemId` como ancora nullable e os novos writes do PDV passam a preenchê-la;
- isso e guardado pelo fluxo transacional de `completePosSale`, pelo check `ensurePosSaleHasNoRegisteredEffects` e pelo guard de write-site em `applyInventoryMovementInMutation`.

Por que ainda nao virou constraint fisica:

- a tabela `InventoryMovement` comporta varios tipos de movimento para o mesmo `posSaleItemId`;
- a unicidade desejada recai apenas sobre o subconjunto `movementType = SALE_OUT`;
- isso tambem exigiria indice parcial/condicional.

Risco residual:

- se um fluxo futuro escrever direto em `InventoryMovement` sem reaplicar a regra, o banco ainda nao bloqueia sozinho a duplicidade porque a promocao de `UNIQUE(saleOutPosSaleItemId)` segue pendente;
- hoje a explicabilidade continua boa porque o movimento preserva origem, snapshots de quantidade e vinculo com `PosSaleItem`.

### No-show protection unico por appointment

Estado atual:

- um atendimento em `NO_SHOW` nao deve receber cobranca duplicada de protecao;
- a protecao atual usa busca de receitas do appointment e categoria `NO_SHOW_PROTECTION` em `FinancialTransaction.metadata`.

Por que ainda nao virou constraint fisica:

- a regra depende de um valor dentro de `metadata`, nao de coluna dedicada;
- sem coluna materializada, o banco nao consegue reforcar a unicidade sem gambiarra.

Risco residual:

- a regra continua dependente do service layer e da categoria correta no metadata;
- a trilha de auditoria e o ledger ainda permitem diagnostico, mas nao substituem um reforco estrutural futuro.

## Duplicacao estrutural residual relevante

### Ja reduzida nesta rodada

- a verificacao de unicidade de `FinancialTransaction(integrationProvider, externalReference)` deixou de ficar duplicada entre `finance` e `pos`;
- agora existe um guard unico em `features/finance/transaction-reference.ts`, consumido pelos dois fluxos.
- a leitura de `UnitSetting` deixou de repetir parsing local em `finance`, `pos` e `inventory`;
- agora esses tres dominios reutilizam `server/settings/unit-settings.ts` para carregar mapa de settings e aplicar fallback booleano/numerico de forma consistente.
- os guards condicionais do fechamento de venda e da baixa `SALE_OUT` do estoque ficaram consolidados em `features/pos/effect-guards.ts`, em vez de permanecerem parcialmente espalhados entre `pos/services.ts` e `inventory/services.ts`.

### Ainda existente e nao corrigida agora

- a escolha de quais chaves ler por unidade continua distribuida por dominio;
- isso ainda e aceitavel porque cada modulo continua dono das suas configuracoes e regras, mas o parsing deixou de ficar duplicado.

### Ponto de verdade economico

- `FinancialTransaction` continua sendo a autoridade economica;
- `PosSale` nao mantem um estado financeiro paralelo, apenas aciona o ledger;
- `InventoryMovement` continua registrando efeito fisico, nao economico.

Essa separacao segue coerente com ADR 006 e evita colapsar financeiro e operacao em um unico estado.

## Reforcos fisicos ainda pendentes por ambiente

No repositorio, as duas ancoras ja possuem migration de promocao para `UNIQUE`.

O que ainda falta nao e decidir modelagem, e sim repetir o gate por ambiente antes de deploy:

- aplicar as migrations pendentes em staging, se esse ambiente for materializado com acesso real;
- rodar preflight;
- executar backfill apenas se o ambiente estiver apto;
- rerodar pos-check;
- so entao considerar a Etapa 2 concluida naquele ambiente.

## Estrategia evolutiva recomendada para os dois residuos condicionais

### Estado atual aceitavel

No estado atual, a estrategia e aceitavel porque:

- a escrita relevante continua concentrada em boundaries transacionais conhecidos;
- `completePosSale` revalida ausencia de efeitos registrados e unicidade de `REVENUE` no momento do write;
- `applyInventoryMovementInMutation` revalida unicidade de `SALE_OUT` por `posSaleItemId` no proprio write-site;
- `AuditLog`, `FinancialTransaction` e `InventoryMovement` preservam trilha suficiente para reconciliacao manual quando necessario.

### Reforco logico adotado

Nesta trilha, o reforco logico passou a ter um ponto unico e nomeado:

- `ensurePosSaleHasNoRegisteredEffects`
- `ensurePosSaleRevenueEffectIsUnique`
- `ensurePosSaleItemSaleOutEffectIsUnique`

Isso nao torna a regra fisica, mas reduz o risco de divergencia local de mensagem, query e criterio entre modulos.

Mesmo depois da promocao de `UNIQUE` em `local` e `producao`, esses guards continuam obrigatorios. A constraint fisica reforca a integridade; ela nao substitui validacao de dominio nem a ergonomia de erro do write boundary.

### Caminho futuro mais seguro

Se o repositorio precisar transformar essas invariantes em garantias mais fisicas sem depender de indice parcial do MySQL, o caminho mais seguro hoje e:

1. manter a Etapa 1 aplicada, com coluna-ancora dedicada e nullable para cada subconjunto unico;
2. preencher a ancora nos registros legados por ambiente;
3. aplicar `UNIQUE` nessa coluna-ancora;
4. manter os guards atuais durante a migracao, o backfill e a promocao final.

Exemplos de direcao:

- em `FinancialTransaction`, uma ancora dedicada para a receita originada por `PosSale`, distinta de `posSaleId` generico;
- em `InventoryMovement`, uma ancora dedicada para o `SALE_OUT` originado por `PosSaleItem`, distinta de `posSaleItemId` generico.

Essa abordagem e preferivel a hack de indice parcial porque:

- funciona no MySQL atual com `UNIQUE` sobre coluna nullable;
- evita misturar varios significados na mesma coluna de relacionamento;
- permite backfill e validacao explicita antes de promover a garantia estrutural.

A prova de viabilidade e a decisao tecnica mais recente para esse passo estao registradas em `docs/finance-pos-inventory-anchor-columns.md`.

### Risco residual enquanto isso nao acontece

- qualquer fluxo futuro que grave direto em `FinancialTransaction` ou `InventoryMovement` fora desses guards ainda depende da disciplina do service layer;
- por isso, novos write paths que toquem `posSaleId` ou `posSaleItemId` devem obrigatoriamente reutilizar esses guards ou passar por services que ja os encapsulam.

## Leitura pratica do estado atual

Hoje o sistema ja consegue explicar, com evidencias consistentes, a maior parte do fluxo:

1. a venda gera `PosSale` e `PosSaleItem`;
2. o fechamento da venda produz `FinancialTransaction` e `InventoryMovement`;
3. a auditoria do `PDV` referencia explicitamente os IDs desses efeitos;
4. depositos, reembolsos, credito e no-show geram trilha no ledger e em `AuditLog`;
5. quando o consolidado financeiro do atendimento muda, `appointment.financial_status.sync` registra a transicao e a origem que a disparou.

O residuo importante nao esta mais em "falta de explicabilidade", e sim nas regras que o banco ainda nao consegue expressar sozinho sem indice parcial, coluna dedicada ou decisao de produto.
