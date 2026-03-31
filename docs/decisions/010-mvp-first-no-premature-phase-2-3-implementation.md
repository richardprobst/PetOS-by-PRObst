# ADR 010 — Prioridade absoluta para o MVP, sem antecipação indevida de Fase 2 e Fase 3

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição de execução inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/domain-rules.md`

---

## 1. Contexto

O PetOS possui um roadmap em fases claramente definido no PRD:

- **MVP**
- **Fase 2**
- **Fase 3**
- **Roadmap Futuro**

O produto tem ambição ampla e domínio rico, incluindo:

- agenda e operação;
- clientes e pets;
- serviços;
- comunicação;
- financeiro;
- portal do tutor;
- gestão da equipe;
- pagamentos;
- documentos;
- IA;
- multiunidade;
- integrações adicionais.

Esse cenário cria um risco clássico de execução:

> tentar “adiantar” recursos futuros cedo demais e comprometer foco, prazo, consistência e qualidade do núcleo do sistema.

Era necessário formalizar uma decisão de execução para preservar o foco do projeto.

---

## 2. Problema

A decisão precisava responder:

> O PetOS deve permitir antecipação frequente de funcionalidades futuras durante o desenvolvimento inicial, ou deve proteger o foco do MVP de forma explícita?

Sem uma decisão clara, o projeto correria risco de:

- expandir escopo sem controle;
- diluir esforço em recursos não essenciais;
- atrasar o core operacional;
- criar arquitetura prematura;
- introduzir abstrações sem uso real;
- gerar código parcialmente pronto para fases futuras;
- confundir agentes de IA e colaboradores sobre prioridade real.

---

## 3. Alternativas consideradas

## A. Permitir antecipação frequente de Fase 2 e Fase 3
Implementar partes de funcionalidades futuras “aproveitando o embalo” do desenvolvimento do MVP.

### Vantagens
- sensação inicial de avanço rápido;
- possibilidade de “deixar preparado” mais cedo.

### Desvantagens
- escopo cresce facilmente;
- o MVP perde foco;
- aumenta risco de arquitetura prematura;
- dificulta previsibilidade;
- eleva custo de manutenção de código não usado;
- confunde prioridades do produto.

## B. Priorizar rigorosamente o MVP e só antecipar fases futuras com autorização explícita
Desenvolver primeiro o núcleo do produto e só avançar para Fase 2/Fase 3 com decisão consciente.

### Vantagens
- foco claro;
- melhor previsibilidade;
- entrega mais rápida do core;
- menor risco de overengineering;
- mais clareza para humanos e agentes de IA;
- melhor alinhamento com o PRD.

### Desvantagens
- exige disciplina;
- pode parecer “menos ambicioso” no curto prazo;
- força priorização mais dura de backlog.

---

## 4. Decisão

## Decisão aceita
O PetOS seguirá a regra de **prioridade absoluta para o MVP**.

Isso significa que:

- funcionalidades da **Fase 2**, **Fase 3** e **Roadmap Futuro** não devem ser implementadas durante o ciclo do MVP sem instrução explícita do mantenedor;
- a arquitetura pode ser pensada para crescer, mas a implementação deve focar no que o MVP realmente exige;
- agentes de IA e colaboradores devem assumir que o escopo atual é o do MVP, salvo orientação contrária.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. O maior risco no início é perder foco
O PetOS possui escopo naturalmente expansivo. Sem uma trava explícita, o projeto tende a crescer antes de estabilizar o núcleo.

### 5.2. O valor do produto depende do core funcionando bem
Antes de IA avançada, multiunidade, fiscal completo ou automações sofisticadas, o sistema precisa entregar bem:
- agenda;
- operação;
- cliente/pet;
- serviços;
- comunicação básica;
- financeiro básico;
- portal básico;
- comissões;
- report card simples.

### 5.3. Melhor arquitetura nasce com necessidades reais
Preparar crescimento é correto. Implementar complexidade sem uso imediato, não.

### 5.4. Agentes de IA precisam de fronteiras claras
Sem uma decisão formal, agentes tendem a sugerir ou implementar:
- features fora da fase;
- abstrações genéricas demais;
- preparação excessiva para cenários ainda não ativados.

---

## 6. Consequências práticas

A partir desta decisão:

- backlog do MVP deve prevalecer sobre ideias futuras;
- PRs e implementações devem ser avaliados pelo critério de aderência à fase atual;
- preparações estruturais devem ser leves e justificadas;
- abstrações só devem ser introduzidas quando tiverem uso real ou valor arquitetural claro;
- documentação deve distinguir claramente o que é presente do que é futuro.

---

## 7. O que isso significa na prática

## 7.1. Pode
Durante o MVP, pode:
- organizar código para facilitar crescimento futuro;
- nomear estruturas de forma sustentável;
- evitar decisões que bloqueiem expansão;
- registrar ADRs e documentos que preparem evolução;
- criar pontos de extensão leves quando isso for barato e útil.

## 7.2. Não pode
Durante o MVP, não deve:
- implementar waitlist sem solicitação explícita;
- criar motor avançado de capacidade;
- construir fluxo completo de documentos da Fase 2;
- antecipar PDV completo;
- implementar IA pesada de Fase 3;
- construir multiunidade operacional completa;
- adicionar fiscal complexo sem demanda explícita;
- introduzir microarquiteturas desnecessárias.

---

## 8. Critério para antecipação excepcional

Uma funcionalidade fora do MVP só pode ser antecipada se houver pelo menos um dos cenários abaixo:

1. **Instrução explícita do mantenedor**
2. **Dependência técnica inevitável para o MVP**
3. **Estrutura mínima necessária para não bloquear o núcleo**
4. **Decisão arquitetural formal registrada**

Mesmo nesses casos:
- a antecipação deve ser mínima;
- o código deve ser intencional;
- o escopo deve permanecer controlado.

---

## 9. Relação com arquitetura

Esta decisão **não proíbe** projetar com visão de futuro.

Ela apenas exige que a implementação siga estes princípios:

- **arquitetura pronta para crescer**
- **código implementado para a fase atual**

Ou seja:
- pensar à frente é bom;
- implementar à frente sem necessidade é ruim.

---

## 10. Relação com agentes de IA

Agentes de IA devem assumir que:

- o PRD é a fonte da fase atual;
- o `AGENTS.md` reforça essa prioridade;
- não devem “melhorar” o projeto adicionando funcionalidades fora da fase;
- não devem expandir escopo só porque a base técnica permitiria;
- devem sinalizar quando uma ideia parece boa, mas pertence à Fase 2 ou 3.

---

## 11. Exemplos práticos

## Exemplo 1: agenda
No MVP, implementar conflito básico de agenda.  
Não implementar engine avançada de capacidade por porte/raça/profissional sem solicitação.

## Exemplo 2: portal do tutor
No MVP, implementar portal básico.  
Não antecipar jornada completa, documentos, assinaturas e pré-check-in completo da Fase 2 sem instrução.

## Exemplo 3: pagamentos
No MVP, a base pode ser preparada, mas fiscal completo, múltiplos cenários sofisticados e automações de cobrança futuras não devem entrar sem decisão explícita.

## Exemplo 4: IA
No MVP, priorizar geração de mensagens e uso operacional simples.  
Não antecipar análise de imagem e análise preditiva.

---

## 12. Riscos conhecidos e mitigação

## Risco 1: arquitetura estreita demais para crescer
### Mitigação
- projetar com boa separação de responsabilidades;
- registrar ADRs;
- manter extensibilidade onde o custo for baixo.

## Risco 2: equipe sentir que “não pode melhorar nada”
### Mitigação
- permitir melhorias técnicas e de qualidade dentro da fase;
- distinguir claramente “melhoria do MVP” de “feature futura”.

## Risco 3: agentes de IA sugerirem excesso de preparação
### Mitigação
- reforçar a decisão em `AGENTS.md`;
- revisar sugestões com foco em aderência à fase.

---

## 13. Revisão futura

Esta decisão permanece válida enquanto o projeto estiver em construção do MVP.

Quando o MVP estiver estabilizado, a prioridade pode ser atualizada formalmente para Fase 2 por decisão do mantenedor.

---

## 14. Resumo

No PetOS:

- o **MVP vem primeiro**;
- Fase 2 e Fase 3 não devem ser implementadas cedo demais;
- arquitetura pode ser preparada com leveza;
- implementação deve respeitar a fase atual;
- foco é um ativo estratégico do projeto.
