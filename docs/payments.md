# Pagamentos no PetOS

## Objetivo

Este documento descreve o estado atual do dominio financeiro do PetOS apos o **MVP validado**, a execucao do **Bloco 2 da Fase 2** e a integracao operacional com o **Bloco 7 (PDV e estoque)**.

Ele complementa:

- `PetOS_PRD.md`
- `docs/domain-rules.md`
- `docs/security-notes.md`
- ADR 006
- ADR 008

## Estado atual do modulo

O repositorio agora cobre:

- registro de receitas, despesas, ajustes, depositos e reembolsos;
- vinculo financeiro opcional com agendamentos;
- pre-pagamento por deposito vinculado ao atendimento;
- creditos de cliente com uso controlado no servidor;
- no-show protection por cobranca operacional dedicada;
- consolidacao do `financialStatus` do atendimento com base em valores liquidados;
- trilha auditavel de `EventosIntegracao` para pagamentos e fiscal;
- emissao fiscal minima como pedido/outbox, sem acoplamento precoce a provider unico;
- recalculo de comissao condicionado a estado financeiro e operacional corretos;
- integracao do PDV com o ledger financeiro existente, sem criar estado economico paralelo para venda presencial.

O modulo **ainda nao** e:

- um checkout completo;
- um ERP financeiro/fiscal;
- uma integracao full-provider de Stripe, Mercado Pago ou NFS-e/NFC-e;
- um fluxo automatico completo de campanhas, documentos ou portal ampliado.

## Principios obrigatorios

- status operacional e status financeiro continuam separados;
- `PAID` continua sendo a liquidacao real do atendimento e da venda presencial;
- `AUTHORIZED` nao quita atendimento, nao libera comissao e nao simula faturamento definitivo;
- evento externo nao e verdade final sem validacao, idempotencia e trilha auditavel;
- operacao critica exige permissao server-side, auditoria e escopo de unidade;
- payload bruto de provider nao deve contaminar o dominio interno sem normalizacao.

## Entidades financeiras ativas

O Bloco 2 ativou o uso real de:

- `TransacoesFinanceiras`
- `Depositos`
- `Reembolsos`
- `CreditosCliente`
- `UsoCredito`
- `EventosIntegracao`
- `DocumentosFiscais`

Com o Bloco 7, essas entidades passaram a se relacionar tambem com:

- `VendasPDV`
- `ItensVendaPDV`
- `Produtos`
- `EstoquesProduto`
- `MovimentacoesEstoque`

## Status relevantes

### `PaymentStatus`

Status de cada lancamento financeiro:

- `PENDING`
- `AUTHORIZED`
- `PARTIAL`
- `PAID`
- `FAILED`
- `REFUNDED`
- `REVERSED`
- `VOIDED`

### `AppointmentFinancialStatus`

Status financeiro consolidado do agendamento:

- `PENDING`
- `PARTIAL`
- `PAID`
- `INVOICED`
- `REFUNDED`
- `REVERSED`
- `EXEMPT`

### `DepositStatus`

Status operacional do deposito/pre-pagamento:

- `PENDING`
- `CONFIRMED`
- `APPLIED`
- `FORFEITED`
- `REFUNDED`
- `CANCELED`
- `EXPIRED`

## Regras de consolidacao financeira

O `financialStatus` do atendimento agora considera:

- transacoes de receita liquidadas (`PAID` e `PARTIAL`);
- depositos `PREPAYMENT` em `CONFIRMED`, `APPLIED` e `FORFEITED`;
- depositos `SECURITY` em `APPLIED` e `FORFEITED`;
- reembolsos concluidos, abatendo o valor previamente liquidado;
- estornos/cancelamentos (`REVERSED` e `VOIDED`) como sinal de reversao financeira;
- `NO_SHOW` com cobranca dedicada apenas quando houver valor efetivamente liquidado.

Consequencia pratica:

- `AUTHORIZED` isolado mantem o atendimento em `PENDING`;
- `PAID` representa cobertura financeira real do atendimento;
- `REFUNDED` e `REVERSED` dependem de snapshot financeiro consolidado, nao de um unico campo manual.

## Deposito, pre-pagamento e no-show protection

Regras ativas no Bloco 2:

- deposito pode ser `SECURITY` ou `PREPAYMENT`;
- `PREPAYMENT` exige `appointmentId`;
- transicao de status de deposito e validada no servidor;
- deposito confirmado gera reflexo no consolidado financeiro apenas quando o estado e economicamente valido;
- no-show protection e registrado como cobranca dedicada em `TransacoesFinanceiras` e so pode ser aplicado a atendimento em `NO_SHOW`;
- cobranca duplicada de no-show e bloqueada.

## Creditos e reembolsos

Regras ativas:

- reembolso respeita saldo realmente reembolsavel da origem;
- um reembolso pode gerar:
  - transacao financeira de saida; ou
  - credito de cliente para uso futuro;
- credito possui saldo disponivel, origem e expiracao;
- `ClientCredit.originRefundId` segue politica `1 reembolso -> 1 credito`;
- `ClientCredit.originDepositId` segue politica `1 conversao direta de deposito -> 1 credito`;
- quando o credito nasce diretamente de `originRefundId` ou `originDepositId`, o valor do credito deve espelhar integralmente o valor da origem;
- quando houver necessidade de fracionar efeito economico ou converter parcialmente um deposito, o caminho esperado e materializar `Refund` dedicados por valor, em vez de criar varios `ClientCredit` para a mesma origem;
- uso de credito gera lancamento financeiro proprio com `paymentMethod = CLIENT_CREDIT`;
- credito so pode ser aplicado ao mesmo cliente e dentro do saldo disponivel.

## Comissao

A comissao continua calculada no servidor por item de `AgendamentoServicos`.

No Bloco 2, a regra ficou mais restritiva e aderente ao PRD:

- comissao so consolida quando o agendamento estiver `PAID`;
- e tambem quando o status operacional estiver em `COMPLETED`;
- pre-pagamento ou deposito anterior ao termino do atendimento nao libera comissao sozinho;
- `AUTHORIZED`, `INVOICED`, `PENDING` e estados parciais nao destravam comissao final.

## Integracoes e webhooks

O Bloco 2 nao acopla o PetOS diretamente a payloads brutos de Stripe, Mercado Pago ou fiscal.

O fluxo ativo e:

1. o evento entra por provider conhecido;
2. a assinatura e validada;
3. o payload e normalizado;
4. a idempotencia usa `provider + externalEventId`;
5. o evento e persistido em `EventosIntegracao`;
6. o dominio atualiza `TransacoesFinanceiras`, `Depositos`, `Reembolsos` ou `DocumentosFiscais`;
7. o atendimento sincroniza o `financialStatus` se houver impacto.

Isso preserva:

- rastreabilidade;
- reprocessamento controlado;
- independencia relativa de provider;
- menor risco de acoplamento precoce.

## Fiscal minimo da Fase 2

O recorte fiscal ativo na Fase 2 e intencionalmente minimo:

- criacao de `DocumentosFiscais`;
- atualizacao controlada de status fiscal;
- registro de `EventosIntegracao` de saida para emissao;
- suporte a `SERVICE_INVOICE` e `CONSUMER_RECEIPT`.

O que isso **nao** significa:

- motor fiscal completo;
- automacao ampla de cancelamento fiscal;
- conciliacao fiscal completa;
- modulo autonomo de ERP.

## PDV e estoque no dominio financeiro

O Bloco 7 nao cria um financeiro paralelo para a frente de caixa.

Regras ativas:

- uma `VendaPDV` aberta ainda nao liquida nada e nao baixa estoque;
- o fechamento da venda acontece no servidor e na mesma transacao:
  - cria a `TransacaoFinanceira` de receita;
  - aplica `paymentMethod` e `paymentStatus` do fechamento;
  - baixa estoque dos itens controlados;
  - registra `MovimentacoesEstoque` de `SALE_OUT`;
- `PAID` continua sendo a liquidacao real da venda;
- `AUTHORIZED`, `PENDING` e `PARTIAL` continuam como estados financeiros intermediarios;
- a solicitacao fiscal minima do PDV so pode ocorrer para venda efetivamente liquidada;
- cancelamento automatico de venda concluida nao entra aqui; estorno, reembolso e retorno continuam operacoes controladas.

Consequencia pratica:

- o PDV reaproveita o mesmo dominio de status financeiros ja consolidado no Bloco 2;
- estoque e financeiro andam juntos no fechamento da venda, mas continuam como dominios distintos;
- o modulo nao vira ERP comercial nem supply chain.

## Invariantes condicionais remanescentes do PDV

Mesmo com as constraints fisicas ja aplicadas para referencias externas e origens financeiras, ainda existem dois residuos condicionais importantes:

- apenas uma `FinancialTransaction` de `REVENUE` por `posSaleId`;
- apenas um `InventoryMovement` de `SALE_OUT` por `posSaleItemId`.

No estado atual, essas duas regras continuam protegidas no service layer porque o MySQL nao expressa esse subconjunto com indice parcial nativo sobre as colunas existentes.

Na Etapa 1 da rollout estrutural:

- `FinancialTransaction.revenuePosSaleId` foi adicionada como ancora nullable e ja passa a ser preenchida no fechamento do PDV;
- `InventoryMovement.saleOutPosSaleItemId` foi adicionada como ancora nullable e ja passa a ser preenchida no `SALE_OUT` do item vendido;
- os guards do service layer continuam obrigatorios;
- a promocao para `UNIQUE` continua gateada por preflight limpo e backfill validado por ambiente.

Na Etapa 2 da rollout estrutural:

- o repositorio passou a incluir `npm run ops:backfill:anchor-columns` para backfill idempotente e fechado;
- `UNIQUE(revenuePosSaleId)` e `UNIQUE(saleOutPosSaleItemId)` ja foram promovidos em `local` e `producao`;
- em `producao`, o rollout respeitou a separacao entre Etapa 1 e Etapa 2:
  - primeiro foram executadas manualmente as migrations pre-Etapa 1 e registradas com `migrate resolve --applied`;
  - depois o preflight veio limpo, o backfill rodou como no-op e so entao a migration final foi aplicada com `migrate deploy`;
- ambientes compartilhados continuam proibidos de promover `UNIQUE` sem repetir o gate completo, porque um ambiente limpo nao substitui outro como fonte de verdade operacional.

No estado atual, essa trilha esta encerrada nos ambientes acessiveis (`local` e `producao`). `staging` permanece apenas como pendencia operacional externa, porque nao existe ambiente acessivel para repetir o gate; isso nao reabre a decisao tecnica nem invalida o rollout ja concluido.

O endurecimento atual segue esta hierarquia:

- `completePosSale` revalida ausencia de efeitos ja registrados;
- `ensurePosSaleRevenueEffectIsUnique` revalida a receita por venda no boundary financeiro;
- `applyInventoryMovementInMutation` revalida `SALE_OUT` por item no boundary fisico;
- auditoria e reconciliacao continuam referenciando `saleId`, `financialTransactionId` e `inventoryMovementId`.

O proximo reforco estrutural desejado nao e hackear indice parcial, e sim promover `UNIQUE` nas colunas-ancora ja materializadas, somente depois de preflight limpo e backfill validado antes da migration final.

## Seguranca

As regras obrigatorias do modulo seguem ativas:

- segredos somente em ambiente;
- validacao de assinatura de eventos externos;
- idempotencia;
- trilha de auditoria;
- sanitizacao de payload;
- rate limit em mutacoes sensiveis;
- principio do menor privilegio.

## Fora do escopo atual deste dominio

Continuam fora do escopo financeiro ampliado da fase:

- checkout completo do portal;
- motor completo de documentos e assinaturas;
- fiscal amplo com ERP;
- CRM/campanhas;
- waitlist, agenda avancada e blocos operacionais seguintes;
- compras complexas, supply chain e fiscal amplo de varejo;
- escalas, ponto e payroll;
- qualquer item de Fase 3.

## Resumo

O dominio financeiro da Fase 2 fecha a espinha dorsal economica do PetOS sem transformar o sistema em ERP:

- fortalece o consolidado financeiro;
- ativa deposito, pre-pagamento, reembolso, credito e no-show protection;
- endurece a regra de comissao;
- traz idempotencia e auditoria reais para eventos externos;
- adiciona o recorte fiscal minimo necessario para os proximos blocos;
- permite que o PDV conclua venda presencial usando o mesmo ledger financeiro e o mesmo criterio de liquidacao real.

Para o mapa consolidado de invariantes fisicas versus guardas logicas cruzando `finance`, `pos` e `inventory`, ver tambem `docs/finance-pos-inventory-invariants.md`.
