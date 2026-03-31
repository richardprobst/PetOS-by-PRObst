# Decisões Arquiteturais do PetOS

## 1. Objetivo desta pasta

Esta pasta reúne os **ADRs (Architecture Decision Records)** do projeto **PetOS**.

Os ADRs existem para registrar decisões importantes de arquitetura, execução e estrutura técnica, preservando:

- contexto;
- alternativas consideradas;
- decisão adotada;
- justificativa;
- consequências práticas.

Esses registros ajudam a evitar decisões implícitas, perda de contexto e divergência entre produto, código e documentação.

---

## 2. Como interpretar os ADRs

Cada ADR deve responder, no mínimo:

- qual problema precisava ser resolvido;
- quais alternativas foram consideradas;
- qual decisão foi tomada;
- por que ela foi tomada;
- quais consequências essa decisão traz.

### Regra importante
Se houver conflito entre um ADR e o **PRD**, o **PRD vence**, a menos que o próprio PRD tenha sido atualizado formalmente para refletir a nova decisão.

---

## 3. Relação com outros documentos

Os ADRs desta pasta foram pensados para conversar com:

- `PetOS_PRD.md`
- `AGENTS.md`
- `README.md`
- `docs/architecture.md`
- `docs/domain-rules.md`
- `SECURITY.md`
- `CONTRIBUTING.md`

---

## 4. Índice dos ADRs atuais

### ADR 001 — WordPress não será a base do núcleo do PetOS
Arquivo: `001-no-wordpress-core.md`  
Decisão: o núcleo do PetOS será construído como sistema próprio, e não sobre WordPress.

### ADR 002 — Next.js App Router com Route Handlers será a base fullstack do PetOS
Arquivo: `002-nextjs-app-router-route-handlers.md`  
Decisão: a base fullstack oficial do projeto será Next.js com App Router e Route Handlers.

### ADR 003 — Regras críticas de negócio e autorização devem ser garantidas no servidor
Arquivo: `003-server-side-business-rules.md`  
Decisão: UI melhora experiência, mas regras críticas, validações sensíveis e autorização pertencem ao servidor.

### ADR 004 — Prisma será a camada oficial de acesso ao banco de dados
Arquivo: `004-prisma-as-single-db-access-layer.md`  
Decisão: Prisma será o padrão oficial para acesso ao banco, schema e migrations.

### ADR 005 — Auth.js com RBAC aplicado no servidor será a estratégia oficial de autenticação e autorização
Arquivo: `005-authjs-rbac-server-enforced.md`  
Decisão: Auth.js / NextAuth.js será a base de autenticação, com RBAC e autorização real no servidor.

### ADR 006 — Separação conceitual entre status operacional e status financeiro
Arquivo: `006-status-operational-vs-financial-separation.md`  
Decisão: status de atendimento e status financeiro devem ser tratados como conceitos distintos.

### ADR 007 — Documentos e mídias terão armazenamento externo, com banco guardando referências e metadados
Arquivo: `007-storage-for-documents-and-media-outside-db.md`  
Decisão: o banco não armazenará o binário principal; apenas referências e metadados.

### ADR 008 — Webhooks devem ser idempotentes, validados, rastreáveis e auditáveis
Arquivo: `008-webhooks-must-be-idempotent-and-auditable.md`  
Decisão: eventos externos críticos devem ser tratados com validação, idempotência, rastreabilidade e auditoria.

### ADR 009 — Zod será a camada oficial de contratos e validação do PetOS
Arquivo: `009-zod-as-validation-contract-layer.md`  
Decisão: Zod será a base de contratos e validação entre frontend, backend e domínio.

### ADR 010 — Prioridade absoluta para o MVP, sem antecipação indevida de Fase 2 e Fase 3
Arquivo: `010-mvp-first-no-premature-phase-2-3-implementation.md`  
Decisão: o projeto deve priorizar rigorosamente o MVP e evitar escopo prematuro.

---

## 5. Como criar novos ADRs

Ao registrar uma nova decisão, seguir estas regras:

1. usar numeração sequencial;
2. usar nome curto, claro e descritivo;
3. registrar contexto, problema, alternativas, decisão e consequências;
4. relacionar o ADR aos documentos impactados;
5. atualizar este `README.md`.

### Exemplo de nome
`011-nome-curto-da-decisao.md`

---

## 6. Quando criar um novo ADR

Criar ADR sempre que a decisão impactar significativamente:

- arquitetura;
- stack;
- segurança;
- autenticação/autorização;
- dados e modelagem;
- storage;
- integrações;
- estratégia de execução;
- convenções estruturais importantes.

### Evitar ADR para
- detalhe pequeno de implementação;
- escolha local sem impacto sistêmico;
- preferência pessoal sem consequência relevante.

---

## 7. Regra de manutenção

Sempre que um ADR for:

- criado,
- atualizado,
- substituído,
- revogado,

este índice deve ser revisado.

Se uma decisão antiga deixar de valer, isso deve ficar explícito por meio de:
- novo ADR substituindo o anterior; ou
- atualização formal do status do ADR antigo.

---

## 8. Resumo

Esta pasta existe para preservar a memória arquitetural do PetOS.

Objetivo:
- reduzir improviso;
- manter consistência;
- facilitar onboarding;
- ajudar humanos e agentes de IA a entenderem o “porquê” da arquitetura.
