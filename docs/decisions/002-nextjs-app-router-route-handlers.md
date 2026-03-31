# ADR 002 — Next.js App Router com Route Handlers será a base fullstack do PetOS

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/001-no-wordpress-core.md`

---

## 1. Contexto

O PetOS será construído como um sistema próprio, com natureza de aplicação operacional transacional, orientada a domínio e com evolução por fases.

O projeto precisa sustentar, desde o MVP e em evolução futura:

- interface administrativa;
- portal do tutor;
- autenticação e autorização;
- APIs internas;
- regras de domínio e operações transacionais;
- integração com banco relacional via Prisma;
- pagamentos, webhooks e auditoria;
- futura expansão para IA, documentos, multiunidade e integrações externas.

Na definição da base técnica, foi necessário decidir **qual arquitetura fullstack principal** sustentaria frontend, backend e evolução do repositório de forma coesa.

---

## 2. Problema

A decisão precisava responder:

> Qual base fullstack deve estruturar o PetOS para equilibrar produtividade, clareza arquitetural, manutenção, performance e evolução futura?

A escolha deveria considerar:

- aderência ao PRD;
- simplicidade do MVP;
- boa integração entre frontend e backend;
- compatibilidade com TypeScript, Prisma, autenticação e validação;
- organização sustentável para humanos e agentes de IA;
- menor atrito para evoluir o sistema ao longo das fases.

---

## 3. Alternativas consideradas

## A. Next.js com App Router e Route Handlers
Uso do Next.js como base fullstack, com App Router para páginas/rotas e Route Handlers para APIs internas.

### Vantagens
- stack unificada para frontend e backend;
- boa aderência ao uso com React e TypeScript;
- estrutura moderna para rotas, layouts e organização por aplicação;
- facilidade para integrar autenticação, validação e acesso ao banco;
- boa base para portal do tutor, área administrativa e APIs internas;
- reduz dispersão arquitetural no início do projeto.

### Desvantagens
- exige disciplina para separar bem UI, domínio e integração;
- pode ser mal utilizado se toda lógica for empilhada dentro de rotas sem camada de aplicação.

## B. Next.js com Pages Router legado
Uso do Next.js em modelo anterior de roteamento.

### Vantagens
- familiaridade histórica para parte da comunidade;
- muitos exemplos antigos disponíveis.

### Desvantagens
- menos alinhado com a direção atual do framework;
- menor coerência com a arquitetura moderna definida para o projeto;
- não faz sentido iniciar um projeto novo com padrão legado.

## C. Frontend e backend totalmente separados desde o início
Exemplo: frontend em Next.js e backend separado em Express/Nest/Fastify.

### Vantagens
- separação física mais explícita;
- escalabilidade arquitetural futura em cenários específicos.

### Desvantagens
- maior custo inicial de setup e integração;
- mais complexidade para o MVP sem necessidade comprovada;
- duplicação de preocupação com autenticação, contrato e infraestrutura logo no começo.

---

## 4. Decisão

## Decisão aceita
O PetOS será construído com:

- **Next.js**
- **App Router**
- **Route Handlers** para APIs internas
- **React**
- **TypeScript**
- **Prisma**
- **MySQL**
- **Auth.js / NextAuth.js**
- **Zod**

Essa combinação será a **base fullstack oficial do projeto**.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Coerência com o PRD
O PRD já define a base do projeto em torno de Next.js, TypeScript, Prisma, MySQL e autenticação moderna. Formalizar o App Router com Route Handlers torna essa definição mais precisa e consistente.

### 5.2. Simplicidade arquitetural para o MVP
O projeto precisa de velocidade com responsabilidade. Uma base fullstack unificada reduz atrito inicial, sem impedir separação lógica entre camadas.

### 5.3. Boa relação entre UI e backend
O PetOS precisa de:
- páginas administrativas;
- portal do tutor;
- fluxos autenticados;
- formulários;
- APIs internas;
- integração com banco e serviços externos.

Essa combinação atende bem ao conjunto sem forçar fragmentação prematura.

### 5.4. Melhor alinhamento com TypeScript e Prisma
A experiência de tipagem, validação e modelagem fica mais consistente com o ecossistema adotado.

### 5.5. Boa base para humanos e agentes de IA
Uma stack mais unificada e previsível facilita:
- leitura do repositório;
- geração de código;
- manutenção;
- revisão;
- testes;
- documentação.

---

## 6. Consequências

## Consequências positivas
- menor atrito para iniciar o sistema;
- arquitetura mais coesa para MVP;
- melhor integração entre frontend, autenticação, banco e APIs;
- menos dispersão de contexto entre projetos separados;
- base moderna e alinhada com a direção do framework.

## Consequências aceitas
- necessidade de disciplina para não misturar tudo em uma única camada;
- risco de acoplamento indevido se não houver organização por domínio;
- atenção extra para manter regras de negócio fora da UI e fora de handlers excessivamente gordos.

---

## 7. Regras decorrentes desta decisão

A partir desta decisão:

- rotas da aplicação devem seguir o **App Router**;
- APIs internas devem preferir **Route Handlers**;
- a lógica de negócio não deve ficar concentrada apenas em handlers;
- código de domínio/aplicação deve ser isolado em camadas ou módulos adequados;
- autenticação deve seguir a estratégia oficial do projeto;
- Prisma será o caminho oficial de acesso ao banco.

---

## 8. O que esta decisão não impede

Esta decisão **não impede**:

- uso de server actions quando fizer sentido e for coerente com a arquitetura adotada;
- extração futura de serviços específicos para módulos separados, se a complexidade justificar;
- adoção de camadas mais explícitas de serviço e domínio dentro do próprio projeto;
- evolução da organização interna do repositório por domínio/capacidade.

Ela apenas define a **base fullstack principal** do PetOS neste momento.

---

## 9. Riscos conhecidos e mitigação

## Risco 1: lógica demais na camada de rota
### Mitigação
- criar camada de aplicação/serviços;
- manter handlers finos;
- isolar regras de domínio.

## Risco 2: mistura entre UI e regra crítica
### Mitigação
- garantir validação e autorização no servidor;
- manter cálculo, status, financeiro e permissões fora da UI.

## Risco 3: crescimento desorganizado do repositório
### Mitigação
- seguir `AGENTS.md`;
- seguir `docs/architecture.md`;
- organizar por domínio/capacidade quando útil;
- documentar decisões arquiteturais relevantes.

---

## 10. Revisão futura

Esta decisão só deve ser revista se houver mudança relevante em:

- escopo do produto;
- necessidade comprovada de separação física de backend;
- restrições operacionais sérias de infraestrutura;
- mudança formal de arquitetura aprovada pelo mantenedor.

Sem isso, a decisão permanece válida.

---

## 11. Resumo

O PetOS usará **Next.js com App Router e Route Handlers** como base fullstack porque isso oferece:

- aderência ao PRD;
- simplicidade responsável para o MVP;
- integração forte com React, TypeScript, Prisma e autenticação;
- boa capacidade de evolução sem fragmentação prematura.

A decisão não elimina a necessidade de boa arquitetura interna — ela apenas define a fundação oficial do projeto.
