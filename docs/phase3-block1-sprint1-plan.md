# Phase 3 Block 1 Sprint 1 Plan

Data da ultima revisao: 2026-04-07

## 1. Objetivo do Sprint 1

O Sprint 1 existe para abrir a implementacao do Bloco 1 da Fase 3 pelo ponto de menor risco arquitetural:

- `B1-T01`
- `B1-T02`
- `B1-T03`

Ele comeca por esses itens porque:

- o contrato central de IA precisa existir antes de qualquer persistencia ou adaptador concreto;
- o gating precisa existir antes de qualquer chamada externa, job ou custo;
- as quotas base precisam nascer junto do gating, e nao como correção posterior.

Este sprint prepara a fundacao de governanca da IA sem abrir:

- fluxo final de imagem;
- insight final do preditivo;
- persistencia minima completa do Bloco 1;
- multiunidade completa;
- jobs reais ou consumo pago de provider.

Referencia principal:

- [docs/phase3-block1-technical-backlog.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-technical-backlog.md)

---

## 2. Escopo incluido

Entram no Sprint 1:

- formalizacao executavel do contrato central de `features/ai`;
- definicao implementavel da relacao entre `features/ai` e `server/integrations/ai`;
- definicao implementavel da hierarquia de flags:
  - `ai.enabled`
  - `ai.imageAnalysis.enabled`
  - `ai.predictiveInsights.enabled`
  - previsao de chave por unidade;
- regra `fail-closed` como comportamento padrao;
- definicao implementavel do funil server-side de bloqueio antes de qualquer consumo;
- desenho inicial de quotas por modulo e por unidade;
- definicao de bloqueio por quota e degradacao minima;
- previsao de auditoria minima de bloqueio, tentativa e motivo operacional, sem fechar ainda toda a camada de observabilidade do bloco.

---

## 3. Escopo excluido

Nao entram neste sprint, mesmo que pertençam ao Bloco 1:

- `B1-T04` ate `B1-T19`;
- persistencia minima de execucao, resultado, custo e metadados;
- politica transversal de retencao aplicada tecnicamente;
- envelope de jobs e estados assincronos;
- adaptador real de provider;
- fallback real de integracao;
- contexto de unidade na sessao;
- ownership e visibilidade de cliente/pet;
- superfícies administrativas internas;
- suite minima completa de testes do bloco;
- qualquer trabalho do Bloco 2, 3, 4 ou 5.

Tambem nao entram:

- schema novo;
- migration;
- UX final de imagem;
- painel final de insights;
- consumo pago de provider;
- qualquer caminho que contorne a exigencia de IA desligada por padrao.

---

## 4. Sequencia de implementacao recomendada

### Etapa 1 - `B1-T01`

Primeiro vem o contrato central de orquestracao de IA, porque ele define quem pode decidir, bloquear, auditar e integrar.

### Etapa 2 - `B1-T02`

Depois vem a hierarquia de flags e a politica `fail-closed`, porque o contrato sem gating ainda deixaria o bloco vulneravel a consumo indevido.

### Etapa 3 - `B1-T03`

Por fim entram quotas base por modulo e unidade, porque elas dependem do gating ja estar centralizado e uniforme.

---

## 5. Quebra executavel por item

### B1-T01

- **ID**: `B1-T01`
- **Nome**: contrato central de orquestracao de IA
- **Objetivo**: formalizar o papel de `features/ai` como camada interna de orquestracao, separada de provider e de regra critica de negocio.
- **Por que ele vem nesta ordem**: sem esse contrato, qualquer gating ou quota fica espalhado e o adaptador nasce acoplado ao dominio.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/`
  - `server/integrations/ai/`
  - `server/http/`
  - `server/audit/`
  - `docs/`
- **Dependencias**:
  - `A1`
  - `A5`
- **Riscos**:
  - contrato virar abstracao demais sem consequencia pratica;
  - provider vazar para camadas de dominio;
  - auditoria ficar tratada como detalhe posterior.
- **Criterio de pronto**:
  - responsabilidades de orquestracao, integracao, bloqueio e auditoria ficam descritas de forma implementavel;
  - fica claro que a UI nao fala diretamente com provider;
  - backend fica identificado como autoridade do fluxo.
- **Validacao esperada**:
  - o documento de implementacao deixa claro onde termina o dominio e onde comeca a integracao.
- **Teste minimo esperado**:
  - teste de contrato interno cobrindo entrada valida, bloqueio por governanca e resposta normalizada.

### B1-T02

- **ID**: `B1-T02`
- **Nome**: hierarquia de flags e politica fail-closed
- **Objetivo**: definir a ordem de verificacao entre flag global, flags por modulo e previsao de chave por unidade, com comportamento `fail-closed`.
- **Por que ele vem nesta ordem**: ele depende do contrato central e protege o sistema antes de qualquer persistencia, job ou chamada externa.
- **Arquivos e modulos provaveis a tocar**:
  - `server/env.ts`
  - `server/config/`
  - `features/ai/`
  - `server/http/`
  - `docs/`
- **Dependencias**:
  - `B1-T01`
- **Riscos**:
  - flags inconsistentes entre ambientes;
  - comportamento diferente entre rota, action e job;
  - caminho pago escapar quando a flag estiver desligada.
- **Criterio de pronto**:
  - a hierarquia `global -> modulo -> unidade` fica definida;
  - estado ausente, invalido ou incoerente significa `desabilitado`;
  - o bloqueio acontece antes de qualquer execucao potencialmente paga.
- **Validacao esperada**:
  - a mesma regra de bloqueio pode ser reaproveitada nas camadas futuras do bloco.
- **Teste minimo esperado**:
  - teste unitario da matriz de flags;
  - teste de integracao para bloqueio antes de qualquer chamada ou job.

### B1-T03

- **ID**: `B1-T03`
- **Nome**: quotas base por modulo e unidade
- **Objetivo**: preparar a base minima de governanca de custo por modulo e por unidade.
- **Por que ele vem nesta ordem**: quota sem gating vira remendo; gating sem quota fica cego para custo.
- **Arquivos e modulos provaveis a tocar**:
  - `features/ai/`
  - `server/config/`
  - `server/audit/`
  - `server/http/`
  - `docs/`
- **Dependencias**:
  - `B1-T02`
  - `A4`
- **Riscos**:
  - degradacao silenciosa;
  - diferenca entre bloqueio por flag e bloqueio por custo;
  - quota virar regra visual e nao server-side.
- **Criterio de pronto**:
  - existe desenho implementavel de limite por modulo;
  - existe previsao de limite por unidade;
  - bloqueio por quota e motivo operacional ficam definidos;
  - nenhum consumo pago ocorre quando a quota bloquear.
- **Validacao esperada**:
  - o sistema sabe responder por que bloqueou: flag, quota ou indisponibilidade.
- **Teste minimo esperado**:
  - teste unitario de decisao de quota;
  - teste de integracao de bloqueio por quota antes de job ou chamada externa.

---

## 6. Estrategia de implementacao por PR ou slice

### PR 1 - Contrato central de IA

- cobre `B1-T01`
- entrega pequena:
  - organiza a fronteira `features/ai` vs `server/integrations/ai`
  - documenta a orquestracao central
  - prepara a base de auditoria e bloqueio
- validade:
  - pequena
  - reversivel
  - sem tocar schema

### PR 2 - Flags e fail-closed

- cobre `B1-T02`
- entrega pequena:
  - centraliza a hierarquia de flags
  - define o comportamento `fail-closed`
  - impede qualquer caminho pago ou job quando desligado
- validade:
  - pequena
  - diretamente testavel
  - critica para seguranca operacional

### PR 3 - Quotas base e bloqueio por custo

- cobre `B1-T03`
- entrega pequena:
  - define quotas base por modulo
  - prepara previsao de quotas por unidade
  - separa bloqueio por quota de bloqueio por flag
- validade:
  - pequena
  - reversivel
  - pronta para evoluir nas camadas seguintes

Se o time preferir slices ainda menores:

- PR 1A: contrato interno e responsabilidade de orquestracao
- PR 1B: pontos de auditoria minima previstos
- PR 2A: flag global e flags por modulo
- PR 2B: comportamento `fail-closed`
- PR 3A: envelope conceitual de quota
- PR 3B: degradacao minima e motivo de bloqueio

---

## 7. Estrategia minima de testes do sprint

### Unitario

- decisao da matriz de flags
- comportamento `fail-closed`
- decisao de quota por modulo
- decisao de quota por unidade no envelope inicial

### Integracao

- bloqueio antes de qualquer chamada externa quando `ai.enabled=false`
- bloqueio antes de qualquer job quando modulo estiver desligado
- bloqueio por quota antes de consumo

### Contrato

- entrada e saida do contrato central de IA
- envelope de bloqueio com motivo explicito
- envelope minimo de quota e degradacao

### Autorizacao

- neste sprint, apenas o necessario para provar que o backend e a autoridade do bloqueio
- nao inclui ainda contexto multiunidade completo

### Smoke interno ou administrativo

- verificacao interna de que o sistema expoe estado coerente de:
  - desabilitado por flag
  - desabilitado por inconsistencia
  - bloqueado por quota

---

## 8. Riscos do Sprint 1

### Acoplamento prematuro ao provider

Se `B1-T01` ficar fraco, o adaptador real da Camada 4 pode nascer contaminando o dominio.

### Gating incompleto

Se `B1-T02` nao cobrir todos os pontos de entrada, pode surgir chamada paga ou job com IA desligada.

### Flags inconsistentes

Se a hierarquia nao ficar unica e centralizada, cada superficie futura pode interpretar habilitacao de modo diferente.

### Quota sem efeito real

Se `B1-T03` nascer como conceito apenas visual, o custo continua sem governanca real.

### Auditoria minima insuficiente

Mesmo sendo sprint inicial, ele ja precisa prever o minimo de rastreabilidade para erro, bloqueio e motivo operacional.

### Abrir superficie cedo demais

Qualquer UI ou surface desnecessaria neste sprint amplia risco sem agregar valor fundacional.

---

## 9. Sinal de saida do Sprint 1

O Sprint 1 pode ser considerado concluido quando:

- o contrato central de IA estiver implementavel e claro;
- a hierarquia de flags estiver centralizada;
- o comportamento `fail-closed` estiver definido e validado;
- o backend bloquear qualquer caminho pago, job ou retry com IA desligada;
- quotas base por modulo estiverem definidas;
- a previsao de quota por unidade estiver preparada;
- os testes minimos do sprint estiverem executaveis;
- o sprint nao tiver puxado schema, job real, adaptador final ou UX final de blocos seguintes.

---

## 10. Pre-condicao para abrir o Sprint 2

O Sprint 2 so deve abrir quando o Sprint 1 tiver validado de forma objetiva:

- contrato central de IA coerente;
- gating server-side unico;
- bloqueio de custo e consumo pago funcionando no nivel da fundacao;
- motivos de bloqueio distinguindo flag, inconsistencia e quota;
- trilha minima prevista para auditoria e erro;
- ausencia de acoplamento UI -> provider.

Com isso validado, o proximo sprint pode abrir com seguranca o inicio da Camada 2, especialmente:

- `B1-T04`
- `B1-T05`
- `B1-T06`

