# PLANS.md — Plano Técnico-Operacional do MVP

## 1. Objetivo do plano

Este arquivo define a sequência técnica recomendada para implementar o **MVP do PetOS** com segurança, consistência e baixo retrabalho.

Ele **não substitui** o `PetOS_PRD.md` e **não cria um novo plano de produto**. O PRD continua sendo a fonte de verdade para escopo, regras e fases. Este documento existe para transformar o MVP em uma ordem de execução prática:

- o que construir primeiro;
- o que depende do quê;
- quais bases precisam existir antes dos fluxos principais;
- quais checkpoints indicam que cada etapa está pronta para a próxima.

### Base de partida considerada

Este plano foi escrito considerando o estado atual do repositório em `2026-03-31`:

- aplicação Next.js com App Router já inicializada;
- TypeScript `strict`, Tailwind CSS e Prisma já configurados;
- `prisma/schema.prisma` ainda sem modelos de domínio;
- `app/page.tsx` e `app/layout.tsx` ainda em estado mínimo;
- ausência atual de autenticação, RBAC, rotas de API, migrations e módulos de domínio implementados.

Em outras palavras: o repositório já tem a **base técnica mínima**, mas ainda não iniciou a **implementação real do sistema**.

---

## 2. Escopo atual

O foco deste plano é o **MVP**.

### Dentro do escopo imediato

- bootstrap técnico do projeto para desenvolvimento contínuo;
- estrutura visual inicial da aplicação;
- modelagem de dados e migrations do núcleo do MVP;
- autenticação com `next-auth v4` e base de RBAC no servidor;
- cadastro de clientes, pets, serviços e profissionais;
- agenda operacional básica;
- fluxo de status do atendimento com histórico;
- check-in com checklist;
- comunicação manual via WhatsApp/e-mail com templates e log;
- financeiro básico;
- controle de comissões;
- portal do tutor básico;
- report card simples;
- validação, auditoria e segurança base para áreas críticas.

### Regra de escopo

Este plano assume que:

- o produto continua em **fase MVP**;
- qualquer item de Fase 2, Fase 3 ou Roadmap Futuro só entra mediante decisão explícita do mantenedor;
- preparação arquitetural leve é aceitável;
- implementação antecipada de escopo futuro não é aceitável.

---

## 3. Princípios de execução

- **Foco absoluto no MVP**: implementar o necessário para o núcleo operar bem antes de expandir.
- **Servidor como autoridade**: regra crítica, autorização, cálculo financeiro, conflito de agenda e transição de status devem ser garantidos no servidor.
- **Zod como contrato oficial**: toda entrada relevante deve ser validada com Zod, inclusive payloads de API e integrações externas.
- **Prisma como camada única de dados**: schema, migrations e acesso transacional devem passar pelo Prisma.
- **Sem overengineering**: abstrações só entram quando reduzem acoplamento real ou evitam retrabalho provável.
- **Handlers finos, domínio explícito**: Route Handlers devem orquestrar; regras de negócio devem ficar em módulos de aplicação/domínio.
- **Status operacional separado de status financeiro**: a UI pode simplificar a leitura, mas o domínio não deve misturar conceitos distintos.
- **Configuração por unidade sem multiunidade completa**: regras configuráveis devem nascer em estrutura adequada, sem ativar escopo completo de Fase 3.
- **Auditoria desde o começo**: ações críticas precisam deixar trilha desde a primeira versão útil.
- **Arquitetura preparada para crescer, implementação restrita à fase atual**: estruturar bem agora para não reescrever depois, sem implementar recursos futuros.

---

## 4. Ordem recomendada de implementação

### Bloco 1 — Bootstrap técnico da aplicação

Objetivo: sair da base Next.js mínima e estabelecer a fundação operacional do repositório para que os próximos blocos sejam implementados com padrão único.

Arquivos/sistemas impactados:

- `app/`
- `components/`
- `features/`
- `lib/`
- `server/`
- `tests/`
- `package.json`
- `.env.example`

Pré-requisitos:

- PRD, arquitetura, regras de domínio e ADRs alinhados;
- definição de convenções de pastas e de limites entre UI, domínio, persistência e integração.

Entregáveis esperados:

- estrutura de pastas coerente com `app/`, `components/`, `features/`, `lib/`, `server/` e `tests/`;
- utilitário compartilhado para leitura/validação de ambiente;
- cliente Prisma singleton e camada inicial de acesso ao banco;
- helpers base de resposta/erro para Route Handlers;
- convenção para contratos Zod por domínio;
- runner de testes configurado para cobrir regras críticas desde cedo;
- scripts de qualidade e execução local confirmados.

Riscos principais:

- criar utilitários genéricos demais antes de haver casos reais;
- espalhar helpers sem fronteira clara entre `lib/` e `server/`;
- atrasar blocos de negócio tentando “perfeccionar” a base técnica.

Critérios de conclusão:

- repositório roda com estrutura definida e previsível;
- `lint`, `typecheck` e suíte básica de testes executam sem improvisos;
- ambiente e Prisma podem ser usados sem duplicação de setup;
- a fundação está pronta para receber domínios sem refactor estrutural imediato.

### Bloco 2 — Base visual e layout

Objetivo: criar a casca visual inicial da aplicação para áreas pública, autenticação, administrativo e portal do tutor, sem esconder regra de negócio na interface.

Arquivos/sistemas impactados:

- `app/layout.tsx`
- `app/globals.css`
- `app/(public)/`
- `app/(auth)/`
- `app/admin/`
- `app/tutor/`
- `components/`

Pré-requisitos:

- conclusão do Bloco 1;
- definição mínima da navegação principal e dos contextos de uso.

Entregáveis esperados:

- layout global consistente e responsivo;
- shells distintos para área administrativa e portal do tutor;
- componentes base de formulário, tabela, feedback, estado vazio e cabeçalho;
- convenção visual inicial para status, alertas e erros;
- estrutura de navegação pronta para receber telas reais.

Riscos principais:

- gastar tempo demais em refinamento visual antes dos fluxos centrais existirem;
- acoplar componentes a domínios ainda não implementados;
- introduzir padrões de UI que dificultem autorização por contexto depois.

Critérios de conclusão:

- a aplicação tem layout navegável e coerente;
- componentes base existem e podem ser reutilizados;
- as áreas principais estão prontas para receber fluxos autenticados e operacionais;
- nenhuma regra crítica depende apenas da interface.

### Bloco 3 — Base de dados e Prisma

Objetivo: implementar o modelo relacional inicial do MVP e a primeira sequência de migrations compatível com o núcleo operacional do produto.

Arquivos/sistemas impactados:

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.*`
- `server/`
- `docs/data-model.md` e ADRs, apenas se a implementação consolidada divergir do desenho atual

Pré-requisitos:

- conclusão do Bloco 1;
- definição clara das entidades mínimas do MVP e da separação entre status operacional e financeiro.

Entregáveis esperados:

- modelos Prisma para identidade e acesso, clientes, pets, serviços, profissionais, agendamentos, itens do agendamento, status, histórico de status, templates de mensagem, logs de mensagens, transações financeiras, report cards, logs de auditoria, unidades e configurações por unidade;
- índices e chaves estrangeiras para agenda, histórico, financeiro e autorização;
- lookups e seeds iniciais para status, perfis e permissões básicas;
- primeira migration versionada e aplicável em ambiente local;
- decisão explícita sobre o que fica fora da primeira leva de schema por ainda pertencer a fases futuras.

Riscos principais:

- tentar modelar todo o roadmap logo na primeira migration;
- misturar valores estimados e realizados no mesmo campo sem clareza;
- deixar a estrutura de status ou comissão ambígua e pagar esse custo depois.

Critérios de conclusão:

- banco local sobe com migrations reproduzíveis;
- schema cobre os fluxos centrais do MVP sem depender de campos genéricos demais;
- status operacional e financeiro estão representados de forma clara;
- seeds mínimas permitem iniciar autenticação e primeiros fluxos operacionais.

### Bloco 4 — Autenticação e estrutura de acesso

Objetivo: ativar autenticação oficial do projeto e a base de autorização server-side para áreas administrativas e portal do tutor.

Arquivos/sistemas impactados:

- `app/api/auth/`
- `app/(auth)/`
- `server/auth/`
- `server/authorization/`
- `features/auth/`
- tabelas e seeds de acesso no Prisma

Pré-requisitos:

- conclusão do Bloco 3;
- perfis, permissões e usuários iniciais disponíveis no banco.

Entregáveis esperados:

- configuração de `next-auth v4` aderente ao App Router;
- sessão enxuta com identidade, papel básico e contexto necessário;
- helpers server-side para checagem de autenticação e permissão;
- separação entre acesso administrativo e acesso do tutor;
- fluxo inicial de login e proteção de rotas/handlers;
- usuário administrador inicial e perfis mínimos de operação definidos.

Riscos principais:

- definir sessão inchada e frágil;
- resolver autorização apenas por renderização condicional na UI;
- misturar regra de perfil com regra de domínio específico.

Critérios de conclusão:

- usuário autenticado acessa apenas áreas permitidas;
- operações sem permissão são bloqueadas no servidor;
- base de RBAC está pronta para ser aplicada aos módulos do MVP;
- autenticação não depende de solução caseira paralela.

### Bloco 5 — Primeiros domínios do MVP

Objetivo: implementar o núcleo operacional que sustenta o restante do sistema.

Arquivos/sistemas impactados:

- `features/servicos/`
- `features/clientes/`
- `features/pets/`
- `features/agenda/`
- `features/status/`
- `features/check-in/`
- `server/`
- `app/api/`

Pré-requisitos:

- conclusão dos Blocos 3 e 4;
- contratos Zod e helpers de autenticação/erro já disponíveis.

Entregáveis esperados:

- casos de uso e contratos para cadastro e manutenção de clientes e pets;
- catálogo de serviços com preço base e duração estimada;
- cadastro operacional de profissionais necessário para agenda e comissão;
- criação, edição, cancelamento e reagendamento básico de agendamentos;
- bloqueio server-side de agendamento no passado e overbooking do mesmo profissional;
- fluxo de status com transições válidas, histórico e rastreabilidade;
- check-in com checklist e registro de quem executou a ação;
- estrutura inicial para cálculo de comissão baseada em valor faturado.

Riscos principais:

- deixar conflito de agenda só na interface;
- tratar `Faturado` como etapa operacional sem separar o eixo financeiro;
- modelar checklist de check-in de forma rígida demais ou vaga demais.

Critérios de conclusão:

- é possível operar o ciclo básico de atendimento do MVP internamente;
- status mudam com histórico consistente;
- conflito de agenda é barrado no servidor;
- cadastro de cliente, pet, serviço e profissional sustenta o agendamento sem hacks.

### Bloco 6 — Rotas e fluxos iniciais

Objetivo: expor os casos de uso do MVP em fluxos utilizáveis pela equipe e pelo tutor.

Arquivos/sistemas impactados:

- `app/api/`
- `app/admin/`
- `app/tutor/`
- `features/financeiro/`
- `features/comunicacao/`
- `features/comissoes/`
- `features/report-cards/`

Pré-requisitos:

- conclusão do Bloco 5;
- base visual do Bloco 2 pronta para receber telas reais.

Entregáveis esperados:

- telas e APIs administrativas para clientes, pets, serviços e agenda;
- fluxo operacional de atualização de status e check-in;
- templates de mensagem com edição manual e log de envio;
- registro de receitas, despesas e contas a pagar/receber em nível básico;
- cálculo e consulta básica de comissões;
- portal do tutor com conta/perfil, visualização de pets, histórico de serviços e agendamento online básico;
- criação e consulta de report card simples ao final do atendimento.

Riscos principais:

- tentar entregar todas as telas ao mesmo tempo e perder o foco no fluxo principal;
- misturar comunicação manual do MVP com automação de CRM de Fase 2;
- avançar em portal do tutor antes da operação interna estar estável.

Critérios de conclusão:

- equipe interna consegue operar os fluxos centrais do MVP pela interface;
- tutor consegue acessar o recorte básico previsto no PRD;
- comunicação, financeiro básico, comissão e report card já têm caminho funcional;
- cada fluxo usa APIs/ações com validação e autorização reais.

### Bloco 7 — Validação, segurança e auditoria base

Objetivo: endurecer os fluxos já implementados para que o MVP seja confiável antes de ampliar o escopo.

Arquivos/sistemas impactados:

- `server/`
- `app/api/`
- `features/*/schemas.ts`
- `features/*/services.ts`
- estrutura de auditoria e logs

Pré-requisitos:

- existência dos fluxos centrais dos Blocos 4, 5 e 6.

Entregáveis esperados:

- validação Zod consistente em todas as entradas críticas;
- respostas de erro padronizadas sem vazamento de stack trace;
- auditoria para login sensível, mudanças de status, alterações financeiras, edições críticas e ações administrativas;
- uso explícito de transação onde houver múltiplos efeitos relacionados;
- rate limiting nas rotas sensíveis que já existirem;
- política clara para dados sensíveis em logs;
- esqueleto seguro para webhooks apenas se uma integração financeira do MVP for explicitamente ativada.

Riscos principais:

- tentar “colar” segurança depois que os fluxos já estiverem espalhados;
- gerar logs demais sem utilidade operacional;
- antecipar complexidade de webhook/gateway sem decisão de escopo.

Critérios de conclusão:

- fluxos críticos do MVP estão validados, autorizados e auditáveis;
- operações sensíveis não dependem de comportamento implícito;
- erros e logs seguem padrão único;
- a base está apta a evoluir sem reabrir lacunas de segurança já conhecidas.

### Bloco 8 — Refinamento e preparação para a próxima etapa

Objetivo: estabilizar o que foi implementado, fechar lacunas técnicas e preparar a continuação do MVP sem entrar em Fase 2.

Arquivos/sistemas impactados:

- `tests/`
- `README.md`, `docs/architecture.md`, `docs/data-model.md` e ADRs, somente se a implementação consolidada exigir atualização
- módulos já implementados

Pré-requisitos:

- conclusão funcional dos Blocos 1 a 7.

Entregáveis esperados:

- testes unitários e de integração para agenda, status, autorização, financeiro básico e comissão;
- revisão de seeds e massa de dados de desenvolvimento;
- revisão de performance e clareza das queries mais sensíveis;
- atualização pontual da documentação impactada pelo código real;
- lista objetiva do que ainda falta para concluir o MVP sem alterar fase.

Riscos principais:

- continuar abrindo novas frentes sem estabilizar o que já existe;
- deixar divergência entre schema, código e documentação;
- tratar refinamento como “opcional” e acumular dívida cedo demais.

Critérios de conclusão:

- o núcleo implementado do MVP está testado e explicável;
- documentação crítica reflete o estado real do repositório;
- a próxima sprint pode começar sem redefinir arquitetura base;
- o time tem clareza do restante do MVP antes de pensar em Fase 2.

---

## 5. Dependências entre blocos

- **Bloco 1** é a base de todos os demais. Sem ele, o restante tende a crescer sem padrão.
- **Bloco 2** depende do Bloco 1 e prepara a casca da aplicação, mas não deve bloquear sozinho a modelagem de dados.
- **Bloco 3** depende do Bloco 1 e é o principal gate técnico para autenticação, domínio e APIs.
- **Bloco 4** depende diretamente do Bloco 3, porque usuários, perfis e permissões precisam existir no schema.
- **Bloco 5** depende dos Blocos 3 e 4, porque os primeiros domínios do MVP exigem banco consistente e autorização server-side.
- **Bloco 6** depende do Bloco 5 para expor fluxos reais e do Bloco 2 para encaixar esses fluxos na interface.
- **Bloco 7** começa conceitualmente desde o primeiro bloco, mas só fecha de forma útil depois que os fluxos dos Blocos 4, 5 e 6 existem.
- **Bloco 8** depende da conclusão funcional dos blocos anteriores; ele consolida o MVP já construído, não substitui fundamentos que ficaram faltando.

### Dependência prática mais importante

Depois do bootstrap, a prioridade real é:

1. dados e schema;
2. autenticação e autorização;
3. domínio operacional;
4. fluxos de interface e API;
5. endurecimento de segurança e auditoria;
6. refinamento e testes.

---

## 6. Riscos e ambiguidades atuais

- **Estratégia exata de login ainda não está especificada no PRD**: `next-auth v4` é obrigatório, mas o método inicial de autenticação precisa ser fixado antes da implementação do Bloco 4.
- **Pagamentos têm fronteira de escopo sensível**: `docs/payments.md` pede base segura para integrações, mas `depósito/pré-pagamento`, `no-show protection` e fiscal completo continuam fora do MVP. A implementação inicial deve ficar no financeiro básico, salvo decisão explícita em contrário.
- **Checklist de check-in precisa de modelagem mínima intencional**: o PRD pede checklist personalizável, mas a estrutura persistida ainda não está consolidada nos documentos.
- **Status operacional vs financeiro exige disciplina de UI e schema**: o PRD expõe `Faturado` no fluxo principal, mas a implementação deve manter separação conceitual sem confundir operação e financeiro.
- **Configuração por unidade deve existir sem simular multiunidade completa**: a modelagem precisa prever `Unidades` e `ConfiguracoesUnidade`, mas a operação multiunidade completa continua fora do escopo.
- **Report card simples depende de definir o nível de mídia no MVP**: se houver fotos/arquivos já no MVP, será necessário decidir a estratégia mínima de storage externo; se o report card inicial for textual, isso pode ser adiado.
- **A base atual ainda não tem suíte de testes consolidada**: a escolha e configuração do runner de testes precisa acontecer cedo para não empurrar regra crítica sem cobertura.

---

## 7. Itens fora do escopo imediato

Não devem entrar agora, sem autorização explícita:

- capacidade por profissional, porte ou raça;
- depósito, pré-pagamento e no-show protection completos;
- bloqueios avançados de agenda e waitlist;
- roteirização de Táxi Dog;
- motor de documentos, formulários e assinaturas digitais;
- review booster, campanhas segmentadas, recuperação de inativos e gatilhos pós-serviço;
- NFS-e, NFC-e e fiscal completo;
- PDV completo e estoque completo;
- portal do tutor aprimorado com jornada completa;
- time clock, payroll e escalas;
- análise de imagem;
- análise preditiva;
- multiunidade operacional completa;
- wearables, gamificação, mercado de personalizados e assistente por voz.

### Observação importante

Também ficam fora do escopo imediato, salvo decisão explícita:

- integração financeira completa em produção com Mercado Pago ou Stripe;
- webhooks financeiros reais e reconciliação operacional completa;
- qualquer infraestrutura de eventos mais sofisticada do que o necessário para o MVP básico.

---

## 8. Próximo passo recomendado

O primeiro passo concreto após a criação deste arquivo deve ser a execução do **Bloco 1 — Bootstrap técnico da aplicação**.

### Ação recomendada para começar imediatamente

Implementar, em sequência curta:

1. estrutura de pastas definitiva (`features/`, `server/`, `lib/`, `tests/`);
2. validação central de ambiente;
3. cliente Prisma singleton e helpers base de servidor;
4. padrão de erro/resposta para handlers;
5. configuração inicial da suíte de testes.

### Por que este é o primeiro bloco

Porque o repositório ainda está no ponto em que:

- não há domínio implementado;
- não há schema útil;
- não há autenticação;
- não há APIs reais;
- qualquer feature construída antes dessa base tende a gerar retrabalho.

Fechar o Bloco 1 primeiro reduz o custo de todos os demais blocos e cria uma trilha de implementação previsível para o time e para o Codex.
