# Suite de Testes da Fase 5

## Objetivo

Este documento registra a suite minima reconhecivel da Fase 5.

Ela protege os pontos centrais do modulo de configuracoes e white label:

- fundacao de configuracao central;
- trilha de mudanca;
- runtime de white label;
- cofre logico de segredos;
- smoke dos registries e do contrato amplo da fase.

## Script dedicado

- `npm run test:phase5`

Atualmente ele executa:

- `tests/server/configuration/*.test.ts`
- `tests/server/branding/*.test.ts`
- `tests/server/integrations-admin/*.test.ts`
- `tests/server/phase5-smoke.test.ts`

## Cobertura minima

### Configuracao central

- leitura fail-closed da fundacao;
- consolidacao entre `env`, `SystemSetting` e `UnitSetting`;
- permissao de publicacao e aprovacao;
- trilha de mudanca com redacao de segredo.

### White label

- resolucao server-side de branding por tenant, unidade e dominio;
- merge de tema tenant + override de unidade;
- resolucao de assets por escopo;
- exposicao de tokens CSS do runtime.

### Integracoes e segredos

- roundtrip criptografado do segredo administrativo;
- fallback seguro entre `CONFIGURATION_SECRET_MASTER_KEY` e `NEXTAUTH_SECRET`;
- catalogo de providers e mascaramento de segredo.

### Smoke

- registries centrais da Fase 5 continuam presentes;
- branding default continua resolvivel;
- a camada continua preparada para publicacao governada.

## O que esta fora desta suite

- teste e2e visual do centro administrativo;
- deploy hospedado;
- validacao real de provider externo;
- publish/approval em ambiente com humanos reais;
- validacao de dominio customizado em DNS publico.
