# Hostinger GitHub Import

Guia objetivo para importar o repositório do PetOS no painel da Hostinger usando o fluxo nativo de GitHub.

Este documento assume:

- repositório remoto em [richardprobst/PetOS-by-PRObst](https://github.com/richardprobst/PetOS-by-PRObst)
- branch de deploy `main`
- domínio alvo `petos.desi.pet`
- MySQL remoto já existente e validado

## Configuração esperada no painel

Se a Hostinger pedir os campos manualmente, use:

- repositório: `richardprobst/PetOS-by-PRObst`
- branch: `main`
- diretório raiz do projeto: `/`
- versão do Node.js: `22`
- install command: `npm install`
- build command: `npm run build`
- start command: `npm start`

Observações:

- o projeto já está configurado com `output: 'standalone'` em [next.config.ts](/C:/Users/casaprobst/PetOS-by-PRObst-main/next.config.ts)
- o `start` já sobe o servidor standalone gerado pelo build em [scripts/start-standalone.mjs](/C:/Users/casaprobst/PetOS-by-PRObst-main/scripts/start-standalone.mjs)
- `postinstall` já executa `prisma generate`, reduzindo fragilidade no primeiro deploy

## Variáveis de ambiente obrigatórias

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
- não usar `localhost`, `.local` ou placeholders
- não subir `.env.local` para o host

## Bootstrap após a importação

Depois que a aplicação estiver importada e o terminal do ambiente estiver disponível, rodar:

```bash
npm run hostinger:bootstrap
```

Esse script executa:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

## Smoke mínimo pós-importação

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
- `/admin/sistema` deve exigir autenticação

## Estado atual do repositório

Este repositório já está pronto para a importação:

- código sincronizado no GitHub
- `package-lock.json` presente
- scripts de `build` e `start` definidos
- Prisma schema, migrations e seed versionados
- docs operacionais do installer/updater já incluídas

O próximo risco operacional já não é organização do repositório. É apenas a configuração correta do app no painel da Hostinger.
