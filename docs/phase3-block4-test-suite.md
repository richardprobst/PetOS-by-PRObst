# Fase 3 - Bloco 4 - Suite Minima de Testes

## Objetivo

Este documento registra a suite minima reconhecivel do **Bloco 4 da Fase 3**, cobrindo o primeiro corte de analise preditiva do PetOS sobre a fundacao de IA, multiunidade e agenda ja estabilizada nos blocos anteriores.

Ele existe para deixar explicito:

- qual recorte de testes protege o Bloco 4;
- quais invariantes do insight preditivo continuam obrigatorios;
- quais superficies administrativas entram no smoke do bloco;
- o que ainda nao e coberto como automacao, provider real ou painel final de insights.

## Script reconhecivel do bloco

- `npm run test:phase3:block4`

## Recorte executado pelo script

- `tests/server/ai/*.test.ts`
- `tests/server/appointments/*.test.ts`
- `tests/server/phase3-block4-smoke.test.ts`

## O que a suite cobre

### Primeiro insight preditivo

- primeiro corte restrito a `APPOINTMENT_DEMAND_FORECAST`;
- insight explicado por unidade, janela historica e horizonte de 7 dias;
- saida preditiva continua em modo de recomendacao, sem automacao;
- feedback operacional minimo (`PENDING`, `ACKNOWLEDGED`, `ACTION_PLANNED`, `NOT_USEFUL`) fica persistido e auditavel.

### Integracao com a fundacao da Fase 3

- gating server-side e `fail-closed` continuam ativos no caminho preditivo;
- envelope provider-neutral da IA continua sendo reutilizado;
- eventos, auditoria, retencao e snapshot operacional continuam coerentes com a fundacao do Bloco 1;
- leitura multiunidade continua respeitando o contexto resolvido no servidor.

### Superficies administrativas minimas

- `/admin/agenda` mostra o snapshot preditivo sem virar painel final;
- rotas internas administrativas permitem listar, gerar e registrar feedback;
- o insight continua restrito ao contexto interno e nao abre automacao comercial, de estoque ou de precificacao.

## Invariantes protegidos

- o primeiro insight continua sendo previsao de demanda de agenda por unidade;
- sem provider real, sem billing real e sem automacao ativa;
- unidade sem historico suficiente continua degradando com fallback explicito, sem fingir alta confianca;
- feedback operacional nao altera regra de negocio automaticamente;
- leitura cross-unit continua bloqueada por padrao e so abre quando o contexto global autorizado permite;
- o bloco continua provider-neutral e assistivo.

## O que a suite ainda NAO cobre

- processamento agendado diario real;
- insights de churn, estoque ou preco;
- provider externo real para analise preditiva;
- dashboard final de insights;
- automacao de agenda, preco, estoque ou comunicacao;
- Bloco 5 de observabilidade e governanca final de custo.

## Evidencias complementares

- [PHASE3_PLAN.md](../PHASE3_PLAN.md)
- [docs/phase3-decision-matrix.md](./phase3-decision-matrix.md)
- [docs/phase3-approval-board.md](./phase3-approval-board.md)
- [docs/phase3-block4-exit-checklist.md](./phase3-block4-exit-checklist.md)
