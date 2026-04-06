# PHASE2_PLAN.md

## 1. Objetivo da Fase 2

A Fase 2 do PetOS existe para expandir o MVP validado em direcao a operacao comercial e financeira mais completa, sem reabrir o escopo do MVP e sem antecipar Fase 3.

O foco desta fase e adicionar os recursos previstos no PRD para:

- pagamentos e financeiro ampliado;
- documentos, formularios, assinaturas e midia;
- agenda avancada com capacidade, bloqueios e waitlist;
- portal do tutor ampliado;
- comunicacao e CRM mais fortes;
- PDV, estoque e operacao comercial;
- gestao de equipe com escalas, ponto e payroll.

A Fase 2 deve partir da baseline do MVP validado, preservando:

- autoridade do servidor;
- separacao entre status operacional e financeiro;
- RBAC no servidor;
- auditoria em eventos sensiveis;
- Prisma como camada unica de acesso a dados;
- validacao por contratos Zod;
- rotas e server actions finas, com regra critica em servicos de dominio.

---

## 2. Escopo da Fase 2

Entram explicitamente na Fase 2, conforme o PRD:

- capacidade por profissional, porte e raca;
- deposito e pre-pagamento;
- bloqueios de agenda;
- waitlist;
- otimizacao operacional de rotas para Taxi Dog;
- motor de documentos e formularios;
- documentos de vacinas e anexos operacionais;
- assinatura digital de termos e autorizacoes;
- review booster;
- campanhas segmentadas;
- recuperacao de clientes inativos;
- ofertas por perfil;
- gatilhos pos-servico;
- integracao para emissao de NFS-e e NFC-e;
- no-show protection e cobranca preventiva;
- PDV completo;
- gerenciamento abrangente de estoque;
- portal do tutor aprimorado;
- time clock, payroll e escalas.

---

## 3. Itens fora da Fase 2

### 3.1. Continua em Fase 3

- analise de imagem;
- analise preditiva;
- multiunidade operacional completa.

### 3.2. Continua em roadmap futuro

- wearables;
- gamificacao;
- mercado de produtos personalizados;
- assistente por voz.

### 3.3. Continua fora do escopo desta abertura

- reabrir ou remodelar o MVP ja validado;
- trocar stack consolidada;
- refatoracao arquitetural ampla sem necessidade real;
- gateways ou automacoes alem do necessario para os itens da propria Fase 2;
- qualquer expansao que empurre Fase 3 para dentro da Fase 2.

---

## 4. Principios de execucao

- Preservar o que ja foi validado no MVP. Fase 2 cresce sobre a baseline existente, nao contra ela.
- Manter server-side authority. Nenhuma regra critica nova deve depender so de UI.
- Preservar seguranca, auditoria e rastreabilidade nas novas areas sensiveis.
- Crescer com migrations pequenas, reversiveis quando possivel e semanticamente claras.
- Separar claramente produto novo de bugfix residual do MVP. Correcao residual so entra se bloquear diretamente um bloco da Fase 2.
- Evitar overengineering. Resolver o que o PRD pede para Fase 2 sem preparar Fase 3 no codigo.
- Continuar distinguindo status operacional de status financeiro em agenda, pagamentos, no-show, PDV e fiscal.
- Tratar webhooks e eventos externos como fluxos criticos: validacao, idempotencia, rastreabilidade e auditoria.
- Armazenar binarios de documentos e midias fora do banco, mantendo no banco apenas referencias e metadados.
- Preservar a organizacao por dominio do repositorio, expandindo `features/`, `app/api/`, `server/` e `prisma/` sem misturar regra critica em componentes visuais.

---

## 5. Ordem recomendada de implementacao

### Bloco 1 - Fundacao transacional da Fase 2
### Bloco 2 - Pagamentos, financeiro expandido e fiscal
### Bloco 3 - Documentos, formularios, assinaturas e midia
### Bloco 4 - Agenda avancada, capacidade, bloqueios, waitlist e Taxi Dog
### Bloco 5 - Portal do Tutor ampliado
### Bloco 6 - CRM e comunicacao ampliada
### Bloco 7 - PDV completo e estoque
### Bloco 8 - Gestao da equipe: escalas, ponto e payroll
### Bloco 9 - Fechamento e estabilizacao da Fase 2

Essa ordem e recomendada porque reduz retrabalho entre schema, pagamentos, documentos, agenda e experiencia do tutor. Ela so deve mudar se houver dependencia externa concreta, como escolha de provider, requisito fiscal ou restricao operacional.

---

## 6. Detalhamento dos blocos

### Bloco 1 - Fundacao transacional da Fase 2

**Objetivo**

Abrir a Fase 2 pela camada que todos os outros blocos compartilham: dados, contratos, configuracoes, tabelas auxiliares de integracao, storage metadata, novas configuracoes por unidade e reforcos de auditoria.

**Modulos, arquivos e sistemas impactados**

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `server/env.ts`
- `server/audit/`
- `server/security/`
- `server/authorization/`
- `server/http/`
- `features/finance/`
- `features/appointments/`
- `features/tutor/`
- `features/messages/`
- novos dominios previstos para Fase 2, como `features/documents/`, `features/waitlist/`, `features/fiscal/`, `features/integrations/`, `features/inventory/`, `features/pos/` e `features/team-operations/`

**Dependencias**

- baseline do MVP validado preservada;
- smoke local e rollout tecnico do MVP tratados como historico da fase anterior;
- confirmacao do recorte funcional de Fase 2 no PRD.

**Riscos**

- migration grande demais e dificil de revisar;
- criar tabelas demais sem uso imediato no bloco seguinte;
- acoplar schema a um provider especifico cedo demais;
- misturar infraestrutura de Fase 2 com preparacao para Fase 3.

**Criterios de conclusao**

- schema Prisma expandido para os eixos centrais da Fase 2, sem extrapolar para Fase 3;
- migrations revisaveis e consistentes;
- seed atualizado para novos status, configuracoes e perfis necessarios;
- contratos de ambiente e readiness ajustados para pagamentos, storage, fiscal e documentos;
- documentacao impactada sincronizada.

### Bloco 2 - Pagamentos, financeiro expandido e fiscal

**Objetivo**

Implementar a espinha dorsal financeira da Fase 2: deposito, pre-pagamento, no-show protection, creditos e reembolsos dedicados, reconciliacao mais forte, base para gateway e integracao fiscal.

**Modulos, arquivos e sistemas impactados**

- `features/finance/`
- `features/appointments/financial.ts`
- `features/appointments/services.ts`
- `features/commissions/`
- `app/admin/financeiro/`
- `app/admin/comissoes/`
- `app/api/admin/financial-transactions/`
- novos handlers para pagamentos, depositos, creditos, reembolsos, fiscal e webhooks
- camadas de auditoria e idempotencia em `server/audit/`, `server/security/` e `server/http/`

**Dependencias**

- Bloco 1 concluido;
- definicao do(s) provider(s) financeiro(s) da fase;
- definicao operacional minima para no-show, deposito, cancelamento e reembolso;
- definicao do provider fiscal ou adaptador equivalente.

**Riscos**

- misturar pagamento autorizado com pagamento liquidado;
- acoplar dominio local a payload bruto de gateway;
- falhas de idempotencia em webhook;
- fiscal gerar escopo excessivo se entrar como ERP completo;
- impacto indireto em comissao se a separacao operacional/financeira nao for preservada.

**Criterios de conclusao**

- dominio financeiro trata deposito, pre-pagamento, credito, reembolso e no-show com estados claros;
- webhooks sao idempotentes e auditaveis;
- regras de comissao continuam baseadas em estado financeiro correto;
- fiscal entra no nivel de integracao pedido pelo PRD, sem virar modulo autonomo alem da fase;
- telas e APIs administrativas conseguem operar os novos fluxos sem quebrar o MVP.

### Bloco 3 - Documentos, formularios, assinaturas e midia

**Objetivo**

Entregar o motor de documentos e formularios da Fase 2, com storage externo, metadados no banco, upload seguro, assinatura digital e vinculacao com cliente, pet, agendamento e tutor.

**Modulos, arquivos e sistemas impactados**

- `prisma/schema.prisma`
- `features/documents/`
- `features/tutor/`
- `features/appointments/`
- `server/storage/` ou camada equivalente
- `server/authorization/`
- `server/audit/`
- `app/admin/`
- `app/tutor/`
- `app/api/admin/`
- `app/api/tutor/`

**Dependencias**

- Bloco 1 concluido;
- provider de storage escolhido;
- decisao operacional para tipos de documentos, validade, assinatura e retencao;
- politicas minimas de acesso por papel e por vinculo da entidade.

**Riscos**

- upload inseguro;
- URLs previsiveis ou acesso sem autorizacao;
- tentativa de armazenar blob no banco por conveniencia;
- fluxo de assinatura pouco auditavel;
- requisitos LGPD e retencao mal definidos.

**Criterios de conclusao**

- uploads e downloads protegidos por permissao no servidor;
- documentos e midias armazenados externamente, com referencias e metadados no banco;
- formularios, autorizacoes e assinaturas basicas operam no fluxo administrativo e no portal do tutor;
- historico e auditoria cobrem criacao, assinatura, substituicao e remocao logica quando aplicavel.

### Bloco 4 - Agenda avancada, capacidade, bloqueios, waitlist e Taxi Dog

**Objetivo**

Expandir o dominio de agenda alem do MVP, incorporando capacidade por profissional, porte e raca, bloqueios operacionais, waitlist e fluxo de transporte compativel com Taxi Dog.

**Modulos, arquivos e sistemas impactados**

- `features/appointments/`
- `features/waitlist/`
- `features/taxi-dog/`
- `app/admin/agenda/`
- `app/api/admin/appointments/`
- novos handlers para bloqueios, waitlist, capacidade e transporte
- configuracoes por unidade e regras em `server/` e `prisma/`

**Dependencias**

- Bloco 1 concluido;
- idealmente Bloco 2 concluido para quando deposito e no-show interferirem na agenda;
- definicao operacional de capacidade, bloqueios e priorizacao de waitlist;
- definicao minima do escopo de Taxi Dog para Fase 2.

**Riscos**

- engine de agenda crescer demais e virar otimizacao de Fase 3;
- conflito entre capacidade e usabilidade da recepcao;
- regras por porte/raca sem dados suficientes no cadastro;
- waitlist sem criterios claros de promocao para agendamento;
- Taxi Dog extrapolar para roteirizacao sofisticada demais.

**Criterios de conclusao**

- servidor impede conflitos segundo capacidade e bloqueios configurados;
- waitlist tem regras claras de entrada, promocao e cancelamento;
- agenda administrativa expressa os novos estados sem esconder a regra critica na UI;
- fluxo de Taxi Dog entra como parte do agendamento quando aplicavel, sem IA ou roteirizacao excessiva.

### Bloco 5 - Portal do Tutor ampliado

**Objetivo**

Levar para o portal do tutor os recursos da Fase 2 que dependem de documentos, pagamentos e agenda: jornada ampliada, documentos, vacinas, assinaturas, pagamentos, alertas e pre-check-in.

**Modulos, arquivos e sistemas impactados**

- `features/tutor/`
- `app/tutor/`
- `app/api/tutor/`
- `features/documents/`
- `features/finance/`
- `features/appointments/`
- PWA ja existente, sem expandir para produto alem do PRD de Fase 2

**Dependencias**

- Blocos 2, 3 e 4 concluidos pelo menos no nucleo;
- RBAC e escopo por tutor preservados;
- contratos de documentos e pagamentos ja consolidados.

**Riscos**

- expor dados administrativos indevidos ao tutor;
- mover regra critica para o client por pressao de UX;
- jornada do tutor ficar acoplada demais ao estado interno do admin;
- PWA crescer alem do recorte funcional da fase.

**Criterios de conclusao**

- tutor acessa apenas seus dados, documentos, alertas, pagamentos e pre-check-in;
- portal usa o servidor como autoridade para autorizacao, agenda e estado financeiro;
- comportamento continua coerente com a base PWA do MVP, sem abrir escopo de portal de Fase 3.

### Bloco 6 - CRM e comunicacao ampliada

**Objetivo**

Evoluir a comunicacao manual do MVP para o conjunto de gatilhos e acoes comerciais previstos na Fase 2: review booster, campanhas segmentadas, recuperacao de inativos, ofertas por perfil e gatilhos pos-servico.

**Modulos, arquivos e sistemas impactados**

- `features/messages/`
- novo dominio `features/crm/`
- `app/admin/comunicacao/`
- `app/api/admin/message-templates/`
- `app/api/admin/message-logs/`
- novas tabelas para segmentacao, consentimento, campanhas, execucoes e resultados

**Dependencias**

- Bloco 1 concluido;
- idealmente Blocos 3, 4 e 5 maduros para aproveitar eventos e dados mais ricos;
- politicas claras de consentimento e LGPD;
- definicao do que continua manual e do que passa a ser gatilho controlado na fase.

**Riscos**

- transformar CRM da Fase 2 em plataforma de marketing completa;
- gatilhos pouco auditaveis;
- segmentacao sem consentimento claro;
- mistura entre log operacional, automacao e mensageria transacional.

**Criterios de conclusao**

- campanhas e gatilhos funcionam com criterios auditaveis;
- templates, publico, execucao e historico ficam rastreaveis;
- canais continuam coerentes com a arquitetura atual do sistema;
- escopo fica restrito ao que o PRD chama de CRM/comunicacao da Fase 2.

### Bloco 7 - PDV completo e estoque

**Objetivo**

Adicionar a operacao de venda presencial e o controle mais amplo de estoque, sem romper a base financeira e fiscal criada nos blocos anteriores.

**Modulos, arquivos e sistemas impactados**

- `features/pos/`
- `features/inventory/`
- `features/finance/`
- `app/admin/financeiro/`
- novas areas como `app/admin/pdv/` e `app/admin/estoque/`
- `app/api/admin/` para vendas, itens, estoque, ajustes e movimentacoes
- schema para produtos, saldos, lotes simplificados quando realmente necessarios, movimentos e vendas

**Dependencias**

- Bloco 2 concluido;
- base fiscal definida;
- definicao operacional do recorte de PDV e estoque para Fase 2.

**Riscos**

- PDV puxar complexidade de ERP;
- estoque entrar em granularidade maior do que a fase precisa;
- conflito entre vendas de servicos, produtos e efeitos financeiros;
- regras fiscais variarem por municipio/operacao.

**Criterios de conclusao**

- vendas e movimentacoes de estoque funcionam com integridade e auditoria;
- financeiro reconhece corretamente os efeitos do PDV;
- modulo fica no recorte de Fase 2, sem abrir supply chain ou fiscal alem do necessario.

### Bloco 8 - Gestao da equipe: escalas, ponto e payroll

**Objetivo**

Ampliar a gestao da equipe para escalas, ponto e payroll, aproveitando a base de funcionarios e comissoes do MVP.

**Modulos, arquivos e sistemas impactados**

- `features/employees/`
- novo dominio `features/team-operations/`
- `features/commissions/`
- `app/admin/equipe/`
- novas areas como `app/admin/escalas/` e `app/admin/ponto/`
- schema para escalas, jornadas, registros de ponto, eventos de folha e bases de calculo

**Dependencias**

- Bloco 1 concluido;
- idealmente Bloco 4 concluido para coerencia entre capacidade, escala e agenda;
- definicao clara do escopo de payroll da fase.

**Riscos**

- payroll crescer para modulo trabalhista completo;
- divergencia entre escalas e capacidade de agenda;
- calculos de folha exigirem regras legais nao fechadas;
- risco de misturar com RH amplo, que nao esta no PRD.

**Criterios de conclusao**

- escalas, ponto e bases de folha ficam operacionais no recorte da Fase 2;
- integracao com agenda, equipe e comissao permanece consistente;
- regras sensiveis continuam centralizadas no servidor, com auditoria.

### Bloco 9 - Fechamento e estabilizacao da Fase 2

**Objetivo**

Consolidar o estado final da Fase 2 com regressao tecnica, smoke de dominios novos, alinhamento documental e readiness para o proximo marco do produto.

**Modulos, arquivos e sistemas impactados**

- testes em `tests/`
- documentacao em `README.md`, `CHANGELOG.md` e `docs/`
- scripts operacionais e checks
- ajustes pontuais em dominios impactados pelos blocos anteriores

**Dependencias**

- blocos anteriores concluidos;
- ambiente de staging e rollout tecnico reutilizavel;
- checklist manual atualizada para a nova fase.

**Riscos**

- encerrar a fase com gaps cruzados entre pagamentos, documentos, agenda e tutor;
- deixar divergencia entre codigo e documentacao;
- misturar estabilizacao com backlog novo.

**Criterios de conclusao**

- checks automatizados verdes;
- smoke manual da fase executado em ambiente controlado;
- documentacao sincronizada com o que realmente entrou;
- baseline da Fase 2 pronta para nova rodada de rollout tecnico.

---

## 7. Riscos e ambiguidades da Fase 2

- **Provider de pagamentos e fiscal**: o PRD pede integracao, mas a escolha concreta do provider afeta schema, webhooks, auditoria e rollout.
- **Politica de deposito, pre-pagamento, no-show e reembolso**: precisa de regra operacional fechada por unidade para nao gerar implementacao ambigua.
- **Assinatura digital e valor juridico**: a fase precisa definir se assinatura sera aceite operacional, juridica simples ou integrada a provider especifico.
- **Storage e documentos sensiveis**: exige decisao clara de retention, URLs assinadas, mime validation e controle de acesso.
- **Taxi Dog**: pode facilmente escorregar para algoritmo de otimizacao pesado. A fase deve ficar em heuristica operacional e roteirizacao pratica.
- **CRM e LGPD**: campanhas, review booster e recuperacao de inativos exigem criterio de consentimento e preferencia de contato.
- **PDV e estoque**: ha risco alto de virar subproduto grande demais se o recorte de catalogo, saldo e fiscal nao for bem fechado.
- **Payroll**: calculos podem depender de regras trabalhistas e politicas internas ainda nao formalizadas.
- **Multiunidade**: continua fora da Fase 2 e segue para a Fase 3, mas a Fase 2 precisa manter cada modulo preparado para unidade sem ativar operacao multiunidade completa.
- **Sequenciamento**: se blocos forem executados fora da ordem recomendada, o risco de retrabalho em schema, auditoria e telas cresce bastante.

---

## 8. Proximo passo recomendado

O primeiro bloco recomendado para execucao e o **Bloco 1 - Fundacao transacional da Fase 2**.

Ele deve vir primeiro porque:

- varios itens da Fase 2 ainda nao possuem base estrutural no schema atual;
- pagamentos, documentos, waitlist, fiscal, estoque e portal ampliado dependem de novas entidades e contratos;
- iniciar por UI ou fluxo final antes dessa base aumentaria retrabalho em migrations, seeds, autorizacao e auditoria;
- esse bloco reduz a chance de cada vertical da Fase 2 inventar sua propria infra parcial.

Escopo pratico do primeiro passo:

1. mapear as novas entidades e relacoes obrigatorias da Fase 2;
2. fechar contratos de ambiente e integracao;
3. preparar migrations e seed base;
4. alinhar auditoria, autorizacao e readiness para os blocos seguintes.

---

## 9. Resumo executivo

A Fase 2 do PetOS deve ser executada como expansao controlada do MVP validado, em blocos que respeitem:

- baseline existente;
- autoridade do servidor;
- seguranca e auditoria;
- separacao operacional e financeira;
- storage externo para documentos e midia;
- integracoes externas tratadas com validacao e idempotencia;
- disciplina para nao antecipar Fase 3.

Se a ordem recomendada for respeitada, a Fase 2 pode crescer com previsibilidade sem descaracterizar o que ja foi consolidado no MVP.
