# Phase 3 Block 1 Approval Round

Data da ultima revisao: 2026-04-07

## Objetivo

Esta rodada curta existe para transformar as tres pendencias criticas da Fase 3 em decisao humana formal:

- `B1` consentimento para analise de imagem;
- `B2` retencao de imagem e resultados;
- `C1` compartilhamento de cliente e pet entre unidades.

Ela deve ser lida em conjunto com:

- [PHASE3_PLAN.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/PHASE3_PLAN.md)
- [docs/phase3-decision-matrix.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-decision-matrix.md)
- [docs/phase3-approval-board.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-approval-board.md)

Esta rodada nao implementa nada.
Ela apenas fecha o gate documental do Bloco 1 da Fase 3.

---

## Itens submetidos a aprovacao

### B1 - Consentimento para analise de imagem

- **ID**: `B1`
- **Tema**: consentimento para analise de imagem
- **Decisao recomendada**: opt-in por fluxo com finalidade explicita
- **Alternativas possiveis**:
  - consentimento geral no cadastro
  - opt-in por fluxo
  - opt-in por fluxo com finalidade explicita
- **Trade-off principal**: mais seguranca juridica e menos ambiguidade, com mais friccao operacional
- **Status sugerido**: `aprovado`
- **Resposta esperada do decisor**:
  - `aprovado`
  - `aprovado com ajustes`
  - `rejeitado`
  - `pendente`

### B2 - Retencao de imagem e resultados

- **ID**: `B2`
- **Tema**: retencao de imagem e resultados de IA
- **Decisao recomendada**: reter imagem original somente quando operacionalmente necessaria, reter resultado interpretado, descartar payload bruto por padrao e aplicar expiracao automatica para artefatos tecnicos
- **Alternativas possiveis**:
  - reter tudo
  - reter original + interpretado
  - retencao minima com expiracao automatica
- **Trade-off principal**: menos risco juridico e menos custo, com menos material bruto para debugging
- **Status sugerido**: `aprovado com ajustes`
- **Resposta esperada do decisor**:
  - `aprovado`
  - `aprovado com ajustes`
  - `rejeitado`
  - `pendente`

### C1 - Compartilhamento de cliente e pet entre unidades

- **ID**: `C1`
- **Tema**: compartilhamento de cliente e pet entre unidades
- **Decisao recomendada**: modelo mestre com vinculo por unidade
- **Alternativas possiveis**:
  - totalmente segregado por unidade
  - compartilhado com visibilidade controlada
  - modelo mestre com vinculo por unidade
- **Trade-off principal**: evita duplicidade e preserva operacao local, mas exige modelagem e autorizacao mais cuidadosas
- **Status sugerido**: `aprovado com ajustes`
- **Resposta esperada do decisor**:
  - `aprovado`
  - `aprovado com ajustes`
  - `rejeitado`
  - `pendente`

---

## Recomendacao por item

### B1

- **Status final recomendado para ratificacao humana**: `aprovado`
- **Leitura executiva**: o consentimento deve nascer mais conservador do que generico. Opt-in por fluxo com finalidade explicita reduz ambiguidade juridica e evita que o primeiro corte de imagem comece com base fraca.

### B2

- **Status final recomendado para ratificacao humana**: `aprovado com ajustes`
- **Leitura executiva**: a direcao de retencao minima com expiracao automatica esta madura o suficiente, mas ainda precisa de tres parametros curtos para virar politica fechada:
  - prazo base de retencao;
  - excecoes de retencao;
  - autoridade para retencao estendida.

### C1

- **Status final recomendado para ratificacao humana**: `aprovado com ajustes`
- **Leitura executiva**: o modelo mestre com vinculo por unidade e o melhor equilibrio entre identidade unica e operacao local, mas ainda precisa de tres limites curtos:
  - visibilidade entre unidades;
  - regra de edicao cross-unit;
  - ownership principal do cadastro.

---

## Resposta consolidada do decisor

Ratificacao humana registrada nesta rodada:

- `B1`: `aprovado`
- `B2`: `aprovado com ajustes`
- `C1`: `aprovado com ajustes`

Pacote ratificado:

- `B1`
  - analise de imagem so pode ocorrer com opt-in por fluxo e por finalidade explicita;
  - o consentimento deve ser separado de aceites genericos de cadastro;
  - a UI deve deixar explicito que o uso e assistivo e nao diagnostico.
- `B2`
  - imagem original so e retida quando houver necessidade operacional real;
  - resultado interpretado pode ser retido;
  - payload bruto de provider deve ser descartado por padrao;
  - artefatos tecnicos devem expirar automaticamente.
- `C1`
  - adotar modelo mestre com vinculo por unidade.

---

## Ajustes exigidos

Estes ajustes so se aplicam se o decisor marcar `aprovado com ajustes`.

### B2

- prazo base de retencao tecnica: `180 dias`;
- excecoes permitidas: auditoria formal, incidente operacional, contestacao documentada, exigencia regulatoria ou contratual especifica;
- quem pode autorizar retencao estendida: perfil administrativo global com trilha de auditoria obrigatoria.

### C1

- visibilidade entre unidades: perfis locais so veem registros vinculados a propria unidade; visao cross-unit apenas para perfis globais explicitamente autorizados;
- edicao cross-unit: so a unidade vinculada ao registro pode editar dados operacionais locais; alteracao estrutural cross-unit apenas por papel global autorizado;
- ownership principal do cadastro: unidade de criacao inicial, com possibilidade de reatribuicao auditada por papel global.

---

## Decisao sobre o Bloco 1

### Estado formal atual

- **Bloco 1 autorizado**

### Justificativa curta

O gate abriu porque as tres pendencias criticas receberam ratificacao humana formal nesta rodada e sairam de `pendente` sem nenhum item `rejeitado`.

### Condicao objetiva para abrir o gate

O pacote ratificado que autoriza o Bloco 1 ficou assim:

- `B1`: `aprovado`
- `B2`: `aprovado com ajustes`
- `C1`: `aprovado com ajustes`
- nenhum dos tres marcado como `rejeitado`

### Leitura executiva

O Bloco 1 da Fase 3 esta documentalmente destravado, mas a autorizacao nao altera as regras ja aprovadas para governanca de IA:

- IA segue desligada por padrao;
- backend segue como autoridade;
- `ai.enabled`, `ai.imageAnalysis.enabled` e `ai.predictiveInsights.enabled` continuam obrigatorios;
- comportamento `fail-closed`;
- nenhuma chamada paga, job, retry ou consumo em background quando a IA estiver desligada.
