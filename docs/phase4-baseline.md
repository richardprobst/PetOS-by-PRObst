# Phase 4 Baseline

Nome sugerido da baseline: `v0.2.0-phase4-assistant`

## O que esta baseline representa

Este documento marca o ponto em que o PetOS abriu e fechou, de forma conservadora, o primeiro item do roadmap futuro: **assistente virtual por voz**.

No estado atual do repositorio, isso significa:

- assistente virtual limitado ao portal do tutor;
- entrada por texto ou voz no navegador, com envio de transcricao ao servidor;
- consultas sobre dados proprios do tutor;
- consultas sobre report cards proprios;
- rascunho assistido de agendamento com confirmacao explicita;
- historico minimo e telemetria de uso derivados da auditoria existente;
- integracao integral com a fundacao de IA fail-closed ja existente.

## O que ja esta consolidado

Esta baseline inclui:

- novo modulo `VIRTUAL_ASSISTANT` na fundacao de IA;
- flags e quota dedicadas por modulo;
- contrato provider-neutral do assistente;
- rota protegida do tutor para interpretar e confirmar pedidos;
- painel minimo no portal do tutor;
- leitura administrativa minima do uso do assistente em `/admin/sistema`;
- suite reconhecivel da fase e checklist formal de saida.

## O que permanece fora do escopo

Continuam fora desta baseline:

- provider real de voz ou LLM;
- retencao de audio bruto no servidor;
- memoria conversacional persistida;
- assistente omnichannel;
- automacao autonoma de agendamento;
- billing real;
- qualquer outro item do roadmap futuro ainda nao aprovado.

## Invariantes desta baseline

- o backend continua sendo a autoridade de criacao do agendamento;
- nenhum atendimento e criado sem confirmacao explicita;
- ownership do tutor continua validado no servidor;
- flags e quotas invalidas continuam bloqueando por `fail-closed`;
- a API continua operando sobre transcricao, e nao sobre binario de audio.
- o historico do assistente continua resumido e auditavel, sem guardar audio bruto nem conversa livre.

## Evidencias centrais

- [PHASE4_PLAN.md](../PHASE4_PLAN.md)
- [docs/phase4-test-suite.md](./phase4-test-suite.md)
- [docs/phase4-exit-checklist.md](./phase4-exit-checklist.md)
- [tests/server/phase4-smoke.test.ts](../tests/server/phase4-smoke.test.ts)

## Proximo passo recomendado

Depois desta baseline, o repositorio volta a exigir gate explicito antes de qualquer nova expansao.

Os proximos movimentos sensatos passam a ser:

1. validar em uso real se o historico minimo, os report cards e a leitura administrativa ja reduzem ambiguidade operacional;
2. medir se o modelo deterministico atual e suficiente antes de discutir provider real;
3. abrir qualquer ampliacao futura como nova fase ou novo item aprovado, sem tratar o assistente atual como copiloto autonomo ja resolvido.
