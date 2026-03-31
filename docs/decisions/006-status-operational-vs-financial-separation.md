# ADR 006 — Separação conceitual entre status operacional e status financeiro

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/003-server-side-business-rules.md`, `docs/decisions/004-prisma-as-single-db-access-layer.md`

---

## 1. Contexto

O PRD do PetOS define o seguinte fluxo principal de atendimento:

`Agendado -> Confirmado -> Check-in -> Em Atendimento -> Pronto para Retirada -> Concluído -> Faturado`

Esse fluxo funciona bem como visão de produto de alto nível, mas durante a análise de domínio ficou claro que **operações do atendimento** e **estado financeiro** não são exatamente o mesmo conceito.

No PetOS, um atendimento pode estar:

- operacionalmente concluído,
- mas financeiramente pendente;

ou pode ter:

- pagamento parcial,
- reembolso,
- estorno,
- depósito anterior,
- ajuste financeiro posterior.

Sem uma separação clara, o sistema corre risco de misturar conceitos de:
- operação;
- caixa;
- faturamento;
- auditoria;
- relatórios;
- experiência do usuário.

---

## 2. Problema

A dúvida central era:

> O PetOS deve tratar o fluxo do atendimento e o fluxo financeiro como uma única sequência de status ou como conceitos distintos?

Se tudo ficar preso a um único status, surgem problemas como:

- atendimento concluído, mas ainda sem pagamento final;
- pagamento confirmado antes da conclusão física do serviço;
- reembolso afetando leitura operacional;
- dificuldade para auditar eventos de atendimento versus eventos financeiros;
- risco de UI e relatórios interpretarem o mesmo campo de forma diferente.

---

## 3. Alternativas consideradas

## A. Um único fluxo de status para tudo
Usar apenas um campo/status central para representar ao mesmo tempo:
- etapa operacional;
- situação financeira.

### Vantagens
- aparência inicial de simplicidade;
- menos campos e menos modelagem conceitual.

### Desvantagens
- mistura conceitos diferentes;
- dificulta casos reais do domínio;
- aumenta ambiguidade em relatórios e integrações;
- pode gerar regras confusas e frágeis.

## B. Separar status operacional e status financeiro
Tratar o andamento do atendimento e a situação financeira como dois conceitos relacionados, porém independentes.

### Vantagens
- maior clareza de domínio;
- melhor aderência a cenários reais;
- relatórios mais precisos;
- melhor rastreabilidade;
- menor acoplamento entre operação e financeiro.

### Desvantagens
- exige mais cuidado na modelagem e na UI;
- demanda mapeamento claro para evitar confusão na equipe.

---

## 4. Decisão

## Decisão aceita
No PetOS, será adotada uma **separação conceitual entre status operacional e status financeiro**.

Isso significa que:

- o andamento do atendimento será tratado por um conjunto de estados operacionais;
- a situação financeira será tratada por um conjunto de estados financeiros;
- quando necessário, ambos poderão ser combinados na apresentação do sistema;
- o PRD continuará sendo respeitado como visão de produto, mas a implementação poderá usar essa separação internamente para maior consistência.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Clareza de domínio
“Concluído” e “Faturado” não representam a mesma natureza de evento.

- **Concluído** diz respeito ao atendimento.
- **Faturado/Pago/Pendente/Reembolsado** dizem respeito ao financeiro.

### 5.2. Casos reais do negócio
O PetOS precisa suportar cenários como:
- serviço concluído e pagamento pendente;
- depósito anterior usado como abatimento;
- pagamento parcial;
- reembolso após conclusão;
- estorno;
- cobrança posterior em caso de no-show ou ajuste.

### 5.3. Melhor base para relatórios e auditoria
Separar os conceitos melhora:
- leitura operacional;
- leitura financeira;
- trilha de auditoria;
- integrações;
- reconciliação.

### 5.4. Evolução futura
Essa separação ajuda bastante em:
- pagamentos via gateway;
- reconciliação por webhook;
- no-show protection;
- fiscal;
- multiunidade;
- BI futuro.

---

## 6. Modelo conceitual recomendado

## 6.1. Status operacional
Exemplo de conjunto operacional:

- Agendado
- Confirmado
- Check-in
- Em Atendimento
- Pronto para Retirada
- Concluído
- Cancelado
- No-Show

## 6.2. Status financeiro
Exemplo de conjunto financeiro:

- Pendente
- Parcial
- Pago
- Faturado
- Reembolsado
- Estornado
- Isento

### Observação
A lista final pode variar conforme refinamento do domínio, mas a separação conceitual deve ser mantida.

---

## 7. Relação com o PRD

O PRD usa o fluxo:

`Agendado -> Confirmado -> Check-in -> Em Atendimento -> Pronto para Retirada -> Concluído -> Faturado`

Essa decisão **não contradiz o PRD**.

Ela apenas reconhece que, em nível de implementação e domínio:

- `Faturado` pode ser tratado como parte do eixo financeiro;
- o produto pode continuar apresentando um fluxo simples para fins de entendimento;
- internamente, o sistema ganha robustez ao separar os conceitos.

---

## 8. Consequências práticas

A partir desta decisão:

- modelos de dados podem refletir status operacional e financeiro de forma distinta;
- a camada de domínio deve evitar usar um único status para representar tudo;
- UI e relatórios devem deixar claro o que estão exibindo;
- integrações financeiras devem atualizar o eixo financeiro sem distorcer o andamento operacional;
- auditoria deve distinguir eventos de atendimento de eventos financeiros.

---

## 9. Exemplos práticos

## Exemplo 1: atendimento concluído, mas ainda não pago
- Status operacional: `Concluído`
- Status financeiro: `Pendente`

## Exemplo 2: atendimento concluído e pago integralmente
- Status operacional: `Concluído`
- Status financeiro: `Pago` ou `Faturado`, conforme convenção adotada

## Exemplo 3: cliente fez depósito antes do atendimento
- Status operacional: `Confirmado` ou `Em Atendimento`
- Status financeiro: `Parcial`

## Exemplo 4: serviço finalizado e depois parcialmente reembolsado
- Status operacional: `Concluído`
- Status financeiro: `Reembolsado` ou combinação equivalente no histórico financeiro

## Exemplo 5: no-show com cobrança
- Status operacional: `No-Show`
- Status financeiro: `Pendente`, `Cobrado` ou outra representação financeira adequada

---

## 10. Riscos conhecidos e mitigação

## Risco 1: confusão entre times sobre qual status olhar
### Mitigação
- documentar claramente os dois eixos;
- usar nomes explícitos;
- ajustar dashboards, telas e relatórios.

## Risco 2: UI mostrar informação ambígua
### Mitigação
- rotular explicitamente “status do atendimento” e “status financeiro” quando necessário;
- evitar campos genéricos sem contexto.

## Risco 3: implementação parcial da separação
### Mitigação
- reforçar essa decisão em `AGENTS.md`;
- revisar modelagem, casos de uso e PRs com esse critério.

---

## 11. O que esta decisão não exige imediatamente

Esta decisão **não obriga** o MVP a ter uma interface complexa com múltiplos painéis de status em todos os lugares.

Ela exige principalmente:
- separação conceitual no domínio;
- modelagem compatível;
- clareza em pontos sensíveis.

A experiência visual pode continuar simples, desde que a arquitetura não misture conceitos críticos.

---

## 12. Revisão futura

Esta decisão só deve ser revista se houver uma mudança grande no domínio do produto que torne desnecessária essa distinção.

Dado o perfil transacional do PetOS, essa revisão é improvável no curto prazo.

---

## 13. Resumo

No PetOS:

- **status operacional** indica em que etapa o atendimento está;
- **status financeiro** indica a situação econômica da operação.

Separar esses conceitos melhora:
- clareza;
- segurança de domínio;
- auditoria;
- relatórios;
- integração com pagamentos;
- evolução do sistema.
