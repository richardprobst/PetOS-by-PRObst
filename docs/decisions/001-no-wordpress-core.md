# ADR 001 — WordPress não será a base do núcleo do PetOS

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`

---

## 1. Contexto

O PetOS é um sistema SaaS voltado para pet shops, banho e tosa e serviços correlatos, com foco no mercado brasileiro.

O produto exige, desde o início ou em evolução planejada:

- agenda operacional com regras de conflito;
- fluxo formal de status do atendimento;
- cadastro estruturado de clientes, pets, serviços e profissionais;
- financeiro e rastreabilidade;
- permissões e auditoria;
- portal do tutor;
- integrações externas;
- evolução para pagamentos, documentos, webhooks, IA e multiunidade.

Durante a definição arquitetural, foi considerada a possibilidade de usar **WordPress como base do sistema**, aproveitando familiaridade com o ecossistema e facilidade inicial de publicação de páginas e conteúdo.

---

## 2. Problema

A dúvida central era:

> O núcleo do PetOS deve ser construído sobre WordPress ou sobre uma stack de aplicação própria?

A decisão precisava considerar:

- aderência ao PRD;
- natureza transacional do produto;
- complexidade de regras de negócio;
- segurança;
- escalabilidade;
- manutenção;
- capacidade de evolução por fases.

---

## 3. Alternativas consideradas

## A. WordPress como base do sistema
Uso de WordPress como núcleo da aplicação, com plugins, custom post types, custom tables, APIs e customizações para sustentar a operação do PetOS.

### Vantagens
- ecossistema conhecido;
- rapidez para páginas institucionais e conteúdo;
- facilidade inicial para áreas simples;
- grande disponibilidade de plugins.

### Desvantagens
- exigiria alta customização para sustentar regras transacionais complexas;
- risco de acoplamento excessivo entre CMS e domínio do produto;
- aumento da complexidade para RBAC, auditoria, pagamentos, webhooks e regras operacionais;
- maior chance de arquitetura híbrida confusa;
- manutenção mais difícil à medida que o sistema cresce.

## B. Sistema próprio como núcleo
Construção do PetOS como aplicação própria fullstack, usando stack definida no PRD.

### Vantagens
- melhor aderência ao domínio do produto;
- maior controle sobre dados, fluxos, segurança e regras;
- arquitetura mais coerente para evolução por fases;
- menor dependência de contorcionismos para suportar funcionalidades SaaS;
- melhor base para integrações críticas e multiunidade futura.

### Desvantagens
- maior investimento inicial de arquitetura e base técnica;
- exige mais disciplina desde o começo;
- menor reaproveitamento de ferramentas prontas de CMS.

---

## 4. Decisão

## Decisão aceita
**WordPress não será a base do núcleo do PetOS.**

O núcleo do sistema será implementado como **aplicação própria**, usando a stack definida no projeto:

- Next.js com App Router
- TypeScript
- React
- Tailwind CSS
- Node.js
- MySQL
- Prisma ORM
- Route Handlers
- Auth.js / NextAuth.js
- Zod

WordPress pode ser utilizado, se necessário no futuro, apenas em papel **periférico**, como:

- site institucional;
- blog;
- landing pages;
- conteúdo de marketing;
- central pública de conteúdo.

Ele **não** será o núcleo operacional do produto.

---

## 5. Justificativa

A decisão foi tomada porque o PetOS possui natureza de **aplicação operacional transacional**, não de CMS adaptado.

Os seguintes fatores pesaram fortemente:

### 5.1. Complexidade do domínio
O produto exige regras fortes para:
- agenda;
- status;
- financeiro;
- comissão;
- permissões;
- auditoria;
- pagamentos;
- integração entre módulos.

Isso é mais bem servido por uma arquitetura de aplicação própria do que por um CMS altamente customizado.

### 5.2. Aderência ao PRD
O PRD já define uma stack e uma evolução que apontam claramente para uma aplicação própria, não para um núcleo em WordPress.

### 5.3. Segurança e rastreabilidade
Áreas como:
- autenticação;
- autorização;
- webhooks;
- auditoria;
- documentos;
- dados sensíveis;
- pagamentos

pedem controle fino de arquitetura, domínio e persistência.

### 5.4. Evolução futura
O sistema precisa poder crescer para:
- Fase 2 com documentos, no-show protection, estoque completo, fiscal e pagamentos;
- Fase 3 com IA avançada e multiunidade.

Uma base própria oferece maior previsibilidade e menor atrito estrutural nessa evolução.

---

## 6. Consequências

## Consequências positivas
- arquitetura mais coerente com o domínio do produto;
- mais controle sobre modelagem e regras;
- melhor separação entre UI, domínio, persistência e integração;
- menos improviso estrutural;
- melhor base para testes, auditoria e segurança.

## Consequências aceitas
- maior esforço inicial de setup;
- necessidade de base técnica mais organizada;
- menor reaproveitamento de recursos “prontos” de CMS.

---

## 7. Impactos práticos no repositório

A partir desta decisão:

- o projeto deve seguir a stack oficial do PRD;
- agentes de IA não devem sugerir WordPress como base do núcleo sem mudança formal de decisão;
- documentação e exemplos devem assumir arquitetura própria;
- integrações futuras devem ser desenhadas sobre a base fullstack definida;
- qualquer uso de WordPress, se existir, deve ser tratado como componente externo e não como centro da operação.

---

## 8. O que esta decisão não proíbe

Esta decisão **não impede**:

- uso de WordPress para marketing e conteúdo;
- integração futura entre PetOS e um site WordPress externo;
- migração/importação de conteúdo entre sistemas;
- reaproveitamento de conhecimento do ecossistema WordPress em áreas não centrais.

Ela apenas define que o **núcleo do PetOS** não será construído sobre WordPress.

---

## 9. Revisão futura

Esta decisão só deve ser revista se houver mudança significativa em pelo menos um destes pontos:

- escopo do produto;
- modelo de negócio;
- capacidade técnica da equipe;
- restrições severas de infraestrutura;
- redefinição formal do PRD.

Sem isso, a decisão permanece válida.

---

## 10. Resumo

O PetOS será construído como **sistema próprio**, porque seu domínio, seu PRD e sua evolução planejada exigem arquitetura transacional, modular, segura e extensível.

WordPress pode existir ao redor do produto, mas **não como base do núcleo operacional**.
