# Fase 4 - Suite Minima de Testes

## Objetivo

Este documento registra a suite minima reconhecivel da **Fase 4 - Assistente Virtual do Tutor**.

Ele existe para deixar explicito:

- qual recorte de testes protege o primeiro corte do assistente virtual;
- quais invariantes da fundacao de IA continuam obrigatorios;
- como o portal do tutor permanece protegido por ownership, confirmacao explicita e `fail-closed`;
- o que ainda nao entra como provider real, audio persistido ou copiloto autonomo.

## Script reconhecivel da fase

- `npm run test:phase4`

## Recorte executado pelo script

- `tests/server/assistant/*.test.ts`
- `tests/server/ai/*.test.ts`
- `tests/server/tutor/*.test.ts`
- `tests/server/phase4-smoke.test.ts`

## O que a suite cobre

### Assistente virtual do tutor

- interpretacao deterministica das intents iniciais do tutor;
- cobertura de `report cards` proprios como intent adicional do recorte;
- montagem de rascunho assistido de agendamento;
- parsing de referencias naturais de dia da semana e periodo do dia;
- manutencao explicita de campos pendentes;
- resposta de ajuda dentro do recorte aprovado;
- bloqueio rapido quando o modulo estiver desligado por flag;
- historico minimo e telemetria de uso derivados de `AuditLog`.

### Fundacao de IA reutilizada

- `VIRTUAL_ASSISTANT` continua provider-neutral;
- gating server-side e `fail-closed` continuam ativos;
- quota por modulo continua exigida;
- consentimento permanece `NOT_APPLICABLE` neste recorte;
- auditoria e eventos continuam coerentes com o envelope.

### Portal do tutor e smoke da fase

- a API aceita apenas transcricao no limite HTTP do tutor;
- confirmacao de agendamento continua separada da interpretacao;
- o primeiro corte permanece restrito a consultas proprias e agendamento assistido;
- o portal agora consegue exibir historico minimo do assistente sem memoria conversacional persistida;
- os testes do tutor continuam protegendo o ownership do portal.

## Invariantes protegidos

- o servidor continua sendo a autoridade do agendamento;
- nenhuma criacao ocorre sem confirmacao explicita;
- audio bruto nao entra no contrato HTTP do servidor;
- ausencia de flag ou quota valida bloqueia execucao;
- a telemetria do assistente deriva da auditoria existente e nao exige tabela propria;
- o assistente nao vira acesso amplo a dados administrativos.

## O que a suite ainda NAO cobre

- provider real de voz;
- transcricao automatica no backend;
- armazenamento de audio;
- memoria conversacional persistida;
- assistente em canais externos;
- automacao autonoma de agenda ou comunicacao.

## Evidencias complementares

- [PHASE4_PLAN.md](../PHASE4_PLAN.md)
- [docs/phase4-exit-checklist.md](./phase4-exit-checklist.md)
- [docs/phase4-baseline.md](./phase4-baseline.md)
