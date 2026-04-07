# Operational Homologation

Data da ultima revisao: 2026-04-07

## Objetivo

Este documento marca a fase seguinte ao rollout tecnico bem-sucedido do PetOS no host real.

Nesta etapa, o objetivo nao e abrir nova feature nem antecipar Fase 3.
O objetivo e usar o sistema publicado em [https://petos.desi.pet](https://petos.desi.pet) para:

- configurar a operacao real;
- executar fluxos reais do negocio;
- capturar gaps concretos de uso;
- corrigir apenas o que bloquear o MVP ou a baseline fechada da Fase 2;
- separar claramente bug real, configuracao incompleta e escopo futuro.

## Estado de entrada

Esta fase parte do seguinte estado:

- app publicada em host real;
- `GET /api/health` saudavel;
- banco, auth e area administrativa funcionando;
- baseline do MVP validado preservada;
- baseline tecnica da Fase 2 concluida no repositorio;
- camada installer/updater fechada, mas sem virar motor principal de deploy nesse host.

## O que esta em escopo nesta fase

- configuracao operacional inicial do PetOS;
- criacao de usuarios, perfis e acessos reais;
- configuracao de unidade, servicos, equipe e parametros usados no dia a dia;
- homologacao guiada dos fluxos do MVP;
- homologacao dos modulos da Fase 2 que realmente serao usados agora;
- registro de gaps reais;
- correcoes pequenas, localizadas e justificadas quando um gap bloquear uso real.

## O que nao esta em escopo nesta fase

- abrir Fase 3;
- reabrir escopo estrutural da Fase 2 sem evidencia de uso;
- trocar arquitetura;
- transformar o updater interno em motor principal de upgrade hospedado;
- inventar automacoes novas sem necessidade operacional imediata.

## Ordem recomendada de homologacao

### 1. Seguranca e acessos

- trocar a senha do admin seeded;
- criar usuarios reais da equipe;
- vincular perfis e permissoes de acordo com funcao real;
- validar login, logout e isolamento de acesso entre perfis.

### 2. Base operacional

- revisar unidade e configuracoes por unidade;
- cadastrar servicos com duracao e preco coerentes;
- cadastrar equipe e percentuais de comissao;
- revisar templates de comunicacao realmente usados pela operacao.

### 3. Cadastros principais

- cadastrar clientes reais ou de homologacao;
- cadastrar pets com dados suficientes para operacao;
- validar historico e relacao cliente-pet.

### 4. Fluxo principal do MVP

Executar ponta a ponta:

- criacao de agendamento;
- bloqueio de conflito de agenda;
- check-in;
- mudanca de status em ordem valida;
- conclusao;
- faturamento;
- calculo de comissao;
- comunicacao operacional;
- report card simples.

Use como referencia:

- [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md)

### 5. Recorte da Fase 2 em uso real

Validar apenas o que a operacao realmente for usar agora, por exemplo:

- documentos e assinaturas;
- waitlist;
- Taxi Dog;
- CRM com consentimento;
- PDV e estoque;
- escalas, ponto e folha base.

Use como referencia:

- [docs/phase2-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-smoke-checklist.md)

### 6. Portal do tutor

- validar leitura dos proprios dados;
- validar agendamento permitido;
- validar historico, documentos e dados financeiros permitidos;
- confirmar que nao existe vazamento de dados de outro cliente.

## Como registrar gaps reais

Todo gap encontrado deve ser classificado antes de qualquer correcao.

### Classificacoes permitidas

- `configuracao`: dado, permissao, env ou parametro operacional incorreto;
- `bug`: comportamento divergente do PRD, das regras de dominio ou da baseline entregue;
- `limitacao intencional`: fora do escopo da baseline atual;
- `escopo futuro`: pertence a Fase 3 ou roadmap.

### Registro minimo recomendado

Para cada gap, registrar:

- data;
- usuario e perfil;
- rota ou modulo;
- passo de reproducao;
- comportamento esperado;
- comportamento observado;
- severidade;
- classificacao;
- evidencia minima.

## Regra de decisao

Se um gap bloquear operacao real do MVP ou da baseline da Fase 2 em uso, ele pode justificar correcao imediata.

Se o gap nao bloquear uso real, primeiro classificar, depois priorizar.

Se o pedido cair em Fase 3, o correto e abrir planejamento proprio, separado desta fase.

Use como referencia:

- [PHASE3_PLAN.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/PHASE3_PLAN.md)

## Sinal de saida desta fase

Esta fase pode ser considerada bem-sucedida quando:

- a configuracao inicial da operacao estiver concluida;
- os fluxos principais do MVP estiverem homologados no host real;
- os modulos da Fase 2 realmente usados estiverem homologados sem bloqueantes;
- os gaps reais restantes estiverem classificados e priorizados;
- o planejamento de Fase 3, se desejado, estiver explicitamente separado da estabilizacao atual.
