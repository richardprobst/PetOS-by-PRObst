# Modelo de Dados do PetOS

## Objetivo

Este documento resume o modelo de dados implementado no MVP e serve como ponte entre o PRD e o `prisma/schema.prisma`.

Em caso de divergencia:

1. o PRD vence em escopo de produto;
2. o `prisma/schema.prisma` vence em estado tecnico consolidado;
3. este documento deve ser atualizado para refletir a implementacao real.

## Estado atual do repositorio

O schema atual preserva o nucleo operacional do MVP, a fundacao compartilhada da Fase 2 e a ativacao dos blocos financeiro/fiscal, documental, de agenda avancada, de portal ampliado do tutor, de CRM/comunicacao ampliada e de PDV/estoque.

O nucleo operacional do MVP continua cobrindo:

- identidade, perfis e permissoes;
- unidades e configuracoes por unidade;
- clientes e pets;
- servicos e funcionarios;
- agendamentos, itens de servico, status e historico;
- check-in com snapshot do checklist;
- comunicacao manual com templates e logs;
- transacoes financeiras basicas;
- report cards;
- logs de auditoria.

A base compartilhada, financeira, documental, de agenda avancada, de portal do tutor e de CRM da Fase 2 adiciona ao schema:

- `Documentos`, `Assinaturas` e `Midia` como dominio documental ativo, com metadados, vinculos, arquivamento logico e binarios fora do banco;
- `Depositos`, `Reembolsos`, `CreditosCliente` e `UsoCredito` como base financeira dedicada;
- `EventosIntegracao` como trilha auditavel para webhooks e integracoes externas;
- `DocumentosFiscais` como entidade minima para emissao e retorno fiscal.
- `CapacidadeAgendamento`, `BloqueiosAgenda`, `ListaEspera` e `TaxiDog` como base operacional para capacidade, bloqueios, waitlist e transporte.
- `PreCheckInTutor` como registro 1:1 do pre-check-in do tutor antes do atendimento.
- `PreferenciasComunicacaoCliente`, `CampanhasCRM`, `ExecucoesCampanhaCRM` e `DestinatariosCampanhaCRM` como base de consentimento, segmentacao, execucao e rastreabilidade de CRM.
- `Produtos`, `EstoquesProduto`, `MovimentacoesEstoque`, `VendasPDV` e `ItensVendaPDV` como base operacional de catalogo, saldo por unidade e venda presencial integrada ao financeiro.

Essas estruturas significam que documentos, assinatura operacional minima, agenda avancada, waitlist, Taxi Dog operacional, portal ampliado do tutor, CRM/comunicacao ampliada, PDV/estoque e gestao operacional da equipe ja fazem parte do dominio funcional da Fase 2 no recorte previsto pelo PRD. RH amplo, folha trabalhista completa e componentes amplos de ERP continuam fora do escopo funcional atual.

## Blocos do modelo

### 1. Identidade e acesso

Tabelas:

- `Usuarios`
- `PerfisAcesso`
- `Permissoes`
- `PerfilPermissao`
- `UsuarioPerfil`

Pontos importantes:

- `Usuarios` concentra identidade, e-mail unico, hash de senha, tipo de usuario e unidade.
- `PerfisAcesso` e `Permissoes` suportam RBAC real no servidor.
- um usuario pode ter mais de um perfil.

### 2. Unidades e configuracao

Tabelas:

- `Unidades`
- `ConfiguracoesUnidade`

Uso no MVP:

- preparar configuracao por unidade sem simular multiunidade completa;
- centralizar janelas de cancelamento e reagendamento;
- manter base para timezone, moeda e parametros operacionais.

### 3. Clientes e pets

Tabelas:

- `Clientes`
- `Pets`

Pontos importantes:

- `Clientes` reaproveita o `id` do usuario tutor.
- `Pets` pertence sempre a um cliente.
- dados de saude, alergias e observacoes ficam no pet, visiveis para a operacao.

### 4. Catalogo operacional

Tabelas:

- `Servicos`
- `Funcionarios`

Pontos importantes:

- `Servicos` guarda preco base, duracao estimada e ativacao.
- `Funcionarios` guarda cargo, especialidade, percentual de comissao, modo de folha, valor base e jornada padrao por unidade.
- o percentual de comissao vive no funcionario, mas a comissao calculada fica materializada por item em `AgendamentoServicos`.

### 5. Agenda e atendimento

Tabelas:

- `Agendamentos`
- `AgendamentoServicos`
- `StatusAtendimento`
- `HistoricoStatusAgendamento`
- `CheckInAgendamento`
- `PreCheckInTutor`
- `CapacidadeAgendamento`
- `BloqueiosAgenda`
- `ListaEspera`
- `TaxiDog`

Pontos importantes:

- `Agendamentos` separa `status_atual_id` de `status_financeiro`.
- `AgendamentoServicos` modela a relacao N:N entre agendamento e servicos, incluindo profissional e preco acordado.
- `StatusAtendimento` e um lookup operacional.
- `HistoricoStatusAgendamento` registra quem mudou o status e quando.
- `CheckInAgendamento` e 1:1 com `Agendamentos` no MVP e armazena `checklist_snapshot` em JSON.
- `PreCheckInTutor` tambem e 1:1 com `Agendamentos` e armazena telefone de contato, consentimento e payload preparatorio do tutor.
- `CapacidadeAgendamento` define capacidade ativa por unidade e, quando necessario, por profissional, porte e raca.
- `BloqueiosAgenda` representa indisponibilidades gerais ou por profissional que precisam ser respeitadas na validacao server-side.
- `ListaEspera` registra demanda reprimida com janela preferencial, estado da entrada e eventual promocao para `Agendamentos`.
- `TaxiDog` vincula transporte operacional ao atendimento, com motorista, janelas de coleta/entrega, tarifa e status proprio.

### 6. Comunicacao

Tabelas:

- `TemplatesMensagem`
- `LogsMensagens`

Uso no MVP:

- templates editaveis por canal;
- variaveis permitidas por template;
- historico de envio manual com tutor, agendamento, usuario emissor, mensagem efetiva e status.

O envio continua manual, mas o sistema agora prepara e abre o canal correto para WhatsApp Web ou e-mail.

### 7. Financeiro

Tabelas:

- `TransacoesFinanceiras`
- `Depositos`
- `Reembolsos`
- `CreditosCliente`
- `UsoCredito`
- `EventosIntegracao`
- `DocumentosFiscais`

Enums relevantes:

- `FinancialTransactionType`
- `PaymentMethod`
- `PaymentStatus`
- `AppointmentFinancialStatus`

Pontos importantes:

- `TransacoesFinanceiras` continua sendo o ledger central, agora com suporte a `DEPOSIT` e `REFUND`.
- `paymentStatus` representa o estado de cada lancamento individual.
- `financialStatus` no agendamento continua separado e consolidado a partir do snapshot financeiro do atendimento.
- `AUTHORIZED` e tratado como estado intermediario e nao liquida o atendimento.
- `Depositos` suportam `SECURITY` e `PREPAYMENT`.
- `Reembolsos` controlam origem, status e possivel reflexo em transacao financeira ou credito.
- `CreditosCliente` e `UsoCredito` permitem reaproveitamento financeiro sem distorcer a trilha contabil do atendimento.
- `EventosIntegracao` suportam idempotencia, reconciliacao e reprocessamento de eventos externos.
- `DocumentosFiscais` registram emissao minima de NFS-e/NFC-e sem introduzir ainda um modulo fiscal completo.
- comissao so e liberada quando o `financialStatus` do agendamento chega a `PAID` e o status operacional chega a `COMPLETED`.

### 8. PDV e estoque

Tabelas:

- `Produtos`
- `EstoquesProduto`
- `MovimentacoesEstoque`
- `VendasPDV`
- `ItensVendaPDV`

Pontos importantes:

- `Produtos` pertence a uma unidade e guarda catalogo de venda, SKU, codigo de barras, politica de controle de estoque e estoque minimo.
- `EstoquesProduto` materializa o saldo atual por unidade e produto.
- `MovimentacoesEstoque` registra trilha auditavel de entradas, saidas por venda e ajustes, sempre com quantidade antes/depois.
- `VendasPDV` representa pre-venda ou venda presencial concluida, com cliente opcional e totais calculados no servidor.
- `ItensVendaPDV` preserva snapshot do item vendido para manter rastreabilidade mesmo se o produto mudar depois.
- o fechamento da venda do PDV baixa estoque e cria `TransacoesFinanceiras` de receita na mesma transacao, sem criar um ledger paralelo.
- a solicitacao fiscal minima do PDV reaproveita `DocumentosFiscais` e `EventosIntegracao` apenas para venda liquidada.

### 9. Equipe, escalas, ponto e folha

Tabelas:

- `EscalasEquipe`
- `RegistrosPonto`
- `FolhasPagamento`
- `ItensFolhaPagamento`

Pontos importantes:

- `EscalasEquipe` registra janela, tipo e status da escala por funcionario, sempre vinculada a unidade.
- `RegistrosPonto` registra entrada, saida, intervalo e vinculo opcional com a escala correspondente.
- `FolhasPagamento` representa a rodada de apuracao por periodo e unidade.
- `ItensFolhaPagamento` materializa a base de calculo por funcionario com modo de folha, minutos previstos/trabalhados, comissao, ajustes manuais e valores bruto/liquido.
- a fase atual fecha o recorte operacional de payroll sem abrir modulo trabalhista amplo.

### 10. Report cards e auditoria

Tabelas:

- `ReportCards`
- `LogsAuditoria`

Pontos importantes:

- `ReportCards` fica vinculado ao agendamento e ao usuario que gerou o registro.
- `LogsAuditoria` guarda unidade, usuario, acao, entidade, horario e detalhes estruturados.

### 11. Fundacao transacional, financeira, documental, de agenda avancada, portal do tutor, CRM, PDV/estoque e equipe na Fase 2

Tabelas:

- `Documentos`
- `Assinaturas`
- `Midia`
- `Depositos`
- `Reembolsos`
- `CreditosCliente`
- `UsoCredito`
- `EventosIntegracao`
- `DocumentosFiscais`
- `CapacidadeAgendamento`
- `BloqueiosAgenda`
- `ListaEspera`
- `TaxiDog`
- `PreCheckInTutor`
- `PreferenciasComunicacaoCliente`
- `CampanhasCRM`
- `ExecucoesCampanhaCRM`
- `DestinatariosCampanhaCRM`
- `Produtos`
- `EstoquesProduto`
- `MovimentacoesEstoque`
- `VendasPDV`
- `ItensVendaPDV`
- `EscalasEquipe`
- `RegistrosPonto`
- `FolhasPagamento`
- `ItensFolhaPagamento`

Pontos importantes:

- `Documentos` e `Midia` armazenam apenas referencias, checksums e metadados de storage; o binario continua fora do banco.
- `Documentos` e `Midia` agora suportam arquivamento logico com trilha de quem arquivou, quando e por qual motivo.
- `Assinaturas` registra metodo, status e dados minimos do signatario, incluindo assinatura operacional do tutor e registro manual interno quando aplicavel.
- o acesso de leitura passa por rotas protegidas no servidor e respeita permissao, unidade, vinculo com cliente/pet/agendamento e `AssetAccessLevel`.
- `Depositos`, `Reembolsos`, `CreditosCliente` e `UsoCredito` agora sustentam os fluxos de deposito, pre-pagamento, no-show protection, reembolso e credito da Fase 2 sem virar ERP completo.
- `EventosIntegracao` prepara e opera a trilha de idempotencia, auditoria e reconciliacao de eventos externos sem acoplar o schema a um provider unico.
- formularios e autorizacoes entram neste recorte como documentos gerados e assinaveis, sem transformar o sistema em plataforma juridica ampla.
- `DocumentosFiscais` registram o pedido, retorno e estado minimo da emissao fiscal sem puxar o dominio documental para um modulo fiscal amplo.
- `CapacidadeAgendamento` e `BloqueiosAgenda` sustentam a agenda avancada da Fase 2 sem reescrever a agenda validada do MVP.
- `ListaEspera` operacionaliza entrada, promocao e cancelamento previsiveis sem virar CRM.
- `TaxiDog` integra transporte ao agendamento e ao valor estimado, ainda sem roteirizacao pesada.
- `PreCheckInTutor` habilita o fluxo preparatorio do tutor com janela configurada por unidade e validacao server-side antes do atendimento.
- `PreferenciasComunicacaoCliente` centraliza opt-in, opt-out e preferencia de canal por tutor com trilha de quem atualizou.
- `CampanhasCRM` guarda tipo, canal, criterios e template reaproveitando o modulo existente de mensagens.
- `ExecucoesCampanhaCRM` e `DestinatariosCampanhaCRM` registram audiencia preparada, descarte por falta de consentimento/destino, disparo controlado e vinculo opcional com `LogsMensagens`.
- `Produtos`, `EstoquesProduto` e `MovimentacoesEstoque` sustentam catalogo, saldo e trilha auditavel de estoque sem abrir compras complexas ou supply chain.
- `VendasPDV` e `ItensVendaPDV` fecham venda presencial no servidor, integram baixa de estoque ao fechamento e reaproveitam o dominio financeiro/fiscal minimo ja existente.
- `EscalasEquipe`, `RegistrosPonto`, `FolhasPagamento` e `ItensFolhaPagamento` fecham o recorte de gestao da equipe da Fase 2 com jornada prevista, ponto auditavel e base de folha por periodo.
- a separacao entre status operacional e financeiro permanece intacta; nenhuma dessas tabelas substitui `financialStatus` do agendamento.

### 12. Portal do tutor ampliado

O portal ampliado do tutor reutiliza o dominio ja existente, sem criar um modelo paralelo:

- `Clientes`, `Pets` e `Agendamentos` continuam definindo ownership e escopo;
- `Documentos`, `Assinaturas` e `Midia` sustentam leitura protegida e assinatura propria;
- `Depositos`, `Reembolsos` e `CreditosCliente` sustentam a visao financeira propria;
- `ListaEspera`, `TaxiDog` e `PreCheckInTutor` sustentam jornada, acompanhamento e preparacao pre-atendimento;
- toda leitura e mutacao continua vinculada ao `clientId` do tutor e validada no servidor.

## Enums implementados

### `UserType`

- `ADMIN`
- `CLIENT`
- `EMPLOYEE`

### `AppointmentFinancialStatus`

- `PENDING`
- `PARTIAL`
- `PAID`
- `INVOICED`
- `REFUNDED`
- `REVERSED`
- `EXEMPT`

### `PaymentStatus`

- `PENDING`
- `AUTHORIZED`
- `PAID`
- `PARTIAL`
- `FAILED`
- `REFUNDED`
- `REVERSED`
- `VOIDED`

### `DepositStatus`

- `PENDING`
- `CONFIRMED`
- `APPLIED`
- `FORFEITED`
- `REFUNDED`
- `CANCELED`
- `EXPIRED`

### `DepositPurpose`

- `SECURITY`
- `PREPAYMENT`

### `IntegrationProvider`

- `STRIPE`
- `MERCADO_PAGO`
- `FISCAL`
- `OTHER`

### `IntegrationEventStatus`

- `PENDING`
- `RECEIVED`
- `PROCESSED`
- `FAILED`
- `IGNORED`

### `FiscalDocumentType`

- `SERVICE_INVOICE`
- `CONSUMER_RECEIPT`

### `FiscalDocumentStatus`

- `PENDING`
- `ISSUED`
- `FAILED`
- `CANCELED`

### `PetSizeCategory`

- `SMALL`
- `MEDIUM`
- `LARGE`
- `GIANT`
- `UNKNOWN`

### `ScheduleBlockType`

- `UNAVAILABLE`
- `BREAK`
- `HOLIDAY`
- `TRANSPORT`
- `OTHER`

### `WaitlistStatus`

- `PENDING`
- `PROMOTED`
- `CANCELED`
- `EXPIRED`

### `CrmCampaignType`

- `REVIEW_BOOSTER`
- `SEGMENTED_CAMPAIGN`
- `INACTIVE_RECOVERY`
- `PROFILE_OFFER`
- `POST_SERVICE_TRIGGER`

### `CrmCampaignStatus`

- `DRAFT`
- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

### `CrmCampaignExecutionStatus`

- `PREPARED`
- `COMPLETED`
- `FAILED`
- `CANCELED`

### `CrmCampaignRecipientStatus`

- `PREPARED`
- `LAUNCHED`
- `SKIPPED`
- `FAILED`
- `CANCELED`

### `TaxiDogStatus`

- `REQUESTED`
- `SCHEDULED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELED`

### `InventoryMovementType`

- `STOCK_IN`
- `SALE_OUT`
- `RETURN_IN`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`

### `PosSaleStatus`

- `OPEN`
- `COMPLETED`
- `CANCELED`

### `EmployeePayrollMode`

- `MONTHLY`
- `HOURLY`
- `COMMISSION_ONLY`

### `TeamShiftType`

- `WORK`
- `ON_CALL`
- `TRAINING`
- `DAY_OFF`

### `TeamShiftStatus`

- `PLANNED`
- `CONFIRMED`
- `CANCELED`

### `TimeClockEntryStatus`

- `OPEN`
- `CLOSED`
- `ADJUSTED`
- `VOIDED`

### `PayrollRunStatus`

- `DRAFT`
- `FINALIZED`
- `CANCELED`

### `MessageChannel`

- `EMAIL`
- `WHATSAPP`

### `MessageDeliveryStatus`

- `DRAFT`
- `SENT`
- `FAILED`
- `CANCELED`

## Relacoes criticas do MVP

- `Usuarios` 1:1 `Clientes`
- `Usuarios` 1:1 `Funcionarios`
- `Clientes` 1:N `Pets`
- `Clientes` 1:N `Agendamentos`
- `Pets` 1:N `Agendamentos`
- `Agendamentos` 1:N `AgendamentoServicos`
- `Agendamentos` 1:N `HistoricoStatusAgendamento`
- `Agendamentos` 1:1 `CheckInAgendamento`
- `Agendamentos` 1:N `TransacoesFinanceiras`
- `Agendamentos` 1:N `Depositos`
- `Agendamentos` 1:N `Reembolsos`
- `Agendamentos` 1:1 `TaxiDog`
- `Agendamentos` 1:0..1 `ListaEspera` como origem de promocao
- `Agendamentos` 1:1 `ReportCards`
- `TransacoesFinanceiras` 1:N `Reembolsos` por origem
- `TransacoesFinanceiras` 1:N `DocumentosFiscais`
- `TransacoesFinanceiras` N:1 `VendasPDV` quando a liquidacao vier do PDV
- `Depositos` 1:N `Reembolsos`
- `Depositos` 1:N `CreditosCliente`
- `CreditosCliente` 1:N `UsoCredito`
- `TemplatesMensagem` 1:N `LogsMensagens`
- `TemplatesMensagem` 1:N `CampanhasCRM`
- `Clientes` 1:1 `PreferenciasComunicacaoCliente`
- `CampanhasCRM` 1:N `ExecucoesCampanhaCRM`
- `CampanhasCRM` 1:N `DestinatariosCampanhaCRM`
- `ExecucoesCampanhaCRM` 1:N `DestinatariosCampanhaCRM`
- `LogsMensagens` 1:1 `DestinatariosCampanhaCRM` quando o disparo controlado e aberto pela equipe
- `Funcionarios` 1:N `CapacidadeAgendamento`
- `Funcionarios` 1:N `BloqueiosAgenda`
- `Funcionarios` 1:N `TaxiDog`
- `Clientes` 1:N `ListaEspera`
- `Pets` 1:N `ListaEspera`
- `Unidades` 1:N `Produtos`
- `Unidades` 1:N `EstoquesProduto`
- `Unidades` 1:N `MovimentacoesEstoque`
- `Unidades` 1:N `VendasPDV`
- `Clientes` 1:N `VendasPDV`
- `Produtos` 1:0..1 `EstoquesProduto` por unidade
- `Produtos` 1:N `MovimentacoesEstoque`
- `Produtos` 1:N `ItensVendaPDV`
- `VendasPDV` 1:N `ItensVendaPDV`
- `VendasPDV` 1:N `MovimentacoesEstoque`
- `Funcionarios` 1:N `EscalasEquipe`
- `Funcionarios` 1:N `RegistrosPonto`
- `FolhasPagamento` 1:N `ItensFolhaPagamento`
- `Funcionarios` 1:N `ItensFolhaPagamento`

## Decisoes de modelagem relevantes

- Status operacional e financeiro permanecem separados, conforme ADR 006.
- Prisma continua como camada unica de acesso a dados, conforme ADR 004.
- JSON no MVP fica restrito a snapshots e detalhes auditaveis, nao a relacoes centrais.
- O schema nasce preparado para unidade e configuracao por unidade, sem afirmar multiunidade completa.

## Fora do escopo atual

Continuam fora da implementacao funcional atual:

- plataforma juridica ampla de formularios, assinatura e gestao documental;
- planos e assinaturas de planos;
- compras complexas, supply chain e ERP comercial amplo;
- RH e folha trabalhista ampla.

O recorte fiscal minimo, no entanto, ja existe no schema e no dominio: `DocumentosFiscais` e `EventosIntegracao` sustentam a emissao e o retorno fiscal minimo da Fase 2 sem abrir ainda um modulo fiscal amplo.

Esses itens so devem entrar mediante autorizacao explicita de nova fase ou ajuste formal de escopo.
