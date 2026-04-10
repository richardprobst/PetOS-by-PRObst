# PHASE5_PLAN.md

# Fase 5 - Centro de Configuracoes e White Label

## 1. Status desta fase

Esta fase nao existia no `PetOS_PRD.md` original.

Status atual do repositorio:

- fase implementada e fechada;
- centro administrativo ativo em `/admin/configuracoes`;
- runtime de white label publicado de forma server-side;
- governanca de publish, approval e rollback entregue.

Ela passa a existir por decisao explicita do mantenedor para cobrir:

- centro administrativo unificado de configuracoes;
- ajustes operacionais e de negocio hoje dispersos;
- governanca de integracoes;
- parametros por unidade;
- white label completo e auditavel.

Escopo desta fase:

- abrir uma superficie administrativa central para configuracao;
- consolidar configuracoes hoje espalhadas entre `env`, `UnitSetting`, seeds e telas pontuais;
- permitir branding e white label por tenant e por unidade;
- manter segredos, autorizacao e auditoria sob controle server-side.

Fora do escopo desta fase:

- reescrever runtime, installer ou updater;
- trocar a base de multiunidade;
- abrir automacao irrestrita de IA;
- transformar o sistema em CMS generico.

## 2. Objetivo

Entregar um modulo administrativo amplo em `/admin/configuracoes` para centralizar:

- configuracoes gerais do sistema;
- configuracoes operacionais por unidade;
- preferencias de portal e comunicacao;
- integracoes externas;
- parametros da camada de IA;
- politicas administrativas;
- branding e white label.

O objetivo nao e apenas abrir uma tela nova.

O objetivo e criar uma arquitetura de configuracao com:

- hierarquia de escopo;
- rastreabilidade;
- preview e publicacao quando necessario;
- suporte a segredos sensiveis sem exposicao indevida;
- runtime consistente entre admin, portal, APIs, documentos e canais externos.

## 3. Encaixe com o produto atual

O repositorio ja possui:

- `UnitSetting` como base de configuracao por unidade;
- flags e quotas da IA em ambiente;
- runtime e operacao de sistema em `/admin/sistema`;
- RBAC server-side;
- auditoria transversal;
- fundacao multiunidade server-side;
- superficies administrativas por modulo.

O problema atual e de fragmentacao:

- parte das configuracoes esta em `env`;
- parte esta em `UnitSetting`;
- parte esta embutida em fluxo de modulo;
- parte nem possui editor administrativo;
- white label ainda nao existe como dominio formal.

Esta fase organiza isso sem reabrir as fases anteriores.

## 4. Principios inegociaveis

### 4.1. Segredo nao e configuracao comum

API keys, segredos de webhook, tokens e credenciais:

- nao devem ser exibidos em claro depois de salvos;
- nao devem trafegar para o cliente sem necessidade;
- nao devem ficar no browser como fonte de verdade;
- devem ser salvos de forma criptografada ou referenciados por ambiente seguro.

### 4.2. Backend continua sendo a autoridade

Toda leitura e mutacao de configuracao sensivel deve passar pelo servidor.

### 4.3. White label nao pode virar multiunidade insegura

Branding, dominio, assets e textos precisam respeitar:

- tenant;
- unidade;
- ownership administrativo;
- contexto multiunidade resolvido no servidor.

### 4.4. Configuracao tem escopo

Nem toda configuracao pertence ao mesmo nivel.

Os niveis desta fase serao:

- `SYSTEM_GLOBAL`
- `TENANT_GLOBAL`
- `UNIT`
- `PUBLIC_BRAND`
- `INTEGRATION_SECRET`

### 4.5. Mudanca critica precisa de trilha

Alteracoes em configuracoes financeiras, fiscais, IA, dominio, branding e integracao precisam gerar auditoria.

## 5. Decisao de modelagem recomendada

### 5.1. Melhor forma para configuracao ampla

A melhor forma, no contexto atual do PetOS, e separar o problema em quatro familias:

1. configuracao funcional editavel no banco;
2. configuracao sensivel protegida por cofre logico;
3. configuracao publica de branding;
4. configuracao de runtime estritamente lida do ambiente.

### 5.2. Regra de ouro

Nem tudo deve ir para a UI.

Deve ficar em ambiente:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `NEXTAUTH_SECRET`
- chaves mestras de criptografia
- segredos de infraestrutura do host

Pode migrar para configuracao administravel:

- toggles de modulo
- quotas por modulo
- janelas operacionais
- comportamento de CRM
- parametros de portal
- configuracao fiscal funcional
- identificadores publicos de integracao
- white label e dominios

Pode ir para cofre logico administravel:

- tokens de API
- webhook secrets
- credenciais SMTP
- tokens de provedores fiscais
- tokens de IA, se um dia forem administraveis via UI

### 5.3. Melhor forma para white label completo

White label completo deve ser resolvido por camadas:

1. branding default da plataforma;
2. branding do tenant;
3. override por unidade;
4. resolucao server-side por dominio e contexto;
5. cache e invalidacao controlados.

Isso e melhor do que:

- hardcode por deploy;
- branch por cliente;
- `.env` por identidade visual;
- CSS solto por pagina;
- troca de logo apenas no frontend.

## 6. Escopo funcional do modulo

## 6.1. Centro administrativo

Nova area recomendada:

- `/admin/configuracoes`

Subareas:

- `/admin/configuracoes/geral`
- `/admin/configuracoes/unidades`
- `/admin/configuracoes/operacao`
- `/admin/configuracoes/comunicacao`
- `/admin/configuracoes/financeiro-fiscal`
- `/admin/configuracoes/integracoes`
- `/admin/configuracoes/ia`
- `/admin/configuracoes/portal`
- `/admin/configuracoes/seguranca-acesso`
- `/admin/configuracoes/white-label`
- `/admin/configuracoes/dominios`
- `/admin/configuracoes/auditoria`

## 6.2. Conteudo do centro de configuracoes

### Geral

- nome juridico e nome fantasia;
- dados institucionais;
- timezone e moeda;
- dados padrao de contato;
- identidade da conta/tenant.

### Unidades

- cadastro e ativacao de unidades;
- dados fiscais e operacionais por unidade;
- janelas e tolerancias;
- parametros de agenda e atendimento;
- defaults por unidade.

### Operacao

- no-show;
- cancelamento;
- reagendamento;
- pre-check-in;
- duracao e regras operacionais;
- estoque negativo;
- retencao operacional minima.

### Comunicacao

- remetentes;
- canais habilitados;
- politica de templates;
- gatilhos de CRM;
- consentimento e defaults de contato.

### Financeiro/Fiscal

- politicas de deposito;
- reembolso;
- credito do cliente;
- comportamento fiscal por unidade;
- parametros de cobranca preventiva;
- provedores habilitados.

### Integracoes

- Stripe;
- Mercado Pago;
- fiscal;
- SMTP;
- storage;
- futuras integracoes.

### IA

- flags por modulo;
- quotas;
- comportamento de fallback;
- configuracao funcional da camada assistiva;
- observabilidade e status de readiness.

### Portal

- textos institucionais;
- modulos do tutor habilitados;
- politicas de exibicao;
- configuracao do assistente virtual;
- termos e links publicos.

### Seguranca e acesso

- perfis administrativos;
- trilha de aprovacao;
- quem pode editar o que;
- leitura mascarada de segredo;
- politica de mudanca critica.

### White label

- logos;
- favicon;
- icones PWA;
- paleta;
- tipografia;
- imagens de autenticacao;
- nome publico da marca;
- microcopy institucional;
- componentes publicos de marca;
- email branding;
- branding de documentos e report cards;
- dominio principal;
- dominios secundarios por unidade;
- preview e publish.

## 7. Proposta de modelo de dados

## 7.1. Novas entidades recomendadas

- `SystemSetting`
- `TenantBranding`
- `UnitBranding`
- `BrandAsset`
- `DomainBinding`
- `IntegrationConnection`
- `IntegrationSecret`
- `ConfigurationChange`
- `ConfigurationApproval`
- `ConfigurationPublish`

## 7.2. Papel de cada entidade

### `SystemSetting`

Armazena configuracoes administrativas nao secretas, com:

- chave;
- escopo;
- valor tipado;
- categoria;
- unidade ou tenant quando aplicavel;
- estado de publicacao.

### `TenantBranding`

Base de white label do tenant:

- nome publico;
- slug;
- cores;
- tipografia;
- layout tokens;
- logos e icones;
- configuracao de manifest e metadata.

### `UnitBranding`

Overrides por unidade:

- logo da unidade;
- cor secundaria local;
- nome curto de unidade;
- textos operacionais;
- variacoes de impressao ou report card.

### `BrandAsset`

Metadados de assets de marca:

- logo principal;
- logo monocromatico;
- favicon;
- og image;
- icones do PWA;
- assinatura de e-mail;
- cabecalho/rodape de documentos.

### `DomainBinding`

Mapeia hostnames para:

- tenant;
- unidade;
- tipo de superficie;
- status de verificacao;
- dominio principal ou secundario.

### `IntegrationConnection`

Configuracao funcional de integracao:

- provider;
- escopo;
- status;
- parametros nao secretos;
- health state.

### `IntegrationSecret`

Cofre logico de segredos:

- referencia da conexao;
- segredo cifrado;
- metadata de rotacao;
- usuario responsavel;
- data de ultima alteracao.

### `ConfigurationChange`

Trilha de mudanca:

- quem alterou;
- antes/depois;
- categoria;
- escopo;
- impacto;
- request id.

### `ConfigurationApproval`

Quando a mudanca for sensivel:

- solicitante;
- aprovador;
- status;
- motivo;
- janela de aplicacao.

### `ConfigurationPublish`

Controle de snapshot publicado:

- versao;
- escopo;
- hash;
- publicado por;
- rollback de referencia.

## 7.3. Regras de storage para segredos

Segredos nao devem ser reutilizados a partir de texto puro no frontend.

Opcao recomendada:

- salvar cifrado com chave mestra do ambiente;
- mostrar apenas mascara depois do cadastro;
- permitir teste de conexao sem reexibir o valor;
- manter trilha de rotacao.

## 8. Proposta de arquitetura da aplicacao

## 8.1. Features novas

Recomendado abrir:

- `features/configuration/`
- `features/branding/`
- `features/integrations-admin/`

## 8.2. Responsabilidades

### `features/configuration/`

- schemas;
- services;
- actions;
- policy;
- audit helpers;
- resolucao de escopo;
- publish/preview.

### `features/branding/`

- resolucao de tenant/unidade por dominio;
- assets;
- tokens de tema;
- metadata e manifest;
- branding de documentos e e-mail.

### `features/integrations-admin/`

- conexoes;
- segredos;
- health checks;
- mascaramento;
- teste controlado.

## 8.3. Superficies HTTP

Rotas recomendadas:

- `/api/admin/settings/*`
- `/api/admin/branding/*`
- `/api/admin/domains/*`
- `/api/admin/integrations/*`

Essas rotas devem:

- validar input com Zod;
- aplicar RBAC;
- mascarar segredos;
- registrar auditoria;
- suportar publish/preview quando relevante.

## 8.4. Superficie visual

Padrao recomendado:

- wizard para primeiras configuracoes;
- tabs por categoria;
- resumo de impacto;
- diff antes de publicar;
- teste de conexao;
- historico de alteracoes.

## 9. White label completo - melhor forma de entrega

## 9.1. Camadas de white label

### Camada 1 - Identidade publica

- nome da marca;
- logotipo;
- favicon;
- manifest;
- og image;
- dominio.

### Camada 2 - Tema visual

- cores primarias e auxiliares;
- radius;
- sombras;
- tipografia;
- variantes para admin e portal.

### Camada 3 - Conteudo institucional

- textos publicos;
- assinatura de e-mail;
- rodape legal;
- mensagens de contato;
- politicas e termos.

### Camada 4 - Documentos e comunicacao

- templates de documento;
- cabecalho/rodape;
- assinatura visual de report card;
- branding de comunicacao transacional.

### Camada 5 - Dominio e experiencia publica

- portal do tutor sob dominio customizado;
- login com identidade da marca;
- canonical e metadata corretos;
- politica de assets por host.

## 9.2. Regra tecnica recomendada

White label deve ser resolvido server-side por:

- hostname;
- dominio vinculado;
- tenant;
- unidade ativa.

Implementacao recomendada no App Router:

- resolver branding no servidor;
- usar metadata dinamica por dominio;
- servir manifest e assets com base no branding publicado;
- aplicar CSS variables a partir de tokens de marca.

## 9.3. O que nao fazer

- theme por deploy manual;
- branch por cliente;
- copia de projeto para cada marca;
- variavel de ambiente para cada cor ou logo;
- segredo em tabela publica;
- branding decidido apenas no client.

## 10. Blocos de implementacao

## B5-T01 - Fundacao de configuracao central

Entregar:

- taxonomia de configuracoes;
- modelo de dados;
- permissao nova;
- trilha de auditoria;
- leitura server-side consolidada.

## B5-T02 - Centro administrativo minimo

Entregar:

- `/admin/configuracoes`;
- resumo por categoria;
- leitura de configuracoes atuais;
- escopo global vs unidade;
- bloqueio por permissao.

## B5-T03 - Editor de configuracoes por unidade

Entregar:

- CRUD seguro sobre `UnitSetting`;
- grupos operacionais;
- validacao;
- auditoria;
- sem hardcode disperso.

## B5-T04 - Integracoes administrativas

Entregar:

- conexoes;
- segredos mascarados;
- teste de conexao;
- estado de health;
- status por ambiente.

## B5-T05 - IA administravel

Entregar:

- flags por modulo;
- quotas;
- status atual;
- diferenca entre env obrigatorio e configuracao administravel;
- trilha de mudanca.

## B5-T06 - White label foundation

Entregar:

- entidades de branding;
- assets;
- tokens;
- resolucao por dominio;
- preview.

## B5-T07 - White label runtime

Entregar:

- login white label;
- portal do tutor white label;
- metadata;
- manifest;
- email branding;
- report card branding.

## B5-T08 - Publicacao, aprovacao e rollback

Entregar:

- publish draft/live;
- aprovacao para mudanca critica;
- historico;
- rollback seguro.

## B5-T09 - Suite e handoff

Entregar:

- testes de permissao;
- testes de escopo;
- testes de segredos mascarados;
- testes de resolucao de branding por dominio;
- checklist final da fase.

## 11. RBAC recomendado

Novas familias de permissao:

- `configuracao.central.visualizar`
- `configuracao.central.editar`
- `configuracao.publicar`
- `configuracao.aprovar`
- `configuracao.segredo.editar`
- `configuracao.integracao.testar`
- `white_label.visualizar`
- `white_label.editar`
- `white_label.publicar`
- `dominio.visualizar`
- `dominio.editar`

Regra:

- leitura e edicao de configuracao comum nao implica acesso a segredos;
- publicar nao implica editar segredos;
- white label nao implica alterar runtime do sistema.

## 12. Testes obrigatorios

- leitura protegida por permissao;
- mutacao protegida por permissao;
- segregacao por unidade;
- segredos nunca retornam em claro;
- preview nao publica por acidente;
- branding resolve corretamente por host;
- admin e tutor mantem o backend como autoridade;
- auditoria registra diff e autoria;
- rollback retorna o snapshot anterior.

## 13. Criterios de pronto

A fase so deve ser considerada concluida quando existir:

- centro de configuracoes administrativo real;
- configuracao por unidade editavel com trilha;
- gestao de integracoes com segredos mascarados;
- white label completo para dominio, assets e tema;
- publicacao segura e auditavel;
- testes e checklist da fase.

## 14. Riscos principais

- misturar segredo com configuracao comum;
- liberar white label sem resolver dominio no servidor;
- criar editor amplo sem auditoria;
- duplicar configuracao em `env`, banco e UI sem hierarquia clara;
- vazar escopo cross-unit em configuracao global;
- deixar documentos, emails e portal fora do mesmo runtime de branding.

## 15. Ordem recomendada

Ordem recomendada de implementacao:

1. `B5-T01`
2. `B5-T02`
3. `B5-T03`
4. `B5-T04`
5. `B5-T06`
6. `B5-T07`
7. `B5-T05`
8. `B5-T08`
9. `B5-T09`

Motivo:

- primeiro consolidar base e governanca;
- depois abrir CRUD de configuracao;
- depois integracoes e branding;
- por fim publicacao, rollback e fechamento.

## 16. Resultado esperado

Ao final da Fase 5, o PetOS deve ter:

- um centro administrativo real de configuracoes;
- parametros operacionais e de negocio centralizados;
- integracoes administraveis com seguranca;
- white label completo e controlado;
- governanca de mudanca e publicacao;
- base pronta para expansao comercial multi-tenant sem fork do produto.
