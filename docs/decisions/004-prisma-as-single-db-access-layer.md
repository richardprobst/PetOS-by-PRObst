# ADR 004 — Prisma será a camada oficial de acesso ao banco de dados

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/002-nextjs-app-router-route-handlers.md`, `docs/decisions/003-server-side-business-rules.md`

---

## 1. Contexto

O PetOS usará um banco de dados relacional **MySQL** como base transacional do sistema.

O projeto precisa lidar com:

- entidades fortemente relacionadas;
- regras de negócio críticas;
- histórico e auditoria;
- operações financeiras;
- integrações externas;
- evolução incremental por fases;
- migrations frequentes ao longo do desenvolvimento.

Na definição da camada de dados, era necessário decidir:

> Como o projeto deve acessar o banco de dados de forma consistente, segura e sustentável?

---

## 2. Problema

Sem uma decisão explícita, haveria risco de o repositório evoluir com múltiplos padrões concorrentes, como:

- Prisma em parte do sistema;
- SQL manual espalhado em arquivos diferentes;
- acesso direto via driver em pontos isolados;
- lógica de persistência inconsistente entre módulos;
- migrations sem padrão único.

Isso aumentaria o risco de:

- duplicação;
- inconsistência de dados;
- dificuldade de manutenção;
- fragilidade em refatorações;
- baixa previsibilidade para humanos e agentes de IA.

---

## 3. Alternativas consideradas

## A. Prisma como camada oficial de acesso ao banco
Uso do Prisma Client para leitura e escrita, com `schema.prisma` e migrations como fonte principal de estrutura de dados.

### Vantagens
- boa integração com TypeScript;
- tipagem consistente;
- experiência adequada para modelagem relacional;
- migrations organizadas;
- melhor previsibilidade no projeto;
- boa compatibilidade com a stack definida.

### Desvantagens
- nem toda consulta complexa fica elegante imediatamente;
- exige disciplina para manter schema e migrations organizados.

## B. Mistura de Prisma com SQL direto espalhado
Uso de Prisma em parte do projeto e SQL/driver direto em outra parte.

### Vantagens
- liberdade local para resolver casos pontuais.

### Desvantagens
- quebra de padrão;
- perda de previsibilidade;
- maior dificuldade para revisão;
- risco alto de divergência na camada de dados;
- pior experiência para manutenção e agentes de IA.

## C. Driver SQL puro / query builder como padrão
Uso de SQL mais manual ou abstração mais baixa como padrão principal.

### Vantagens
- máximo controle sobre queries;
- alta flexibilidade para casos específicos.

### Desvantagens
- maior custo de implementação e manutenção;
- mais boilerplate;
- menor alinhamento com a decisão tecnológica já tomada;
- mais atrito para o ritmo inicial do projeto.

---

## 4. Decisão

## Decisão aceita
No PetOS, o **Prisma** será a **camada oficial e preferencial de acesso ao banco de dados**.

Isso significa que:

- acesso regular ao banco deve passar pelo **Prisma Client**;
- a estrutura do banco deve ser refletida no **`schema.prisma`**;
- alterações estruturais devem ocorrer por **migrations controladas**;
- acesso direto ao banco fora do Prisma não deve ser a regra.

---

## 5. Justificativa

A decisão foi tomada porque o Prisma oferece o melhor equilíbrio entre:

- integração com TypeScript;
- clareza da camada de dados;
- produtividade;
- consistência estrutural;
- previsibilidade para o time;
- aderência à arquitetura do PetOS.

### 5.1. Coerência com a stack
O PRD e os documentos arquiteturais já apontam Prisma como ORM oficial do projeto.

### 5.2. Consistência
Centralizar o acesso à persistência reduz padrões paralelos e facilita revisão técnica.

### 5.3. Evolução do schema
O projeto deverá evoluir rapidamente em suas fases. Ter um fluxo claro de schema + migration reduz risco de improviso e desalinhamento.

### 5.4. Qualidade para humanos e agentes
Uma camada previsível facilita:
- implementação;
- leitura;
- refatoração;
- revisão;
- geração de código assistida por IA.

---

## 6. Consequências práticas

A partir desta decisão:

- o `schema.prisma` passa a ser referência da estrutura relacional do sistema;
- mudanças estruturais devem ser feitas com migrations;
- repositórios, serviços e handlers devem usar Prisma Client;
- SQL manual não deve ser introduzido como padrão geral;
- documentação técnica deve assumir Prisma como base da persistência.

---

## 7. Regras decorrentes desta decisão

## 7.1. Schema e migrations
- toda alteração estrutural deve passar por `schema.prisma`;
- migrations devem ser geradas e versionadas;
- não alterar o banco “na mão” como prática comum;
- migrations devem ser pequenas, claras e com propósito definido.

## 7.2. Acesso aos dados
- operações comuns de leitura e escrita devem usar Prisma Client;
- transações devem usar mecanismos apropriados do Prisma;
- relações devem ser modeladas explicitamente;
- integridade referencial deve ser respeitada.

## 7.3. Organização
- evitar queries espalhadas sem padrão;
- concentrar persistência em camadas ou módulos coerentes;
- separar acesso a dados de regra de negócio quando possível.

---

## 8. Exceções controladas

Esta decisão **não proíbe totalmente** o uso de SQL manual, mas ele deve ser tratado como **exceção controlada**, e não como padrão.

Pode haver uso pontual quando houver justificativa clara, por exemplo:

- necessidade real de otimização;
- query muito específica não bem atendida pela abstração padrão;
- operação administrativa especial;
- manutenção controlada de dados.

### Regras para exceção
Se SQL direto for usado:
- justificar claramente no código ou na documentação;
- isolar a implementação;
- evitar espalhar o padrão;
- preservar segurança e parametrização;
- não burlar o domínio nem a integridade do sistema.

---

## 9. Riscos conhecidos e mitigação

## Risco 1: excesso de lógica de persistência misturada na aplicação
### Mitigação
- manter organização por domínio/capacidade;
- isolar casos de uso, serviços e persistência quando necessário.

## Risco 2: migrations desorganizadas
### Mitigação
- criar migrations pequenas;
- nomear migrations de forma clara;
- revisar impacto antes de aplicar mudanças em produção.

## Risco 3: uso indevido de SQL fora de padrão
### Mitigação
- reforçar esta decisão em `AGENTS.md`;
- revisar PRs com foco em consistência da camada de dados.

---

## 10. O que esta decisão não resolve sozinha

Esta decisão não substitui a necessidade de:

- boa modelagem de domínio;
- índices adequados;
- testes de persistência;
- transações bem pensadas;
- separação entre persistência e regra de negócio;
- revisão de performance quando necessário.

Ela apenas define **o caminho oficial de acesso ao banco**.

---

## 11. Revisão futura

Esta decisão só deve ser revista se houver mudança estrutural grande em:

- stack tecnológica;
- volume/complexidade operacional que justifique outro padrão;
- arquitetura do backend;
- limitações concretas do Prisma comprovadas no contexto do projeto.

Sem isso, a decisão permanece válida.

---

## 12. Resumo

No PetOS, o banco será acessado oficialmente por meio do **Prisma** porque isso traz:

- consistência;
- clareza;
- melhor integração com TypeScript;
- migrations controladas;
- melhor base para manutenção humana e assistida por IA.

SQL direto pode existir em casos excepcionais, mas não como padrão do sistema.
