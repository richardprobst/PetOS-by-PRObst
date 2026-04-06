# Release Readiness

Baseline tecnica de release/staging do MVP do PetOS.

Para a baseline tecnica da Fase 2 concluida, use tambem [docs/phase2-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-baseline.md).
Para a camada de installer/updater assistido, use tambem [docs/installer-updater-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-baseline.md).
Para o estado mais recente do rollout hospedado dessa camada, use tambem [docs/installer-updater-hosted-rollout.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-hosted-rollout.md).

Este documento nao abre nova fase de produto. Ele resume o que ja esta pronto no repositorio, o que ainda falta para um staging real e qual criterio minimo deve ser usado antes de tratar o ambiente como pronto para deploy controlado.

## O que ja esta pronto no MVP

No nivel de repositorio, esta baseline ja inclui:

- escopo do MVP implementado e fechado no codigo;
- setup local documentado em [docs/setup.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/setup.md);
- guia de staging em [docs/deploy-staging.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/deploy-staging.md);
- operabilidade basica em [docs/operability.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operability.md);
- endpoint `GET /api/health` para bootstrap e readiness;
- scripts de preflight, sanity check, Prisma, build e testes;
- logs estruturados leves com `requestId` para correlacao de erro;
- validacao automatizada recorrente para tipagem, lint, testes e build;
- rodada manual do MVP concluida com sucesso, sem reabertura de escopo.

## O que ainda falta para publicacao em ambiente controlado

Esta baseline ainda nao significa staging hospedado validado. Ainda faltam:

- um MySQL real acessivel pelo ambiente hospedado;
- aplicacao real de `prisma migrate deploy` e `prisma db seed` fora da maquina local;
- segredos reais de staging, distintos de `dev` e `production`;
- subida do app com URL publica coerente para `APP_URL`, `NEXT_PUBLIC_APP_URL` e `NEXTAUTH_URL`;
- uma rodada focada de regressao no ambiente hospedado usando [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md) como referencia.

Na validacao hospedada mais recente da frente installer/updater, o estado permaneceu `NO-GO`, agora com isolamento mais preciso:

- `petos-staging` ja recebeu a baseline publicada;
- as envs seguras/publicas do staging foram reaplicadas com sucesso;
- `DATABASE_URL` e `DIRECT_DATABASE_URL` continuam ausentes no contexto `production`;
- o ultimo deploy publicado ainda responde com callbacks de auth em `localhost`, porque a tentativa de rebuild limpo sem `.env.local` local nao conseguiu concluir sem essas envs reais de banco.

Em paralelo, a baseline foi validada com sucesso em ambiente controlado local usando Docker Desktop e o `docker-compose.yml` do proprio repositorio. Esse fallback local esta registrado em [docs/local-docker-validation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/local-docker-validation.md) e confirma que o bloqueio residual do staging hospedado esta no ambiente externo, nao no app.

## Pre-requisitos tecnicos

Para considerar um staging real minimamente pronto, o ambiente precisa de:

- Node.js `>=22` e npm `>=10`;
- MySQL acessivel pela aplicacao;
- variaveis de ambiente consistentes;
- build de producao concluido;
- migrations aplicadas;
- seed basico aplicado;
- `NEXTAUTH_SECRET` exclusivo do staging;
- HTTPS e host publico coerente para sessao/autenticacao.

## Dependencias externas ainda nao validadas

Continuam sem validacao real nesta baseline:

- MySQL hospedado ou remoto acessivel pelo runtime final;
- comportamento de cookie/sessao atras de proxy ou host real;
- WhatsApp Web e `mailto:` nos dispositivos da operacao;
- instalabilidade do PWA nos navegadores-alvo;
- comportamento ponta a ponta de login e RBAC com usuarios persistidos.

## O que continua dependente do ambiente hospedado

Mesmo com a baseline pronta e o MVP validado, seguem dependentes do proximo ambiente controlado:

- login e sessao sob host publico e proxy reais;
- acesso autenticado e permissao em `/admin` e `/tutor` no ambiente hospedado;
- agenda, check-in, historico de status, financeiro e comissao em banco hospedado;
- comunicacao manual pelos canais reais no contexto do staging;
- verificacao visual e operacional do PWA no host final;
- revisao final de logs apos o primeiro deploy controlado.

## Criterios para considerar a baseline pronta para staging real

Use esta lista como gate tecnico minimo:

1. A baseline do MVP validado descrita em [docs/release-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-baseline.md) esta preservada.
2. `npm run ops:preflight:staging` passa com variaveis reais do ambiente hospedado, ou `ops:preflight:staging:file` passa no ensaio local com `.env.staging`.
3. `npm run ops:check:staging` passa com banco acessivel, migrations aplicadas e seed existente, ou `ops:check:staging:file` reproduz isso no ensaio local.
4. `GET /api/health` retorna `200` no ambiente hospedado.
5. Uma regressao focada baseada em [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md) e executada sem gaps bloqueantes.

## O que esta baseline nao significa

Esta baseline nao significa:

- liberacao publica;
- producao pronta;
- Fase 2 iniciada;
- gateways financeiros ativos;
- automacoes ou infraestrutura sofisticada.

Ela significa apenas que o MVP esta organizado como um ponto tecnico coerente de release/staging para a proxima etapa controlada.

## Installer / updater assistido

O repositorio tambem fechou a camada interna de installer/updater assistido, mas isso nao muda os limites de release hospedada:

- o setup guiado ajuda no bootstrap de ambiente novo, nao na configuracao do host;
- o updater controlado ajuda a executar migrations e tasks suportadas no runtime atual, nao a publicar um novo build;
- deploy, segredos externos, banco remoto, DNS, SSL e rollback universal continuam fora dessa camada.
