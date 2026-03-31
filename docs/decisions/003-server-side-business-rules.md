# ADR 003 — Regras críticas de negócio e autorização devem ser garantidas no servidor

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/002-nextjs-app-router-route-handlers.md`

---

## 1. Contexto

O PetOS é um sistema operacional transacional com impacto direto em:

- agenda;
- atendimento;
- dados de clientes e pets;
- permissões;
- financeiro;
- pagamentos;
- auditoria;
- documentos;
- integrações externas.

Em sistemas com esse perfil, a interface pode ajudar a orientar e validar o uso, mas **não pode ser tratada como autoridade final** para decisões críticas.

Era necessário formalizar de forma explícita onde devem viver:

- validações sensíveis;
- regras de negócio;
- autorização;
- transições de status;
- cálculos financeiros;
- verificações de integridade.

---

## 2. Problema

A dúvida central era:

> A interface pode ser responsável por garantir regras críticas do sistema ou isso deve ser obrigatório no servidor?

A decisão precisava evitar cenários em que:

- regras importantes só existam no frontend;
- usuários burlem fluxos por chamadas diretas à API;
- inconsistências apareçam entre diferentes telas;
- agentes de IA implementem regras críticas no lugar errado;
- permissões fiquem dependentes de elementos visuais.

---

## 3. Alternativas consideradas

## A. Permitir que parte relevante das regras fique no frontend
Usar a UI como principal camada de validação e fluxo, deixando o servidor apenas com persistência básica.

### Vantagens
- implementação inicial aparentemente mais rápida;
- menos código de domínio no backend;
- experiência de prototipação mais simples.

### Desvantagens
- segurança fraca;
- inconsistência entre telas;
- possibilidade de bypass por chamadas diretas;
- dificuldade para garantir rastreabilidade;
- maior risco financeiro e operacional;
- comportamento imprevisível ao longo da evolução do sistema.

## B. Garantir regras críticas no servidor, usando o frontend apenas como apoio
Tratar o frontend como camada de experiência, mas manter a autoridade real no servidor.

### Vantagens
- maior segurança;
- integridade de domínio mais forte;
- consistência entre canais e interfaces;
- melhor suporte para auditoria;
- melhor base para integrações, APIs e automações;
- menor risco de comportamento divergente.

### Desvantagens
- exige mais disciplina arquitetural;
- aumenta a responsabilidade da camada de aplicação/domínio;
- pode demandar mais cuidado na organização do código.

---

## 4. Decisão

## Decisão aceita
No PetOS, **toda regra crítica de negócio, autorização e validação sensível deve ser garantida no servidor**.

O frontend pode:
- orientar;
- validar experiência;
- melhorar usabilidade;
- impedir erros óbvios;
- mostrar estados e permissões de forma amigável.

Mas o frontend **não** será a autoridade final para:

- autorização;
- transição de status;
- cálculo de comissão;
- conflitos de agenda;
- valores financeiros;
- políticas de cancelamento, no-show e reagendamento;
- processamento de pagamentos;
- impacto de depósitos, reembolsos e créditos;
- acesso a dados sensíveis;
- acesso a documentos e uploads;
- decisões auditáveis.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Integridade do domínio
O PetOS depende de regras que precisam ser executadas de forma uniforme, independente de:
- página;
- interface;
- origem da chamada;
- usuário;
- fluxo de navegação.

### 5.2. Segurança
Autorização baseada apenas em UI é insuficiente.  
Esconder botão, aba ou ação visual **não equivale a negar acesso**.

### 5.3. Consistência operacional
Regras como:
- conflito de agenda;
- transição de status;
- no-show;
- comissão;
- pagamento e reembolso

precisam ter o mesmo comportamento em qualquer ponto do sistema.

### 5.4. Auditoria e rastreabilidade
Para registrar ações críticas de forma confiável, a decisão precisa passar pelo servidor.

### 5.5. Compatibilidade com crescimento do sistema
Conforme o PetOS evoluir para:
- portal do tutor;
- integrações externas;
- automações;
- IA;
- multiunidade;

a centralização da regra crítica no servidor evita duplicação e divergência.

---

## 6. O que é considerado “regra crítica”

São consideradas regras críticas, entre outras:

- autenticação e autorização;
- RBAC;
- conflito de agenda;
- transições do fluxo de atendimento;
- cálculo de comissão;
- políticas de no-show;
- cancelamento e reagendamento;
- vínculo entre agendamento, serviço, profissional e pet;
- geração e atualização de movimentações financeiras;
- depósitos, créditos e reembolsos;
- processamento e reconciliação de pagamentos;
- validação e processamento de webhooks;
- acesso a documentos e mídias sensíveis;
- geração de logs auditáveis.

---

## 7. Consequências práticas

A partir desta decisão:

- validações críticas devem existir no servidor;
- Route Handlers e/ou camada de aplicação devem verificar regras sensíveis;
- o frontend pode validar UX, mas nunca substituir a validação real;
- cálculos relevantes não devem depender do cliente;
- autorização deve ser executada no servidor;
- ações críticas devem poder gerar auditoria no servidor.

---

## 8. Regras decorrentes desta decisão

## 8.1. Frontend
O frontend:
- pode validar campos para usabilidade;
- pode exibir estados disponíveis;
- pode ocultar ações sem permissão como conveniência de UX;
- pode bloquear interações inválidas óbvias.

Mas isso é **complementar**.

## 8.2. Servidor
O servidor deve:
- validar payloads com Zod;
- verificar autenticação;
- verificar autorização;
- aplicar regras de negócio;
- decidir transições válidas;
- persistir mudanças com integridade;
- registrar auditoria quando necessário.

## 8.3. Banco de dados
O banco deve reforçar integridade com:
- chaves estrangeiras;
- constraints quando aplicável;
- modelagem coerente;
- transações;
- esquema relacional adequado.

---

## 9. Exemplos concretos

## Exemplo 1: status do atendimento
A UI pode mostrar apenas botões válidos para a próxima transição.  
Ainda assim, o servidor deve verificar se a transição é permitida antes de persistir.

## Exemplo 2: comissão
A UI pode exibir uma estimativa de comissão.  
O valor final deve ser calculado/confirmado no servidor com base no estado real da operação.

## Exemplo 3: conflito de agenda
A UI pode sinalizar conflito em tempo real.  
O servidor deve confirmar o conflito no momento da gravação, evitando corrida e inconsistência.

## Exemplo 4: permissões
A UI pode esconder a ação “editar cliente”.  
O servidor deve negar a operação se o usuário não possuir permissão real.

## Exemplo 5: pagamento
A UI pode mostrar “pagamento aprovado”.  
A camada de domínio/integração deve considerar webhooks, reconciliação e status confiável antes de concluir efeitos financeiros.

---

## 10. O que esta decisão não proíbe

Esta decisão **não proíbe**:

- validação local de formulário;
- feedback imediato de UX;
- preview de regras;
- checagens preventivas no cliente;
- otimizações de interface.

Ela apenas define que **a decisão final e confiável** sobre regras críticas pertence ao servidor.

---

## 11. Riscos conhecidos e mitigação

## Risco 1: duplicação de validação entre frontend e backend
### Mitigação
- usar Zod e contratos compartilhados quando possível;
- distinguir validação de UX da validação de autoridade.

## Risco 2: handlers gordos e confusos
### Mitigação
- manter Route Handlers finos;
- mover regra de domínio para serviços/casos de uso.

## Risco 3: falsa sensação de segurança pela UI
### Mitigação
- documentar esta decisão;
- revisar PRs com foco em autorização e validação do servidor;
- reforçar a regra em `AGENTS.md`.

---

## 12. Revisão futura

Esta decisão só deve ser revista se o modelo arquitetural do projeto mudar de forma significativa.

Enquanto o PetOS mantiver natureza transacional, multiusuário e sensível a regras de negócio, esta decisão permanece válida.

---

## 13. Resumo

No PetOS:

- a UI melhora a experiência;
- o servidor garante a regra;
- o banco reforça a integridade.

Essa separação é necessária para segurança, consistência, auditoria e evolução saudável do sistema.
