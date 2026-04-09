# Fase 3 - Bloco 5 - Suite Minima de Testes

## Objetivo

Este documento registra a suite minima reconhecivel do **Bloco 5 da Fase 3**, cobrindo o fechamento, a observabilidade minima e a governanca consolidada da fase sobre os blocos 1 a 4 ja estabilizados.

Ele existe para deixar explicito:

- qual recorte de testes protege o fechamento da Fase 3;
- quais invariantes continuam obrigatorios em multiunidade, imagem e insight preditivo;
- quais sinais administrativos minimos sustentam a baseline da fase;
- o que ainda nao entra como provider real, billing real ou painel final.

## Scripts reconheciveis do bloco e da fase

- `npm run test:phase3:block5`
- `npm run test:phase3`

## Recorte executado pelo script

- `tests/server/ai/*.test.ts`
- `tests/server/multiunit/*.test.ts`
- `tests/server/appointments/*.test.ts`
- `tests/server/documents/*.test.ts`
- `tests/server/tutor/*.test.ts`
- `tests/server/phase3-governance.test.ts`
- `tests/server/phase3-block*.test.ts`

## O que a suite cobre

### Governanca consolidada da Fase 3

- existe um snapshot unico de governanca da fase, combinando fundacao de IA, contexto multiunidade, sinais minimos de imagem, insight preditivo e auditoria;
- o snapshot continua protegido por permissao alta de sistema;
- o admin consegue ler status consolidado, alertas abertos, backlog humano, feedback operacional e fail-closed sem virar painel final;
- a fase permanece com baseline observavel e economicamente controlada.

### Regressao dos blocos anteriores

- gating server-side e `fail-closed` continuam ativos;
- quotas, consentimento, retencao, auditoria e eventos seguem coerentes com o envelope de IA;
- leitura multiunidade continua baseada em contexto resolvido no servidor;
- o primeiro corte assistivo de imagem continua com revisao humana obrigatoria;
- o primeiro insight preditivo continua em modo de recomendacao, sem automacao.

### Superficies internas minimas

- `/admin/sistema` continua mostrando diagnostico minimo da fundacao e agora tambem o snapshot consolidado da fase;
- `GET /api/admin/system/phase3-foundation-diagnostics` continua servindo o diagnostico de base;
- `GET /api/admin/system/phase3-governance` expõe a leitura consolidada do fechamento da fase;
- os smokes dos blocos 1 a 5 continuam reconheciveis como recortes tecnicos separados.

## Invariantes protegidos

- IA desligada ou mal configurada continua significando bloqueio, nunca execucao permissiva;
- multiunidade continua falhando fechado quando o contexto da sessao nao resolve;
- imagem continua assistiva, auditavel e dependente de revisao humana;
- insight preditivo continua explicavel, por unidade e sem acao autonoma;
- fallback continua conceitual e documentado, sem troca real entre vendors;
- a baseline da Fase 3 continua sem provider real, billing real ou painel operacional final.

## O que a suite ainda NAO cobre

- provider real de imagem ou preditivo;
- billing real e reconciliacao de custo por vendor;
- fallback real entre vendors;
- agendamento diario automatico de insights;
- painel final consolidado de IA ou multiunidade;
- automacao de agenda, preco, estoque ou comunicacao;
- homologacao operacional completa em host como parte do runner automatizado.

## Evidencias complementares

- [PHASE3_PLAN.md](../PHASE3_PLAN.md)
- [docs/phase3-block5-exit-checklist.md](./phase3-block5-exit-checklist.md)
- [docs/phase3-baseline.md](./phase3-baseline.md)
- [docs/phase3-approval-board.md](./phase3-approval-board.md)
