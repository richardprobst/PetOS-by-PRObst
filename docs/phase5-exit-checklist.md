# Checklist de Saida da Fase 5

## Objetivo

Transformar o encerramento da Fase 5 em um gate objetivo de saida.

Esta fase so pode ser considerada fechada quando o centro administrativo, o white label e a governanca de publicacao estiverem entregues de forma coerente com a baseline do repositorio.

## Itens obrigatorios

### Fundacao de configuracao

- [x] `SystemSetting` e `ConfigurationChange` consolidados no schema
- [x] leitura server-side consolidada entre `env`, `UnitSetting` e configuracao sistemica
- [x] permissao administrativa central semeada
- [x] rota interna de leitura da fundacao em `/api/admin/settings/foundation`
- [x] rota interna consolidada em `/api/admin/settings/center`

### Centro administrativo

- [x] modulo aberto em `/admin/configuracoes`
- [x] configuracoes gerais do tenant editaveis
- [x] ajustes operacionais por unidade editaveis
- [x] administracao funcional da IA centralizada
- [x] overview de integracoes e segredos
- [x] publicacao, aprovacao e rollback com trilha administrativa

### White label

- [x] branding por tenant
- [x] override por unidade
- [x] assets de marca administraveis
- [x] bindings de dominio administraveis
- [x] resolucao server-side de runtime por superficie
- [x] aplicacao do branding no root layout, login, publico, tutor e shell admin
- [x] manifest PWA alinhado ao branding publicado

### Integracoes e segredos

- [x] modelo de conexao administrativa persistente
- [x] modelo de segredo separado da configuracao comum
- [x] cifragem de segredo com fallback controlado de chave mestra
- [x] diagnostico administrativo minimo de conexoes

### Validacao tecnica

- [x] `npm run test:phase5`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] `git diff --check`

## Limitacoes intencionais

A Fase 5 deliberadamente ainda nao entrega:

- cofre externo dedicado;
- DNS real e emissao automatica de certificado;
- editor WYSIWYG de branding;
- painel de marketing ou CMS;
- validacao real contra providers externos;
- rollout por tenant com infraestrutura separada.

## Gate final

- `Fase 5 encerrada`: `sim`
- `Modulo central de configuracoes entregue`: `sim`
- `White label server-side publicado`: `sim`
- `Pode seguir para nova fase`: `sim com ressalvas`

## Ressalvas

- segredos continuam dependentes de `CONFIGURATION_SECRET_MASTER_KEY` ou do fallback controlado em `NEXTAUTH_SECRET`;
- o runtime publicado respeita snapshot publicado, entao alteracoes live exigem publicacao governada;
- bindings de dominio continuam exigindo homologacao operacional real fora do repositorio.
