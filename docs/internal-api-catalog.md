# Catalogo de APIs Internas do PetOS

## 1. Objetivo

Este documento cataloga as superficies HTTP internas do PetOS para navegacao de desenvolvimento.

Ele nao substitui OpenAPI nem os contratos Zod das rotas. O objetivo aqui e:

- mostrar quais grupos de API existem;
- registrar quem consome cada superficie;
- indicar o guard de autenticacao e o tipo de escopo esperado;
- facilitar manutencao sem depender apenas de leitura exploratoria de `app/api/`.

## 2. Guards de entrada

### 2.1. APIs internas

Principal helper:

- `requireInternalApiUser`

Local:

- `server/authorization/api-access.ts`

### 2.2. APIs do tutor

Principal helper:

- `requireTutorApiUser`

Uso:

- rotas do portal do tutor com ownership obrigatorio.

## 3. Grupos de rotas

### 3.1. Saude e sistema

Rotas:

- `/api/health`
- `/api/setup/preflight`
- `/api/admin/settings/foundation`
- `/api/admin/settings/center`
- `/api/admin/branding`
- `/api/admin/integrations`
- `/api/admin/system/phase3-foundation-diagnostics`
- `/api/admin/system/phase3-governance`
- `/api/admin/system/update-preflight`
- `/api/admin/system/update-executions`
- `/api/admin/system/update-executions/[executionId]`
- `/api/admin/system/update-executions/[executionId]/retry`

Uso:

- healthcheck;
- setup inicial;
- fundacao central de configuracao da Fase 5;
- centro administrativo consolidado da Fase 5;
- leitura interna de branding e white label;
- leitura interna de integracoes administrativas;
- diagnostico administrativo da fundacao;
- governanca consolidada da Fase 3;
- operacao e trilha do updater.

Observacoes operacionais:

- `/api/health` deve expor apenas leitura minima de `status`, `checks`, `service`, `lifecycle`, `requestId` e fingerprint de deploy, sem stack trace nem segredos.
- `/api/admin/system/phase3-foundation-diagnostics` e `/api/admin/system/phase3-governance` devem expor labels humanas junto com os enums tecnicos, para que UI e suporte tratem a explicacao operacional como fonte primaria e deixem `policyReasonCode`, `gateReasonCode`, `fallbackStatus` e afins apenas como apoio.
- `/api/admin/system/update-preflight` deve priorizar mensagens acionaveis para o operador; `gate.code` existe para suporte tecnico, mas a UI administrativa deve tratar `title` + `message` como fonte primaria.
- `/api/admin/system/update-executions` deve permanecer em payload enxuto para listagem administrativa; detalhes ricos de execucao ficam reservados a `/api/admin/system/update-executions/[executionId]`.

### 3.2. Identidade

Rotas:

- `/api/auth/[...nextauth]`

Uso:

- sessao e autenticacao next-auth.

### 3.3. Agenda operacional

Rotas:

- `/api/admin/appointments`
- `/api/admin/appointments/[appointmentId]`
- `/api/admin/appointments/[appointmentId]/cancel`
- `/api/admin/appointments/[appointmentId]/check-in`
- `/api/admin/appointments/[appointmentId]/reschedule`
- `/api/admin/appointments/[appointmentId]/status`
- `/api/admin/appointments/[appointmentId]/no-show-charge`
- `/api/admin/appointments/[appointmentId]/taxi-dog`
- `/api/admin/appointment-capacity-rules`
- `/api/admin/appointment-capacity-rules/[ruleId]`
- `/api/admin/schedule-blocks`
- `/api/admin/schedule-blocks/[blockId]`
- `/api/admin/waitlist`
- `/api/admin/waitlist/[waitlistEntryId]/cancel`
- `/api/admin/waitlist/[waitlistEntryId]/promote`
- `/api/admin/taxi-dog`
- `/api/admin/taxi-dog/[rideId]/status`

### 3.4. Cadastro operacional

Rotas:

- `/api/admin/clients`
- `/api/admin/clients/[clientId]`
- `/api/admin/pets`
- `/api/admin/pets/[petId]`
- `/api/admin/services`
- `/api/admin/services/[serviceId]`
- `/api/admin/employees`
- `/api/admin/employees/[employeeUserId]`

### 3.5. Financeiro e fiscal

Rotas:

- `/api/admin/financial-transactions`
- `/api/admin/financial-transactions/[transactionId]`
- `/api/admin/deposits`
- `/api/admin/deposits/[depositId]`
- `/api/admin/refunds`
- `/api/admin/client-credits`
- `/api/admin/client-credits/[creditId]/use`
- `/api/admin/commissions`
- `/api/admin/fiscal-documents`
- `/api/admin/fiscal-documents/[documentId]`
- `/api/integrations/financial-events/[provider]`

Observacao:

- webhooks precisam continuar com validacao e idempotencia;
- a superficie externa de integracao e menor e mais sensivel que o resto do catalogo.

### 3.6. Documentos, midia e report cards

Rotas:

- `/api/admin/report-cards`
- `/api/admin/report-cards/[reportCardId]`
- `/api/assets/documents/[documentId]`
- `/api/assets/media/[mediaAssetId]`

### 3.7. CRM e comunicacao

Rotas:

- `/api/admin/message-templates`
- `/api/admin/message-templates/[templateId]`
- `/api/admin/message-logs`
- `/api/admin/crm/preferences`
- `/api/admin/crm/campaigns`
- `/api/admin/crm/campaigns/[campaignId]`
- `/api/admin/crm/campaigns/[campaignId]/execute`
- `/api/admin/crm/executions`
- `/api/admin/crm/recipients/[recipientId]/launch`

### 3.8. Estoque e PDV

Rotas:

- `/api/admin/products`
- `/api/admin/products/[productId]`
- `/api/admin/inventory-movements`
- `/api/admin/pos-sales`
- `/api/admin/pos-sales/[saleId]`
- `/api/admin/pos-sales/[saleId]/complete`
- `/api/admin/pos-sales/[saleId]/cancel`

### 3.9. Equipe e payroll operacional

Rotas:

- `/api/admin/team-shifts`
- `/api/admin/team-shifts/[shiftId]`
- `/api/admin/time-clock-entries`
- `/api/admin/time-clock-entries/[entryId]`
- `/api/admin/time-clock-entries/[entryId]/close`
- `/api/admin/payroll-runs`
- `/api/admin/payroll-runs/[runId]`
- `/api/admin/payroll-runs/[runId]/finalize`

### 3.10. IA e insights da Fase 3

Rotas:

- `/api/admin/image-analyses`
- `/api/admin/image-analyses/[analysisId]/review`
- `/api/admin/predictive-insights`
- `/api/admin/predictive-insights/[predictiveInsightId]/feedback`

Observacao:

- continuam superficies internas e protegidas;
- nao representam provider real, billing real ou painel final.

### 3.11. Tutor

Rotas:

- `/api/tutor/profile`
- `/api/tutor/pets`
- `/api/tutor/appointments`
- `/api/tutor/appointments/[appointmentId]/pre-check-in`
- `/api/tutor/finance`
- `/api/tutor/report-cards`
- `/api/tutor/virtual-assistant`
- `/api/tutor/waitlist`
- `/api/tutor/waitlist/[waitlistEntryId]`

Regra:

- toda rota do tutor exige ownership server-side;
- nunca assumir que sessao de tutor autoriza leitura ampla.
- o assistente virtual do tutor continua operando sobre transcricao e confirmacao explicita, sem provider real obrigatorio nem audio bruto no servidor.
- a resposta de `/api/tutor/virtual-assistant` entrega `intentLabel` e `statusLabel` junto dos codigos tecnicos, para manter o portal alinhado ao contrato humanizado sem traducao local duplicada.

## 4. Como manter este catalogo

Ao adicionar uma rota nova:

1. decidir a familia correta;
2. aplicar o helper de auth correspondente;
3. validar input com Zod;
4. atualizar este documento se a rota abrir uma superficie nova ou relevante;
5. revisar permissao, ownership e contexto por unidade.

## 5. O que este catalogo nao pretende ser

Este documento nao e:

- OpenAPI formal;
- referencia de payload exata;
- substituto dos contratos Zod;
- substituto da leitura do service de dominio.

## 6. Documentos complementares

Ler em conjunto com:

- `docs/rbac-permission-matrix.md`
- `docs/architecture.md`
- `server/authorization/api-access.ts`
- `app/api/`
