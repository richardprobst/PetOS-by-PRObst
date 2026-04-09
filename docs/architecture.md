# Arquitetura do PetOS

## 1. Objetivo

Este documento descreve a arquitetura vigente do PetOS em nivel alto e medio.

Ele existe para:

- alinhar implementacao, operacao e manutencao ao `PetOS_PRD.md`;
- registrar a separacao entre UI, dominio, persistencia, autorizacao e integracoes;
- refletir o estado real do repositorio apos o fechamento do MVP, da Fase 2 e da baseline tecnica conservadora da Fase 3;
- reduzir divergencia entre codigo, schema, testes e documentacao.

Em caso de conflito:

1. `PetOS_PRD.md` vence em produto e escopo;
2. `AGENTS.md` vence em diretrizes de execucao assistida;
3. o codigo e o `prisma/schema.prisma` vencem em estado tecnico consolidado;
4. este documento deve ser atualizado para refletir a implementacao real.

## 2. Estado arquitetural atual

O repositorio esta organizado como uma aplicacao web fullstack em:

- Next.js com App Router;
- React;
- TypeScript com `strict: true`;
- Tailwind CSS;
- Route Handlers e server actions;
- Prisma ORM sobre MySQL;
- next-auth v4 para autenticacao;
- Zod para contratos e validacao.

No estado atual do repositorio:

- o MVP operacional esta fechado;
- a Fase 2 esta fechada no recorte aprovado pelo PRD;
- a Fase 3 esta fechada como baseline tecnica conservadora, sem provider real de IA, billing real, painel final de IA ou multiunidade irrestrita.
- a Fase 4 abriu, de forma controlada, o primeiro item de roadmap futuro: assistente virtual do tutor, ainda sem provider real de voz ou automacao autonoma.

Essa baseline inclui:

- fundacao de IA provider-neutral, auditavel e fail-closed;
- rollout multiunidade server-side controlado;
- analise de imagem assistiva com revisao humana;
- insight preditivo assistivo e auditavel;
- governanca consolidada e regressao reconhecivel da fase.
- assistente virtual do tutor em modo transcript-only e confirmacao explicita.

## 3. Principios arquiteturais

### 3.1. Regra critica no servidor

Validacao, autorizacao, transicoes de status, calculos financeiros, escopo por unidade e gating de IA pertencem ao servidor.

### 3.2. Prisma como camada unica de dados

O acesso ao banco deve passar por Prisma, com schema, migrations e relacoes centralizados em `prisma/schema.prisma`.

### 3.3. Evolucao por fases

O desenho deve permitir evolucao por fase sem antecipar escopo:

- MVP;
- Fase 2;
- Fase 3;
- Fase 4;
- roadmap futuro.

### 3.4. Separacao de responsabilidades

- UI apresenta, coleta input e organiza experiencia.
- Route Handlers e server actions expõem contratos e entram na aplicacao.
- Camada de aplicacao orquestra casos de uso.
- Camada de dominio concentra regras de negocio.
- Persistencia usa Prisma.
- Integracoes externas ficam isoladas em adaptadores.

### 3.5. Fail-closed em superficies sensiveis

Quando contexto, permissao, configuracao ou flag critica estiver ausente, o comportamento padrao deve ser bloquear, e nao assumir permissao ou habilitacao implicita.

## 4. Camadas do sistema

### 4.1. Apresentacao

Principais pontos:

- `app/` concentra paginas, layouts e rotas do App Router;
- `components/` guarda componentes visuais reutilizaveis;
- `app/admin/` concentra superficies internas;
- `app/tutor/` concentra a experiencia do tutor.

Regras:

- UI nao decide permissao real;
- UI nao implementa regra de negocio critica;
- validacao local apenas complementa a validacao server-side.

### 4.2. Entrada HTTP e contracts

Principais pontos:

- `app/api/` expõe Route Handlers por dominio;
- `server/authorization/api-access.ts` protege APIs internas e de tutor;
- `server/http/` centraliza erros, respostas e utilitarios.

Regras:

- entrada validada com Zod;
- respostas coerentes com status HTTP;
- sem stack trace bruto para o cliente;
- operacoes sensiveis devem considerar idempotencia, transacao e auditoria.

### 4.3. Aplicacao e dominio

Principais pontos:

- `features/` organiza logica por dominio;
- `server/` concentra orquestracao, auth, autorizacao, runtime e integracoes;
- cada modulo deve manter regras de negocio perto do proprio dominio.

Exemplos:

- agenda e status do atendimento;
- financeiro e conciliacao local;
- documentos, midia e assinatura;
- CRM e consentimento de comunicacao;
- IA assistiva;
- contexto multiunidade.

### 4.4. Persistencia

Principais pontos:

- `prisma/schema.prisma` representa o estado tecnico consolidado;
- migrations devem ser pequenas, claras e reversiveis quando possivel;
- dados criticos precisam de chaves, indices e integridade referencial adequados.

### 4.5. Integracoes e adaptadores

Principais pontos:

- pagamentos e fiscal ficam atras de adaptadores e eventos integrados;
- storage guarda binarios fora do banco;
- IA fica atras de contratos provider-neutral;
- bootstrap e updater ficam atras de runtime state e preflight controlado.

## 5. Dominios arquiteturais principais

### 5.1. Nucleo operacional

Inclui:

- clientes e pets;
- servicos;
- funcionarios;
- agenda;
- check-in;
- historico de status;
- report cards.

### 5.2. Fundacao de acesso e auditoria

Inclui:

- usuarios, perfis e permissoes;
- unidade e configuracao por unidade;
- logs de auditoria;
- guards de area e guards de API.

### 5.3. Fase 2 consolidada

Inclui:

- depositos, reembolsos, creditos e eventos de integracao;
- documentos, assinaturas e midia;
- waitlist, bloqueios e capacidade de agenda;
- Taxi Dog;
- CRM e preferencias de comunicacao;
- produtos, estoque e PDV;
- escalas, ponto e base de payroll;
- installer/updater integrado.

### 5.4. Fase 3 consolidada

Inclui:

- `features/ai/` como fundacao transversal de IA;
- `features/ai/vision/` para analise de imagem assistiva;
- `features/insights/` para snapshots preditivos;
- `features/multiunit/` para contexto multiunidade;
- `features/phase3/governance.ts` para governanca consolidada da fase.

### 5.5. Fase 4 conservadora

Inclui:

- `features/assistant/` para o dominio do assistente virtual do tutor;
- `app/api/tutor/virtual-assistant/route.ts` como fronteira HTTP protegida;
- painel minimo embutido em `app/tutor/page.tsx`;
- contrato transcript-only, sem upload de audio bruto para o servidor.

## 6. Autenticacao, autorizacao e escopo

### 6.1. Autenticacao

O projeto usa next-auth v4. Segredos ficam em ambiente e a sessao autenticada e o ponto de entrada para guards de UI e API.

### 6.2. RBAC server-side

Perfis e permissoes sao semeados no bootstrap e aplicados no servidor.

Principio:

- esconder botao nunca substitui autorizacao real;
- toda rota critica precisa validar identidade, perfil e permissao;
- ownership do tutor e escopo por unidade devem ser aplicados no servidor.

### 6.3. Multiunidade

O contexto multiunidade atual e resolvido no servidor com distincao entre:

- `LOCAL`;
- `GLOBAL_AUTHORIZED`.

Invariantes:

- ausencia de contexto nao libera acesso cross-unit;
- leitura global depende de papel autorizado;
- escrita estrutural cross-unit continua conservadora;
- superficies administrativas internas mostram contexto, mas nao substituem a regra server-side.

## 7. Fundacao de IA da Fase 3 e expansoes conservadoras posteriores

### 7.1. Camadas

O recorte de IA atual foi construido em camadas:

- `features/ai/domain.ts`: contratos centrais e tipos de resultado;
- `features/ai/gating.ts`: avaliacao de flags e fail-closed;
- `features/ai/policy.ts`: quotas e politica por modulo;
- `features/ai/execution.ts`: envelope de execucao;
- `features/ai/retention.ts` e `features/ai/consent.ts`: governanca transversal;
- `features/ai/events.ts` e `features/ai/audit.ts`: trilha minima de eventos e auditoria;
- `features/ai/admin-diagnostics.ts`: superficie minima de diagnostico;
- `features/ai/vision/`: analise de imagem;
- `features/insights/`: previsao e recomendacao assistiva.
- `features/assistant/`: assistente virtual do tutor em modo transcript-only.

### 7.2. Invariantes de IA

- IA desligada por padrao;
- flags invalidas ou ausentes bloqueiam;
- quota ausente ou invalida bloqueia;
- nenhum provider real e assumido por padrao;
- imagem continua assistiva e com revisao humana;
- insight preditivo continua recomendacao, nao automacao.
- assistente virtual continua confirmacao-primeiro, sem audio bruto persistido e sem criacao autonoma de atendimento.

## 8. Runtime, installer e updater

O repositorio tambem possui uma fundacao de runtime operacional para setup e update:

- `SystemRuntimeState` representa o ciclo de vida do sistema;
- `RecoveryIncident` registra incidentes de repair;
- `UpdateExecution` e `UpdateExecutionStep` registram updates controlados;
- `/api/setup/preflight` e `/api/admin/system/update-*` expõem diagnostico e operacao interna minima;
- `/admin/sistema` consolida leitura administrativa do runtime e da Fase 3.

Essa frente continua integrada ao mesmo principio de servidor como autoridade, com preflight, lock, trilha auditavel e comportamento conservador.

## 9. Estrutura do repositorio

Estrutura principal:

```text
app/
  admin/
  api/
  tutor/
components/
docs/
features/
lib/
prisma/
server/
tests/
```

Convencoes:

- `features/` por dominio ou capacidade;
- `server/` para auth, runtime, autorizacao e orquestracao;
- `tests/server/` para cobertura de regras e contratos;
- `docs/` para referencias de arquitetura, dominio, dados, fase e operacao.

## 10. Estrategia de extensao

Quando evoluir o sistema:

1. confirmar fase e escopo no PRD;
2. localizar o dominio certo em `features/` e `server/`;
3. preservar separacao entre regra de dominio e UI;
4. atualizar schema e migration quando houver impacto em dados;
5. revisar auditoria, permissao, ownership e contexto de unidade;
6. sincronizar testes e documentacao afetados.

## 11. O que a arquitetura atual nao pressupoe

Esta arquitetura nao deve ser interpretada como entrega de:

- provider real de IA;
- billing real de IA;
- fallback real entre vendors;
- automacao irrestrita;
- multiunidade completa em todos os fluxos;
- dashboards globais finais;
- UI final de troca de contexto.

Esses itens seguem dependendo de gate explicito de produto e implementacao.

## 12. Documentos complementares

Ler em conjunto com:

- `PetOS_PRD.md`
- `AGENTS.md`
- `docs/domain-rules.md`
- `docs/data-model.md`
- `docs/environment-contract.md`
- `docs/rbac-permission-matrix.md`
- `docs/internal-api-catalog.md`
- `docs/phase3-maintenance-guide.md`
- `docs/decisions/README.md`
