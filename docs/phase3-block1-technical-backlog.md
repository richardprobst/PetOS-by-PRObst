# Phase 3 Block 1 Technical Backlog

Data da ultima revisao: 2026-04-07

## 1. Objetivo do backlog tecnico

Este documento converte o plano operacional do Bloco 1 da Fase 3 em uma sequencia implementavel, ainda sem abrir os blocos seguintes.

Ele existe para:

- quebrar o Bloco 1 por camada tecnica;
- ordenar dependencias reais;
- indicar os arquivos e modulos mais provaveis de impacto;
- definir validacao e teste minimo por item;
- reduzir o risco de abrir implementacao em ordem errada.

Este backlog nao autoriza:

- schema novo fora do escopo da fundacao;
- fluxo final de imagem;
- insight final do preditivo;
- multiunidade operacional completa;
- implementacao do Bloco 2, 3, 4 ou 5.

Referencia principal:

- [docs/phase3-block1-operational-plan.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-operational-plan.md)
- [docs/phase3-block1-sprint1-plan.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-sprint1-plan.md)

---

## 2. Estrategia de execucao por camada

### Camada 1 - Contratos e gating

Abrir os contratos internos e a hierarquia de bloqueio da IA antes de qualquer persistencia ou integracao externa.

### Camada 2 - Dominio e persistencia minima

Definir o envelope minimo de execucao, resultado interpretado, custo e trilha de auditoria, sem abrir fluxo final dos blocos seguintes.

### Camada 3 - Autorizacao, contexto e isolamento

Preparar sessao, ownership, visibilidade e limites cross-unit como fundacao server-side.

### Camada 4 - Integracao e jobs

Preparar o adaptador interno, o envelope de job e os estados minimos de execucao, sem ligar consumo real fora do gating aprovado.

### Camada 5 - Observabilidade, auditoria e seguranca

Fechar eventos minimos, rastreabilidade, bloqueios por custo e controles de consentimento e retencao como dependencias transversais.

### Camada 6 - Superficies minimas administrativas e internas

Expor apenas o minimo interno para operacao, diagnostico e validacao da fundacao, sem UX final de imagem ou preditivo.

### Camada 7 - Testes e fechamento do bloco

Transformar as regras do bloco em validacoes automatizadas e smoke interno suficiente para liberar a saida para o Bloco 2.

---

## 3. Itens tecnicos por camada

### Camada 1 - Contratos e gating

#### B1-T01

- **ID do item**: `B1-T01`
- **Nome**: contrato central de orquestracao de IA
- **Camada**: contratos e gating
- **Objetivo**: formalizar o papel de `features/ai` como orquestrador interno, separado de provider e de regra critica de negocio.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/`
  - `server/integrations/ai/`
  - `server/http/`
  - `docs/`
- **Dependencias**:
  - `A1`
  - `A5`
- **Risco principal**: acoplamento precoce entre dominio e provider.
- **Criterio de pronto**: responsabilidades de orquestracao, integracao, estado e auditoria estao documentadas e sem ambiguidade.
- **Validacao esperada**: o contrato deixa claro quem decide gating, quem chama provider e quem registra auditoria.
- **Teste minimo esperado**: teste de contrato interno documentado para entrada valida, bloqueio por flag e resposta normalizada.

#### B1-T02

- **ID do item**: `B1-T02`
- **Nome**: hierarquia de flags e politica fail-closed
- **Camada**: contratos e gating
- **Objetivo**: definir a ordem de verificacao entre flag global, flag por modulo e previsao de flag por unidade.
- **Arquivos e modulos provaveis a tocar**:
  - `server/env.ts`
  - `server/config/`
  - `features/ai/`
  - `docs/`
- **Dependencias**:
  - `B1-T01`
- **Risco principal**: consumo pago com IA desligada por inconsistencia de gating.
- **Criterio de pronto**: a hierarquia `global -> modulo -> unidade` esta clara e qualquer estado invalido cai em `desabilitado`.
- **Validacao esperada**: toda rota ou job potencial de IA depende do mesmo funil de verificacao.
- **Teste minimo esperado**: teste unitario da matriz de flags cobrindo habilitado, ausente, invalido e inconsistente.

#### B1-T03

- **ID do item**: `B1-T03`
- **Nome**: quotas base por modulo e unidade
- **Camada**: contratos e gating
- **Objetivo**: preparar o envelope minimo de limite de custo por modulo e por unidade.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/`
  - `server/config/`
  - `server/audit/`
  - `docs/`
- **Dependencias**:
  - `B1-T02`
  - `A4`
- **Risco principal**: IA habilitada sem teto de consumo e sem degradacao explicita.
- **Criterio de pronto**: quota conceitual, motivo de bloqueio e degradacao minima estao definidos para imagem e preditivo.
- **Validacao esperada**: o sistema sabe distinguir bloqueio por flag, por quota e por indisponibilidade.
- **Teste minimo esperado**: teste unitario de decisao de quota e teste de integracao do bloqueio antes de job ou chamada.

### Camada 2 - Dominio e persistencia minima

#### B1-T04

- **ID do item**: `B1-T04`
- **Nome**: envelope de execucao de IA
- **Camada**: dominio e persistencia minima
- **Objetivo**: definir a estrutura minima conceitual de execucao, estados e referencia cruzada com usuario, unidade e modulo.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/`
  - `features/ai/vision/`
  - `features/insights/`
  - `server/audit/`
  - `prisma/schema.prisma`
  - `prisma/migrations/`
- **Dependencias**:
  - `B1-T01`
  - `B1-T02`
- **Risco principal**: abrir persistencia demais antes do fluxo real ou guardar pouco a ponto de inviabilizar auditoria.
- **Criterio de pronto**: estados, campos conceituais e vinculos de auditoria estao descritos antes da modelagem real.
- **Validacao esperada**: fica claro o minimo necessario para job, resultado interpretado, custo e trilha tecnica.
- **Teste minimo esperado**: teste de contrato de estados e teste de integracao futuro para ciclo `bloqueada -> pendente -> concluida ou falhou`.

#### B1-T05

- **ID do item**: `B1-T05`
- **Nome**: politica transversal de retencao e descarte
- **Camada**: dominio e persistencia minima
- **Objetivo**: refletir `B2` na fundacao tecnica sem abrir storage final dos blocos seguintes.
- **Arquivos e modulos provaveis a tocar**:
  - `server/storage/`
  - `features/ai/`
  - `server/audit/`
  - `docs/`
- **Dependencias**:
  - `B1-T04`
  - `B2`
- **Risco principal**: payload bruto sobreviver por inercia ou retencao estendida sem trilha.
- **Criterio de pronto**: o bloco sabe o que e retido, por quanto tempo e em que excecao administrativa.
- **Validacao esperada**: a politica minima de `180 dias` e as excecoes ratificadas aparecem como dependencia transversal de implementacao.
- **Teste minimo esperado**: teste de contrato para classificacao de artefato e teste de integracao futuro para purge elegivel.

#### B1-T06

- **ID do item**: `B1-T06`
- **Nome**: envelope de custo e metadados de provider
- **Camada**: dominio e persistencia minima
- **Objetivo**: definir o minimo de rastreio de provider, modelo, custo e fallback por execucao.
- **Arquivos e modulos provaveis a tocar**:
  - `server/integrations/ai/`
  - `features/ai/`
  - `server/audit/`
  - `docs/`
- **Dependencias**:
  - `B1-T04`
  - `B1-T03`
- **Risco principal**: nao conseguir auditar qual provider ou modelo consumiu custo.
- **Criterio de pronto**: o envelope minimo de provider, modelo, unidade, modulo, custo estimado ou real e motivo de fallback esta definido.
- **Validacao esperada**: nenhuma execucao elegivel passa sem carregar metadados minimos.
- **Teste minimo esperado**: teste de contrato de serializacao minima de custo e provider.

### Camada 3 - Autorizacao, contexto e isolamento

#### B1-T07

- **ID do item**: `B1-T07`
- **Nome**: contexto de unidade na sessao
- **Camada**: autorizacao, contexto e isolamento
- **Objetivo**: preparar a sessao para reconhecer unidade ativa e troca manual de contexto sem abrir multiunidade completa.
- **Arquivos e modulos provaveis a tocar**:
  - `server/auth/`
  - `server/authorization/`
  - `features/multiunit/`
  - `app/admin/`
  - `app/api/`
- **Dependencias**:
  - `C1`
  - `C3`
- **Risco principal**: contexto de unidade ficar apenas visual e nao server-side.
- **Criterio de pronto**: sessao, unidade ativa, troca manual e papeis globais limitados estao descritos como autoridade do servidor.
- **Validacao esperada**: toda decisao cross-unit depende de contexto de sessao verificavel.
- **Teste minimo esperado**: teste de autorizacao para perfil local, perfil global e troca manual de contexto.

#### B1-T08

- **ID do item**: `B1-T08`
- **Nome**: ownership e visibilidade base de cliente e pet
- **Camada**: autorizacao, contexto e isolamento
- **Objetivo**: refletir `C1` na fundacao com identidade mestre e vinculo por unidade.
- **Arquivos e modulos provaveis a tocar**:
  - `features/multiunit/`
  - `features/clients/`
  - `features/pets/`
  - `server/authorization/`
  - `docs/`
- **Dependencias**:
  - `B1-T07`
  - `C1`
- **Risco principal**: duplicidade de cadastro ou vazamento cross-unit.
- **Criterio de pronto**: ownership principal, visibilidade local e override global estao traduzidos em regra implementavel.
- **Validacao esperada**: o sistema distingue leitura local, leitura global autorizada e edicao estrutural cross-unit.
- **Teste minimo esperado**: teste de autorizacao e isolamento com cenarios local/local, local/global e global/global.

#### B1-T09

- **ID do item**: `B1-T09`
- **Nome**: mapa de impacto em filtros e dashboards
- **Camada**: autorizacao, contexto e isolamento
- **Objetivo**: identificar quais modulos server-side precisarao respeitar o novo contexto de unidade desde a fundacao.
- **Arquivos e modulos provaveis a tocar**:
  - `server/authorization/`
  - `app/api/`
  - `app/admin/`
  - `features/appointments/`
  - `features/finance/`
  - `features/messages/`
  - `docs/`
- **Dependencias**:
  - `B1-T07`
  - `B1-T08`
- **Risco principal**: deixar pontos de leitura server-side fora do isolamento.
- **Criterio de pronto**: o mapa de enforcement por modulo existe e separa o que entra no Bloco 1 do que fica para o Bloco 2.
- **Validacao esperada**: fica claro o que sera preparado agora e o que sera adaptado depois.
- **Teste minimo esperado**: checklist de contrato server-side para filtros e dashboards afetados.

### Camada 4 - Integracao e jobs

#### B1-T10

- **ID do item**: `B1-T10`
- **Nome**: adaptador interno de provider
- **Camada**: integracao e jobs
- **Objetivo**: preparar o adaptador interno de IA sem acoplamento da UI ao provider.
- **Arquivos e modulos provaveis a tocar**:
  - `server/integrations/ai/`
  - `features/ai/`
  - `features/ai/vision/`
  - `features/insights/`
- **Dependencias**:
  - `B1-T01`
  - `B1-T02`
  - `A2`
- **Risco principal**: UI ou dominio falarem diretamente com provider externo.
- **Criterio de pronto**: entrada, saida e erro do adaptador estao normalizados e auditaveis.
- **Validacao esperada**: nenhuma camada acima de integracao depende de formato proprietario do provider.
- **Teste minimo esperado**: teste de contrato do adaptador com resposta valida, erro tecnico e bloqueio por flag.

#### B1-T11

- **ID do item**: `B1-T11`
- **Nome**: envelope de jobs e estados assincronos
- **Camada**: integracao e jobs
- **Objetivo**: preparar os estados minimos de job e a separacao entre execucao leve e pesada.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/`
  - `features/ai/vision/`
  - `features/insights/`
  - `server/jobs/`
  - `server/http/`
- **Dependencias**:
  - `B1-T04`
  - `B1-T10`
  - `A3`
- **Risco principal**: abrir fila ou retry sem gating uniforme.
- **Criterio de pronto**: estados minimos e pontos de transicao de job estao definidos para suportar execucao mista.
- **Validacao esperada**: o sistema sabe quando bloquear, enfileirar, falhar e expor status interno.
- **Teste minimo esperado**: teste de integracao para criacao de job permitido e negado.

#### B1-T12

- **ID do item**: `B1-T12`
- **Nome**: fallback conceitual minimo
- **Camada**: integracao e jobs
- **Objetivo**: preparar o comportamento minimo para indisponibilidade de provider, quota e erro tecnico.
- **Arquivos e modulos provaveis a tocar**:
  - `server/integrations/ai/`
  - `features/ai/`
  - `server/http/`
  - `docs/`
- **Dependencias**:
  - `B1-T03`
  - `B1-T10`
  - `B1-T11`
- **Risco principal**: fallback silencioso ou custo dobrado por retry implicito.
- **Criterio de pronto**: degradacao, bloqueio e razoes de fallback estao descritos de forma uniforme.
- **Validacao esperada**: o sistema diferencia erro tecnico, indisponibilidade e bloqueio de governanca.
- **Teste minimo esperado**: teste de contrato do fallback com motivo de erro preservado e sem retry silencioso.

### Camada 5 - Observabilidade, auditoria e seguranca

#### B1-T13

- **ID do item**: `B1-T13`
- **Nome**: auditoria minima de uso de IA
- **Camada**: observabilidade, auditoria e seguranca
- **Objetivo**: registrar tentativa, bloqueio, execucao, fallback, custo e decisao humana relevante.
- **Arquivos e modulos provaveis a tocar**:
  - `server/audit/`
  - `features/ai/`
  - `features/multiunit/`
  - `app/api/`
- **Dependencias**:
  - `B1-T04`
  - `B1-T06`
  - `B1-T08`
- **Risco principal**: nao conseguir provar porque uma chamada foi permitida, bloqueada ou descartada.
- **Criterio de pronto**: eventos minimos de auditoria e seus gatilhos estao definidos.
- **Validacao esperada**: uso, erro, custo e override administrativo ficam rastreaveis.
- **Teste minimo esperado**: teste de integracao de emissao de auditoria nos caminhos permitido, bloqueado e fallback.

#### B1-T14

- **ID do item**: `B1-T14`
- **Nome**: trilha de consentimento e retencao como dependencia transversal
- **Camada**: observabilidade, auditoria e seguranca
- **Objetivo**: garantir que consentimento e retencao aparecam como pre-condicao tecnica e nao como detalhe tardio do Bloco 3.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/vision/`
  - `server/audit/`
  - `server/storage/`
  - `docs/`
- **Dependencias**:
  - `B1`
  - `B2`
  - `B1-T05`
- **Risco principal**: analise de imagem nascer com dependencias juridicas implicitas ou escondidas.
- **Criterio de pronto**: consentimento, retencao e revisao humana aparecem como gates transversais documentados.
- **Validacao esperada**: nada de imagem pode ser desenhado sem depender explicitamente desses requisitos.
- **Teste minimo esperado**: teste de contrato de pre-condicoes para fluxo futuro de imagem.

#### B1-T15

- **ID do item**: `B1-T15`
- **Nome**: eventos minimos de custo, erro e desligamento rapido
- **Camada**: observabilidade, auditoria e seguranca
- **Objetivo**: preparar os sinais operacionais que permitem desligar IA rapidamente sem perder rastreabilidade.
- **Arquivos e modulos provaveis a tocar**:
  - `server/audit/`
  - `features/ai/`
  - `server/http/`
  - `app/admin/`
- **Dependencias**:
  - `B1-T03`
  - `B1-T12`
  - `A5`
- **Risco principal**: incidente de custo sem gatilho operacional claro.
- **Criterio de pronto**: eventos e motivos de desligamento, bloqueio por quota e erro de provider estao definidos.
- **Validacao esperada**: operacao consegue diferenciar desligamento preventivo, quota estourada e falha tecnica.
- **Teste minimo esperado**: smoke interno de bloqueio rapido por flag e teste de integracao de evento emitido.

### Camada 6 - Superficies minimas administrativas e internas

#### B1-T16

- **ID do item**: `B1-T16`
- **Nome**: superficie administrativa minima de diagnostico
- **Camada**: superficies minimas administrativas e internas
- **Objetivo**: preparar uma superficie interna minima para leitura de flags, estados, quota e bloqueios do bloco.
- **Arquivos e modulos provaveis a tocar**:
  - `app/admin/sistema/`
  - `app/api/admin/`
  - `features/ai/`
  - `features/multiunit/`
- **Dependencias**:
  - `B1-T02`
  - `B1-T03`
  - `B1-T15`
- **Risco principal**: operar a fundacao sem visibilidade administrativa minima.
- **Criterio de pronto**: existe superficie interna minima de leitura, sem abrir UX final dos blocos seguintes.
- **Validacao esperada**: administracao consegue distinguir habilitacao, bloqueio e erro de fundacao.
- **Teste minimo esperado**: smoke administrativo interno de leitura protegida por permissao.

#### B1-T17

- **ID do item**: `B1-T17`
- **Nome**: superficie interna minima de contexto multiunidade
- **Camada**: superficies minimas administrativas e internas
- **Objetivo**: expor o contexto de unidade e seus limites para uso administrativo interno e validacao do bloco.
- **Arquivos e modulos provaveis a tocar**:
  - `app/admin/`
  - `app/api/admin/`
  - `features/multiunit/`
  - `server/auth/`
  - `server/authorization/`
- **Dependencias**:
  - `B1-T07`
  - `B1-T08`
  - `B1-T09`
- **Risco principal**: fundacao de sessao e ownership ficar invisivel ate o Bloco 2.
- **Criterio de pronto**: existe leitura interna minima de unidade ativa, papel global e ownership base.
- **Validacao esperada**: suporte e validacao tecnica conseguem verificar o isolamento sem UI final multiunidade.
- **Teste minimo esperado**: smoke administrativo interno com perfil local e perfil global.

### Camada 7 - Testes e fechamento do bloco

#### B1-T18

- **ID do item**: `B1-T18`
- **Nome**: suite minima de testes do Bloco 1
- **Camada**: testes e fechamento do bloco
- **Objetivo**: consolidar testes unitarios, de integracao, autorizacao, contrato e smoke minimo do bloco.
- **Arquivos e modulos provaveis a tocar**:
  - `tests/`
  - `features/ai/`
  - `features/multiunit/`
  - `server/`
  - `app/api/`
- **Dependencias**:
  - `B1-T01` ate `B1-T17`
- **Risco principal**: a fundacao ficar sem rede de protecao e sem prova de comportamento fail-closed.
- **Criterio de pronto**: a suite minima cobre gating, quotas, isolamento por unidade, auditoria minima e superficies internas.
- **Validacao esperada**: os caminhos criticos do Bloco 1 estao cobertos antes do handoff para o Bloco 2.
- **Teste minimo esperado**: execucao completa do conjunto minimo previsto na secao de estrategia de testes.

#### B1-T19

- **ID do item**: `B1-T19`
- **Nome**: checklist de fechamento e saida para o Bloco 2
- **Camada**: testes e fechamento do bloco
- **Objetivo**: transformar os criterios de pronto em checklist objetivo de encerramento do bloco.
- **Arquivos e modulos provaveis a tocar**:
  - `docs/`
  - `tests/`
  - `README.md`
  - `CHANGELOG.md`
- **Dependencias**:
  - `B1-T18`
- **Risco principal**: concluir o bloco sem validacao objetiva da saida para o Bloco 2.
- **Criterio de pronto**: checklist final do bloco alinhado ao sinal de saida do plano operacional.
- **Validacao esperada**: fica documentado o que precisa estar entregue para abrir o Bloco 2 sem reavaliacao ampla do bloco.
- **Teste minimo esperado**: revisao documental e smoke final administrativo ou interno registrados.

---

## 4. Ordem de implementacao recomendada

1. `B1-T01` e `B1-T02`
   Motivo: o bloco precisa de contrato central e gating antes de qualquer persistencia ou integracao.
2. `B1-T03`
   Motivo: quota e bloqueio por custo precisam nascer junto do gating, nao depois.
3. `B1-T04`, `B1-T05` e `B1-T06`
   Motivo: so depois do gating faz sentido definir o envelope minimo de execucao, retencao e custo.
4. `B1-T07` e `B1-T08`
   Motivo: contexto de unidade e ownership sao a base do isolamento multiunidade da fundacao.
5. `B1-T09`
   Motivo: com sessao e ownership definidos, o mapa de impacto server-side fica tratavel.
6. `B1-T10`, `B1-T11` e `B1-T12`
   Motivo: integracao e jobs so devem nascer depois que contrato, gating e persistencia minima ja existirem.
7. `B1-T13`, `B1-T14` e `B1-T15`
   Motivo: auditoria, consentimento transversal e eventos operacionais precisam consolidar o que foi definido nas camadas anteriores.
8. `B1-T16` e `B1-T17`
   Motivo: superficies internas so devem expor o que ja esta coerente no backend.
9. `B1-T18` e `B1-T19`
   Motivo: fechamento e saida para o Bloco 2 dependem da validacao do conjunto completo.

---

## 5. Dependencias entre itens

### 5.1. O que bloqueia o que

- `B1-T01` bloqueia `B1-T02`, `B1-T04` e `B1-T10`
- `B1-T02` bloqueia `B1-T03`, `B1-T10` e parte de `B1-T16`
- `B1-T03` bloqueia `B1-T06`, `B1-T12` e `B1-T15`
- `B1-T04` bloqueia `B1-T05`, `B1-T06`, `B1-T11` e `B1-T13`
- `B1-T07` bloqueia `B1-T08`, `B1-T09` e `B1-T17`
- `B1-T08` bloqueia parte de `B1-T13` e parte de `B1-T17`
- `B1-T10` bloqueia `B1-T11` e `B1-T12`
- `B1-T18` depende da conclusao de `B1-T01` ate `B1-T17`
- `B1-T19` depende de `B1-T18`

### 5.2. O que pode rodar em paralelo

- `B1-T04` e `B1-T07` podem avancar em paralelo depois de `B1-T01` e `B1-T02`
- `B1-T05` e `B1-T06` podem avancar em paralelo depois de `B1-T04`
- `B1-T09` e `B1-T10` podem correr em paralelo depois de sessao, ownership e contrato central definidos
- `B1-T13`, `B1-T14` e `B1-T15` podem correr em paralelo quando persistencia minima, contexto e fallback ja existirem
- `B1-T16` e `B1-T17` podem correr em paralelo quando backend e auditoria minima estiverem estabilizados

### 5.3. O que nao pode comecar antes de outro item

- nada de integracao real ou envelope de job antes de `B1-T02`
- nada de superficie administrativa antes de `B1-T15`
- nada de teste de fechamento antes de `B1-T18`
- nada de saida para o Bloco 2 antes de `B1-T19`

---

## 6. Estrategia minima de testes do Bloco 1

### 6.1. Unitario

- matriz de flags e comportamento `fail-closed`
- decisao de quota por modulo e unidade
- normalizacao de resposta do adaptador
- classificacao minima de estados de execucao

### 6.2. Integracao

- bloqueio de chamada ou job com IA desligada
- criacao negada e permitida de execucao interna
- registro minimo de provider, modelo e custo
- purge elegivel conforme politica de retencao

### 6.3. Autorizacao

- sessao com unidade ativa
- perfil local sem visao cross-unit
- perfil global com visao permitida
- edicao estrutural cross-unit bloqueada para perfil local

### 6.4. Contrato

- entrada e saida normalizada do adaptador interno
- envelope de estado de execucao
- envelope de evento de auditoria
- envelope de bloqueio por flag, quota e indisponibilidade

### 6.5. Smoke minimo administrativo e interno

- leitura administrativa de flags e bloqueios
- leitura administrativa de unidade ativa e ownership base
- verificacao interna de eventos de auditoria e custo
- verificacao de degradacao explicita quando recurso estiver desligado

---

## 7. Criterios de validacao do bloco

Durante a futura implementacao, o Bloco 1 so deve ser considerado corretamente executado quando:

- a fundacao de IA estiver controlada por gating server-side unico;
- a IA continuar desligada por padrao e `fail-closed`;
- nenhuma chamada paga, job ou retry escapar do gating;
- o adaptador interno estiver isolado da UI e da regra de negocio;
- provider, modelo, custo, erro e fallback ficarem rastreaveis;
- consentimento e retencao aparecerem como dependencia transversal de imagem;
- o contexto de unidade da sessao for autoridade server-side;
- ownership e visibilidade de cliente/pet respeitarem a ratificacao de `C1`;
- as superficies internas se limitarem a diagnostico e operacao minima;
- os testes minimos da secao anterior estiverem executaveis e coerentes com o bloco.

---

## 8. Sinal de saida para iniciar a implementacao do Bloco 2

O Bloco 2 pode abrir sem ambiguidade quando, na pratica:

- o contexto de unidade estiver implementado no servidor e validado;
- ownership e visibilidade base de cliente/pet estiverem implementados e auditaveis;
- flags, quotas e bloqueios de IA estiverem ativos e observaveis;
- integracao interna de IA estiver isolada e rastreavel;
- eventos de auditoria, custo e erro estiverem emitidos no minimo necessario;
- a superficie administrativa minima permitir validar o estado da fundacao;
- o checklist final `B1-T19` estiver concluido.

Sem esses pontos, a abertura do Bloco 2 tende a contaminar a fundacao com ajuste tardio de sessao, isolamento ou governanca.
