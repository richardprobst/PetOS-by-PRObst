# Release Baseline

Nome sugerido da baseline: `v0.1.0-mvp-validated`

## O que esta baseline representa

Este documento marca o ponto em que o MVP do PetOS:

- ficou concluido no codigo;
- teve a estabilizacao automatizada concluida;
- teve a validacao manual em ambiente real concluida com sucesso;
- permaneceu dentro do recorte do MVP, sem abertura de Fase 2.

Para a baseline de fechamento da Fase 2, use [docs/phase2-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-baseline.md).

## O que ja foi validado

Esta baseline cobre, de forma objetiva:

- autenticacao, sessao e RBAC server-side;
- fluxos autenticados de `/admin` e `/tutor`;
- agenda, check-in e historico de status;
- coerencia entre status operacional e financeiro;
- financeiro basico e comissao no estado financeiro correto;
- comunicacao manual por WhatsApp Web e e-mail;
- portal do tutor basico e instalabilidade do PWA;
- bootstrap, checks automatizados e documentacao operacional.

## O que permanece fora do escopo

Continuam fora desta baseline:

- qualquer item de Fase 2;
- qualquer item de Fase 3;
- gateways financeiros e webhooks ativos em producao;
- CRM, automacoes, fiscal, estoque completo e PDV;
- multiunidade operacional completa e IA avancada.

## Proximo passo recomendado

O proximo passo mais sensato a partir desta baseline e um staging/deploy controlado, mantendo separadas:

- operacao e rollout do MVP validado;
- correcao de bug especifico de ambiente, se aparecer;
- planejamento formal da Fase 2, quando houver autorizacao explicita.
