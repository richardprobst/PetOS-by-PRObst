# Pagamentos no PetOS

## 1. Objetivo deste documento

Este documento descreve a visão técnica e operacional do módulo de pagamentos do **PetOS**.

Ele existe para:
- consolidar regras e decisões relacionadas a pagamentos;
- orientar implementação e revisão técnica;
- conectar o domínio financeiro ao restante do sistema;
- reduzir ambiguidades em fluxos sensíveis;
- alinhar humanos e agentes de IA sobre comportamento esperado.

Este documento complementa, mas **não substitui**:
- `PetOS_PRD.md`
- `AGENTS.md`
- `SECURITY.md`
- `docs/architecture.md`
- `docs/domain-rules.md`
- ADRs relacionados a webhooks, autenticação, validação e status

Se houver conflito com o **PRD**, o **PRD vence**.

---

## 2. Escopo

O módulo de pagamentos do PetOS cobre principalmente:

- recebimento de valores de serviços;
- depósitos e pré-pagamentos;
- vínculo entre pagamento e atendimento;
- atualização de status financeiro;
- reembolsos;
- uso de créditos;
- reconciliação com gateways;
- webhooks de confirmação;
- rastreabilidade e auditoria.

### Fora do escopo inicial do MVP
- fiscal completo;
- automações avançadas de cobrança;
- cenários multiadquirente sofisticados além do necessário;
- lógica excessivamente complexa antes do core estar estável.

---

## 3. Gateways previstos

## 3.1. Mercado Pago
Previsto para:
- PIX;
- cartão;
- uso aderente ao mercado brasileiro;
- cenários de pagamento rápidos e familiares ao usuário local.

## 3.2. Stripe
Previsto para:
- cartão;
- cenários de recorrência futura;
- flexibilidade para integrações adicionais.

### Regra geral
A arquitetura deve suportar múltiplos gateways sem acoplamento indevido da regra de domínio a um provedor específico.

---

## 4. Princípios do módulo de pagamentos

## 4.1. Pagamento é evento de domínio sensível
Pagamentos afetam:
- atendimento;
- financeiro;
- comissão;
- reconciliação;
- relatórios;
- auditoria;
- experiência do tutor.

Portanto, qualquer implementação deve tratar pagamento como fluxo crítico.

## 4.2. Resposta síncrona não é verdade final absoluta
Sempre que o gateway depender de confirmação posterior:
- a resposta síncrona é apenas sinal inicial;
- o estado final deve considerar webhook e reconciliação.

## 4.3. Status operacional e status financeiro são distintos
Pagamento não deve ser confundido com o andamento operacional do atendimento.

## 4.4. Toda operação financeira precisa ser rastreável
Deve ser possível responder:
- quem iniciou;
- quando ocorreu;
- qual entidade foi impactada;
- qual transação externa está vinculada;
- qual foi o resultado;
- se houve reembolso, estorno ou falha.

---

## 5. Fluxos principais

## 5.1. Pagamento de atendimento
Fluxo conceitual:

1. sistema calcula ou recupera valor devido;
2. usuário escolhe método de pagamento;
3. sistema cria intenção/transação no gateway quando necessário;
4. gateway responde com estado inicial;
5. sistema registra tentativa/transação;
6. webhook e/ou reconciliação confirmam estado final;
7. financeiro é atualizado;
8. domínio reflete impacto adequado.

## 5.2. Depósito / pré-pagamento
Fluxo conceitual:

1. atendimento exige ou permite depósito;
2. cliente realiza pagamento parcial;
3. sistema registra depósito com vínculo ao agendamento;
4. valor pode ser abatido no fechamento do atendimento;
5. regra de perda, devolução ou crédito deve ser explícita.

## 5.3. Reembolso
Fluxo conceitual:

1. operação elegível a reembolso é identificada;
2. usuário com permissão inicia reembolso ou gateway informa evento;
3. sistema registra solicitação/execução;
4. webhook ou retorno do gateway confirma resultado;
5. transação e saldo são atualizados;
6. auditoria é registrada.

## 5.4. Uso de crédito do cliente
Fluxo conceitual:

1. cliente possui saldo válido;
2. sistema permite abatimento conforme regras;
3. uso do crédito é registrado;
4. transação financeira reflete a composição final;
5. histórico permanece auditável.

---

## 6. Status financeiros

A implementação deve tratar estado financeiro como conceito próprio.

### Exemplos de estados possíveis
- `Pendente`
- `Parcial`
- `Pago`
- `Faturado`
- `Reembolsado`
- `Estornado`
- `Recusado`
- `Expirado`
- `Isento`

### Observação
Os nomes finais podem variar conforme modelagem e PRD, mas a distinção conceitual deve permanecer clara.

---

## 7. Entidades de dados relacionadas

O módulo de pagamentos conversa com entidades como:

- `TransacoesFinanceiras`
- `Depositos`
- `Reembolsos`
- `CreditosCliente`
- `UsoCredito`
- `StatusPagamento`
- `MetodosPagamento`
- `Gateways_Pagamento`
- `Transacoes_Pagamento`
- `Webhook_Logs`
- `Agendamentos`
- `AgendamentoServicos`
- `LogsAuditoria`

### Regra importante
Dados financeiros críticos devem manter:
- vínculo com entidade de origem;
- identificadores externos quando existirem;
- histórico rastreável;
- consistência com status do domínio.

---

## 8. Webhooks

## 8.1. Regra obrigatória
Webhooks de pagamento devem ser:
- validados;
- idempotentes;
- rastreáveis;
- auditáveis.

## 8.2. O que validar
- assinatura/segredo;
- integridade mínima do payload;
- tipo de evento;
- vínculo com transação conhecida quando possível.

## 8.3. O que registrar
- provedor;
- identificador externo;
- tipo de evento;
- payload relevante;
- data/hora;
- resultado de validação;
- status de processamento;
- erro, se houver.

## 8.4. O que evitar
- atualizar domínio sem validação;
- confiar apenas em requisição síncrona;
- processar evento repetido como novo;
- perder trilha do que foi recebido.

---

## 9. Reconciliação

Reconciliação é o processo de comparar:
- o que o PetOS acredita;
- o que o gateway confirmou;
- o que foi efetivamente processado.

### Quando é importante
- pagamento aprovado no gateway, mas não refletido no sistema;
- evento duplicado;
- evento perdido;
- falha temporária de comunicação;
- divergência entre reembolso e status local.

### Estratégia mínima recomendada
- registrar transações externas;
- armazenar identificadores do gateway;
- manter logs de webhook;
- permitir análise e correção controlada;
- prever rotina de conferência quando necessário.

---

## 10. Depósitos, pré-pagamentos e no-show

## 10.1. Depósito
O depósito pode funcionar como:
- reserva;
- garantia contra no-show;
- abatimento parcial.

### Regras obrigatórias
- o sistema deve saber se o depósito:
  - é devolvível,
  - vira crédito,
  - é abatido,
  - é perdido em certas condições.

## 10.2. Pré-pagamento
O pré-pagamento representa quitação antecipada total ou parcial.

### Regras obrigatórias
- não confundir pagamento antecipado com serviço concluído;
- status financeiro e status operacional devem permanecer distintos.

## 10.3. No-show
Quando a política de no-show estiver ativa:
- o efeito financeiro deve ser explícito;
- perda de depósito ou cobrança deve seguir regra configurável;
- a trilha deve permanecer auditável.

---

## 11. Créditos do cliente

Créditos podem surgir de:
- reembolso parcial;
- saldo promocional;
- ajuste administrativo;
- conversão de depósito, quando aplicável.

### Regras obrigatórias
- manter saldo e histórico;
- impedir uso acima do saldo;
- registrar origem e consumo;
- evitar “sumir” com crédito sem trilha clara.

---

## 12. Segurança

## 12.1. Credenciais
- chaves de API e segredos devem ficar em ambiente;
- nunca expor segredos no cliente;
- separar ambiente local, teste e produção.

## 12.2. Autorização
Operações como:
- iniciar cobrança,
- registrar ajuste,
- confirmar manualmente,
- reembolsar,
- alterar vínculo financeiro

devem exigir permissão adequada no servidor.

## 12.3. Logs e dados sensíveis
- evitar logar dados sensíveis em excesso;
- registrar o necessário para suporte e auditoria;
- sanitizar payloads quando necessário.

## 12.4. Menor privilégio
Somente usuários com papel apropriado devem acessar fluxos financeiros sensíveis.

---

## 13. Relação com comissão

Pagamentos impactam comissão porque:

- a base da comissão depende do valor efetivamente faturado;
- descontos, reembolsos e ajustes podem alterar a base final;
- atendimento concluído sem pagamento confirmado não deve induzir cálculo definitivo errado.

### Regra obrigatória
Cálculo de comissão deve considerar o estado financeiro confiável da operação, não apenas estimativas de UI.

---

## 14. Relação com auditoria

Ações que devem poder gerar auditoria:
- criação de cobrança;
- alteração manual de status financeiro;
- reembolso;
- ajuste de crédito;
- vínculo/desvínculo de transação;
- correção administrativa;
- falhas críticas de integração.

---

## 15. Relação com experiência do usuário

A experiência do usuário deve ser clara, sem ocultar complexidade do domínio.

### Princípios
- mostrar status compreensível;
- evitar linguagem ambígua;
- diferenciar “agendado”, “confirmado” e “pago” quando necessário;
- deixar reembolso, crédito e depósito compreensíveis;
- não exibir sucesso financeiro definitivo sem base confiável.

---

## 16. O que o sistema não deve fazer

- considerar pagamento confirmado apenas porque a UI acredita que sim;
- atualizar financeiro crítico sem trilha;
- processar webhook sem validação;
- misturar atendimento concluído com quitação financeira por conveniência;
- permitir ajuste financeiro sem permissão;
- esconder falhas de integração sem registro.

---

## 17. Estratégia recomendada por fase

## 17.1. MVP
Priorizar:
- base de integração segura;
- registro de transações;
- estrutura para depósitos e reembolsos;
- logs e auditoria;
- comportamento consistente com domínio.

## 17.2. Fase 2
Evoluir para:
- no-show protection mais completo;
- depósitos e pré-pagamentos mais robustos;
- fiscal;
- cenários de cobrança mais refinados.

## 17.3. Fase 3
Expandir conforme necessário para:
- maior inteligência financeira;
- multiunidade;
- análises avançadas;
- integrações mais sofisticadas.

---

## 18. Resumo

No PetOS, pagamentos devem ser tratados como parte crítica do domínio.

Isso implica:
- integração segura com gateways;
- validação e idempotência de webhooks;
- reconciliação;
- separação entre status financeiro e operacional;
- rastreabilidade;
- auditoria;
- foco em consistência antes de sofisticação.
