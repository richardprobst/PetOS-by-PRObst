# Regras de Domínio do PetOS

## 1. Objetivo deste documento

Este documento consolida as **regras de negócio críticas** do PetOS em formato operacional e de consulta rápida.

Ele existe para:
- facilitar implementação consistente;
- reduzir ambiguidade entre produto, backend e frontend;
- orientar testes, validações e auditoria;
- ajudar humanos e agentes de IA a localizar rapidamente regras sensíveis.

Este documento **não substitui** o `PetOS_PRD.md`.  
Se houver conflito, o **PRD vence**.

---

## 2. Princípios gerais

### 2.1. Regra no servidor
Toda regra de negócio crítica deve ser garantida no servidor.

### 2.2. Rastreabilidade
Mudanças relevantes devem gerar histórico e/ou auditoria quando aplicável.

### 2.3. Configuração por unidade
Sempre que o PRD indicar parâmetros configuráveis, a implementação deve evitar valores hardcoded e usar configuração por unidade.

### 2.4. Simplicidade no MVP
No MVP, implementar o necessário para garantir operação confiável, sem antecipar complexidades que pertencem à Fase 2 ou Fase 3.

---

## 3. Agenda e Operação

## 3.1. Agendamento
Um agendamento representa a reserva de um atendimento para um pet, vinculado a cliente, serviço(s), profissional(is) e horários.

### Regras obrigatórias
- não permitir agendamento no passado;
- não permitir criar agendamento sem pet e cliente válidos;
- duração do atendimento deve ser compatível com os serviços selecionados;
- o sistema deve impedir conflito de agenda do mesmo profissional no mesmo horário, salvo regra configurada futura;
- um agendamento pode conter um ou mais serviços, conforme modelagem com `AgendamentoServicos`.

## 3.2. Check-in
O check-in marca a entrada formal do pet para atendimento.

### Regras obrigatórias
- só pode ocorrer para agendamento existente e válido;
- deve registrar informações operacionais relevantes;
- deve respeitar checklist configurado para o contexto do atendimento;
- deve gerar rastreabilidade mínima de quem executou a ação.

## 3.3. Overbooking
No MVP, overbooking não é permitido para o mesmo profissional no mesmo intervalo.

### Observação
Regras mais avançadas de capacidade por profissional, porte e raça pertencem à **Fase 2**.

---

## 4. Fluxo de status do atendimento

## 4.1. Fluxo principal
Fluxo definido no PRD:

`Agendado -> Confirmado -> Check-in -> Em Atendimento -> Pronto para Retirada -> Concluído -> Faturado`

## 4.2. Regras obrigatórias
- não permitir salto arbitrário entre estados sem justificativa/permissão;
- toda mudança de status deve ser registrada em histórico;
- o sistema deve registrar usuário e data/hora da mudança;
- mudanças de status podem disparar efeitos em comunicação, financeiro e operação.

## 4.3. Separação conceitual recomendada
Sempre que a implementação exigir mais clareza, tratar:
- **status operacional**
- **status financeiro**

como conceitos distintos.

### Exemplo operacional
- Agendado
- Confirmado
- Check-in
- Em Atendimento
- Pronto para Retirada
- Concluído
- Cancelado
- No-Show

### Exemplo financeiro
- Pendente
- Pago
- Reembolsado
- Estornado
- Faturado

Se adotado, esse mapeamento deve ser documentado.

---

## 5. Cancelamento, reagendamento e no-show

## 5.1. Cancelamento
O cancelamento deve respeitar a janela configurável por unidade.

### Regras obrigatórias
- o sistema não deve hardcodar a janela de cancelamento;
- cancelamentos fora da janela podem gerar penalidade, perda de depósito ou crédito parcial, conforme configuração;
- o cancelamento deve registrar histórico.

## 5.2. Reagendamento
O reagendamento deve respeitar janela configurável por unidade.

### Regras obrigatórias
- não hardcodar o prazo de reagendamento;
- reagendamento fora da janela pode ser tratado como cancelamento + novo agendamento, conforme regra configurada;
- manter rastreabilidade da alteração quando aplicável.

## 5.3. No-Show
No-show ocorre quando o cliente não comparece nem regulariza a situação dentro da tolerância configurada.

### Regras obrigatórias
- a tolerância deve ser configurável por unidade;
- a marcação de no-show deve poder impactar cobrança, depósito, comunicação e histórico;
- a política de no-show não deve ser implementada de forma oculta ou implícita.

---

## 6. Cliente e Pet

## 6.1. Cliente
Cliente é a entidade titular do vínculo comercial com o estabelecimento.

### Regras obrigatórias
- dados mínimos devem ser suficientes para contato e vínculo com pets;
- histórico de serviços deve permanecer vinculado ao cliente e aos pets correspondentes;
- alterações importantes em dados sensíveis devem considerar auditoria quando aplicável.

## 6.2. Pet
Pet é a entidade central do atendimento operacional.

### Regras obrigatórias
- cada pet deve estar vinculado a um cliente;
- informações de saúde, alergias e observações importantes devem estar disponíveis para consulta operacional;
- a aplicação deve evitar perda de contexto histórico do pet ao longo do tempo.

---

## 7. Serviços

## 7.1. Cadastro de serviços
Serviços devem ter definição clara de:
- nome;
- duração;
- preço base;
- disponibilidade.

## 7.2. Regras obrigatórias
- o sistema deve permitir precificação acordada por item no agendamento quando necessário;
- preço base não substitui preço efetivamente praticado no atendimento;
- o vínculo entre serviço e profissional executante deve ser preservado quando aplicável.

---

## 8. Financeiro

## 8.1. Registro financeiro
Toda movimentação relevante deve ser refletida em registros financeiros adequados.

### Tipos comuns
- receita
- despesa
- depósito
- reembolso

## 8.2. Regras obrigatórias
- não misturar valor estimado com valor efetivamente realizado sem distinção;
- reembolsos devem ter rastreabilidade;
- créditos do cliente devem ter histórico de uso;
- impacto financeiro de no-show, Táxi Dog, descontos e pagamentos deve ser consistente.

## 8.3. Faturamento
O faturamento deve refletir o estado financeiro real da operação.

### Regra obrigatória
O sistema não deve marcar uma operação como financeiramente concluída apenas por efeito visual de UI sem confirmação adequada da camada de domínio.

---

## 9. Comissão

## 9.1. Base da comissão
A comissão deve ser calculada sobre o valor **faturado**, após descontos, conforme PRD.

## 9.2. Regras obrigatórias
- cálculo deve ocorrer na camada de domínio/aplicação;
- não implementar comissão apenas na interface;
- a lógica deve ser rastreável;
- quando houver múltiplos serviços e múltiplos profissionais, a estrutura deve preservar o vínculo correto.

---

## 10. Comunicação

## 10.1. Comunicação operacional do MVP
No MVP, a comunicação prioriza:
- WhatsApp operacional;
- e-mail;
- templates de mensagens.

## 10.2. Regras obrigatórias
- mensagens devem usar dados válidos e contextualizados;
- templates devem permitir personalização controlada;
- envios relevantes devem poder ser registrados em log;
- não tratar integração manual como automação completa quando não for.

---

## 11. Portal do Tutor

## 11.1. Escopo do MVP
No MVP, o portal do tutor cobre:
- criação de conta e perfil;
- visualização de pets;
- histórico de serviços;
- agendamento online;
- notificações básicas.

## 11.2. Regras obrigatórias
- tutor só pode visualizar dados autorizados e vinculados à sua conta;
- o portal não substitui validações administrativas críticas;
- permissões devem ser garantidas no servidor.

---

## 12. Táxi Dog

## 12.1. Natureza do serviço
Táxi Dog é uma extensão logística do atendimento.

## 12.2. Regras obrigatórias
- quando contratado, deve se integrar ao agendamento;
- custo do transporte deve refletir no financeiro;
- comissão do motorista, se existir, deve ter critério explícito;
- roteirização avançada não deve ser simulada como se fosse completa no MVP.

---

## 13. Pagamentos, depósitos e reembolsos

## 13.1. Depósitos
Depósito pode ser usado como proteção contra no-show ou reserva.

### Regras obrigatórias
- o sistema deve registrar valor, data e status;
- regras de perda, devolução ou conversão em crédito devem ser explícitas;
- depósito não deve ser tratado como pagamento final automaticamente sem regra clara.

## 13.2. Pagamentos
Pagamentos podem envolver gateway externo.

### Regras obrigatórias
- a confirmação final deve considerar webhooks e reconciliação quando aplicável;
- não confiar somente na resposta síncrona;
- operações devem ser idempotentes quando necessário;
- falhas externas devem ter tratamento claro.

## 13.3. Reembolsos
Reembolsos devem:
- registrar motivo;
- manter vínculo com transação original;
- refletir corretamente no financeiro;
- preservar rastreabilidade.

---

## 14. Webhooks

## 14.1. Natureza
Webhooks são eventos externos recebidos de integrações como gateways de pagamento.

## 14.2. Regras obrigatórias
- validar assinatura ou segredo;
- registrar recebimento;
- processar de forma idempotente;
- evitar duplicidade de efeitos financeiros;
- manter trilha para reconciliação.

---

## 15. Documentos, assinaturas e mídia

## 15.1. Escopo por fase
Documentos e assinaturas digitais pertencem à **Fase 2**, mas a arquitetura pode ser preparada antes.

## 15.2. Regras obrigatórias quando implementados
- controlar acesso por vínculo e permissão;
- validar tipo e tamanho de arquivo;
- manter referência segura aos arquivos;
- registrar upload e ações relevantes;
- separar armazenamento de binário e metadados.

---

## 16. Permissões e segurança

## 16.1. RBAC
O sistema deve operar com perfis e permissões.

### Regras obrigatórias
- autorização no servidor;
- interface visível não define permissão real;
- operações críticas devem verificar papel, permissão e, quando aplicável, vínculo com unidade.

## 16.2. Auditoria
Operações críticas devem ser auditáveis.

### Exemplos
- login sensível;
- alterações financeiras;
- mudança de status;
- edição de dados críticos;
- mudanças de configuração;
- ações administrativas relevantes.

---

## 17. Multiunidade

## 17.1. Escopo
A operação multiunidade completa pertence à **Fase 3**, mas o modelo pode nascer preparado.

## 17.2. Regras obrigatórias
- evitar hardcode de configuração global quando o PRD já prevê configuração por unidade;
- dados e regras sensíveis à unidade devem prever esse vínculo na modelagem;
- o MVP não deve fingir multiunidade completa sem suporte real.

---

## 18. IA no produto

## 18.1. MVP
No MVP, IA deve ser usada de forma controlada e de baixo risco, como:
- geração de mensagens;
- apoio operacional;
- prompts internos contextuais.

## 18.2. Fase 3
Na Fase 3, IA pode incluir:
- análise de imagem;
- análise preditiva;
- recomendações mais sofisticadas.

## 18.3. Regras obrigatórias
- IA não substitui validação de domínio;
- IA não deve tomar decisão crítica sozinha sem controle;
- resultados de IA devem ser tratados como apoio, não como verdade absoluta, quando aplicável.

---

## 19. Regras para testes

## 19.1. O que testar primeiro
Priorizar testes para:
- conflito de agenda;
- transição de status;
- comissão;
- no-show;
- cancelamento e reagendamento;
- pagamentos;
- webhooks;
- permissões;
- operações financeiras críticas.

## 19.2. Regra prática
Se uma regra puder causar:
- perda financeira,
- inconsistência operacional,
- falha de segurança,
- erro de autorização,
- corrupção de fluxo do atendimento,

ela merece teste prioritário.

---

## 20. Resumo operacional

As regras mais sensíveis do PetOS giram em torno de:

- agenda sem conflito indevido;
- status com rastreabilidade;
- financeiro consistente;
- pagamentos e webhooks confiáveis;
- autorização real no servidor;
- configurações por unidade;
- foco rigoroso no escopo da fase atual.

Este documento deve ser mantido enxuto, prático e alinhado ao PRD.
