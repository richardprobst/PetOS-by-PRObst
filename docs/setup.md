# Setup Local

Guia curto para subir o PetOS localmente com o menor atrito possivel.

## Pre-requisitos

- Node.js `>=22` e npm `>=10`
- Docker Desktop com `docker compose`

Se voce nao quiser usar Docker, pode apontar `DATABASE_URL` e `DIRECT_DATABASE_URL` para um MySQL proprio. O restante do fluxo continua o mesmo.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### Valores locais padrao

O `.env.example` ja vem alinhado ao `docker-compose.yml`:

- `DATABASE_URL="mysql://petos:petos@127.0.0.1:3306/petos"`
- `DIRECT_DATABASE_URL="mysql://petos:petos@127.0.0.1:3306/petos"`

### Fundacao do instalador integrado

Os exemplos de ambiente agora tambem incluem:

- `INSTALLER_ENABLED`
- `INSTALLER_BOOTSTRAP_TOKEN`

Essas variaveis ficam desabilitadas por padrao. So habilite o modo instalador de forma explicita em ambiente novo e com token forte, porque essa rota existe para bootstrap controlado e nao para uso permanente do sistema.

Quando `INSTALLER_ENABLED=true`, o Bloco B da frente de instalador libera a superficie guiada em:

- `GET /setup`

Regras dessa tela:

- continua bloqueada por flag de ambiente;
- exige sessao temporaria de setup aberta com `INSTALLER_BOOTSTRAP_TOKEN`;
- valida preflight, revisa o draft inicial de empresa/unidade/admin e conclui a instalacao inicial;
- trava o modo setup ao final com estado persistido de runtime;
- so consegue aplicar schema em banco vazio quando o runtime tiver Prisma CLI disponivel; se esse binario nao existir no host, rode `npm run prisma:migrate:deploy` manualmente antes do finalize.

### Seed opcional do administrador inicial

Para criar um acesso interno no seed, preencha antes de rodar `npm run prisma:seed`:

```env
ADMIN_SEED_EMAIL=admin@petos.local
ADMIN_SEED_PASSWORD=uma-senha-forte
```

## 3. Subir o MySQL local

```bash
npm run db:up
```

Comandos uteis:

- `npm run db:logs`
- `npm run db:down`

## 4. Aplicar schema e seed

Fluxo recomendado para quem so quer usar o repositorio localmente:

```bash
npm run prisma:bootstrap
```

O script executa:

1. `prisma generate`
2. `prisma migrate deploy`
3. `prisma db seed`

Se voce estiver alterando schema localmente, use `npm run prisma:migrate:dev` em vez de `deploy`.

## 5. Verificar prontidao operacional local

```bash
npm run ops:check
```

Esse sanity check valida:

- parse do ambiente;
- conectividade com o banco;
- presenca da tabela `_prisma_migrations`;
- presenca minima de dados de seed;
- bloco `lifecycle` coerente para diferenciar ambiente novo, instalado ou indisponivel.

## 6. Iniciar a aplicacao

```bash
npm run dev
```

Ou, para validar build de producao:

```bash
npm run build
npm run start
```

O `start` padrao ja usa o servidor `standalone` gerado pelo Next.js e carrega `.env.local` e `.env` quando existirem.
Se voce precisar comparar comportamento local com o entrypoint legado, use `npm run start:legacy`.

## 7. Checks basicos

```bash
npm run ops:preflight
npm run prisma:check
npm run typecheck
npm run lint
npm test
npm run build
```

Atalho unico:

```bash
npm run check:all
```

Esse atalho ja inclui `npm run ops:check` antes dos checks de Prisma, tipagem, lint, testes e build, entao tambem valida banco, migrations, seed e lifecycle operacional.

## 8. Proxima rodada manual

Depois do ambiente subir e do seed existir, use:

- [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md)
- [docs/phase2-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-smoke-checklist.md)
- [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md)

Esse documento segue como referencia da rodada manual que validou o MVP e como checklist de regressao para novos ambientes.

## Fallback operacional com Docker local

Se o staging hospedado estiver bloqueado por segredos externos de banco, use o fallback validado em:

- [docs/local-docker-validation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/local-docker-validation.md)

Esse caminho nao substitui o host real, mas fecha a validacao tecnica do app em ambiente controlado com o MySQL previsto pelo proprio repositorio.

## Ambiente hospedado

Quando o objetivo nao for mais rodar localmente, use:

- [docs/deploy-staging.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/deploy-staging.md)
- [docs/operability.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operability.md)
- [docs/release-readiness.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-readiness.md)
- [docs/installer-updater-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-baseline.md)

Leitura pratica:

- `ops:preflight:staging` e `ops:check:staging` assumem variaveis injetadas pelo ambiente hospedado;
- `ops:preflight:staging:file` e `ops:check:staging:file` servem para ensaiar staging localmente usando `.env.staging`.
- o installer/updater assistido continua interno ao runtime do app; ele nao substitui bootstrap de host, deploy de build nem configuracao de segredos externos.
