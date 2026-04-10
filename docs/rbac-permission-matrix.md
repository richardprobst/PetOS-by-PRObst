# Matriz de RBAC e Permissoes do PetOS

## 1. Objetivo

Este documento consolida a matriz atual de perfis e permissoes do PetOS.

Ele existe para:

- reduzir a dependencia de leitura direta do seed para entender autorizacao;
- facilitar onboarding e revisao de acesso;
- registrar a diferenca entre superficies internas, tutor e operacao de sistema;
- apoiar manutencao das permissoes abertas no MVP, na Fase 2 e na Fase 3.

Fonte de verdade do seed atual:

- `server/system/bootstrap-core.ts`
- `server/foundation/phase2.ts`

## 2. Principios

- permissao real e validada no servidor;
- perfil e apenas agrupador de permissoes;
- esconder UI nao substitui autorizacao;
- novas permissoes devem nascer com nome, descricao, seed e cobertura coerentes.

## 3. Perfis padrao semeados

### 3.1. Administrador

Escopo:

- acesso administrativo amplo ao sistema;
- herda todas as familias de permissao atualmente semeadas.

### 3.2. Recepcionista

Escopo:

- agenda, cadastro, comunicacao, documentos, CRM, PDV e parte da operacao de equipe;
- leitura de runtime;
- sem permissao ampla de manutencao ou update do sistema.

### 3.3. Tosador

Escopo:

- execucao do atendimento;
- leitura operacional do que precisa para atender;
- report cards e fluxo assistivo de imagem;
- sem administracao ampla do financeiro ou do sistema.

### 3.4. Tutor

Escopo:

- apenas portal e dados proprios;
- ownership obrigatorio no servidor;
- nenhuma permissao administrativa interna.

## 4. Familias de permissao atuais

### 4.1. MVP operacional

Permissoes:

- `agendamento.visualizar`
- `agendamento.criar`
- `agendamento.editar`
- `agendamento.cancelar`
- `agendamento.atualizar_status`
- `checkin.executar`
- `cliente.visualizar`
- `cliente.editar`
- `cliente.visualizar_proprio`
- `cliente.editar_proprio`
- `pet.visualizar`
- `pet.editar`
- `pet.visualizar_proprio`
- `servico.visualizar`
- `servico.editar`
- `funcionario.visualizar`
- `funcionario.editar`
- `financeiro.visualizar`
- `financeiro.lancar`
- `comissao.visualizar`
- `template_mensagem.visualizar`
- `template_mensagem.editar`
- `report_card.visualizar`
- `report_card.editar`
- `report_card.visualizar_proprio`
- `configuracao.visualizar`
- `configuracao.editar`
- `portal_tutor.acessar`
- `agendamento.visualizar_proprio`
- `agendamento.criar_proprio`

### 4.2. Operacao de sistema

Permissoes:

- `sistema.runtime.visualizar`
- `sistema.manutencao.operar`
- `sistema.reparo.operar`
- `sistema.update.operar`

### 4.3. Fundacao da Fase 2

Permissoes:

- `documento.visualizar`
- `documento.editar`
- `documento.assinar`
- `documento.visualizar_proprio`
- `documento.assinar_proprio`
- `midia.visualizar`
- `midia.editar`
- `midia.visualizar_propria`
- `financeiro.deposito.operar`
- `financeiro.reembolso.operar`
- `financeiro.credito.operar`
- `financeiro.fiscal.visualizar`
- `financeiro.fiscal.operar`
- `integracao.evento.visualizar`
- `integracao.evento.reprocessar`
- `agenda.capacidade.visualizar`
- `agenda.capacidade.editar`
- `agenda.bloqueio.visualizar`
- `agenda.bloqueio.editar`
- `agenda.waitlist.visualizar`
- `agenda.waitlist.editar`
- `agenda.taxi_dog.visualizar`
- `agenda.taxi_dog.editar`

### 4.4. Portal ampliado do tutor

Permissoes:

- `financeiro.visualizar_proprio`
- `agenda.waitlist.visualizar_proprio`
- `agenda.waitlist.editar_proprio`
- `agenda.taxi_dog.visualizar_proprio`
- `agendamento.pre_check_in.visualizar_proprio`
- `agendamento.pre_check_in.editar_proprio`

### 4.5. CRM e comunicacao ampliada

Permissoes:

- `crm.preferencia_contato.visualizar`
- `crm.preferencia_contato.editar`
- `crm.campanha.visualizar`
- `crm.campanha.editar`
- `crm.campanha.executar`

### 4.6. PDV e estoque

Permissoes:

- `produto.visualizar`
- `produto.editar`
- `estoque.visualizar`
- `estoque.movimentar`
- `pdv.visualizar`
- `pdv.operar`

### 4.7. Equipe, escalas e payroll operacional

Permissoes:

- `equipe.escala.visualizar`
- `equipe.escala.editar`
- `equipe.ponto.visualizar`
- `equipe.ponto.editar`
- `equipe.folha.visualizar`
- `equipe.folha.editar`

### 4.8. IA e insights da Fase 3

Permissoes:

- `ai.imagem.visualizar`
- `ai.imagem.executar`
- `ai.imagem.revisar`
- `ai.insights.visualizar`
- `ai.insights.executar`
- `ai.insights.feedback`

### 4.9. Fundacao de configuracao central da Fase 5

Permissoes:

- `configuracao.central.visualizar`
- `configuracao.central.editar`

## 5. Mapa de perfis para familias

### 5.1. Administrador

Recebe:

- todas as familias listadas neste documento.

### 5.2. Recepcionista

Recebe principalmente:

- agenda e check-in;
- cliente, pet e servico;
- documentos e midia;
- CRM;
- parte de PDV e estoque;
- leitura legada de configuracao administrativa simples;
- leitura de runtime;
- escalas, ponto e leitura de folha;
- IA assistiva e insights sem revisao de imagem.

### 5.3. Tosador

Recebe principalmente:

- leitura operacional de agenda, cliente, pet e bloqueios;
- leitura de documentos e midia, com edicao de midia;
- report cards;
- leitura e execucao de imagem assistiva, incluindo revisao humana;
- leitura operacional de escala e ponto.

### 5.4. Tutor

Recebe:

- acesso ao portal;
- leitura e edicao apenas do proprio escopo;
- documentos, midia, financeiro, waitlist, Taxi Dog, pre-check-in e report cards proprios.

## 6. Aplicacao server-side da autorizacao

Pontos de entrada principais:

- `server/authorization/guards.ts`
- `server/authorization/api-access.ts`

Funcoes principais:

- `requireInternalAreaUser`
- `requireTutorAreaUser`
- `requireInternalApiUser`
- `requireTutorApiUser`

Permissao nao basta sozinha quando o recurso exige ownership ou escopo por unidade.

## 7. Como adicionar uma nova permissao

Fluxo recomendado:

1. adicionar permissao em `server/system/bootstrap-core.ts` ou `server/foundation/phase2.ts`;
2. decidir quais perfis semeados a recebem;
3. aplicar a permissao em rota, page guard ou service server-side;
4. atualizar este documento;
5. atualizar testes e docs do dominio afetado.

## 8. O que esta matriz nao substitui

Esta matriz nao substitui:

- ownership;
- escopo multiunidade;
- gating de runtime;
- feature flags de IA;
- regras de negocio de dominio.

## 9. Documentos complementares

Ler em conjunto com:

- `docs/architecture.md`
- `docs/internal-api-catalog.md`
- `PHASE5_PLAN.md`
- `docs/phase3-maintenance-guide.md`
- `server/system/bootstrap-core.ts`
- `server/foundation/phase2.ts`
