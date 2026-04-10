# Homologacao Operacional da Fase 5

## Objetivo

Validar em ambiente publicado que o centro administrativo de configuracoes e o runtime de white label da Fase 5:

- autenticam corretamente;
- aparecem no shell administrativo;
- respondem sem erro 500;
- expoem permissoes operacionais coerentes para o perfil administrativo;
- sinalizam de forma controlada qualquer pendencia de migration.

## Script dedicado

- `npm run ops:validate:phase5`

## Variaveis esperadas

O script usa este contrato:

- `PHASE5_VALIDATION_URL`
- `PHASE5_VALIDATION_EMAIL`
- `PHASE5_VALIDATION_PASSWORD`

Se essas variaveis nao existirem, ele tenta fallback em:

- `APP_URL` ou `NEXTAUTH_URL`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

## O que o script valida

### Sessao e shell admin

- redirecionamento sem sessao de `/admin/configuracoes` para `/entrar`;
- login por credenciais;
- resposta `200` em `/admin`, `/admin/configuracoes` e `/admin/sistema`;
- presenca do link `/admin/configuracoes` no HTML renderizado do shell admin.

### APIs da Fase 5

- `GET /api/admin/settings/foundation`
- `GET /api/admin/settings/center`
- `GET /api/admin/branding`
- `GET /api/admin/integrations`

### Permissoes operacionais

- o editor de white label precisa aparecer como habilitado para a sessao administrativa;
- o editor de integracoes precisa aparecer como habilitado para a sessao administrativa;
- a compatibilidade com o perfil legado `Administrador` e tratada como requisito operacional do host publicado.

### Alertas nao bloqueantes

O script registra `warning` quando identificar:

- `MIGRATION_PENDING` em storage da Fase 5;
- ausencia de marcador textual esperado no HTML.

## Gate operacional recomendado

- `GO`: rotas principais e APIs respondem `200`, o shell exibe o modulo e a sessao administrativa recebe permissoes coerentes.
- `GO COM RESSALVAS`: os checks acima passam, mas o ambiente ainda expoe `MIGRATION_PENDING`.
- `NO-GO`: falha de login, redirecionamento incorreto, erro 500, modulo ausente do shell ou permissoes administrativas incoerentes.

## Observacao importante

`MIGRATION_PENDING` nao derruba mais a interface, mas continua sendo um bloqueio para operacao plena de branding, dominios e integracoes. Para remover esse alerta no host publicado, ainda e necessario executar `prisma migrate deploy` no ambiente de producao.

## Resultado observado no host publicado

Rodada validada em `2026-04-10` contra `https://petos.desi.pet`:

- `GO COM RESSALVAS` para shell admin e centro administrativo;
- login administrativo funcionando;
- `/admin`, `/admin/configuracoes`, `/admin/sistema` e APIs centrais respondendo `200`;
- compatibilidade com o admin legado validada para centro, branding e integracoes;
- pendencia remanescente: storage da Fase 5 ainda em `MIGRATION_PENDING` no host publicado.
