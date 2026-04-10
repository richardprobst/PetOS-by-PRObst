# Fase 4 - Assistente Virtual do Tutor

## 1. Contexto

O `PetOS_PRD.md` nao descreve uma Fase 4 formal. Depois da Fase 3, o PRD lista apenas itens de roadmap futuro, incluindo:

- wearables para pets;
- gamificacao para tutores;
- mercado de produtos personalizados;
- assistente virtual por voz.

Esta fase nasce da autorizacao explicita para abrir o item de roadmap **assistente virtual por voz** sem reabrir a fundacao dos blocos anteriores.

## 2. Ambiguidade assumida de forma conservadora

O PRD so descreve o item como:

- interacao por voz para agendamentos e consultas.

Como nao ha especificacao detalhada de produto, esta fase adota um recorte minimo, reversivel e auditavel:

- superficie apenas no portal do tutor;
- entrada por texto ou voz no navegador, com envio de **transcricao** ao servidor;
- consultas apenas sobre dados proprios do tutor;
- agendamento apenas em modo **assistido**, com confirmacao explicita;
- backend continua sendo a autoridade de disponibilidade, ownership e criacao;
- sem provider real obrigatorio, sem billing real e sem retencao de audio bruto no servidor.

## 3. Objetivo da fase

Entregar o primeiro corte controlado do assistente virtual do PetOS, reutilizando a fundacao de IA fail-closed ja existente para:

- responder consultas proprias do tutor;
- montar rascunho assistido de agendamento;
- exigir confirmacao explicita antes da criacao;
- manter trilha auditavel, quotas e bloqueio por flag;
- nao confundir esse corte com um copiloto autonomo ou omnichannel.

## 4. Escopo aprovado da Fase 4

### 4.1. Dentro do escopo

- novo modulo de IA `VIRTUAL_ASSISTANT`;
- gating server-side e quota propria por modulo;
- contrato provider-neutral do assistente;
- intents iniciais:
  - proximos agendamentos;
  - resumo financeiro proprio;
  - status de waitlist;
  - documentos pendentes;
  - report cards proprios;
  - rascunho assistido de agendamento;
  - ajuda;
- rota do tutor protegida para interpretar e confirmar pedidos;
- painel minimo no portal do tutor;
- historico minimo e telemetria de uso derivados da auditoria existente, sem audio bruto;
- leitura administrativa minima do uso do assistente em `/admin/sistema`;
- snapshot minimo de validacao operacional com alertas e proximos passos em `/admin/sistema`;
- suite reconhecivel da fase;
- checklist formal de saida e baseline documental da fase.

### 4.2. Fora do escopo

- provider real de voz ou LLM;
- transcricao server-side de audio bruto;
- automacao sem confirmacao;
- assistente em superfices administrativas, WhatsApp ou canais externos;
- memoria conversacional persistida;
- billing real;
- scheduler ou jobs autonomos;
- novas frentes do roadmap futuro.

## 5. Guardrails obrigatorios

- `AI_ENABLED` continua sendo gate global;
- `AI_VIRTUAL_ASSISTANT_ENABLED` continua obrigatorio;
- `AI_VIRTUAL_ASSISTANT_BASE_QUOTA` continua obrigatorio;
- ausencia, valor invalido ou quota exaurida bloqueiam por `fail-closed`;
- o servidor nao recebe nem persiste audio bruto;
- o historico minimo do assistente deriva da auditoria existente e nao vira memoria conversacional livre;
- o assistente nao cria atendimento sem confirmacao explicita;
- ownership e permissao do tutor continuam validados no servidor;
- a fase nao reabre a Fase 3 nem muda a baseline multiunidade.

## 6. Entregas da fase

- `features/assistant/` como dominio do assistente virtual do tutor;
- rota `POST /api/tutor/virtual-assistant`;
- painel `TutorVirtualAssistantPanel` em `/tutor`;
- snapshot minimo de uso do assistente no portal do tutor e em `/admin/sistema`;
- suite `npm run test:phase4`;
- [docs/phase4-test-suite.md](./docs/phase4-test-suite.md);
- [docs/phase4-exit-checklist.md](./docs/phase4-exit-checklist.md);
- [docs/phase4-baseline.md](./docs/phase4-baseline.md);
- [docs/phase4-operational-validation.md](./docs/phase4-operational-validation.md).

## 7. Gate de validacao

Checks minimos da fase:

- `npm run test:phase4`
- `npm run typecheck`
- `npm test`
- `npm run build`

## 8. Sinal de saida da fase

A fase so pode ser considerada concluida quando:

- o assistente virtual responder consultas proprias do tutor sem provider real;
- o rascunho assistido de agendamento exigir confirmacao explicita;
- o historico minimo e a telemetria permanecerem auditaveis sem audio bruto;
- flags, quota e auditoria continuarem coerentes com a fundacao de IA;
- a rota e a UI permanecerem protegidas e conservadoras;
- a documentacao deixar claro o que esta e o que nao esta entregue.
