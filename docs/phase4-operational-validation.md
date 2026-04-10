# Fase 4 - Validacao Operacional do Assistente Virtual

Data da ultima revisao: 2026-04-09

## Objetivo

Este documento guia a validacao operacional do primeiro corte do **assistente virtual do tutor**.

Ele existe para transformar a baseline tecnica da Fase 4 em uma rodada curta de observacao real, sem:

- abrir provider real;
- reter audio bruto;
- abrir memoria conversacional persistida;
- tratar o assistente como copiloto autonomo.

## Escopo desta validacao

Validar somente o recorte aprovado da Fase 4:

- consultas proprias do tutor;
- leitura de report cards proprios;
- rascunho assistido de agendamento;
- confirmacao explicita antes da criacao;
- leitura administrativa minima do uso em `/admin/sistema`.

## O que observar na operacao

### Sinais minimos de adocao

- houve interacoes reais nos ultimos 30 dias;
- existe pelo menos uma consulta respondida sem bloqueio;
- existe pelo menos um fluxo assistido de agenda exercitado;
- o canal de voz foi observado ao menos uma vez no navegador homologado.

### Sinais minimos de risco

- bloqueio recorrente por flag, quota ou gating;
- volume alto de `NEEDS_CLARIFICATION`;
- ausencia completa de uso por voz;
- ausencia completa de uso do caminho de agenda.

## Como ler `/admin/sistema`

Na secao **Assistente virtual do tutor**, a operacao deve acompanhar:

- `status` da validacao operacional;
- `voiceCoverageStatus`;
- taxa de bloqueio;
- taxa de esclarecimento;
- alertas abertos com `nextStep`.

### Interpretacao minima do status

- `NO_ACTIVITY`: ainda nao existe evidencia minima de uso real;
- `EARLY_USAGE`: o recorte esta em uso inicial e segue em homologacao guiada;
- `READY_WITH_GUARDRAILS`: o recorte tem uso recente suficiente para continuar operando de forma conservadora;
- `ATTENTION_REQUIRED`: os sinais atuais pedem ajuste antes de ampliar uso.

## Smoke manual recomendado

Executar pelo menos estes casos:

- consulta de proximos agendamentos por texto;
- consulta de report cards por texto;
- pedido assistido de agendamento com confirmacao explicita;
- um caso por voz no navegador homologado;
- validacao administrativa do resultado em `/admin/sistema`.

Use em conjunto com:

- [docs/manual-smoke-checklist.md](./manual-smoke-checklist.md)
- [docs/phase4-test-suite.md](./phase4-test-suite.md)

## Como classificar gaps

- `configuracao`: flag, quota, permissao ou navegador fora do esperado;
- `bug`: parser, ownership, confirmacao ou resposta divergente da baseline;
- `limitacao intencional`: fora do recorte transcript-only/assistido;
- `novo gate`: qualquer pedido de provider real, memoria persistida ou canal externo.

## Evidencias minimas desta rodada

- leitura administrativa minima do uso e da validacao em `/admin/sistema`;
- smoke automatizado da fase em [tests/server/phase4-smoke.test.ts](../tests/server/phase4-smoke.test.ts);
- suite reconhecivel `npm run test:phase4`;
- baseline da fase em [docs/phase4-baseline.md](./phase4-baseline.md).
