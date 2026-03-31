# ADR 008 — Webhooks devem ser idempotentes, validados, rastreáveis e auditáveis

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `SECURITY.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/003-server-side-business-rules.md`, `docs/decisions/007-storage-for-documents-and-media-outside-db.md`

---

## 1. Contexto

O PetOS prevê integração com serviços externos, especialmente em contextos como:

- pagamentos;
- confirmação e atualização de transações;
- reembolsos;
- reconciliação financeira;
- eventos assíncronos de provedores externos.

Essas integrações dependem fortemente de **webhooks**, que são eventos enviados por terceiros para notificar mudanças de estado relevantes.

No contexto do PetOS, webhooks podem impactar diretamente:

- status financeiro;
- transações;
- depósitos;
- reembolsos;
- auditoria;
- confiabilidade operacional.

Era necessário formalizar como o sistema deve tratar webhooks para evitar inconsistência, duplicidade e risco de fraude.

---

## 2. Problema

A decisão precisava responder:

> Como o PetOS deve tratar webhooks recebidos de serviços externos para garantir segurança, consistência e rastreabilidade?

Sem uma decisão clara, o sistema correria risco de:

- processar o mesmo evento várias vezes;
- aceitar chamadas falsas ou adulteradas;
- gerar efeitos financeiros duplicados;
- perder trilha de auditoria;
- ficar sem base para reconciliação posterior;
- depender de tratamento informal e pouco confiável.

---

## 3. Alternativas consideradas

## A. Tratar webhooks como chamadas simples, sem rigidez formal
Receber o payload, processar diretamente e seguir o fluxo com validação mínima.

### Vantagens
- implementação aparentemente rápida;
- menor esforço inicial.

### Desvantagens
- alto risco de duplicidade;
- maior vulnerabilidade a chamadas indevidas;
- fragilidade operacional;
- baixa confiabilidade para pagamentos e integrações sensíveis.

## B. Tratar webhooks como eventos críticos, com validação, idempotência e trilha
Receber, validar, registrar, processar e auditar os webhooks como eventos sensíveis da arquitetura.

### Vantagens
- maior segurança;
- melhor consistência de domínio;
- melhor base para reconciliação;
- menor risco de efeitos duplicados;
- melhor suporte para diagnóstico e auditoria.

### Desvantagens
- exige mais disciplina de implementação;
- demanda mais cuidado com modelo de dados, logs e fluxo assíncrono.

---

## 4. Decisão

## Decisão aceita
No PetOS, **todo webhook relevante deve ser tratado como evento crítico**, obedecendo obrigatoriamente aos seguintes princípios:

- **validação**
- **idempotência**
- **rastreabilidade**
- **auditabilidade**

Isso vale especialmente para webhooks de:

- gateways de pagamento;
- reembolsos;
- atualizações financeiras;
- provedores externos que afetem estado de domínio sensível.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Webhooks não são confiáveis por natureza sem controle
Eles podem:
- chegar duplicados;
- chegar fora de ordem;
- falhar parcialmente;
- ser reenviados pelo provedor;
- sofrer tentativas indevidas de chamada.

### 5.2. O domínio do PetOS é sensível a duplicidade
Uma atualização financeira duplicada pode causar:
- cobrança indevida;
- estado inconsistente;
- erro em relatórios;
- erro em comissão;
- erro em reconciliação.

### 5.3. Segurança
Webhooks precisam ser tratados como entrada externa potencialmente hostil até prova em contrário.

### 5.4. Auditoria e suporte
Quando algo der errado, o time precisa conseguir responder:
- o que chegou;
- quando chegou;
- de onde veio;
- se foi validado;
- se foi processado;
- que efeitos gerou;
- por que foi rejeitado ou reprocessado.

---

## 6. Regras decorrentes desta decisão

## 6.1. Validação obrigatória
Todo webhook sensível deve validar:
- assinatura;
- segredo compartilhado;
- origem conforme capacidade do provedor;
- estrutura mínima esperada do payload;
- tipo de evento quando aplicável.

Se a validação falhar:
- o evento não deve gerar efeito de domínio;
- a ocorrência deve ser registrada para análise.

## 6.2. Idempotência obrigatória
O sistema deve ser capaz de receber o mesmo evento mais de uma vez sem gerar efeitos duplicados.

### Exemplos de proteção
- uso de identificador único do evento;
- verificação de processamento anterior;
- persistência de chave de idempotência;
- bloqueio lógico de reprocessamento indevido.

## 6.3. Registro e rastreabilidade
Todo webhook relevante deve poder registrar:
- gateway/provedor;
- tipo de evento;
- identificador externo;
- payload bruto ou sanitizado conforme política;
- data/hora de recebimento;
- status de processamento;
- mensagem de erro, se houver;
- vínculo com entidade afetada quando possível.

## 6.4. Auditabilidade
Se o webhook gerar impacto de negócio, deve ser possível auditar:
- o evento recebido;
- a validação;
- o processamento;
- o efeito no domínio;
- a reconciliação posterior.

---

## 7. Modelo operacional recomendado

Fluxo recomendado para webhooks críticos:

1. Receber o evento
2. Validar assinatura/segredo
3. Registrar recebimento
4. Verificar idempotência
5. Normalizar e validar estrutura útil
6. Processar regra de domínio
7. Persistir efeito e status de processamento
8. Registrar falha ou sucesso
9. Permitir reconciliação e reprocessamento controlado se necessário

---

## 8. Exemplos práticos

## Exemplo 1: pagamento aprovado
Se o gateway enviar duas vezes o mesmo evento de pagamento aprovado:
- o primeiro evento produz o efeito esperado;
- o segundo não pode gerar nova confirmação financeira duplicada.

## Exemplo 2: webhook inválido
Se chegar um webhook com assinatura incorreta:
- o evento deve ser rejeitado;
- o sistema deve registrar a tentativa;
- nenhum efeito de negócio deve ocorrer.

## Exemplo 3: reembolso
Se o gateway notificar um reembolso:
- o evento deve ser registrado;
- a transação correspondente deve ser localizada;
- o efeito financeiro deve ser aplicado uma única vez;
- a trilha deve permanecer auditável.

---

## 9. Relação com pagamentos e reconciliação

Esta decisão é especialmente importante para:
- Mercado Pago;
- Stripe;
- futuros gateways ou integrações financeiras.

### Regra obrigatória
A resposta síncrona de uma API de pagamento **não deve ser tratada sozinha como verdade final absoluta**.

Sempre que o fluxo depender de webhook:
- o estado final deve considerar a notificação confiável e o processo de reconciliação.

---

## 10. Persistência e estrutura de dados

A arquitetura deve prever tabelas ou estruturas adequadas para:
- logs de webhook;
- status de processamento;
- vínculo com gateway;
- vínculo com transação;
- histórico de falha;
- possibilidade de reconciliação.

Essas estruturas devem conversar com:
- entidades financeiras;
- auditoria;
- eventuais retentativas controladas.

---

## 11. Riscos conhecidos e mitigação

## Risco 1: duplicidade de efeito financeiro
### Mitigação
- idempotência forte;
- chave de evento externo;
- validação de estado antes de atualizar domínio.

## Risco 2: aceitar webhook falso
### Mitigação
- validação por assinatura/segredo;
- rejeição explícita;
- logs de tentativa.

## Risco 3: perda de rastreabilidade
### Mitigação
- persistir recebimento;
- registrar resultado de processamento;
- associar ao domínio quando possível.

## Risco 4: payloads sensíveis em log
### Mitigação
- armazenar com critério;
- sanitizar quando necessário;
- proteger acesso aos logs.

---

## 12. O que esta decisão não exige imediatamente

Esta decisão **não obriga** a construir uma infraestrutura altamente sofisticada de eventos no MVP.

Ela exige, no mínimo:
- validação;
- idempotência;
- registro;
- consistência.

A complexidade pode crescer depois, mas esses princípios já são obrigatórios desde o início em fluxos sensíveis.

---

## 13. Revisão futura

Esta decisão só deve ser revista se a arquitetura deixar de depender de webhooks para integrações críticas, o que é improvável no contexto atual do PetOS.

No cenário atual, ela permanece válida.

---

## 14. Resumo

No PetOS, webhooks críticos devem ser tratados como eventos sensíveis de integração.

Isso significa que eles precisam ser:

- validados,
- idempotentes,
- rastreáveis,
- auditáveis.

Sem isso, o risco operacional, financeiro e de segurança se torna alto demais para o produto.
