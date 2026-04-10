# Hostinger GitHub Import

Guia objetivo para importar o repositorio do PetOS no painel da Hostinger usando o fluxo nativo de GitHub.

Este documento assume:

- repositorio remoto em [richardprobst/PetOS-by-PRObst](https://github.com/richardprobst/PetOS-by-PRObst)
- branch de deploy `main`
- dominio alvo `petos.desi.pet`
- MySQL remoto ja existente e validado

## Configuracao esperada no painel

Se a Hostinger pedir os campos manualmente, use:

- repositorio: `richardprobst/PetOS-by-PRObst`
- branch: `main`
- diretorio raiz do projeto: `/`
- versao do Node.js: `22`
- install command: `npm install`
- build command: `npm run build`
- start command: `npm start`

Observacoes:

- o projeto ja esta configurado com `output: 'standalone'` em [next.config.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/next.config.ts)
- o `start` sobe o bootstrap versionado em [server.js](/C:/Users/casaprobst/PetOS-by-PRObst-main/server.js), que carrega o `.builds/config/.env` da Hostinger quando existir e delega para o servidor standalone gerado pelo build
- no host compartilhado, o `.builds/config/.env` passou a ter precedencia explicita sobre variaveis antigas injetadas pelo painel, evitando que o runtime fique preso a `DATABASE_URL` ou `NEXTAUTH_URL` stale apos um redeploy
- [scripts/start-standalone.mjs](/C:/Users/casaprobst/PetOS-by-PRObst-main/scripts/start-standalone.mjs) ficou alinhado com o mesmo bootstrap de runtime, evitando divergencia entre `npm start`, processo manual e boot automatico do host
- `postinstall` ja executa `prisma generate`, reduzindo fragilidade no primeiro deploy
- o build ja foi validado sem `.env.local`, entao a importacao via GitHub nao depende de segredo local da maquina
- dependencias criticas de build (`prisma`, `tailwindcss`, `postcss`, `autoprefixer`, `typescript`, `eslint` e tipagens de TypeScript/React) ficam em `dependencies` de proposito, para nao quebrar em hosts compartilhados que executam o build com install focado em producao
- a validacao estrutural desse fluxo foi refeita com `npm ci --omit=dev && npm run build`, sem depender de `devDependencies`

## Variaveis de ambiente obrigatorias

Configurar no painel da Hostinger, sem usar `.env.local`:

- `NODE_ENV=production`
- `APP_NAME=PetOS`
- `APP_URL=https://petos.desi.pet`
- `NEXT_PUBLIC_APP_URL=https://petos.desi.pet`
- `NEXTAUTH_URL=https://petos.desi.pet`
- `NEXTAUTH_SECRET=<segredo forte>`
- `DATABASE_URL=<mysql url real>`
- `DIRECT_DATABASE_URL=<mysql url real>`
- `INSTALLER_ENABLED=false`
- `UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf`
- `STORAGE_BUCKET=petos-files-hostinger-staging`
- `STORAGE_REGION=br-hostinger`
- `EMAIL_FROM_NAME=PetOS`
- `EMAIL_FROM_ADDRESS=no-reply@petos.desi.pet`
- `DEFAULT_CURRENCY=BRL`
- `DEFAULT_TIMEZONE=America/Sao_Paulo`

Regras duras:

- `APP_URL`, `NEXT_PUBLIC_APP_URL` e `NEXTAUTH_URL` precisam compartilhar exatamente a mesma origem
- nao usar `localhost`, `.local` ou placeholders
- nao subir `.env.local` para o host

## Bootstrap apos a importacao

Depois que a aplicacao estiver importada e o terminal do ambiente estiver disponivel, rodar:

```bash
npm run hostinger:bootstrap
```

Esse script executa:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Smoke minimo pos-importacao

Depois do bootstrap, validar:

1. `GET /api/health`
2. `GET /setup`
3. `GET /api/setup/preflight`
4. `GET /api/auth/providers`
5. `GET /admin/sistema`

Leitura esperada:

- `/api/health` deve responder `200`
- `/setup` deve respeitar o lifecycle real
- `/api/setup/preflight` deve continuar protegido
- `/api/auth/providers` deve apontar para `https://petos.desi.pet`, nunca `localhost`
- `/admin/sistema` deve exigir autenticacao

## Estado atual do repositorio

Este repositorio ja esta pronto para a importacao:

- codigo sincronizado no GitHub
- `package-lock.json` presente
- scripts de `build` e `start` definidos
- Prisma schema, migrations e seed versionados
- docs operacionais do installer/updater ja incluidas

O proximo risco operacional ja nao e organizacao do repositorio. E apenas a configuracao correta do app no painel da Hostinger.
