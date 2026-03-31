# ADR 009 — Zod será a camada oficial de contratos e validação do PetOS

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/002-nextjs-app-router-route-handlers.md`, `docs/decisions/003-server-side-business-rules.md`

---

## 1. Contexto

O PetOS possui fluxos com forte dependência de dados corretos e consistentes, incluindo:

- autenticação;
- agendamento;
- check-in;
- cadastros de cliente e pet;
- mudanças de status;
- financeiro;
- pagamentos;
- webhooks;
- documentos e uploads;
- integrações futuras com IA.

Como o sistema será implementado em **Next.js + TypeScript**, era necessário definir uma estratégia clara para:

- validar entradas;
- padronizar contratos;
- reduzir divergência entre frontend e backend;
- manter coerência entre tipos e regras de entrada;
- melhorar previsibilidade para humanos e agentes de IA.

---

## 2. Problema

A decisão precisava responder:

> Qual será a camada oficial de validação e contratos de dados do PetOS?

Sem uma decisão explícita, o projeto correria risco de:

- validações espalhadas em formatos diferentes;
- contratos implícitos e frágeis;
- validação manual inconsistente;
- divergência entre frontend, Route Handlers e domínio;
- maior chance de erro de integração;
- dificuldade para manter tipagem e validação sincronizadas.

---

## 3. Alternativas consideradas

## A. Zod como camada oficial de validação
Uso de schemas Zod como base para contratos de entrada e validação de dados.

### Vantagens
- ótima integração com TypeScript;
- boa ergonomia para schemas;
- permite inferência de tipos;
- favorece compartilhamento controlado entre camadas;
- combina bem com React Hook Form;
- se encaixa bem em handlers, serviços e domínio.

### Desvantagens
- requer disciplina para organizar schemas por domínio;
- pode haver tentação de centralizar schemas demais sem critério.

## B. Validação manual espalhada pelo projeto
Uso de validação escrita “na mão” em cada formulário, handler ou caso de uso.

### Vantagens
- aparente flexibilidade local.

### Desvantagens
- alta duplicação;
- inconsistência;
- pouca previsibilidade;
- maior risco de erro;
- pior manutenção.

## C. Biblioteca alternativa como padrão principal
Uso de outra biblioteca de validação como referência principal.

### Vantagens
- possíveis recursos específicos em alguns cenários.

### Desvantagens
- menos alinhamento com a base já considerada;
- menor coerência com o ecossistema já definido para o projeto;
- custo de padronização desnecessário neste momento.

---

## 4. Decisão

## Decisão aceita
No PetOS, o **Zod** será a **camada oficial de contratos e validação de dados**.

Isso significa que:

- payloads de entrada devem ser validados com Zod;
- contratos críticos entre UI, API e domínio devem preferir schemas Zod;
- formulários interativos devem usar Zod integrado ao React Hook Form quando aplicável;
- validações sensíveis do servidor não devem depender apenas do cliente.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Integração forte com TypeScript
O PetOS depende de tipagem consistente. O Zod permite:
- validar em runtime;
- inferir tipos em tempo de desenvolvimento;
- reduzir divergência entre contrato e implementação.

### 5.2. Coerência entre camadas
O mesmo schema pode ajudar a alinhar:
- entrada de formulário;
- payload de API;
- validação em Route Handlers;
- contratos de caso de uso;
- normalização de integração.

### 5.3. Redução de duplicação
Ter uma camada oficial de validação evita múltiplos padrões concorrentes.

### 5.4. Melhor base para revisão e IA
Com contratos explícitos, fica mais fácil:
- revisar código;
- testar;
- gerar código assistido;
- detectar inconsistências.

---

## 6. Consequências práticas

A partir desta decisão:

- validações críticas devem usar Zod;
- handlers devem validar entrada com schemas explícitos;
- formulários podem usar os mesmos contratos ou contratos derivados quando fizer sentido;
- o projeto deve evitar validação manual “solta” como regra geral;
- agentes de IA devem assumir Zod como padrão de contrato do projeto.

---

## 7. Regras decorrentes desta decisão

## 7.1. Backend
- Route Handlers devem validar entrada com Zod;
- dados externos não devem ser confiados sem validação;
- integrações críticas devem validar payloads relevantes;
- erros de validação devem ser tratados de forma consistente.

## 7.2. Frontend
- formulários interativos devem preferir Zod com React Hook Form;
- validação no frontend melhora UX, mas não substitui validação no servidor;
- o schema de UI pode ser adaptado, desde que não contradiga o contrato real do servidor.

## 7.3. Domínio
- contratos sensíveis de domínio podem usar schemas específicos;
- regras de negócio continuam pertencendo ao domínio e ao servidor;
- Zod ajuda a validar entrada e forma dos dados, mas não substitui a regra de negócio.

---

## 8. Organização recomendada

Os schemas devem ser organizados de forma clara, preferencialmente por domínio/capacidade.

Exemplos:
- `features/agenda/schemas.ts`
- `features/clientes/schemas.ts`
- `features/financeiro/schemas.ts`
- `server/contracts/`

### Evitar
- um único arquivo gigante de validação para o projeto inteiro;
- schemas sem contexto de domínio;
- validações duplicadas sem necessidade.

---

## 9. Exemplos práticos

## Exemplo 1: criação de agendamento
O payload de criação deve validar:
- cliente;
- pet;
- serviços;
- data/hora;
- observações quando aplicável.

Mesmo validado no frontend, o Route Handler deve validar novamente no servidor.

## Exemplo 2: check-in
O formulário pode validar campos e checklist com Zod no cliente.  
O servidor deve validar novamente o payload recebido.

## Exemplo 3: webhook
Mesmo sendo evento externo, o payload relevante deve ser validado antes de produzir efeito de domínio.

## Exemplo 4: atualização de status
A estrutura do input pode ser validada com Zod, mas a permissão da transição continua sendo regra de domínio do servidor.

---

## 10. O que esta decisão não significa

Esta decisão **não significa** que Zod substituirá:

- regras de negócio;
- autorização;
- transações;
- auditoria;
- integridade relacional.

Zod valida a **forma e consistência do dado de entrada**, mas:
- não decide permissão;
- não resolve domínio sozinho;
- não substitui o banco;
- não substitui a camada de aplicação.

---

## 11. Riscos conhecidos e mitigação

## Risco 1: schema duplicado demais
### Mitigação
- organizar por domínio;
- reutilizar quando fizer sentido;
- derivar schemas em vez de copiar cegamente.

## Risco 2: misturar contrato de UI com regra de domínio
### Mitigação
- lembrar que validação de forma não substitui regra de negócio;
- manter o servidor como autoridade final.

## Risco 3: excesso de centralização
### Mitigação
- evitar “arquivo global de schemas” sem organização;
- manter proximidade com o contexto de uso.

---

## 12. Revisão futura

Esta decisão só deve ser revista se houver mudança estrutural relevante de stack ou uma necessidade comprovada de outra camada principal de contratos.

No cenário atual do PetOS, ela permanece válida.

---

## 13. Resumo

No PetOS:

- **Zod** será a camada oficial de contratos e validação;
- o frontend pode usar Zod para UX;
- o backend deve usar Zod para validar entradas;
- o domínio continua responsável pela regra de negócio;
- a combinação melhora consistência, segurança e previsibilidade.
