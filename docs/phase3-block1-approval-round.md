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

Sem ratificacao humana explicita registrada no repositorio nesta rodada, o estado formal atual permanece:

- `B1`: `pendente`
- `B2`: `pendente`
- `C1`: `pendente`

Leitura pronta para decisao:

- se o decisor aceitar a recomendacao sem alterar a direcao material:
  - `B1` passa para `aprovado`
  - `B2` passa para `aprovado com ajustes`
  - `C1` passa para `aprovado com ajustes`
- se houver discordancia material em qualquer um dos tres:
  - o Bloco 1 continua bloqueado ate nova ratificacao

---

## Ajustes exigidos

Estes ajustes so se aplicam se o decisor marcar `aprovado com ajustes`.

### B2

- definir prazo base de retencao;
- definir excecoes de retencao;
- definir quem autoriza retencao estendida.

### C1

- definir visibilidade entre unidades;
- definir regra de edicao cross-unit;
- definir ownership principal do cadastro.

---

## Decisao sobre o Bloco 1

### Estado formal atual

- **Bloco 1 nao autorizado**

### Justificativa curta

O gate continua fechado porque as tres pendencias criticas ainda nao receberam ratificacao humana formal no repositorio:

- `B1`
- `B2`
- `C1`

### Condicao objetiva para abrir o gate

O Bloco 1 fica autorizado quando:

- `B1` sair de `pendente`;
- `B2` sair de `pendente`;
- `C1` sair de `pendente`;
- nenhum dos tres for marcado como `rejeitado`.

### Leitura executiva

Se o decisor adotar o pacote recomendado desta rodada sem alteracao material, o resultado esperado passa a ser:

- `B1`: `aprovado`
- `B2`: `aprovado com ajustes`
- `C1`: `aprovado com ajustes`
- **Bloco 1 autorizado**

