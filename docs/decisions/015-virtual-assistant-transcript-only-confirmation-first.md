# ADR 015 - Assistente virtual usa transcript-only, provider-neutral e confirmacao explicita

## Status

Aceito

## Contexto

Depois do fechamento da Fase 3, o `PetOS_PRD.md` ainda nao traz uma Fase 4 formal. O item de roadmap futuro relacionado e apenas:

- assistente virtual por voz para agendamentos e consultas.

Essa descricao e insuficiente para justificar:

- provider real de voz ou LLM;
- armazenamento de audio;
- memoria conversacional;
- automacao autonoma de agendamento.

Ao mesmo tempo, a base do repositorio ja possui:

- fundacao de IA provider-neutral e fail-closed;
- portal do tutor com ownership server-side;
- criacao de agendamento ja protegida no backend.

## Decisao

O primeiro corte do assistente virtual do PetOS segue estas regras:

1. o escopo fica restrito ao portal do tutor;
2. o navegador pode capturar voz, mas o servidor recebe apenas transcricao;
3. o modulo usa a fundacao de IA existente como `VIRTUAL_ASSISTANT`;
4. o comportamento permanece provider-neutral e pode ser deterministico;
5. consultas ficam restritas a dados proprios do tutor;
6. agendamento funciona apenas em modo assistido;
7. nenhuma criacao e executada sem confirmacao explicita;
8. flags e quota continuam exigidas por `fail-closed`.

## Alternativas consideradas

### 1. Integrar imediatamente um provider real de voz/LLM

Rejeitada porque aumentaria risco, custo, retencao sensivel e ambiguidade sem especificacao suficiente de produto.

### 2. Construir um chatbot administrativo amplo

Rejeitada porque desviaria do item de roadmap escolhido, aumentaria superficie sensivel e misturaria escopos de tutor e operador.

### 3. Permitir criacao autonoma de agendamento a partir da fala

Rejeitada porque o PRD nao autoriza isso e o risco de erro operacional e alto.

## Consequencias

### Positivas

- abre o item de roadmap com risco controlado;
- reaproveita a fundacao da Fase 3;
- preserva ownership, auditoria e `fail-closed`;
- evita retencao desnecessaria de audio.

### Negativas

- a experiencia continua limitada;
- a qualidade do entendimento depende de parser deterministico e do navegador;
- canais externos e provider real continuam para uma aprovacao futura.

## Documentos relacionados

- `PetOS_PRD.md`
- `PHASE4_PLAN.md`
- `docs/architecture.md`
- `docs/domain-rules.md`
- `docs/environment-contract.md`
