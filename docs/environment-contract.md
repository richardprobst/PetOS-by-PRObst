# Contrato de Ambiente do PetOS

## 1. Objetivo

Este documento descreve as variaveis de ambiente que sustentam o desenvolvimento e a operacao do PetOS.

Ele existe para:

- alinhar `.env.example`, `.env.staging.example` e `server/env.ts`;
- deixar claro o que e obrigatorio, opcional ou condicionado por fase;
- registrar a semantica conservadora de flags e quotas sensiveis;
- reduzir drift entre ambiente local, staging hospedado e producao.

Fonte tecnica de verdade:

- `server/env.ts`
- `.env.example`
- `.env.staging.example`

## 2. Perfis de ambiente

### 2.1. Local

Uso:

- desenvolvimento diario;
- Docker local;
- testes manuais;
- bootstrap local do banco.

Base recomendada:

- copiar `.env.example` para `.env.local`.

### 2.2. Staging

Uso:

- ensaio de configuracao hospedada;
- verificacao de build e conexao remota;
- homologacao tecnica controlada.

Base recomendada:

- usar `.env.staging.example` apenas como referencia local;
- em host real, injetar as mesmas chaves diretamente no provedor.

### 2.3. Producao hospedada

Uso:

- ambiente real do negocio.

Regra:

- nunca depender de `.env.local` commitado ou empacotado;
- segredos devem ser injetados pelo provedor;
- build e runtime precisam receber o mesmo contrato minimo esperado por `server/env.ts`.

## 3. Grupos de variaveis

### 3.1. Aplicacao

Obrigatorias:

- `NODE_ENV`
- `APP_NAME`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`

### 3.2. Banco e Prisma

Obrigatorias:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`

Observacoes:

- ambas devem apontar para MySQL valido;
- em ambiente hospedado, nao usar `localhost` por conveniencia;
- migrations, seed e bootstrap dependem desse bloco.

### 3.3. Autenticacao

Obrigatorias:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `CONFIGURATION_SECRET_MASTER_KEY` (recomendado quando a Fase 5 estiver ativa)

Observacoes:

- `NEXTAUTH_SECRET` precisa ser forte e aleatorio;
- `NEXTAUTH_URL` deve refletir a URL publica efetiva do ambiente.
- `CONFIGURATION_SECRET_MASTER_KEY` deve ter pelo menos 32 caracteres e passa a ser a chave preferida para cifrar segredos administrativos da Fase 5.

### 3.4. Setup inicial e updater

Variaveis:

- `INSTALLER_ENABLED`
- `INSTALLER_BOOTSTRAP_TOKEN`
- `ADMIN_SEED_NAME`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

Regras:

- `INSTALLER_ENABLED=true` so faz sentido em setup inicial controlado;
- quando `INSTALLER_ENABLED=true`, `INSTALLER_BOOTSTRAP_TOKEN` precisa existir e ter pelo menos 32 caracteres;
- depois da instalacao, a expectativa operacional e manter o instalador desligado;
- seed inicial e opcional e nao substitui a trilha normal de usuarios.

### 3.5. Upload e storage

Variaveis:

- `UPLOAD_MAX_FILE_SIZE_MB`
- `UPLOAD_ALLOWED_MIME_TYPES`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_PUBLIC_BASE_URL`

Regras:

- documentos e midias dependem dessas chaves;
- binario continua fora do banco;
- `STORAGE_PUBLIC_BASE_URL` so deve ser preenchida quando o provedor exigir exposicao publica controlada.

### 3.6. Integracoes financeiras e fiscais

Variaveis:

- `FISCAL_PROVIDER`
- `FISCAL_API_BASE_URL`
- `FISCAL_API_TOKEN`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Regras:

- so preencher quando a integracao estiver explicitamente habilitada naquele ambiente;
- staging pode permanecer com valores vazios;
- webhook sem segredo valido nao deve ser tratado como pronto para producao.

### 3.7. E-mail transacional

Variaveis:

- `EMAIL_PROVIDER`
- `EMAIL_FROM_NAME`
- `EMAIL_FROM_ADDRESS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`

### 3.8. Chaves de LLM

Variaveis:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

Regras:

- continuam opcionais na baseline atual;
- sua existencia sozinha nao habilita a Fase 3;
- flags e quotas continuam sendo o gate real da IA.

### 3.9. Fundacao de IA da Fase 3 e extensoes conservadoras posteriores

Variaveis:

- `AI_ENABLED`
- `AI_IMAGE_ANALYSIS_ENABLED`
- `AI_PREDICTIVE_INSIGHTS_ENABLED`
- `AI_VIRTUAL_ASSISTANT_ENABLED`
- `AI_IMAGE_ANALYSIS_BASE_QUOTA`
- `AI_PREDICTIVE_INSIGHTS_BASE_QUOTA`
- `AI_VIRTUAL_ASSISTANT_BASE_QUOTA`

Semantica obrigatoria:

- o servidor espera strings literais `true` ou `false` para as flags;
- valor ausente, vazio ou invalido nao e tratado como habilitado;
- quota ausente, vazia ou invalida nao libera execucao.

Invariantes:

- `AI_ENABLED` e o gate global;
- `AI_IMAGE_ANALYSIS_ENABLED` controla imagem;
- `AI_PREDICTIVE_INSIGHTS_ENABLED` controla insight preditivo;
- `AI_VIRTUAL_ASSISTANT_ENABLED` controla o assistente virtual do tutor;
- quotas sao inteiros nao negativos por modulo;
- flags e quotas nao substituem consentimento, retention, auditoria ou permissao.

### 3.10. Observabilidade e seguranca basica

Variaveis:

- `LOG_LEVEL`
- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

### 3.11. Defaults tecnicos por unidade

Variaveis:

- `DEFAULT_CANCELLATION_WINDOW_HOURS`
- `DEFAULT_RESCHEDULE_WINDOW_HOURS`
- `DEFAULT_NO_SHOW_TOLERANCE_MINUTES`
- `DEFAULT_PRE_CHECK_IN_WINDOW_HOURS`
- `DEFAULT_DEPOSIT_EXPIRATION_MINUTES`
- `DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS`
- `DEFAULT_DOCUMENT_RETENTION_DAYS`
- `DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS`
- `DEFAULT_CRM_INACTIVE_DAYS`
- `DEFAULT_CRM_REVIEW_DELAY_HOURS`
- `DEFAULT_CRM_POST_SERVICE_DELAY_HOURS`
- `DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK`
- `DEFAULT_PRODUCT_MIN_STOCK_QUANTITY`
- `DEFAULT_POS_AUTO_FISCAL_DOCUMENT`
- `DEFAULT_TEAM_SHIFT_MINUTES`
- `DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES`
- `DEFAULT_PAYROLL_PERIOD_DAYS`
- `DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS`
- `DEFAULT_CURRENCY`
- `DEFAULT_TIMEZONE`

Regra:

- esses valores sao fallback tecnico inicial;
- configuracao por unidade continua prevalecendo quando existir no banco.

## 4. Minimo obrigatorio por ambiente

### 4.1. Local

Minimo:

- aplicacao;
- banco;
- auth;
- storage;
- defaults tecnicos.

### 4.2. Staging hospedado

Minimo:

- aplicacao;
- banco remoto;
- auth;
- storage;
- defaults tecnicos.

Recomendado:

- manter IA desligada por padrao;
- manter installer desligado apos setup;
- habilitar integracoes apenas quando o ensaio exigir.

### 4.3. Producao

Minimo:

- todos os blocos basicos validos;
- segredos fortes;
- hostnames reais;
- storage operacional;
- webhooks e auth coerentes com o ambiente.

## 5. Mudancas no contrato de ambiente

Quando adicionar ou alterar uma variavel:

1. atualizar `server/env.ts`;
2. atualizar `.env.example`;
3. atualizar `.env.staging.example` quando fizer sentido;
4. atualizar este documento;
5. revisar seed, bootstrap, runtime ou testes impactados.

## 6. Documentos complementares

Ler em conjunto com:

- `server/env.ts`
- `README.md`
- `docs/architecture.md`
- `docs/phase3-maintenance-guide.md`
