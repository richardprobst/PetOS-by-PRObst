# Modelo de Dados do PetOS

## 1. Objetivo

Este documento resume o modelo de dados vigente do PetOS e funciona como ponte entre:

- `PetOS_PRD.md`;
- o dominio implementado;
- `prisma/schema.prisma`.

Em caso de divergencia:

1. o PRD vence em produto e escopo;
2. `prisma/schema.prisma` vence em estado tecnico consolidado;
3. este documento deve ser atualizado para refletir a implementacao real.

## 2. Estado atual do schema

O schema atual cobre:

- MVP operacional completo;
- fundacao e blocos entregues da Fase 2;
- baseline tecnica conservadora da Fase 3;
- fechamento da Fase 5 para configuracao central, integracoes administrativas e white label.

Isso significa que o schema ja contem:

- nucleo operacional e financeiro do atendimento;
- documentos, assinaturas, midia e storage metadata;
- agenda avancada, waitlist, Taxi Dog e pre-check-in;
- CRM, estoque, PDV, escalas, ponto e payroll operacional;
- runtime state, recovery e update controlado;
- analise de imagem assistiva;
- snapshots de insight preditivo;
- configuracoes sistemicas centralizadas e trilha dedicada de mudanca;
- trilhas de auditoria e ownership por unidade.

## 3. Blocos principais do modelo

### 3.1. Identidade e acesso

Tabelas:

- `User`
- `AccessProfile`
- `Permission`
- `ProfilePermission`
- `UserProfile`

Pontos importantes:

- identidade interna e de tutor fica em `User`;
- RBAC server-side usa perfis e permissoes relacionais;
- um usuario pode ter mais de um perfil;
- autorizacao nao depende apenas do tipo de usuario.

### 3.2. Unidade e configuracao por unidade

Tabelas:

- `Unit`
- `UnitSetting`

Pontos importantes:

- a unidade e o eixo basico de escopo operacional;
- configuracoes por unidade guardam janelas, tolerancias, retencao, politicas e parametros de operacao;
- a baseline atual usa isso em agenda, documentos, CRM, estoque, payroll, IA e runtime;
- a Fase 5 passa a complementar `UnitSetting` com configuracao sistemica centralizada, sem substituir o escopo por unidade.

### 3.3. Configuracao sistemica e governanca

Tabelas:

- `SystemSetting`
- `ConfigurationChange`
- `ConfigurationApproval`
- `ConfigurationPublish`

Pontos importantes:

- `SystemSetting` abre a fundacao de configuracao central com escopo, categoria, tipo de valor e trilha de atualizacao;
- `ConfigurationChange` registra mudancas sensiveis e prepara publish, aprovacao e rollback dos blocos seguintes da Fase 5;
- `ConfigurationApproval` e `ConfigurationPublish` fecham a trilha de publish, aprovacao e rollback do modulo central;
- a camada continua sem tratar segredo como configuracao comum e nao substitui `env` para runtime critico.

### 3.4. White label e integracoes administrativas

Tabelas:

- `TenantBranding`
- `UnitBranding`
- `BrandAsset`
- `DomainBinding`
- `IntegrationConnection`
- `IntegrationSecret`

Pontos importantes:

- branding e dominio agora possuem runtime server-side por superficie;
- a hierarquia e plataforma default -> tenant -> unidade;
- segredo continua separado de configuracao comum e e armazenado cifrado;
- publish do branding nao depende de fork por cliente nem de `.env` por identidade visual.

### 3.5. Cliente, pet e ownership

Tabelas:

- `Client`
- `Pet`

Pontos importantes:

- `Client` reaproveita o `userId` do tutor;
- `Pet` pertence a um cliente;
- cliente e pet preservam ownership e visibilidade base por unidade;
- leituras e mutacoes sensiveis precisam respeitar escopo server-side.

### 3.6. Catalogo operacional e equipe

Tabelas:

- `Service`
- `Employee`

Pontos importantes:

- servico guarda preco base, duracao e disponibilidade;
- funcionario guarda papel operacional, configuracao de comissao e dados base de jornada;
- a comissao materializada fica vinculada aos itens efetivos do atendimento.

### 3.7. Agenda e atendimento

Tabelas:

- `Appointment`
- `AppointmentService`
- `OperationalStatus`
- `AppointmentStatusHistory`
- `AppointmentCheckIn`
- `TutorPreCheckIn`
- `AppointmentCapacityRule`
- `ScheduleBlock`
- `WaitlistEntry`
- `TaxiDogRide`

Pontos importantes:

- status operacional e financeiro continuam separados;
- `AppointmentService` modela o N:N entre atendimento e servicos, com profissional e preco acordado;
- `AppointmentCheckIn` guarda snapshot operacional;
- `TutorPreCheckIn` adiciona a preparacao do tutor antes do atendimento;
- capacidade, bloqueios, waitlist e Taxi Dog pertencem ao dominio operacional real da Fase 2.

### 3.8. Comunicacao

Tabelas:

- `MessageTemplate`
- `MessageLog`
- `ClientCommunicationPreference`
- `CrmCampaign`
- `CrmCampaignExecution`
- `CrmCampaignRecipient`

Pontos importantes:

- o sistema registra templates, logs e consentimento;
- CRM e comunicacao ampliada preservam criterio auditavel de execucao;
- um destinatario descartado por falta de consentimento ou destino continua rastreavel.

### 3.9. Financeiro e fiscal

Tabelas:

- `FinancialTransaction`
- `Deposit`
- `Refund`
- `ClientCredit`
- `ClientCreditUsage`
- `IntegrationEvent`
- `FiscalDocument`

Pontos importantes:

- `FinancialTransaction` continua sendo o ledger central;
- depositos e reembolsos nao criam trilha financeira paralela fora do ledger;
- eventos externos sustentam idempotencia, reconciliacao e reprocessamento controlado;
- fiscal permanece no recorte minimo da Fase 2.

### 3.10. Documentos, assinaturas e midia

Tabelas:

- `Document`
- `Signature`
- `MediaAsset`

Pontos importantes:

- banco guarda metadados e referencias; binario fica fora do banco;
- documentos e midia suportam arquivamento logico;
- acesso passa por permissao, ownership e vinculo com unidade, cliente, pet ou atendimento;
- `MediaAsset` agora tambem sustenta analise de imagem.

### 3.11. PDV e estoque

Tabelas:

- `Product`
- `ProductInventory`
- `InventoryMovement`
- `PosSale`
- `PosSaleItem`

Pontos importantes:

- saldo fica materializado por produto e unidade;
- movimentacao registra quantidade antes e depois;
- venda concluida fecha estoque e financeiro na mesma operacao;
- o schema continua sem virar ERP amplo.

### 3.12. Equipe, ponto e payroll

Tabelas:

- `TeamShift`
- `TimeClockEntry`
- `PayrollRun`
- `PayrollRunItem`

Pontos importantes:

- a base atual cobre escala, jornada, consolidacao de folha e apuracao operacional;
- isso nao representa modulo trabalhista completo;
- a unidade continua sendo o escopo primario dessas entidades.

### 3.13. Runtime, recovery e updater

Tabelas:

- `SystemRuntimeState`
- `RecoveryIncident`
- `UpdateExecution`
- `UpdateExecutionStep`

Pontos importantes:

- `SystemRuntimeState` representa ciclo de vida, manutencao, versao atual e lock de instalacao;
- `RecoveryIncident` preserva incidentes de repair;
- `UpdateExecution` registra update controlado com preflight, lock, recovery e retentativa;
- `UpdateExecutionStep` registra cada passo do update de forma persistida.

### 3.13. IA assistiva e insights da Fase 3

Tabelas:

- `ImageAnalysis`
- `PredictiveInsightSnapshot`

Pontos importantes:

- `ImageAnalysis` registra solicitacao, revisao, envelope, sinais e recomendacoes para imagem assistiva;
- `PredictiveInsightSnapshot` registra snapshots por unidade, tipo e data, com feedback operacional;
- ambas preservam vinculo com unidade, autoria e envelope snapshot;
- a baseline atual nao depende de provider real para existir.

### 3.14. Report cards e auditoria

Tabelas:

- `ReportCard`
- `AuditLog`

Pontos importantes:

- report card permanece vinculado ao atendimento;
- `AuditLog` continua sendo a trilha transversal de operacoes sensiveis;
- governanca da Fase 3 reaproveita essa base.

## 4. Enums centrais do modelo atual

### 4.1. Operacao e financeiro

Enums relevantes:

- `AppointmentFinancialStatus`
- `PaymentStatus`
- `DepositStatus`
- `DepositPurpose`
- `RefundStatus`
- `FiscalDocumentStatus`
- `TaxiDogStatus`
- `WaitlistStatus`

### 4.2. Documentos, midia e acesso

Enums relevantes:

- `SignatureMethod`
- `SignatureStatus`
- `MediaType`
- `AssetAccessLevel`

### 4.3. CRM, estoque e equipe

Enums relevantes:

- `CrmCampaignType`
- `CrmCampaignStatus`
- `CrmCampaignExecutionStatus`
- `CrmCampaignRecipientStatus`
- `InventoryMovementType`
- `PosSaleStatus`
- `TeamShiftType`
- `TeamShiftStatus`
- `TimeClockEntryStatus`
- `PayrollRunStatus`

### 4.4. Runtime e update

Enums relevantes:

- `SystemLifecycleState`
- `RecoveryIncidentStatus`
- `UpdateExecutionMode`
- `UpdateExecutionStatus`
- `UpdateRecoveryState`
- `UpdateExecutionStepStatus`

### 4.5. Fase 3

Enums relevantes:

- `ImageAnalysisKind`
- `ImageAnalysisExecutionStatus`
- `ImageAnalysisReviewStatus`
- `ImageAnalysisVisibility`
- `PredictiveInsightKind`
- `PredictiveInsightExecutionStatus`
- `PredictiveInsightVisibility`
- `PredictiveInsightFeedbackStatus`

### 4.6. Fase 5

Enums relevantes:

- `ConfigurationScope`
- `ConfigurationCategory`
- `ConfigurationValueType`
- `ConfigurationChangeType`
- `ConfigurationImpactLevel`

## 5. Relacoes criticas

Relacoes que continuam centrais para manutencao:

- `User` 1:1 `Client`
- `User` 1:1 `Employee`
- `Client` 1:N `Pet`
- `Unit` 1:N quase todos os dominios operacionais
- `Unit` 1:N `UnitSetting`
- `Unit` 1:N `SystemSetting`
- `Unit` 1:N `ConfigurationChange`
- `Appointment` 1:N `AppointmentService`
- `Appointment` 1:N `AppointmentStatusHistory`
- `Appointment` 1:1 `AppointmentCheckIn`
- `Appointment` 1:0..1 `TutorPreCheckIn`
- `Appointment` 1:N `FinancialTransaction`
- `Appointment` 1:N `Deposit`
- `Appointment` 1:N `Refund`
- `Appointment` 1:0..1 `TaxiDogRide`
- `Appointment` 1:0..1 `ReportCard`
- `MediaAsset` 1:N `ImageAnalysis`
- `Unit` 1:N `ImageAnalysis`
- `Unit` 1:N `PredictiveInsightSnapshot`
- `UpdateExecution` 1:N `UpdateExecutionStep`
- `SystemSetting` 1:N `ConfigurationChange`
- `AccessProfile` N:N `Permission` via `ProfilePermission`
- `User` N:N `AccessProfile` via `UserProfile`

## 6. Decisoes de modelagem relevantes

- status operacional e financeiro permanecem separados;
- JSON fica restrito a snapshots, payloads auditaveis e metadados, nao a relacoes centrais;
- unidade continua como eixo estrutural de escopo;
- storage externo continua sendo a estrategia para binarios;
- IA usa persistencia de snapshot e envelope, nao payload bruto irrestrito;
- Fase 5 separa configuracao sistemica, trilha de mudanca e segredo, em vez de tratar tudo como `UnitSetting`.

## 7. O que ainda nao significa no schema

O schema atual nao deve ser interpretado como entrega de:

- provider real de analise de imagem;
- automacao clinica;
- billing real de IA;
- multiunidade irrestrita;
- modulo trabalhista amplo;
- ERP fiscal ou comercial completo.
- white label completo publicado;
- cofres de segredo completos para integracoes administraveis.

O schema foi preparado e expandido no recorte aprovado, mas a semantica do produto continua dependente das regras de dominio e dos gates de fase.

## 8. Documentos complementares

Ler em conjunto com:

- `prisma/schema.prisma`
- `docs/architecture.md`
- `docs/domain-rules.md`
- `docs/environment-contract.md`
- `docs/phase3-maintenance-guide.md`
