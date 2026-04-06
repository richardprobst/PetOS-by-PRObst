# Local Docker Validation

Validacao tecnica controlada da baseline atual do PetOS usando o MySQL local do proprio repositorio via Docker Desktop.

Data da validacao: `2026-04-05`

## Objetivo

Este documento existe para fechar a validacao tecnica da baseline quando o staging hospedado estiver bloqueado por dependencia externa de banco/segredos.

Ele **nao substitui** um staging hospedado saudavel.

Ele prova apenas que:

- o aplicativo sobe com a configuracao local prevista pelo repositorio;
- o MySQL local via Docker atende Prisma, seed, readiness e runtime state;
- a baseline installer/updater opera de forma coerente nesse ambiente controlado;
- os principais gates tecnicos passam sem depender de credencial externa.

## O que foi usado

- Docker Desktop local
- `docker-compose.yml` do projeto
- [`.env.local`](/C:/Users/casaprobst/PetOS-by-PRObst-main/.env.local) alinhado ao setup padrao do repositorio
- MySQL `8.4` via container `petos-mysql`

## Sequencia executada

1. `npm run db:up`
2. `npm run prisma:bootstrap`
3. `npm run ops:preflight`
4. `npm run ops:check`
5. `npm run build`
6. `npm run start`
7. smoke HTTP focado nas rotas da frente installer/updater

## Resultado dos checks

- `docker compose up -d mysql` -> `ok`
- container `petos-mysql` -> `healthy`
- `npm run prisma:bootstrap` -> `ok`
- `npm run ops:preflight` -> `ok`
- `npm run ops:check` -> `ok`
- `npm run build` -> `ok`
- `GET /api/health` em `http://127.0.0.1:3000` -> `200`

Payload relevante do health:

- `status: ok`
- `lifecycle.state: INSTALLED`
- `lifecycle.source: persisted`
- `currentInstalledVersion: 0.2.0`
- `environment: ok`
- `runtime: ok`
- `database: ok`
- `migrations: ok`
- `seed: ok`

## Smoke local da frente installer/updater

Com a aplicacao rodando em `http://127.0.0.1:3000`:

- `GET /` -> `200`
- `GET /setup` -> `200`
- `GET /api/setup/preflight` -> `403`
- `GET /admin/sistema` -> `307` para `/entrar?callbackUrl=%2Fadmin%2Fsistema`
- `GET /api/admin/system/update-preflight` -> `401`
- `GET /api/admin/system/update-executions` -> `401`
- `GET /api/auth/providers` -> `200`
- `GET /manutencao` -> `307` para `/`
- `GET /reparo` -> `307` para `/`

## Leitura objetiva

### O que esta validado

- a baseline atual do app funciona com o banco previsto pelo setup local do projeto;
- Prisma consegue conectar, detectar migrations e seed;
- o runtime state fica consistente como `INSTALLED`;
- a frente installer/updater responde com os gates esperados:
  - setup bloqueado quando o installer esta desligado;
  - rotas administrativas exigindo autenticacao;
  - maintenance e repair fora do lifecycle correspondente redirecionando com seguranca.

### O que isso nao valida

- conectividade do runtime hospedado com MySQL remoto;
- configuracao de `DATABASE_URL` e `DIRECT_DATABASE_URL` no `petos-staging`;
- proxy, cookies e sessao atras da Netlify;
- HTTPS publico e callbacks reais do host hospedado.

## Decisao

### Ambiente local controlado com Docker

Estado: `GO`

Motivo:

- todos os checks tecnicos locais passaram;
- o banco local ficou operacional;
- o boot de producao local ficou saudavel;
- a baseline installer/updater respondeu de forma coerente no ambiente controlado.

### Staging hospedado na Netlify

Estado: `NO-GO`

Motivo:

- `DATABASE_URL` e `DIRECT_DATABASE_URL` seguem ausentes em `petos-staging`;
- sem essas envs reais, o rebuild limpo hospedado continua bloqueado;
- o deploy publicado atual ainda nao pode ser tratado como validacao final do host.

## Quando usar esta trilha

Use esta validacao local quando:

- o repositorio precisar ser validado de ponta a ponta sem depender de segredos externos;
- o hosted staging estiver bloqueado por credenciais de banco;
- a equipe precisar isolar se o problema e do app ou do ambiente hospedado.

## Proximo passo para o hosted staging

1. configurar `DATABASE_URL` e `DIRECT_DATABASE_URL` reais em `petos-staging`
2. rerodar o deploy integrado limpo sem `.env.local` local durante o build
3. repetir:
   - `npm run ops:preflight:staging`
   - `npm run ops:check:staging`
   - `GET /api/health`
   - [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md)
