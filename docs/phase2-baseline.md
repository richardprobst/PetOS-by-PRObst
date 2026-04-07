# Phase 2 Baseline

Nome sugerido da baseline: `v0.2.0-phase2-complete`

## O que esta baseline representa

Este documento marca o ponto em que a Fase 2 do PetOS ficou fechada tecnicamente no repositorio, preservando a baseline do MVP validado e adicionando, no recorte previsto pelo PRD:

- base transacional compartilhada;
- financeiro expandido e fiscal minimo;
- documentos, assinaturas e midia protegidos;
- agenda avancada, waitlist e Taxi Dog operacional;
- portal do tutor ampliado;
- CRM e comunicacao ampliada;
- PDV e estoque;
- escalas, ponto e base de payroll.

## O que ja esta consolidado

No nivel de repositorio, esta baseline inclui:

- migrations, seed e RBAC coerentes para todos os blocos da Fase 2;
- regras sensiveis mantidas no servidor;
- auditoria em operacoes administrativas e financeiras criticas;
- checks automatizados verdes para schema, tipagem, lint, testes e build;
- smoke local dos dominios novos como recorte tecnico de fechamento da fase.

## O que permanece fora do escopo

Continuam fora desta baseline:

- itens da Fase 3, como analise de imagem, analise preditiva e multiunidade operacional completa;
- roadmap futuro, como wearables, gamificacao, mercado de produtos personalizados e assistente por voz;
- RH amplo, modulo trabalhista completo, ERP comercial amplo e supply chain complexo;
- automacoes massivas ou engine generica de marketing fora do recorte operacional ja implementado.

## Proximo passo recomendado

Com a baseline ja publicada e saudavel no host real, o proximo passo mais sensato deixa de ser rollout tecnico e passa a ser homologacao operacional guiada:

1. usar [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md) e [docs/phase2-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-smoke-checklist.md) como roteiro de uso real;
2. registrar gaps concretos de uso antes de abrir qualquer nova frente;
3. corrigir apenas bloqueios reais do MVP ou da baseline da Fase 2;
4. manter qualquer abertura de Fase 3 separada desta baseline, sem misturar homologacao com novo escopo.

Use tambem:

- [docs/operational-homologation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operational-homologation.md)
- [docs/operability.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operability.md)
