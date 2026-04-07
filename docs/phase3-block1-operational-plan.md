# Phase 3 Block 1 Operational Plan

Data da ultima revisao: 2026-04-07

## 1. Objetivo do Bloco 1

O Bloco 1 da Fase 3 existe para construir a fundacao tecnica e operacional que permitira abrir:

- multiunidade operacional completa no Bloco 2;
- analise de imagem no Bloco 3;
- analise preditiva e insights no Bloco 4.

Este bloco nao entrega a experiencia final dessas frentes.
Ele prepara os contratos, gates, limites e trilhas de governanca para que os proximos blocos nao nascam acoplados, inseguros ou caros demais.

O Bloco 1 faz:

- fundacao de IA assistiva;
- fundacao de multiunidade;
- fundacao de governanca, auditoria e observabilidade minima.

O Bloco 1 nao faz:

- fluxo final de analise de imagem;
- painel final de insights;
- reescrita dos modulos atuais para multiunidade completa;
- automacao critica baseada em IA;
- qualquer entrega que contradiga o principio de IA desligada por padrao.

Para o backlog tecnico executavel deste bloco, use tambem:

- [docs/phase3-block1-technical-backlog.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-technical-backlog.md)

---

## 2. Escopo incluido

Entram no Bloco 1:

### 2.1. Fundacao de IA

- contrato conceitual do modulo `features/ai`;
- contrato conceitual do adaptador em `server/integrations/ai`;
- desenho inicial de `features/ai/vision` como subdominio preparado, sem fluxo final;
- desenho inicial de `features/insights` como superficie futura de snapshots e recomendacoes, sem insight entregue;
- hierarquia de flags:
  - `ai.enabled`
  - `ai.imageAnalysis.enabled`
  - `ai.predictiveInsights.enabled`
  - previsao de flag por unidade;
- politica de `fail-closed`;
- regras-base de gating server-side antes de chamada externa, job, retry ou consumo pago;
- desenho conceitual de quotas por modulo e por unidade;
- persistencia minima conceitual para execucoes, resultados, metadados, custo e auditoria;
- fallback conceitual minimo e degradacao explicita.

### 2.2. Fundacao de multiunidade

- desenho inicial do contexto de unidade na sessao;
- regras-base de escopo por unidade no servidor;
- ownership principal de cliente/pet na unidade de criacao;
- visibilidade cross-unit apenas para papeis globais autorizados;
- edicao estrutural cross-unit apenas por papel global autorizado;
- contrato conceitual de `features/multiunit`;
- pontos esperados de impacto em autorizacao, filtros e dashboards;
- troca manual de contexto como direcao inicial.

### 2.3. Fundacao de governanca e observabilidade

- auditoria minima das tentativas e execucoes de IA;
- eventos minimos de uso, custo, erro, fallback e bloqueio por flag;
- politica minima de rastreabilidade de provider, modelo, unidade, usuario e resultado interpretado;
- criterios minimos de desligamento operacional rapido;
- hipoteses e metricas iniciais de observacao do bloco.

---

## 3. Escopo excluido

### 3.1. Fica para o Bloco 2 - Multiunidade operacional completa

- propagar multiunidade por todos os modulos operacionais;
- dashboards consolidados completos;
- adaptacao final de agenda, financeiro, estoque, comunicacao, tutor e relatorios para operacao multiunidade;
- regras finais de C2 e C3 aplicadas em toda a superficie do sistema.

### 3.2. Fica para o Bloco 3 - Analise de imagem

- primeiro caso de uso final de imagem;
- UX final de analise de imagem;
- fila real e execucao real de analise de imagem;
- exibicao final de resultado para operador ou tutor;
- aprovacao humana aplicada ao fluxo final.

### 3.3. Fica para o Bloco 4 - Analise preditiva e insights

- primeiro insight entregue ao usuario;
- dataset final de predicao;
- cron real de recalculo;
- painel final de insights;
- qualquer simulacao ou automacao derivada.

### 3.4. Fica para o Bloco 5 - Fechamento, observabilidade e governanca final

- observabilidade completa da Fase 3;
- tuning de quotas e custo em producao;
- alertas finais e operacao de incidentes amadurecida;
- baseline final de regressao da Fase 3;
- politicas finais de desligamento por valor entregue ou baixo retorno.

---

## 4. Contratos iniciais previstos

Esta secao descreve contratos conceituais e responsabilidades.
Nao define interfaces de codigo nem schema final.

### 4.1. `features/ai`

Responsabilidade:

- orquestrar o uso interno de IA no produto;
- validar gating antes de qualquer execucao;
- separar decisao de negocio de chamada externa;
- encaminhar persistencia, auditoria e custo para as camadas apropriadas.

Deve conhecer:

- flags globais, por modulo e por unidade;
- quotas e limites operacionais;
- contexto de usuario, unidade e finalidade;
- estado de execucao: bloqueada, pendente, concluida, falhou, descartada.

Nao deve:

- chamar provider diretamente a partir de UI;
- decidir regra critica de negocio;
- contornar flags ou quotas;
- persistir payload bruto por padrao.

### 4.2. `features/ai/vision`

Responsabilidade:

- preparar o subdominio que sustentara analise de imagem;
- normalizar pedidos futuros de analise em termos internos do PetOS;
- carregar requisitos de consentimento, finalidade explicita e revisao humana.

Deve conhecer:

- consentimento valido para a finalidade;
- politica de retencao aprovada;
- linguagem assistiva e nao diagnostica;
- visibilidade inicial restrita a operador e auditoria.

Nao deve:

- definir o caso de uso final do Bloco 3;
- assumir diagnostico veterinario;
- expor resultado clinico ao tutor no primeiro corte.

### 4.3. `features/insights`

Responsabilidade:

- preparar o subdominio que sustentara insights preditivos;
- definir o envelope interno de geracao, snapshot e consumo de recomendacoes;
- separar recomendacao de automacao.

Deve conhecer:

- flags do modulo preditivo;
- contexto por unidade;
- janela temporal e versao de geracao;
- estado de disponibilidade do insight.

Nao deve:

- entregar painel final neste bloco;
- decidir politica comercial automaticamente;
- operar sem base historica e sem trilha de explicacao.

### 4.4. `features/multiunit`

Responsabilidade:

- resolver contexto de unidade na sessao;
- centralizar regras-base de visibilidade, ownership e escopo;
- apoiar autorizacao e filtros cross-unit;
- preparar a abertura do Bloco 2 sem espalhar regra em componentes.

Deve conhecer:

- unidade ativa da sessao;
- papeis locais vs globais;
- unidade de ownership principal do cadastro;
- motivo e trilha de reatribuicao ou override.

Nao deve:

- reimplementar todos os modulos operacionais neste bloco;
- tratar multiunidade como filtro somente visual;
- conceder visibilidade cross-unit por padrao.

### 4.5. `server/integrations/ai`

Responsabilidade:

- encapsular o provider de IA por adaptador interno;
- minimizar payload enviado;
- normalizar resposta tecnica para consumo interno;
- emitir metadados minimos de custo, provider, modelo, erro e fallback.

Deve conhecer:

- provider ativo;
- estrategia de hospedagem inicial por cloud API;
- politica de timeout, erro, retry e fallback conceitual;
- obrigacao de falhar fechado.

Nao deve:

- conhecer regra de negocio do PetOS;
- gravar resultado final sozinho no dominio;
- continuar executando quando a flag estiver desligada.

### 4.6. Feature flags e gating por modulo e unidade

Regras conceituais iniciais:

1. `ai.enabled=false` bloqueia tudo.
2. `ai.imageAnalysis.enabled=false` bloqueia apenas imagem.
3. `ai.predictiveInsights.enabled=false` bloqueia apenas preditivo.
4. Chave por unidade so pode habilitar uma feature se a chave global e a chave do modulo estiverem habilitadas.
5. Flag ausente, invalida ou inconsistente significa `desabilitado`.
6. O backend e a unica autoridade para permitir execucao, job, retry e chamada externa.
7. Quota estourada deve degradar de forma explicita e auditavel.

---

## 5. Backlog ordenado do Bloco 1

### Item 1 - Congelar fronteiras do bloco

- **Objetivo**: transformar o escopo do Bloco 1 em referencia de execucao sem contaminar os blocos seguintes.
- **Dependencias**: gate documental do Bloco 1 autorizado.
- **Risco principal**: misturar fundacao com entrega final de imagem, insights ou multiunidade completa.
- **Criterio de pronto**: backlog do bloco fechado, limites escritos e sem ambiguidade entre Bloco 1, 2, 3, 4 e 5.

### Item 2 - Formalizar o contrato central de IA

- **Objetivo**: definir como `features/ai` e `server/integrations/ai` se relacionam, incluindo estados, responsabilidades e pontos de auditoria.
- **Dependencias**: `A1`, `A2`, `A5`.
- **Risco principal**: acoplamento precoce ao provider ou mistura de regra de negocio com adaptador.
- **Criterio de pronto**: responsabilidades de orquestracao, integracao, auditoria e persistencia minima descritas e aceitas.

### Item 3 - Formalizar feature flags, gating e quotas

- **Objetivo**: descrever a hierarquia de habilitacao, a ordem de verificacao e a degradacao por custo ou indisponibilidade.
- **Dependencias**: item 2.
- **Risco principal**: consumo pago silencioso ou bloqueio inconsistente entre UI e backend.
- **Criterio de pronto**: sequencia de gating definida, politica `fail-closed` registrada e quotas previstas por modulo e unidade.

### Item 4 - Descrever persistencia minima de execucao, resultado e custo

- **Objetivo**: definir o minimo que precisara existir para execucoes de IA, resultados interpretados, custo e trilha de auditoria.
- **Dependencias**: itens 2 e 3; `B2`.
- **Risco principal**: modelar armazenamento demais antes do fluxo real ou guardar dado tecnico em excesso.
- **Criterio de pronto**: envelopes conceituais de job, resultado, uso/custo, metadado tecnico e auditoria descritos sem fixar schema prematuro.

### Item 5 - Descrever fallback e operacao de incidente

- **Objetivo**: preparar o comportamento minimo para erro de provider, quota estourada, indisponibilidade e desligamento rapido.
- **Dependencias**: itens 2, 3 e 4; `A4`.
- **Risco principal**: reexecucao silenciosa, custo descontrolado ou UX enganosa.
- **Criterio de pronto**: caminhos conceituais para falha, bloqueio, degradacao e desligamento rapido documentados.

### Item 6 - Formalizar o contexto de unidade na sessao

- **Objetivo**: definir como a sessao conhece a unidade ativa e como isso impacta escopo, visibilidade e auditoria.
- **Dependencias**: `C1`, `C3`.
- **Risco principal**: trocar contexto de forma opaca e permitir vazamento cross-unit.
- **Criterio de pronto**: unidade ativa, troca manual de contexto, papeis globais e eventos de troca descritos de forma operacional.

### Item 7 - Formalizar ownership e visibilidade base de cliente/pet

- **Objetivo**: fechar a regra-base que sustentara multiunidade sem reescrever os modulos ainda.
- **Dependencias**: item 6; `C1`.
- **Risco principal**: identidade duplicada, edicao cross-unit indevida ou ownership ambiguo.
- **Criterio de pronto**: ownership principal, visibilidade local, visibilidade global e edicao estrutural cross-unit descritos com clareza.

### Item 8 - Mapear pontos de impacto em autorizacao, filtros e dashboards

- **Objetivo**: identificar onde o contexto de unidade e o gating de IA afetarao camadas server-side existentes.
- **Dependencias**: itens 3, 6 e 7.
- **Risco principal**: esquecer pontos de enforcement e deixar multiunidade ou IA apenas na superficie visual.
- **Criterio de pronto**: mapa de impacto por camada definido para auth, RBAC, filtros server-side, dashboards e trilha de auditoria.

### Item 9 - Definir observabilidade minima e metricas do bloco

- **Objetivo**: listar os eventos e sinais minimos que mostrarao se o Bloco 1 esta seguro e governavel.
- **Dependencias**: itens 3, 4, 5, 6 e 8.
- **Risco principal**: sair da fundacao sem conseguir provar bloqueio por flag, custo por unidade ou tentativa negada.
- **Criterio de pronto**: eventos minimos, metrica minima e hipoteses de observacao registradas para IA e multiunidade.

### Item 10 - Preparar o handoff para implementacao

- **Objetivo**: transformar este plano em base de execucao do bloco, com ordem clara e gate de saida para o Bloco 2.
- **Dependencias**: itens 1 a 9.
- **Risco principal**: iniciar implementacao com backlog solto ou sem criterio de encerramento.
- **Criterio de pronto**: plano operacional fechado, backlog ordenado, riscos conhecidos e sinal de saida para o Bloco 2 documentado.

---

## 6. Dependencias e pre-condicoes

### 6.1. O que o Bloco 1 assume como resolvido

- baseline atual publicada e funcional;
- homologacao operacional separada da Fase 3;
- `A1`, `A5`, `D2` e `E3` aprovados;
- `B1` aprovado;
- `B2` e `C1` aprovados com ajustes;
- Bloco 1 autorizado documentalmente;
- diretriz de IA desligada por padrao preservada.

### 6.2. O que ainda precisa ser observado antes de implementar

- budget inicial da camada de IA;
- shortlist do provider cloud inicial, com termos e DPA aceitaveis;
- refinamento curto dos ajustes de `A2`, `A3`, `A4`, `C2`, `C3`, `D3` e `E2`;
- compatibilidade do modelo atual de sessao e RBAC com contexto multiunidade;
- alinhamento do evento de auditoria com a infraestrutura atual do projeto.

### 6.3. O que nao deve virar bloqueio artificial do Bloco 1

- escolha do primeiro caso final de imagem;
- escolha do primeiro insight final do preditivo;
- painel final de custos da Fase 3;
- UI final de operador ou tutor para as features futuras.

---

## 7. Riscos do Bloco 1

### 7.1. Arquitetura

- criar abstracao demais antes do primeiro fluxo real;
- espalhar regra de IA e multiunidade fora dos modulos de fundacao;
- fixar schema cedo demais por medo de mudanca.

### 7.2. Seguranca e LGPD

- capturar consentimento de forma insuficiente para o uso futuro de imagem;
- guardar payload bruto por inercia tecnica;
- nao registrar trilha suficiente de quem autorizou retencao estendida ou override cross-unit.

### 7.3. Custo

- permitir chamada paga mesmo com flag desligada;
- nao prever quota por unidade;
- nao registrar custo minimo por modulo e provider.

### 7.4. Operacao

- estados de erro e bloqueio nao ficarem claros para suporte;
- fallback virar comportamento silencioso;
- desligamento operacional rapido nao funcionar na pratica.

### 7.5. Multiunidade

- contexto de unidade ficar apenas na UI;
- visibilidade cross-unit vazar para perfil local;
- ownership ficar ambiguo em cliente/pet.

### 7.6. Governanca

- nao conseguir provar que a IA estava desligada;
- nao conseguir explicar por que uma execucao foi bloqueada ou permitida;
- abrir o Bloco 2 sem fundacao suficiente de sessao, ownership e auditoria.

---

## 8. Criterios de pronto do Bloco 1

O Bloco 1 pode ser considerado encerrado quando, na futura implementacao:

- o gating de IA estiver definido e aplicado no servidor;
- a hierarquia `global -> modulo -> unidade` estiver clara e `fail-closed`;
- nenhuma chamada paga, job, retry ou consumo em background ocorrer com IA desligada;
- o adaptador interno de IA estiver separado da regra de negocio;
- a persistencia minima conceitual de execucao, resultado interpretado, custo e auditoria estiver implementada sem excesso de retencao;
- o contexto de unidade da sessao estiver definido como autoridade server-side;
- ownership, visibilidade local e override global de cliente/pet estiverem cobertos na fundacao;
- os pontos de impacto em autorizacao, filtros e dashboards estiverem mapeados e tratados no nivel de fundacao;
- eventos minimos de auditoria, uso, erro, fallback e bloqueio por flag estiverem definidos;
- a documentacao do bloco estiver sincronizada com o que foi realmente entregue.

---

## 9. Sinal de saida para o Bloco 2

O Bloco 2 pode abrir sem ambiguidade quando o Bloco 1 tiver deixado pronto:

- contexto de unidade autoritativo na sessao e no servidor;
- regra-base de ownership e visibilidade de cliente/pet estabilizada;
- trilha auditavel para troca de contexto, override global e retencao estendida;
- gating e quotas de IA governados no servidor, mesmo que as features futuras continuem desligadas;
- mapa claro dos modulos que precisarao ser adaptados para multiunidade;
- refinamentos restantes de `C2` e `C3` traduzidos em regras executaveis;
- ausencia de pendencia critica nova em LGPD, custo ou isolamento cross-unit.

Quando esses pontos estiverem entregues, o Bloco 2 pode avancar para adaptar agenda, financeiro, estoque, comunicacao, tutor e dashboards a um modelo multiunidade completo sem reabrir a fundacao.
