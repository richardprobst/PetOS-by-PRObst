# Phase 3 Approval Board

Data da ultima revisao: 2026-04-07

## Objetivo

Este documento consolida a matriz da Fase 3 em um quadro de aprovacao final, pronto para decisao humana.

Ele nao autoriza implementacao automaticamente.
Ele existe para permitir uma leitura executiva e auditavel do que:

- ja pode ser aprovado;
- ja tem direcao aceita, mas ainda pede ajuste curto;
- ainda bloqueia a abertura do Bloco 1;
- pode ser decidido depois da fundacao.

Leitura dos status:

- `aprovado`
- `aprovado com ajustes`
- `pendente`
- `rejeitado`

Os status abaixo sao **propostos para aprovacao** a partir de [PHASE3_PLAN.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/PHASE3_PLAN.md) e [docs/phase3-decision-matrix.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-decision-matrix.md).

Para a rodada curta de ratificacao humana que fecha apenas `B1`, `B2` e `C1`, use tambem:

- [docs/phase3-block1-approval-round.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-approval-round.md)

---

## Grupo A - Estrategia de IA

### A1 - Arquitetura de integracao de IA

- **ID da decisao**: `A1`
- **Nome da decisao**: arquitetura de integracao de IA
- **Resumo curto**: define se a Fase 3 nasce acoplada a um provider ou com contrato interno reutilizavel
- **Status**: `aprovado`
- **Decisao recomendada**: provider unico por tras de adaptador interno
- **Ajustes exigidos**: nenhum antes do Bloco 1
- **O que fica bloqueado se permanecer pendente**: desenho do modulo `features/ai` e estrategia de fallback
- **Observacoes executivas**: decisao de baixo arrependimento e alta protecao contra lock-in precoce

### A2 - Modelo de hospedagem da IA

- **ID da decisao**: `A2`
- **Nome da decisao**: cloud API vs self-hosted vs hibrido
- **Resumo curto**: define onde a IA roda e qual custo/operacao inicial a Fase 3 aceita
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: comecar com cloud API, preservando arquitetura compativel com hibrido
- **Ajustes exigidos**:
  - fechar budget inicial;
  - definir criterio de troca futura para hibrido;
  - registrar exigencia minima de DPA/termos do provider escolhido.
- **O que fica bloqueado se permanecer pendente**: budget inicial e stack operacional de jobs de IA
- **Observacoes executivas**: a direcao esta suficientemente clara para a fundacao, mas o provider final ainda nao precisa ser escolhido agora

### A3 - Modo de execucao da IA

- **ID da decisao**: `A3`
- **Nome da decisao**: modo de execucao
- **Resumo curto**: define o equilibrio entre UX, latencia e robustez operacional
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: execucao mista
- **Ajustes exigidos**:
  - fechar o criterio que separa fluxo leve on-demand de processamento assincrono;
  - definir estados minimos de job para UI e auditoria.
- **O que fica bloqueado se permanecer pendente**: desenho final das rotas e dos jobs
- **Observacoes executivas**: nao bloqueia o Bloco 1 se a direcao mista for aceita

### A4 - Fallback e controle de custo

- **ID da decisao**: `A4`
- **Nome da decisao**: fallback e quotas
- **Resumo curto**: define como a IA degrada e como o custo e governado
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: quotas por feature e por unidade, com degradacao explicita e fallback tecnico opcional
- **Ajustes exigidos**:
  - definir teto inicial por feature;
  - definir metrica minima por unidade;
  - definir quem pode elevar ou reduzir quota.
- **O que fica bloqueado se permanecer pendente**: rollout controlado e aprovacao financeira detalhada
- **Observacoes executivas**: a governanca de custo precisa entrar cedo, mas os numeros finos podem ser fechados logo apos a fundacao

### A5 - Politica de habilitacao e desligamento da IA

- **ID da decisao**: `A5`
- **Nome da decisao**: politica de habilitacao e desligamento da IA
- **Resumo curto**: garante que a IA seja controlavel, auditavel, desligavel e financeiramente governavel
- **Status**: `aprovado`
- **Decisao recomendada**:
  - IA desligada por padrao;
  - backend como autoridade;
  - `ai.enabled` obrigatorio;
  - `ai.imageAnalysis.enabled` obrigatorio;
  - `ai.predictiveInsights.enabled` obrigatorio;
  - chave por unidade prevista desde a fundacao;
  - comportamento `fail-closed`;
  - nenhuma chamada paga, job, retry ou consumo em background quando desligada.
- **Ajustes exigidos**: nenhum antes do Bloco 1
- **O que fica bloqueado se permanecer pendente**: desenho de `features/ai`, rollout controlado, governanca de custo e gate financeiro da Fase 3
- **Observacoes executivas**: tratar como prerequisito obrigatorio de governanca financeira

---

## Grupo B - Consentimento, LGPD e retencao

### B1 - Consentimento para analise de imagem

- **ID da decisao**: `B1`
- **Nome da decisao**: consentimento para uso de imagem
- **Resumo curto**: define a base juridica e operacional para analise de imagem
- **Status**: `aprovado`
- **Decisao recomendada**: opt-in por fluxo e por finalidade explicita
- **Ajustes exigidos**: nenhum antes do Bloco 1
- **O que fica bloqueado se permanecer pendente**: inicio de qualquer implementacao de analise de imagem
- **Observacoes executivas**:
  - consentimento deve ser separado de aceites genericos de cadastro;
  - a UI deve deixar explicito que o uso e assistivo e nao diagnostico.

### B2 - Retencao de imagem e resultados

- **ID da decisao**: `B2`
- **Nome da decisao**: retencao e descarte
- **Resumo curto**: define o que o sistema guarda, por quanto tempo e o que deve ser descartado
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: reter imagem original quando necessaria, reter resultado interpretado e descartar payload bruto por padrao, com expiracao automatica
- **Ajustes exigidos**:
  - prazo base de retencao tecnica: `180 dias`;
  - excecoes permitidas: auditoria formal, incidente operacional, contestacao documentada, exigencia regulatoria ou contratual especifica;
  - retencao estendida apenas por perfil administrativo global com trilha de auditoria obrigatoria.
- **O que fica bloqueado se permanecer pendente**: desenho de storage e metadados de IA
- **Observacoes executivas**: a direcao conservadora de LGPD e custo foi formalmente ratificada

### B3 - Visibilidade dos resultados

- **ID da decisao**: `B3`
- **Nome da decisao**: visibilidade de resultados de IA
- **Resumo curto**: define quem pode ver o resultado e em qual nivel
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: operador e auditoria no primeiro corte; tutor fora do primeiro corte
- **Ajustes exigidos**:
  - fechar regra de excepcao para exibicao futura ao tutor;
  - fechar nivel de detalhe visivel em auditoria.
- **O que fica bloqueado se permanecer pendente**: regra final de exibicao no portal do tutor
- **Observacoes executivas**: nao bloqueia a fundacao se a restricao inicial for aceita

---

## Grupo C - Multiunidade

### C1 - Compartilhamento de cliente e pet

- **ID da decisao**: `C1`
- **Nome da decisao**: compartilhamento de cliente e pet entre unidades
- **Resumo curto**: define identidade, ownership, historico e risco de vazamento cross-unit
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: modelo mestre com vinculo por unidade
- **Ajustes exigidos**:
  - perfis locais so veem registros vinculados a propria unidade; visao cross-unit apenas para perfis globais explicitamente autorizados;
  - so a unidade vinculada ao registro pode editar dados operacionais locais; alteracao estrutural cross-unit apenas por papel global autorizado;
  - ownership principal do cadastro na unidade de criacao inicial, com reatribuicao auditada por papel global.
- **O que fica bloqueado se permanecer pendente**: inicio do Bloco 2 e parte da fundacao de multiunidade
- **Observacoes executivas**: a ratificacao preserva identidade unica sem abrir visibilidade irrestrita entre unidades

### C2 - Compartilhamento de estoque, equipe e servicos

- **ID da decisao**: `C2`
- **Nome da decisao**: compartilhamento de ativos operacionais
- **Resumo curto**: define o que e central da rede e o que continua local por unidade
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: servicos com catalogo base e parametrizacao por unidade; equipe e estoque segregados
- **Ajustes exigidos**:
  - fechar se funcionario pode atuar em multiplas unidades no mesmo modelo de identidade;
  - fechar se o catalogo base de servicos sera opcional ou obrigatorio.
- **O que fica bloqueado se permanecer pendente**: escopo detalhado do Bloco 2
- **Observacoes executivas**: a direcao e suficientemente boa para fundacao, mas precisa refino antes da implementacao multiunidade completa

### C3 - Visao global, papeis globais e troca de contexto

- **ID da decisao**: `C3`
- **Nome da decisao**: sessao e dashboards multiunidade
- **Resumo curto**: define como um usuario muda de unidade e quando pode ver consolidado
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: troca manual de contexto com papeis globais limitados
- **Ajustes exigidos**:
  - aprovar lista inicial de papeis globais;
  - aprovar regra de dashboard consolidado por perfil.
- **O que fica bloqueado se permanecer pendente**: UX final de sessao multiunidade
- **Observacoes executivas**: nao bloqueia a fundacao se a troca manual de contexto for aceita como direcao

---

## Grupo D - Analise de imagem

### D1 - Primeiro corte de casos de uso

- **ID da decisao**: `D1`
- **Nome da decisao**: primeiro corte de analise de imagem
- **Resumo curto**: define qual caso de uso entra primeiro e evita abrir a frente mais sensivel cedo demais
- **Status**: `pendente`
- **Decisao recomendada**: comecar por galeria/metadados e verificacao assistida pre/post-servico; nao comecar por saude preliminar
- **Ajustes exigidos**:
  - aprovar o primeiro caso de uso exato;
  - aprovar o criterio de valor operacional para esse corte.
- **O que fica bloqueado se permanecer pendente**: backlog do Bloco 3
- **Observacoes executivas**: nao bloqueia o Bloco 1, mas bloqueia a abertura do Bloco 3

### D2 - Revisao humana

- **ID da decisao**: `D2`
- **Nome da decisao**: revisao humana dos resultados de imagem
- **Resumo curto**: define se a IA pode ou nao produzir resultado sem aprovacao humana
- **Status**: `aprovado`
- **Decisao recomendada**: revisao humana obrigatoria no primeiro corte
- **Ajustes exigidos**: nenhum antes do Bloco 1
- **O que fica bloqueado se permanecer pendente**: fluxo final de analise de imagem
- **Observacoes executivas**: decisao de baixo arrependimento e alto ganho de seguranca

### D3 - Linguagem obrigatoria de UI

- **ID da decisao**: `D3`
- **Nome da decisao**: linguagem obrigatoria de UI para imagem
- **Resumo curto**: impede leitura clinica indevida do resultado assistivo
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: aviso curto + rotulo assistivo + CTA de revisao humana
- **Ajustes exigidos**:
  - fechar texto juridico/operacional final;
  - definir onde o aviso sera obrigatorio.
- **O que fica bloqueado se permanecer pendente**: publicacao do fluxo final de imagem
- **Observacoes executivas**: nao bloqueia a fundacao

---

## Grupo E - Analise preditiva

### E1 - Primeiro insight preditivo

- **ID da decisao**: `E1`
- **Nome da decisao**: primeiro insight preditivo
- **Resumo curto**: define o caso de uso inicial com maior utilidade e menor risco
- **Status**: `pendente`
- **Decisao recomendada**: previsao de demanda de agenda por unidade
- **Ajustes exigidos**:
  - aprovar KPI de sucesso;
  - aprovar o dashboard inicial.
- **O que fica bloqueado se permanecer pendente**: backlog do Bloco 4
- **Observacoes executivas**: nao bloqueia o Bloco 1

### E2 - Escopo, janela historica e frequencia

- **ID da decisao**: `E2`
- **Nome da decisao**: recorte e frequencia dos insights
- **Resumo curto**: define a base minima de dado e a cadencia de recalculo
- **Status**: `aprovado com ajustes`
- **Decisao recomendada**: por unidade, com minimo de 6 meses de historico util e recalculo diario
- **Ajustes exigidos**:
  - aprovar fallback quando a unidade nao tiver historico suficiente;
  - aprovar janela minima alternativa para bases novas.
- **O que fica bloqueado se permanecer pendente**: cron e dataset final do Bloco 4
- **Observacoes executivas**: nao bloqueia a fundacao

### E3 - Natureza da saida preditiva

- **ID da decisao**: `E3`
- **Nome da decisao**: recomendacao vs simulacao vs automacao
- **Resumo curto**: define o limite entre apoio a decisao e acao automatica
- **Status**: `aprovado`
- **Decisao recomendada**: comecar em recomendacao, sem automacao no primeiro corte
- **Ajustes exigidos**: nenhum antes do Bloco 1
- **O que fica bloqueado se permanecer pendente**: UX final do painel de insights
- **Observacoes executivas**: decisao segura e coerente com o principio de IA assistiva

---

## Classificacao executiva

### A. Aprovado para seguir ao Bloco 1

- `A1` arquitetura de integracao de IA
- `A5` politica de habilitacao e desligamento da IA
- `B1` consentimento para analise de imagem
- `D2` revisao humana
- `E3` natureza da saida preditiva

### B. Aprovado com ajustes obrigatorios antes de implementar

- `A2` modelo de hospedagem da IA
- `A3` modo de execucao
- `A4` fallback e controle de custo
- `B2` retencao de imagem e resultados
- `B3` visibilidade dos resultados
- `C1` compartilhamento de cliente e pet entre unidades
- `C2` compartilhamento de estoque, equipe e servicos
- `C3` visao global, papeis globais e troca de contexto
- `D3` linguagem obrigatoria de UI
- `E2` escopo, janela historica e frequencia

### C. Pendencias criticas

- nenhuma pendencia critica aberta neste momento

### D. Pendencias nao bloqueantes

- `D1` primeiro corte de casos de uso de imagem
- `E1` primeiro insight preditivo

### E. Itens rejeitados

- nenhum item esta formalmente rejeitado neste momento

---

## Recomendacao consolidada para aprovacao da Fase 3

### Pacote minimo recomendado para aprovacao imediata

- aprovar `A1`, `A5`, `D2` e `E3`;
- aprovar `B1`;
- aceitar `A2`, `A3`, `A4`, `B2`, `B3`, `C1`, `C2`, `C3`, `D3` e `E2` como `aprovado com ajustes`.

### Pacote que pode ficar aprovado com ajustes

- hospedagem inicial por cloud API;
- execucao mista;
- quotas e fallback com refinamento curto de budget;
- visibilidade inicial restrita;
- modelo operacional de multiunidade para estoque/equipe/servicos;
- linguagem assistiva obrigatoria;
- janela historica inicial para preditivo.

### O que deve permanecer pendente

- escolha do primeiro caso exato de imagem;
- escolha do primeiro insight exato do preditivo.

### A Fase 3 pode iniciar o Bloco 1?

- **Sim**

### Se nao, quais decisoes ainda bloqueiam?

- nenhuma, desde que o pacote ratificado nesta rodada seja preservado

### Se sim no futuro, sob quais condicoes?

O Bloco 1 esta autorizado sob estas condicoes:

- `B1` mantido como `aprovado`;
- `B2` mantido como `aprovado com ajustes`;
- `C1` mantido como `aprovado com ajustes`;
- o pacote `A1`, `A2`, `A3`, `A4` e `A5` permanece formalmente aceito;
- a diretriz de IA desligada por padrao permanece inalterada.

---

## Gate formal para abertura do Bloco 1 da Fase 3

### Devem estar `aprovado` ou `aprovado com ajustes`

- `A1`
- `A2`
- `A3`
- `A4`
- `A5`
- `B1`
- `B2`
- `C1`

### Podem continuar pendentes no inicio do Bloco 1

- `B3`
- `C2`
- `C3`
- `D1`
- `D3`
- `E1`
- `E2`

### Condicoes minimas para sair do planejamento

- governanca financeira da IA aprovada com `A5`;
- direcao arquitetural de IA aceita;
- politica minima de consentimento e retencao aprovada;
- regra central de identidade multiunidade aprovada;
- nenhum item critico restante em `pendente`.

### Estado atual do gate

- **Bloco 1 autorizado**
- Ratificacao final registrada em [docs/phase3-block1-approval-round.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-block1-approval-round.md)
