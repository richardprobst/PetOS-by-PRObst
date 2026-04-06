# Operability

Guia curto para observar se o PetOS subiu bem e para separar problema de ambiente de problema da aplicacao.

## Sinais de boot saudavel

Use estes checks como trilha principal:

```bash
npm run ops:preflight
npm run ops:check
```

Em staging:

```bash
npm run ops:preflight:staging
npm run ops:check:staging
```

Para ensaio local de staging com `.env.staging`:

```bash
npm run ops:preflight:staging:file
npm run ops:check:staging:file
```

Leitura rapida:

- `ops:preflight` valida ambiente e configuracao minima
- `ops:check` valida ambiente, banco, migrations e seed
- `ops:preflight:staging` e `ops:check:staging` assumem variaveis injetadas pelo host/CI
- os sufixos `:file` servem para simular staging localmente com `.env.staging`
- falha em `database` normalmente aponta para `DATABASE_URL`, rede ou MySQL indisponivel
- falha em `migrations` normalmente aponta para bootstrap incompleto do Prisma
- falha em `seed` normalmente aponta para banco sem massa minima para auth e operacao

## Endpoint operacional

O ambiente expoe:

- `GET /api/health`

Resposta esperada:

- `200` quando ambiente, banco, migrations e seed estao coerentes
- `503` quando o bootstrap ainda esta degradado

O payload informa apenas o minimo operacional:

- `status`
- `service`
- `checks`
- `lifecycle`

O bloco `lifecycle` resume o modo atual do sistema sem expor segredos:

- `state`
- `source`
- `currentInstalledVersion`
- `installerEnabled`
- `installerLocked`
- `maintenanceActive`

Nao ha stack trace nem segredos na resposta.

## Preflight do instalador

Quando a fundacao do instalador integrado estiver habilitada de forma explicita por ambiente, o sistema expoe:

- `GET /api/setup/preflight`
- `GET /setup`

Regras:

- a rota nao fica aberta por padrao;
- exige `INSTALLER_ENABLED=true`;
- exige token de bootstrap via header;
- a pagina `/setup` tambem exige sessao temporaria assinada por cookie `HttpOnly`, aberta somente depois da validacao do token de bootstrap;
- so serve para diagnostico de setup inicial, nao para reinstalacao silenciosa.

No estado atual dessa frente:

- `/api/setup/preflight` diagnostica ambiente, banco, migrations e seed;
- `/setup` valida o draft inicial de empresa, unidade e admin;
- o finalize integrado grava o bootstrap base, cria o admin inicial, marca `INSTALLING -> INSTALLED` e persiste o lock do instalador;
- se o banco ainda estiver vazio e o runtime nao tiver Prisma CLI disponivel, o preflight bloqueia o finalize e exige `npm run prisma:migrate:deploy` manual antes de seguir.

## Preflight do updater

O Bloco E da frente de installer/updater agora expoe uma leitura minima e protegida do plano de update:

- `GET /api/admin/system/update-preflight`
- `/admin/sistema`

Regras:

- o endpoint e interno e exige `sistema.update.operar`;
- nao executa migrations, seed, maintenance ou tasks pos-update;
- apenas compara versao atual instalada, build alvo e manifest embarcado;
- bloqueia quando lifecycle, readiness, manifest ou env obrigatorio novo estiverem incompatíveis;
- registra o que seria exigido para a execucao futura, como maintenance e backup.

O preflight responde com:

- versao atual detectada;
- versao alvo do build/manifest;
- tipo de update (`upgrade`, `none`, `downgrade` ou `unknown`);
- gates classificados como `ok`, `warning` ou `blocking`;
- readiness atual reaproveitando banco, migrations e seed;
- disponibilidade real de `prisma migrate deploy` no runtime atual.

## Engine de update

O Bloco F adiciona a execucao controlada do update, ainda sem deploy de build novo nem rollback universal:

- `GET /api/admin/system/update-executions`
- `POST /api/admin/system/update-executions`
- `GET /api/admin/system/update-executions/[executionId]`
- `POST /api/admin/system/update-executions/[executionId]/retry`
- `/admin/sistema`

Regras:

- toda execucao exige `sistema.update.operar`;
- o update so inicia depois de um preflight compativel;
- apenas uma execucao pode ficar aberta por vez;
- a engine grava execucao, passos, status, tempos e resumo de falha;
- a engine entra em `UPDATING`, aplica migrations, seed policy suportada e tasks declaradas no manifest;
- se uma falha ocorrer depois da entrada no fluxo real, o runtime vai para `UPDATE_FAILED`;
- retentativa so fica disponivel quando a propria execucao falhada marcar `RETRY_AVAILABLE`.

No estado atual dessa frente:

- a engine ja executa `prisma migrate deploy` quando o runtime suporta a Prisma CLI;
- `postUpdateTasks` continuam explicitamente declarativas e so executam tarefas registradas no runtime;
- `seedPolicy=idempotent_bootstrap` reaproveita o bootstrap base do sistema;
- falhas em migration ou validacao final nao sao ocultadas e deixam trilha persistida por passo;
- ainda nao existe deploy automatico do novo build, rollback universal nem recovery expandido alem da base do Bloco F.

## Como interpretar logs basicos

Os logs do servidor usam `LOG_LEVEL` e seguem formato estruturado simples.

Campos mais uteis:

- `message`
- `timestamp`
- `level`
- `context.requestId`
- `context.method`
- `context.path`
- `context.code`
- `context.status`

### Erros de rota

Quando uma rota falha, o cliente recebe:

- `error.code`
- `error.message`
- `error.requestId`

Use o `requestId` para correlacionar a resposta com o log do servidor.

Leitura pratica:

- `BAD_REQUEST` costuma indicar payload invalido ou JSON malformado
- `UNAUTHORIZED` indica falta de sessao
- `FORBIDDEN` indica permissao, papel ou origem nao confiavel
- `CONFLICT` indica regra de dominio impedindo a operacao
- `TOO_MANY_REQUESTS` indica rate limit
- `INTERNAL_SERVER_ERROR` indica falha interna e merece olhar o log correspondente

## Problema de ambiente vs problema de aplicacao

Sinais mais comuns de problema de ambiente:

- `ops:preflight` falha por variavel ausente ou URL incoerente
- `ops:check` falha em `database`
- `/api/health` retorna `503` com falha em `database`, `migrations` ou `seed`
- build nao sobe por segredo, URL ou banco mal configurado

Sinais mais comuns de problema de aplicacao:

- `ops:check` passa, mas uma rota critica retorna `4xx` ou `5xx`
- o `requestId` da resposta aparece em log de `Handled route error.` ou `Unhandled route error.`
- regras de dominio impedem a operacao mesmo com ambiente saudavel

## O que depende de banco real

Sem MySQL acessivel, o projeto ainda nao consegue validar de ponta a ponta:

- migrations reais
- seed real
- login com usuarios persistidos
- agenda, check-in, historico de status, financeiro e comissao em dados reais

## O que continua dependente do ambiente hospedado

A validacao manual do MVP foi concluida. O que permanece para uma futura subida em ambiente controlado e especifico do host:

- sessao e cookies atras do host/proxy publico
- `GET /api/health` e bootstrap real do banco no ambiente hospedado
- regressao focada de `/admin` e `/tutor` depois do deploy
- verificacao operacional de WhatsApp Web, `mailto:` e PWA no navegador/dispositivo usados no staging

## Sinais rapidos de rollout com problema

Durante o primeiro deploy controlado, trate como alerta imediato:

- `ops:preflight:staging` falhando antes do banco;
- `ops:check:staging` com falha em `database`, `migrations` ou `seed`;
- `GET /api/health` respondendo `503`;
- respostas `401`, `403` ou `500` inesperadas em `/entrar`, `/admin` ou `/tutor`;
- ausencia de `requestId` util para correlacao em falha de rota.

Para o gate tecnico desta baseline antes de um staging real, use tambem:

- [docs/release-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-baseline.md)
- [docs/phase2-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-baseline.md)
- [docs/release-readiness.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-readiness.md)
- [docs/installer-updater-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-baseline.md)
- [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md)
