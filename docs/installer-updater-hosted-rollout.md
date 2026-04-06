# Installer / Updater Hosted Rollout

Estado atual do rollout tecnico controlado da baseline installer/updater em ambiente hospedado.

Data da validacao: `2026-04-05`

## Ambiente validado

- Netlify site `petos-staging`
- Netlify site `petos-production`
- Hostinger Business Web Hosting com site final `petos.desi.pet`
- repositorio local na baseline `0.2.0` com frente installer/updater fechada ate o Bloco G

## Evidencias coletadas

### Staging

- `petos-staging` recebeu um deploy integrado valido da baseline atual:
  - deploy id `69d2e2d2c71fe604942456ac`
  - URL publicada [https://petos-staging.netlify.app](https://petos-staging.netlify.app)
  - URL unica [https://69d2e2d2c71fe604942456ac--petos-staging.netlify.app](https://69d2e2d2c71fe604942456ac--petos-staging.netlify.app)
  - runtime da function `___netlify-server-handler` em `nodejs24.x` com `bootstrapVersion 2.14.0`
- as envs seguras/publicas do staging foram reaplicadas com sucesso no contexto `production`:
  - `NODE_ENV=production`
  - `APP_NAME=PetOS`
  - `APP_URL=https://petos-staging.netlify.app`
  - `NEXT_PUBLIC_APP_URL=https://petos-staging.netlify.app`
  - `NEXTAUTH_URL=https://petos-staging.netlify.app`
  - `NEXTAUTH_SECRET` forte e exclusivo do staging
  - `INSTALLER_ENABLED=false`
  - `UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf`
  - `STORAGE_BUCKET=petos-files-staging`
  - `STORAGE_REGION=us-east-1`
  - `EMAIL_FROM_NAME=PetOS`
  - `EMAIL_FROM_ADDRESS=no-reply@petos-staging.netlify.app`
  - `DEFAULT_CURRENCY=BRL`
  - `DEFAULT_TIMEZONE=America/Sao_Paulo`
- as envs de banco continuam ausentes no contexto `production`:
  - `DATABASE_URL`
  - `DIRECT_DATABASE_URL`
- um bug real do rollout foi confirmado e corrigido no repositorio:
  - o artefato manual da Netlify carregava `.env.local` para dentro da function e contaminava callbacks com `localhost`
  - isso foi tratado com sanitizacao explicita do artefato antes do upload manual
- uma tentativa adicional de gerar um deploy integrado limpo, com `.env.local` temporariamente removido da maquina local, falhou em `npm run build` porque o proprio build passou a exigir `DATABASE_URL` e `DIRECT_DATABASE_URL` reais no host
- por causa disso, o deploy publicado atual ainda continua misturando dois fatos:
  - a aplicacao sobe no staging como app Next funcional
  - o pacote publicado ainda carrega `localhost` nas URLs do NextAuth
- comportamento hospedado atualmente observado:
  - `GET /` responde `200`
  - `GET /setup` responde `200`
  - `GET /api/setup/preflight` responde `403`
  - `GET /admin/sistema` responde `307` para `/entrar?callbackUrl=%2Fadmin%2Fsistema`
  - `GET /api/admin/system/update-preflight` responde `401`
  - `GET /api/admin/system/update-executions` responde `401`
  - `GET /manutencao` responde `307` para `/`
  - `GET /reparo` responde `307` para `/`
  - `GET /api/health` responde `503`
  - `GET /api/auth/providers` responde `200`, mas ainda devolve `signinUrl` e `callbackUrl` com `http://localhost:3000`
- o health publicado atual indica:
  - `Environment parsed successfully.`
  - `System runtime could not be determined because the database runtime state is unavailable.`
  - `Database is unreachable at DATABASE_URL.`
- `npm run ops:preflight:staging` e `npm run ops:check:staging` continuam falhando nesta maquina porque o staging ainda nao possui `DATABASE_URL` / `DIRECT_DATABASE_URL` reais e o deploy limpo sem `.env.local` nao consegue ser reconstruido sem elas.

### Production

- `npx netlify sites:list --json` retornou `petos-production` com `published_deploy` em estado `ready`
- `GET https://petos-production.netlify.app/` respondeu `200`
- `GET https://petos-production.netlify.app/api/health` respondeu `503` com `database: fail`
- `GET https://petos-production.netlify.app/setup` respondeu `404`
- `GET https://petos-production.netlify.app/admin/sistema` respondeu `404`
- `GET https://petos-production.netlify.app/api/setup/preflight` respondeu `404`
- `GET https://petos-production.netlify.app/api/admin/system/update-preflight` respondeu `404`

### Hostinger

- o MySQL remoto da Hostinger foi validado em `2026-04-05` com host `srv1182.hstgr.io:3306`
- a conectividade TCP para o banco remoto foi confirmada a partir desta maquina
- `npm run prisma:migrate:deploy` contra o banco remoto retornou sem pendencias
- os gates operacionais com envs do staging da Hostinger espelhadas no processo passaram:
  - `npm run ops:preflight:staging`
  - `npm run ops:check:staging`
- o `ops:check:staging` confirmou:
  - conexao com banco `ok`
  - tabela `_prisma_migrations` detectada
  - seed base detectada
  - lifecycle persistido como `INSTALLED`
- leitura objetiva:
  - o bloqueio de banco que existia no staging da Netlify nao existe mais para o ambiente real pretendido na Hostinger
  - o proximo bloqueio passou a ser apenas a publicacao do app Next.js no host da Hostinger com as mesmas envs coerentes

## Leitura objetiva dos achados

### Bloqueantes

- `petos-staging` continua sem `DATABASE_URL` e `DIRECT_DATABASE_URL` reais no contexto `production`.
- sem essas envs de banco, nao e possivel gerar um novo deploy integrado limpo sem `.env.local` local.
- o deploy atualmente publicado ainda expõe `localhost` em `/api/auth/providers`, entao o staging hospedado nao pode ser tratado como baseline saudavel.
- `GET /api/health` permanece `503`.
- `ops:preflight:staging` e `ops:check:staging` continuam reprovando o rollout.

### Degradantes

- a validacao local dos gates `ops:*:staging` fica limitada porque a Netlify mascara segredo e banco na leitura por CLI; nesta rodada, o proprio host e o `env:get` provaram que o banco ainda nao foi configurado.
- a frente installer/updater publicada em staging nao consegue avancar para smoke autenticado completo porque a camada de auth ainda esta contaminada por `localhost` no deploy atualmente publicado.

### Aceitaveis para a baseline

- a frente installer/updater nao publica build novo sozinha.
- a frente installer/updater nao escreve segredos automaticamente no host.
- a frente installer/updater continua dependente de host com Prisma CLI quando a release exigir migration em runtime.
- o banco remoto real da Hostinger ja foi validado separadamente, entao o `NO-GO` atual da rodada antiga da Netlify nao representa mais um bloqueio de banco para o destino final.

### Fora de escopo intencional

- deploy automatico
- CI/CD novo
- DNS, SSL e infraestrutura externa
- rollback universal

## Decisao

Estado atual: `NO-GO`

Motivo:

- a baseline installer/updater ja esta publicada de verdade em `petos-staging`;
- as envs seguras/publicas ja foram reaplicadas com sucesso;
- mas `DATABASE_URL` e `DIRECT_DATABASE_URL` continuam ausentes no staging;
- sem essas envs reais de banco, nao foi possivel publicar um novo deploy integrado limpo sem `.env.local`, entao o staging atual segue com health degradado e URLs de auth contaminadas por `localhost`;
- o `petos-production` continua fora desta validacao final e segue anterior a essa baseline.

## Proximo passo minimo para destravar

1. configurar em `petos-staging` os valores reais de `DATABASE_URL` e `DIRECT_DATABASE_URL` para um MySQL remoto valido e acessivel pelo runtime
2. republicar o staging com o fluxo documentado em [docs/deploy-staging.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/deploy-staging.md), agora sem `.env.local` local durante o `netlify deploy --build`
3. garantir que o banco publicado tenha migrations e seed coerentes com a baseline
4. rerrodar:
   - `npm run ops:preflight:staging`
   - `npm run ops:check:staging`
   - `GET /api/health`
   - [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md)

## Relacao com a baseline

Este resultado nao invalida a baseline funcional fechada no repositorio.

Ele indica que o rollout hospedado antigo na Netlify nao aconteceu de forma valida para a frente installer/updater, mas o banco remoto real da Hostinger ja foi validado de forma independente.

Para a validacao tecnica equivalente em ambiente local controlado, com MySQL via Docker Desktop e baseline operacional saudavel, veja [docs/local-docker-validation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/local-docker-validation.md).
