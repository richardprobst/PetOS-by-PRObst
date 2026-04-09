# Phase 3 - Block 1 - B1-T09 - Multiunit Impact Map

Data de referencia: `2026-04-07`

## 1. Objetivo

Este documento fecha o `B1-T09` do Bloco 1 da Fase 3 como mapa tecnico explicito do impacto multiunidade em filtros, consultas, listagens, agregacoes e dashboards.

O objetivo aqui nao e adaptar todos os modulos agora. O objetivo e deixar claro:

- onde o escopo por unidade ja esta seguro;
- onde o codigo ainda assume single-unit;
- onde sera necessaria leitura global autorizada;
- onde agregacoes e dashboards terao de ser remodelados;
- o que deve permanecer bloqueado ate o Bloco 2.

## 2. Escopo da leitura

O mapa foi construido a partir da leitura direta dos pontos server-side e das superficies administrativas mais proximas da fundacao multiunidade:

- `server/authorization/`
- `features/multiunit/`
- `features/clients/`
- `features/pets/`
- `features/appointments/`
- `features/finance/`
- `features/fiscal/`
- `features/inventory/`
- `features/pos/`
- `features/messages/`
- `features/crm/`
- `features/employees/`
- `features/team-operations/`
- `features/waitlist/`
- `features/taxi-dog/`
- `features/tutor/`
- `app/admin/`
- `app/tutor/`
- `app/api/admin/`

## 3. Legenda de classificacao

- `JA_COMPATIVEL_LOCAL`: a superficie ja respeita o escopo local esperado no Bloco 1 e reaproveita o funil central de contexto/ownership.
- `EXIGE_FILTRO_LOCAL_EXPLICITO`: a superficie continua segura para operacao local, mas ainda depende de `actor.unitId` ou de filtro local ad hoc e precisara ser migrada para o contexto multiunidade central.
- `EXIGE_LEITURA_GLOBAL_AUTORIZADA`: a superficie precisara de um caminho explicito para leitura `GLOBAL_AUTHORIZED`, sem reaproveitar automaticamente o comportamento local.
- `EXIGE_REMODELAGEM_DE_AGREGACAO`: a superficie usa cards, resumos, joins ou totais que hoje pressupoe uma unica unidade e tera de ser remodelada antes de consolidacao multiunidade.
- `BLOQUEADO_ATE_BLOCO_2`: a superficie nao deve receber adaptacao parcial agora porque isso abriria risco de vazamento, consentimento ambiguo ou UX administrativa incompleta.

## 4. Fundacao ja entregue e preservada

Antes deste mapa, a fundacao multiunidade do Bloco 1 ja deixou os seguintes pontos prontos:

- contexto de unidade resolvido server-side;
- distincao entre `LOCAL` e `GLOBAL_AUTHORIZED`;
- falha fechada quando o contexto nao existe ou nao permite cross-unit;
- wrappers centrais de escopo em `server/authorization/scope.ts`;
- snapshot multiunidade na sessao;
- ownership e visibilidade real ja conectados para cliente e pet;
- bloqueio de edicao estrutural cross-unit por padrao, salvo permissao global explicita.

Esse mapa parte dessa base e identifica onde ela ainda nao foi propagada.

## 5. Inventario real das superficies afetadas

| Superficie | Modulos e arquivos principais | Tipo de consulta, listagem ou agregacao | Estado atual | Risco cross-unit | Classificacao | Impacto esperado |
| --- | --- | --- | --- | --- | --- | --- |
| Clientes administrativos e APIs de cliente | `features/clients/services.ts`, `features/clients/ownership.ts`, `app/api/admin/clients/route.ts` | Listagem, leitura detalhada e escrita estrutural | Ja usa ownership por unidade e funil central de escopo | Baixo no recorte atual | `JA_COMPATIVEL_LOCAL` | Servira como referencia para adaptar outras superficies sem duplicar regra |
| Pets administrativos e APIs de pet | `features/pets/services.ts` | Listagem, leitura detalhada e escrita estrutural | Ja usa ownership por unidade e decisao central de escopo | Baixo no recorte atual | `JA_COMPATIVEL_LOCAL` | Mantem o modelo mestre com vinculo por unidade sem abrir multiunidade completa |
| Agendamentos core | `features/appointments/services.ts`, `app/api/admin/appointments/route.ts` | Listas, detalhe, criacao, atualizacao, historico | Continua assumindo `actor.unitId` em filtros e validacoes de dependencia | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Precisa consumir contexto de unidade resolvido, e nao apenas a unidade nativa do ator |
| Agenda administrativa e agenda avancada | `features/appointments/advanced-services.ts`, `app/admin/agenda/page.tsx` | Capacity, bloqueios, espera operacional, paineis administrativos de agenda | Fluxos continuam locais e seguros, mas ainda sem leitura multiunit central | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Deve ganhar caminho local explicito primeiro; visao global fica separada |
| Waitlist e Taxi Dog | `features/waitlist/services.ts`, `features/taxi-dog/services.ts` | Listagem e operacao por unidade | Assumem operacao local e filtros amarrados a unidade do ator | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Adaptacao futura deve preservar bloqueio cross-unit em operacao, mesmo com visao global limitada |
| Financeiro operacional | `features/finance/services.ts`, `features/fiscal/services.ts`, `app/api/admin/financial-transactions/route.ts` | Ledger, creditos, depositos, reembolsos, fiscal minimo | Seguro como fluxo local, mas filtrado diretamente por `actor.unitId` | Alto | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Exige centralizacao do recorte local antes de qualquer consolidacao entre unidades |
| Dashboards e cards financeiros | `features/finance/services.ts`, `app/admin/financeiro/page.tsx` | Totais, saldos, cards e visoes resumidas | Totais assumem uma unica unidade e nao distinguem visao local de consolidada | Alto | `EXIGE_REMODELAGEM_DE_AGREGACAO` | Antes do Bloco 2, qualquer visao global precisa ser modelada como agregacao autorizada, nao como soma cega |
| Estoque operacional | `features/inventory/services.ts`, `app/admin/estoque/page.tsx` | Catalogo, saldo, movimentacoes e alertas locais | Fluxo local seguro, sem contexto multiunit central | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Adaptacao futura deve separar saldo local de qualquer consolidado multiunidade |
| PDV operacional | `features/pos/services.ts`, `app/admin/pdv/page.tsx`, `app/api/admin/pos-sales/route.ts` | Listagem de vendas, detalhes, fechamento de venda | Continua local e coerente para unidade unica | Alto | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Leituras locais sao trataveis; operacao global e reabertura cross-unit devem esperar o Bloco 2 |
| Comunicacao manual, templates e logs | `features/messages/services.ts`, `app/admin/comunicacao/page.tsx` | Templates, logs e disparos administrativos | Fluxos ainda dependem de unidade do ator, sem sessao multiunit central | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Deve ganhar recorte local explicito antes de qualquer leitura global autorizada |
| CRM e campanhas | `features/crm/services.ts`, `app/admin/comunicacao/page.tsx` | Campanhas, audiencias, execucoes e resumos operacionais | Audiencias e execucoes continuam fortemente locais e sensiveis a consentimento por unidade | Alto | `BLOQUEADO_ATE_BLOCO_2` | Cross-unit aqui exige regra final de consentimento, audiencia e agregacao antes de qualquer liberacao |
| Equipe base | `features/employees/services.ts`, `app/admin/equipe/page.tsx` | Cadastro, listagem e manutencao local de equipe | Continua filtrado pela unidade do ator | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | Precisa aderir ao contexto resolvido sem abrir gestao global completa de equipe |
| Escalas, ponto, folha e operacao de equipe | `features/team-operations/services.ts` | Listas, fechamento de ponto, folha e escalas | Ja usa helpers centrais em parte dos fluxos, mas listagens e agregados seguem locais | Medio | `EXIGE_REMODELAGEM_DE_AGREGACAO` | A base de autorizacao existe, mas os resumos e totais ainda precisam de separacao local versus global |
| Comissoes e resumos derivados | `features/commissions/services.ts` | Totais por profissional, servico e periodo | Usa dados locais e agregacoes implicitas por unidade | Alto | `EXIGE_REMODELAGEM_DE_AGREGACAO` | Visao global de comissoes deve ser tratada como consolidado explicito, nao como extensao do fluxo local |
| Portal do tutor | `features/tutor/services.ts`, `app/tutor/page.tsx` | Historico, agenda, financeiro proprio, documentos e acompanhamentos | Seguro no modelo atual de tutor vinculado a unidade, mas nao pronto para compartilhamento real entre unidades | Alto | `BLOQUEADO_ATE_BLOCO_2` | Multiunidade do tutor depende de regra final de ownership compartilhado e experiencia cross-unit |
| Dashboard administrativo geral | `app/admin/page.tsx` | Cards, listas resumidas e consolidacoes de operacao | Assume leitura local e agrega resultados locais sem semantica multiunit | Alto | `EXIGE_REMODELAGEM_DE_AGREGACAO` | Sera uma das primeiras superficies que precisara de separacao clara entre local e global autorizado |
| Rotas `app/api/admin/*` mais usadas | `app/api/admin/appointments/route.ts`, `app/api/admin/financial-transactions/route.ts`, `app/api/admin/pos-sales/route.ts` e pares similares | Camada HTTP sobre listagens e mutacoes administrativas | Sao wrappers finos sobre servicos e nao resolvem contexto multiunit por conta propria | Medio | `EXIGE_FILTRO_LOCAL_EXPLICITO` | A adaptacao precisa continuar concentrada no service layer, sem duplicar regra nas rotas |

## 6. Leitura transversal do impacto em filtros e consultas

### 6.1. Onde o escopo local ja esta seguro

- cliente e pet ja usam ownership por unidade conectado ao funil central;
- o servidor ja consegue distinguir contexto `LOCAL` de `GLOBAL_AUTHORIZED`;
- o fail-closed de escopo ja existe e deve continuar sendo a regra padrao.

### 6.2. Onde o sistema ainda assume single-unit

O padrao dominante fora de cliente/pet ainda e:

- uso direto de `actor.unitId` em filtros, joins e validacoes de acesso;
- listagens que inferem unidade pelo ator, e nao pelo contexto multiunit resolvido;
- cards e totais que somam resultados locais sem diferenciar leitura local de visao consolidada.

Esse padrao nao gera, por si so, vazamento imediato. O problema e que ele impede evolucao controlada para multiunidade porque mistura "unidade do ator" com "unidade ativa da sessao".

### 6.3. Onde a leitura global autorizada precisara nascer

O mapa mostra que leitura `GLOBAL_AUTHORIZED` ainda nao pode ser liberada por omissao em quase nenhum modulo operacional. Ela precisara ser aberta de forma explicita, principalmente em:

- listas administrativas de agenda;
- consultas financeiras e fiscais consolidadas;
- estoque e PDV em visao administrativa global;
- equipe, escalas, folha e comissoes;
- cards e dashboards administrativos.

### 6.4. Onde a agregacao precisa ser remodelada

As maiores fragilidades para multiunidade nao estao nas tabelas locais, e sim nas agregacoes:

- cards de overview em `/admin`;
- resumos financeiros em `/admin/financeiro`;
- resumos de estoque e alertas;
- totais de folha e comissoes;
- campanhas e execucoes de CRM.

Nesses pontos, a mudanca nao pode ser "adicionar filtro por unidade". E preciso separar:

- agregacao local;
- agregacao global autorizada;
- superficies ainda nao suportadas.

## 7. Mapa de impacto em dashboards e agregacoes

| Dashboard ou agregacao | Estado atual | Direcao correta |
| --- | --- | --- |
| `/admin` overview | Consolida dados locais sem semantica global | Manter local no curto prazo; remodelar para global autorizado apenas no Bloco 2 |
| `/admin/agenda` resumos operacionais | Local por unidade | Pode continuar local depois de aderir ao contexto central |
| `/admin/financeiro` cards e totais | Totais locais implicitos | Exige remodelagem de agregacao e nomenclatura explicita local versus consolidado |
| `/admin/estoque` alertas e saldo | Leitura local | Consolidado multiunit deve esperar desenho proprio |
| `/admin/pdv` listagens e totais | Local por unidade | Consolidados e comparativos entre unidades devem esperar o Bloco 2 |
| `/admin/comunicacao` CRM e execucoes | Audiencia e consentimento locais | Deve permanecer bloqueado para visao cross-unit ate regra final do dominio |
| `/admin/equipe` resumos de folha e ponto | Totais locais | Precisa remodelagem antes de visao global autorizada |
| Portal do tutor | Historico vinculado a unidade atual | Deve permanecer bloqueado ate a regra final de compartilhamento e ownership tutor-cliente-pet |

## 8. Mapa de impacto em autorizacao

### 8.1. Onde a autorizacao atual ja sustenta a fundacao

- `server/authorization/scope.ts` ja entrega a linguagem certa para contexto local, global autorizado e bloqueio cross-unit;
- cliente e pet ja provam que ownership e visibilidade podem ser tratados no servidor sem depender da UI;
- mutacoes estruturais cross-unit continuam corretamente bloqueadas por padrao.

### 8.2. Onde a autorizacao precisara ser expandida

- listagens operacionais ainda precisam parar de consultar so `actor.unitId`;
- as superficies administrativas terao de decidir explicitamente se suportam `GLOBAL_AUTHORIZED`;
- agregacoes e dashboards precisarao distinguir permissao de leitura consolidada de permissao de operacao local;
- CRM e portal do tutor exigem regra final de dominio antes de liberar qualquer leitura cross-unit.

### 8.3. O que deve continuar bloqueado

Mesmo com a fundacao atual, devem continuar bloqueados ate o Bloco 2:

- edicao estrutural cross-unit fora de papel global autorizado;
- CRM cross-unit com audiencia, consentimento e execucao compartilhados;
- portal do tutor com experiencia real cross-unit;
- dashboards globais finais;
- qualquer "listar tudo" administrativo que ignore a semantica do contexto multiunit.

## 9. Backlog derivado do mapa

### Prioridade 1 - Consolidar leitura local segura nos servicos operacionais

- migrar consultas que ainda dependem de `actor.unitId` puro para o contexto multiunit resolvido;
- prioridade inicial: `appointments`, `finance`, `inventory`, `messages`, `employees` e `team-operations`.

### Prioridade 2 - Abrir leitura global autorizada de forma seletiva

- definir quais listagens administrativas do backend vao aceitar `GLOBAL_AUTHORIZED`;
- aplicar essa abertura apenas em pontos com semantica clara de leitura e sem escrita estrutural cross-unit.

### Prioridade 3 - Remodelar agregacoes e dashboards de maior risco

- `/admin`
- `/admin/financeiro`
- folha, comissoes e resumos de equipe
- alertas e consolidacoes de estoque

### Prioridade 4 - Manter bloqueios explicitos ate o Bloco 2

- CRM cross-unit
- portal do tutor cross-unit
- PDV global pleno
- dashboards globais finais

## 10. Decisao operacional do B1-T09

O `B1-T09` fica encerrado como item majoritariamente documental e de leitura tecnica. Nao houve reimplementacao ampla de consultas nem abertura de Bloco 2.

O mapa deixa explicito que:

- a fundacao multiunidade do Bloco 1 esta funcional;
- cliente e pet ja sao a primeira prova real do modelo mestre com vinculo por unidade;
- o maior volume de trabalho restante esta em propagacao controlada de contexto e em remodelagem de agregacoes;
- a maior parte dos riscos de vazamento esta hoje ligada a agregacao e a futuras leituras globais, nao a vazamento ja aberto por default nas listagens locais.

Esse estado e suficiente para orientar os proximos itens do bloco sem espalhar ajustes cegos pelo codigo.
