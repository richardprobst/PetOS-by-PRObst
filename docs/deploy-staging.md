# Deploy / Staging

Guia curto para deixar o PetOS pronto para um ambiente de staging ou desenvolvimento hospedado, sem assumir um provedor final.

Este documento parte do pressuposto de que o MVP ja foi validado. O objetivo aqui nao e revalidar o produto, e sim preparar e subir um ambiente hospedado controlado com o menor atrito possivel.

Para o resultado mais recente do rollout hospedado da frente installer/updater, veja [docs/installer-updater-hosted-rollout.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-hosted-rollout.md).
Para a validacao tecnica local que ja passou com Docker quando o hosted staging esta bloqueado por banco externo, veja [docs/local-docker-validation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/local-docker-validation.md).

Na rodada mais recente do ambiente real pretendido, o MySQL remoto da Hostinger foi validado com sucesso e os gates `ops:preflight:staging` e `ops:check:staging` passaram contra esse banco. Para esse alvo, o proximo passo deixou de ser "resolver banco" e passou a ser "publicar o app Next.js no host com as mesmas envs coerentes".

## O que um staging minimo precisa

- Node.js `>=22` e npm `>=10`
- um MySQL acessivel pela aplicacao
- variaveis de ambiente coerentes para App Router, Prisma e `next-auth`
- migrations aplicadas
- seed executado
- build de producao concluido

## Arquivos e variaveis

O repositorio suporta dois modos de preparo:

1. variaveis injetadas diretamente pelo provedor/CI;
2. ensaio local com `.env.staging`.

Para configuracao baseada em arquivo:

1. copie `.env.staging.example` para `.env.staging`
2. substitua todos os placeholders
3. mantenha as URLs com o mesmo host publico

Variaveis obrigatorias do staging:

- `NODE_ENV=production`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`

Regras importantes:

- `APP_URL`, `NEXT_PUBLIC_APP_URL` e `NEXTAUTH_URL` devem compartilhar a mesma origem
- staging nao deve usar `localhost`, `127.0.0.1`, `.local` ou `example.com`
- `NEXTAUTH_SECRET` precisa ser forte e nao pode ficar com placeholder
- `DATABASE_URL` e `DIRECT_DATABASE_URL` devem apontar para MySQL acessivel fora da maquina local

## Sequencia recomendada de bootstrap

Escolha um dos caminhos abaixo para a preparacao das variaveis.

### Caminho A: staging hospedado com variaveis do provedor

Configure as variaveis obrigatorias diretamente no provedor e rode:

```bash
npm run ops:preflight:staging
```

### Caminho B: ensaio local com `.env.staging`

1. copie `.env.staging.example` para `.env.staging`

```bash
cp .env.staging.example .env.staging
```

No PowerShell:

```powershell
Copy-Item .env.staging.example .env.staging
```

2. validar a configuracao antes do banco:

```bash
npm run ops:preflight:staging:file
```

### Bootstrap comum

1. instalar dependencias:

```bash
npm install
```

2. aplicar Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```

3. executar o sanity check completo:

```bash
npm run ops:check:staging
```

Se estiver ensaiando localmente com `.env.staging`, use:

```bash
npm run ops:check:staging:file
```

4. validar build e boot:

```bash
npm run build
npm run start:standalone
```

Se a publicacao for feita por build local + `npx netlify deploy --prod --no-build` a partir desta maquina, sanitize os artefatos de function antes do upload para impedir que `.env.local` seja empacotado no server handler:

```bash
npm run netlify:artifacts:sanitize
```

Se a publicacao for feita por `npx netlify deploy --prod --build` nesta mesma maquina, o cuidado e diferente:

- nao deixe `.env.local` presente na raiz durante o build;
- o comando integrado da Netlify vai executar `next build` e pode carregar `.env.local` antes mesmo da fase de empacotamento;
- sem `DATABASE_URL` e `DIRECT_DATABASE_URL` reais ja configuradas no host, esse caminho pode falhar ainda no build, antes do deploy ser publicado.

5. confirmar sinal operacional minimo:

- `GET /api/health` deve responder `200`
- o banco deve aparecer como `ok`
- `migrations` e `seed` devem aparecer como `ok`

6. executar regressao focada no ambiente hospedado:

- usar [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md) como referencia;
- usar [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md) para validar a camada installer/updater quando houver janela controlada;
- priorizar login, RBAC, agenda, financeiro, comissao, comunicacao manual e portal do tutor.

## Sanity checks operacionais

Checks uteis nesta etapa:

- `npm run check:all`
- `npm run prisma:check`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run ops:preflight:staging`
- `npm run ops:check:staging`
- `npm run ops:preflight:staging:file`
- `npm run ops:check:staging:file`

O endpoint operacional `GET /api/health` responde `200` quando ambiente e banco estao acessiveis e `503` quando o bootstrap ainda esta degradado.

Para leitura operacional e interpretacao dos sinais basicos de erro, use tambem:

- [docs/operability.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operability.md)
- [docs/release-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-baseline.md)
- [docs/release-readiness.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-readiness.md)

## Autenticacao e sessao

Cuidados minimos para staging:

- use `NEXTAUTH_URL` com a URL publica final do ambiente
- mantenha `NEXTAUTH_SECRET` exclusivo do staging
- nao reutilize segredos locais em ambiente hospedado
- aplique o seed apenas quando fizer sentido criar o administrador inicial

## Limitacoes atuais do MVP

Este staging continua com os mesmos limites do MVP:

- sem gateways financeiros ativos em producao
- sem automacoes de CRM
- sem escopo de Fase 2 ou Fase 3

Na frente installer/updater:

- nao existe deploy automatico do novo build;
- nao existe escrita automatica de segredos no host;
- o updater exige preflight compativel e runtime com Prisma CLI quando a release precisa aplicar migration.

## O que continua dependente do ambiente hospedado

Mesmo com o MVP validado, um ambiente hospedado novo ainda precisa confirmar:

- MySQL acessivel pelo runtime final
- `prisma migrate deploy` e `prisma db seed` executados com sucesso
- autenticacao, cookies e sessao atras do host/proxy publico
- `GET /api/health` respondendo `200` no ambiente hospedado
- uma rodada focada de regressao usando [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md) como referencia

## Go / No-Go minimo para staging

Sinais de `go`:

- `ops:preflight:staging` passa com variaveis reais do ambiente;
- `prisma migrate deploy` e `prisma db seed` concluem sem erro;
- `ops:check:staging` retorna ambiente, banco, migrations e seed como `ok`;
- `GET /api/health` responde `200`;
- a regressao focada de staging nao encontra bloqueio funcional do MVP.

Sinais de `no-go`:

- URL publica incoerente entre `APP_URL`, `NEXT_PUBLIC_APP_URL` e `NEXTAUTH_URL`;
- segredo placeholder ou host local em staging;
- falha de banco, migrations ou seed;
- `GET /api/health` respondendo `503`;
- quebra de sessao, RBAC ou fluxo critico do MVP no host real.

Na rodada hospedada mais recente do staging, a baseline foi publicada de fato, mas o resultado permaneceu `NO-GO` porque:

- o staging ainda nao recebeu `DATABASE_URL` e `DIRECT_DATABASE_URL` reais no contexto `production`;
- o ultimo deploy publicado continua contaminado por `localhost` em `/api/auth/providers`;
- a tentativa de gerar um novo deploy integrado limpo sem `.env.local` local falhou exatamente por falta dessas envs reais de banco.

No destino final hoje pretendido, a leitura operacional ja melhorou:

- o banco remoto da Hostinger respondeu com sucesso a `prisma migrate deploy`;
- `ops:preflight:staging` e `ops:check:staging` passaram com `DATABASE_URL` e `DIRECT_DATABASE_URL` reais desse ambiente;
- a proxima validacao hospedada precisa focar no deploy do app na Hostinger, nao mais na criacao do banco.
