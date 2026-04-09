# Regras de Dominio do PetOS

## 1. Objetivo

Este documento consolida as regras de negocio criticas do PetOS em linguagem operacional.

Ele existe para:

- reduzir ambiguidade entre PRD, backend, frontend, testes e suporte;
- deixar explicitas as invariantes que nao podem ficar apenas na UI;
- orientar manutencao da baseline atual do MVP, da Fase 2 e da Fase 3;
- servir de apoio rapido para quem altera fluxos sensiveis.

Em caso de conflito:

1. o `PetOS_PRD.md` vence em produto e escopo;
2. o codigo server-side e o schema vencem em implementacao consolidada;
3. este documento deve ser atualizado para refletir a decisao real.

## 2. Invariantes transversais

### 2.1. Regra critica no servidor

Autorizacao, ownership, escopo por unidade, transicao de status, calculo financeiro e gating de IA precisam ser garantidos no servidor.

### 2.2. Rastreabilidade

Mudancas em entidades sensiveis devem preservar historico ou auditoria quando aplicavel.

### 2.3. Configuracao por unidade

Sempre que houver janela, tolerancia, retencao, politica de estoque ou regra operacional configuravel, a implementacao deve usar configuracao por unidade em vez de hardcode.

### 2.4. Fase atual importa

O sistema nao deve apresentar como entregue algo que ainda e apenas previsao de fase futura. Isso vale para multiunidade ampla, provider real de IA, billing real e automacao operacional.

## 3. Agenda e atendimento

### 3.1. Agendamento

Um agendamento precisa manter vinculo coerente entre:

- cliente;
- pet;
- unidade;
- servico;
- profissional;
- intervalo de tempo.

Regras obrigatorias:

- nao permitir agendamento no passado;
- nao permitir conflito do mesmo profissional no mesmo horario sem regra explicita;
- nao perder integridade entre servico escolhido e duracao prevista;
- manter trilha de alteracao relevante.

### 3.2. Check-in

O check-in formaliza entrada operacional do pet.

Regras obrigatorias:

- somente para agendamento valido;
- gera snapshot operacional suficiente para consulta posterior;
- registra operador, horario e contexto de execucao;
- nao substitui o historico de status.

### 3.3. Capacidade, bloqueios e waitlist

Na baseline atual:

- capacidade pode variar por unidade, profissional, porte e raca;
- bloqueios operacionais precisam ser respeitados no servidor;
- waitlist pode ser promovida ou cancelada com rastreabilidade;
- promocao de waitlist nao pode criar inconsistencias entre fila e agenda real.

### 3.4. Taxi Dog

Taxi Dog continua sendo extensao operacional do atendimento.

Regras obrigatorias:

- quando existir, precisa permanecer vinculado ao agendamento;
- custo e status nao podem ficar fora da trilha financeira e operacional;
- nao simular roteirizacao completa onde ela nao existe.

## 4. Status operacional e status financeiro

O PRD usa um fluxo unico de alto nivel, mas a implementacao separa:

- status operacional;
- status financeiro.

Regras obrigatorias:

- transicoes operacionais invalidas devem ser bloqueadas;
- historico de status precisa registrar quem mudou, quando e por que;
- status financeiro nao deve ser inferido pela UI;
- um atendimento pode estar concluido operacionalmente e ainda pendente financeiramente.

## 5. Cancelamento, reagendamento e no-show

Regras obrigatorias:

- janelas precisam ser configuraveis por unidade;
- tolerancia de no-show nao pode ser hardcoded;
- penalidade, deposito, reembolso ou credito devem ser aplicados de forma explicita;
- no-show nao pode ser apenas marcacao visual sem reflexo coerente em dominio, historico e financeiro.

## 6. Cliente, pet e ownership

### 6.1. Cliente e pet

Regras obrigatorias:

- pet sempre vinculado a cliente valido;
- historico operacional precisa preservar a trilha de atendimento do pet;
- dados relevantes para a operacao devem continuar acessiveis de forma segura.

### 6.2. Ownership

Na baseline atual:

- cliente e pet usam ownership base auditavel por unidade;
- leitura local e padrao;
- leitura global depende de papel autorizado;
- edicao estrutural cross-unit continua conservadora.

## 7. Servicos, equipe, ponto e folha

### 7.1. Servicos

Regras obrigatorias:

- preco base nao substitui o preco efetivamente praticado;
- duracao e disponibilidade precisam ser coerentes;
- vinculo com profissional e unidade deve ser preservado quando aplicavel.

### 7.2. Comissao

Regras obrigatorias:

- calculo no servidor;
- baseado em valor faturado apos descontos, conforme PRD e dominio local;
- materializacao somente quando o atendimento estiver operacionalmente concluido e financeiramente pago;
- nao pode depender de componente visual.

### 7.3. Escalas, ponto e folha

Regras obrigatorias:

- nao abrir duas jornadas de ponto simultaneas para o mesmo funcionario;
- fechamento de ponto exige saida posterior a entrada;
- escalas sobrepostas precisam ser evitadas;
- base de payroll atual e operacional, nao modulo trabalhista amplo.

## 8. Financeiro, depositos, reembolsos e PDV

### 8.1. Ledger financeiro

`TransacoesFinanceiras` continua sendo a trilha central.

Regras obrigatorias:

- nao misturar estimativa com liquidacao real;
- reconciliacao e efeitos externos precisam de trilha auditavel;
- deposito, reembolso e credito nao podem gerar ledger paralelo sem integracao coerente.

### 8.2. Depositos e reembolsos

Regras obrigatorias:

- deposito precisa ter finalidade, status e historico;
- reembolso precisa manter vinculo com origem e motivo;
- conversao para credito precisa permanecer auditavel.

### 8.3. PDV e estoque

Regras obrigatorias:

- venda concluida deve refletir no financeiro e no estoque na mesma transacao;
- saldo negativo depende de politica explicita por unidade;
- emissao fiscal minima nao deve ocorrer para venda nao liquidada.

## 9. Documentos, assinaturas e midia

Regras obrigatorias:

- binario fica fora do banco; banco guarda referencias e metadados;
- acesso protegido por permissao, ownership e vinculo da entidade;
- tipo e tamanho de arquivo devem ser validados;
- arquivamento logico precisa preservar motivo e autoria;
- assinatura operacional nao pode fingir autoria do tutor quando foi apenas registro interno.

## 10. Comunicacao e CRM

### 10.1. Comunicacao operacional

Regras obrigatorias:

- template conhecido;
- dados contextualizados;
- log de envio relevante;
- comunicacao manual nao deve ser descrita como automacao completa.

### 10.2. Consentimento e CRM

Na baseline atual:

- consentimento de contato e preferencia de canal ficam claros por cliente;
- campanhas e gatilhos usam criterios auditaveis;
- destinatario sem opt-in ou destino valido deve ser descartado com motivo explicito;
- lista de espera, portal do tutor e comunicacao operacional nao viram atalho para marketing sem regra.

## 11. Portal do tutor

Regras obrigatorias:

- tutor so acessa dados proprios e de pets vinculados;
- ownership do tutor precisa ser aplicado no servidor;
- fluxos ampliados do tutor, como documentos, waitlist, Taxi Dog, pre-check-in e financeiro proprio, nao podem depender apenas da UI;
- portal nao substitui validacao administrativa critica.

## 12. Webhooks e eventos externos

Regras obrigatorias:

- assinatura ou segredo validado;
- processamento idempotente;
- registro do recebimento;
- trilha suficiente para reprocessamento controlado e reconciliacao;
- evento invalido nao pode gerar efeito de dominio.

## 13. Multiunidade

### 13.1. Fundacao server-side

O contexto multiunidade atual parte de decisao server-side.

Regras obrigatorias:

- ausencia de contexto falha fechado;
- single-unit continua preservado;
- leitura global depende de papel autorizado;
- escrita estrutural cross-unit nao pode ser liberada por acidente;
- diagnostico administrativo nao pode vazar escopo indevido.

### 13.2. Rollout controlado

O Bloco 2 da Fase 3 abriu recortes seguros em modulos operacionais, mas nao representa multiunidade irrestrita. Toda nova abertura precisa seguir o mapa de impacto e manter o backend como autoridade.

## 14. IA, insights e assistente virtual

### 14.1. Fundacao transversal

Regras obrigatorias:

- IA desligada por padrao;
- `fail-closed` quando flag, quota ou configuracao estiver ausente ou invalida;
- nenhuma chamada paga, job ou retry quando o modulo estiver desligado;
- IA nao substitui regra de negocio, autorizacao ou validacao server-side.

### 14.2. Consentimento, retencao e auditoria

Regras obrigatorias:

- finalidade precisa estar clara;
- retencao por padrao nao deve armazenar payload bruto sem justificativa;
- eventos minimos de custo, erro e desligamento precisam ser distinguiveis;
- auditoria precisa permanecer coerente com envelope e eventos.

### 14.3. Analise de imagem

Na baseline atual:

- resultado e assistivo;
- revisao humana continua obrigatoria quando aplicavel;
- nao ha diagnostico clinico automatico;
- visibilidade segue recorte interno e auditavel.

### 14.4. Insight preditivo

Na baseline atual:

- o primeiro caso e previsao de demanda de agenda;
- resultado continua recomendacao auditavel;
- pouco historico precisa degradar confianca de forma explicita;
- insight nao executa acao automatica sozinho.

### 14.5. Assistente virtual do tutor

Na baseline atual:

- o servidor recebe transcricao, nao audio bruto;
- o assistente pode responder apenas consultas proprias do tutor e montar rascunho assistido de agendamento;
- criacao de atendimento exige confirmacao explicita posterior;
- ownership, disponibilidade e criacao continuam validados no servidor;
- flag, quota ou configuracao invalida continuam bloqueando o modulo por `fail-closed`.

## 15. Runtime operacional, setup e update

Regras obrigatorias:

- setup inicial depende de gating explicito;
- update controlado exige permissao, preflight, lock e trilha persistida;
- incidentes de recovery precisam ficar registrados;
- sistema nao deve esconder falha operacional de setup ou update como se fosse sucesso.

## 16. Prioridades de teste

Testar primeiro o que mais pode gerar:

- perda financeira;
- vazamento cross-unit;
- quebra de autorizacao;
- inconsistencia operacional;
- erro em automacao assistiva;
- perda de rastreabilidade.

Prioridades permanentes:

- conflito de agenda;
- transicao de status;
- depositos, reembolsos e ledger;
- ownership e escopo por unidade;
- consentimento, retencao e fail-closed da IA;
- webhooks e idempotencia;
- diagnosticos administrativos internos.

## 17. Documentos complementares

Ler em conjunto com:

- `PetOS_PRD.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/rbac-permission-matrix.md`
- `docs/environment-contract.md`
- `docs/phase3-maintenance-guide.md`
