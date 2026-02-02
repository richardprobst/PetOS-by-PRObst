# 🐾 PetOS By PRObst — Blueprint Moderno

**Sistema:** PetOS By PRObst (Sistema de Banho e Tosa)  
**Autor:** PRObst  
**Objetivo:** criar um sistema moderno, código limpo e arquitetura sólida, **mantendo compatibilidade com o banco existente** (clientes, pets e atendimentos), e entregando uma experiência **moderna e organizada** para administração, colaboradores e clientes.

> **Foco exclusivo:** Sistema de **Banho e Tosa** para pets.

> **Regra de ouro do projeto:** **não “remendar”**. Toda decisão precisa sustentar: **DRY + SOLID + Segurança + Testabilidade + UX consistente**.

---

## Sumário
1. [Visão e princípios](#1-visão-e-princípios)  
2. [Arquitetura alvo](#2-arquitetura-alvo)  
3. [Estrutura do repositório (moderna)](#3-estrutura-do-repositório-moderna)  
4. [Padrões de código](#4-padrões-de-código)  
5. [Compatibilidade com banco atual (sem quebra)](#5-compatibilidade-com-banco-atual-sem-quebra)  
6. [Domínio e casos de uso (MVP)](#6-domínio-e-casos-de-uso-mvp)  
7. [API e integrações](#7-api-e-integrações)  
8. [UX/UI moderna (Admin + Colaboradores + Clientes)](#8-uxui-moderna-admin--colaboradores--clientes)  
9. [Segurança (obrigatório)](#9-segurança-obrigatório)  
10. [Qualidade, testes e CI/CD](#10-qualidade-testes-e-cicd)  
11. [Observabilidade e performance](#11-observabilidade-e-performance)  
12. [Roadmap por etapas (execução)](#12-roadmap-por-etapas-execução)  
13. [Templates de prompts para GitHub Copilot](#13-templates-de-prompts-para-github-copilot)  
14. [Definição de pronto (DoD)](#14-definição-de-pronto-dod)  

---

## 1) Visão e princípios

### 1.1 Metas de produto (paridade inicial + evolução)
**MVP v2 (primeira entrega operável com dados existentes):**
- CRUD de **Clientes**
- CRUD de **Pets** (vinculados a Clientes)
- CRUD de **Atendimentos/Agendamentos**
- **Portal do Cliente (MVP)**: visualizar dados e histórico (com login por link mágico)

**Depois do MVP:** assinar módulos (assinaturas, finanças, comunicações, fidelidade, estoque, estatísticas etc.).

### 1.2 Princípios inegociáveis (modernidade)
- **Arquitetura limpa (Clean / Hexagonal)**: Domínio independente do WordPress.
- **Interfaces antes de implementação**: desacoplar e permitir evolução.
- **Design System + UI consistente**: mesma linguagem visual e de interação em todo o sistema.
- **Acessibilidade**: mínimo AA (contraste, teclado, labels, foco).
- **Segurança por padrão**: validação, sanitização, autorização e rate limiting.
- **Evolução por etapas** (feature flags): sem big-bang, sem downtime.

---

## 2) Arquitetura alvo

### 2.1 Decisão estratégica: WordPress como host (com núcleo desacoplado)
**Recomendação:** manter WordPress como host na v2 (no início), mas estruturar o plugin de modo que o **Domínio e a Aplicação não dependam do WP**.

**Benefícios:**
- Reuso do ecossistema (admin, auth, usuários, permissões, cron).
- Instalação simples (plugin) e compatibilidade com o banco atual.
- Migração gradual, com rollback fácil (desativar plugin).

### 2.2 Camadas (Clean Architecture)
- **Domain**: entidades, regras, value objects, eventos de domínio.
- **Application**: casos de uso, DTOs, validadores, serviços de aplicação.
- **Infrastructure**: WordPress adapters (REST, Admin, hooks), persistência ($wpdb), logging, segurança, cron.
- **UI**: Admin e Portal (front) consumindo REST v2.

> Regra: **nenhuma regra de negócio em controllers REST, templates ou JS**. Tudo passa pelos casos de uso.

### 2.3 Modularidade (sem Frankenstein)
- **Um plugin núcleo v2** (`petos-core`) com módulos internos (bounded contexts).
- Add-ons futuros podem existir, mas a v2 começa organizada: **core forte, extensível por eventos**.

---

## 3) Estrutura do repositório (moderna)

### 3.1 Monorepo
```
/plugins
  /petos-core
/docs
  /architecture
  /database
  /api
  /ux
  /runbook
/tools
  /dev
.github/workflows
```

### 3.2 Estrutura do plugin (PHP moderno + UI moderna)
```
plugins/petos-core/
  petos-core.php                    # bootstrap WP
  composer.json
  phpstan.neon
  phpunit.xml
  /src
    /Domain
    /Application
    /Infrastructure
    /UI
  /resources
    /admin                            # React/TS + Tailwind (build)
    /portal                           # React/TS + Tailwind (build)
  /build                              # assets compilados
  /tests
```

### 3.3 Stack recomendada (moderna e realista)
- **PHP 8.2+** (8.3 opcional), `declare(strict_types=1);`
- **Composer + PSR-4**
- **PHPStan** (nível 6+ para começar, subir gradualmente)
- **PHPUnit** + integração com WP Test Suite
- **JS/TS:** React + TypeScript
- **Build:** Vite (ou `@wordpress/scripts` se preferir padrão WP)
- **UI:** Tailwind + Headless UI (ou shadcn-like components)  
- **Padrão de componentes:** atomic + design tokens

> Se precisar manter compatibilidade com PHP 7.4, isso reduz bastante o “moderno”. Ideal: subir a infra para 8.2.

---

## 4) Padrões de código

### 4.1 Convenções de estilo e arquitetura
- PSR-12 + PHP-CS-Fixer
- Sem lógica de domínio fora de `Domain/` e `Application/`
- Sem funções globais (exceto bootstrap e compat/hook registration)
- **Namespaces** obrigatórios
- **DTOs** para entrada/saída, nunca usar `$_POST` direto em use case
- Repositórios e mappers encapsulam persistência
- **Eventos de domínio** para extensibilidade

### 4.2 Injeção de dependência (moderno)
- Container simples (ex.: `league/container` ou container próprio minimalista)
- Registrador de serviços no bootstrap
- Controller REST recebe dependências (sem singletons espalhados)

### 4.3 Tratamento de erros (consistência)
- Erros de validação retornam códigos e mensagens padronizadas
- Logar exceções com contexto (request id, usuário, payload parcial mascarado)

---

## 5) Compatibilidade com banco atual (sem quebra)

### 5.1 Objetivo
Instalar v2 e **continuar usando os mesmos dados** já cadastrados.  
✅ Sem migração destrutiva.

### 5.2 Estratégia em duas fases
**Fase A — compatibilidade total:**  
- Ler/escrever nas mesmas tabelas/colunas atuais.
- Criar `LegacySchemaMap` (fonte única de verdade dos nomes).

**Fase B — evolução segura (opcional):**  
- Novas tabelas para recursos modernos (auditoria, tokens de portal, trilhas de log, filas) **sem alterar legado**.
- Novas colunas apenas se forem *nullable* e retrocompatíveis.

### 5.3 Auditoria do schema (entregável obrigatório)
Gerar:
- `docs/database/schema.sql` (estrutura do DB)
- `docs/database/legacy-schema.md` (dicionário de dados)
- `docs/database/mapping.md` (mapa: feature → tabelas/colunas)

**Comandos recomendados (exemplo):**
- `mysqldump --no-data --routines --triggers --events DBNAME > schema.sql`

### 5.4 Contrato de compatibilidade (regra)
- **Nunca renomear** tabela/coluna do legado.
- **Nunca mudar tipo** de coluna do legado no MVP.
- Melhorias = tabelas novas + referências lógicas.

---

## 6) Domínio e casos de uso (MVP)

### 6.1 Entidades (ajustar ao schema real)
**Cliente (Client)**  
- id, nome, telefone/whatsapp, email?, cpf?, data_nasc?, endereco?, origem?, consentimento_foto?

**Pet (Pet)**  
- id, client_id, nome, espécie, porte, sexo, raça, peso?, pelagem?, cor?, data_nasc?, restrições?, agressividade?

**Atendimento/Agendamento (Appointment/ServiceEvent)**  
- id, client_id, pet_id (ou vínculo), início/fim, status, serviços, notas, valor?

### 6.2 Value Objects
- PhoneNumber (normalização)
- Email
- Money (se houver valores)
- DateRange

### 6.3 Use cases (MVP)
**Clientes**
- CreateClient, UpdateClient, GetClientById, SearchClients

**Pets**
- AddPetToClient, UpdatePet, ListPetsByClient

**Atendimentos**
- ScheduleAppointment, UpdateAppointment, CancelAppointment, CompleteAppointment
- ListAppointmentsByClient, ListAppointmentsByDateRange

**Portal**
- RequestMagicLink, ValidateMagicLink, PortalGetSummary

### 6.4 Eventos de domínio (extensibilidade)
- ClientCreated
- PetAddedToClient
- AppointmentScheduled / Completed

---

## 7) API e integrações

### 7.1 REST API v2 (padrão moderno)
Rotas:
- `/dps/v2/clients`
- `/dps/v2/clients/{id}/pets`
- `/dps/v2/appointments`
- `/dps/v2/portal/request-link`
- `/dps/v2/portal/session`

Regras:
- Admin: autenticação WP + capability (criar capability PetOS própria é o ideal).
- Portal: token + rate limit + mensagens genéricas para evitar enumeração.

### 7.2 Contratos de resposta (consistência)
Padrão JSON:
```
{ "data": ..., "meta": ..., "errors": ... }
```
- Erros com `code`, `message`, `field?`, `details?`

### 7.3 Integrações (pós-MVP)
- WhatsApp: inicialmente pode ser “manual”, depois integrar API (via módulo).
- E-mail: WP Mail + provider (SendGrid/Mailgun) com interface `Mailer`.

---

## 8) UX/UI moderna (Admin + Colaboradores + Clientes)

### 8.1 Princípios de UX (indispensáveis)
- **Menos cliques** (fluxos curtos, foco no objetivo)
- **Feedback imediato** (toasts, estados de loading, validação inline)
- **Padrões consistentes** (layout, botões, formulários, mensagens)
- **Acessível** (teclado, foco, aria, contraste)
- **Responsivo** (admin também precisa funcionar em tablet/celular)
- **Escrita clara** (microcopy objetiva; erros explicam como resolver)

### 8.2 Design System (obrigatório na v2)
**Tokens:**
- cores (primária, sucesso, alerta, erro)
- tipografia (escala)
- espaçamento (4/8/12/16)
- raio de borda
- sombras
- grid e breakpoints

**Componentes base (reutilizáveis):**
- Button, Input, Select, Textarea, Checkbox, Switch
- Modal/Dialog, Drawer (mobile), Toast, Tooltip
- DataTable com paginação/filtro/sort
- Empty states, Skeleton loaders
- Stepper (cadastro público), Tabs (perfil cliente)

> Regra: **nada de CSS solto por tela**. Tudo sai do design system.

### 8.3 Perfis e permissões (UX + segurança)
Criar papéis claros:
- **Admin** (configurações, usuários, tudo)
- **Colaborador** (opera atendimentos, vê clientes/pets, limitações)
- **Financeiro** (se existir)
- **Cliente (portal)** (apenas próprio histórico)

A UI deve ocultar o que não é permitido e a API deve bloquear por backend.

### 8.4 Admin (moderno e eficiente)
**Menu PetOS:**
- Dashboard (hoje, próximos atendimentos, alertas)
- Clientes (lista + busca rápida por telefone)
- Pets (vinculados ao cliente; filtro por porte/espécie)
- Atendimentos (calendário + lista)
- Configurações (somente admin)

**Padrões de tela:**
- Header com título + ação primária (ex.: “Novo Cliente”)
- Busca global por nome/telefone
- Tabelas com colunas essenciais + “ver detalhes”
- Formulários em **duas colunas** no desktop, uma coluna no mobile
- Validação inline + máscaras (telefone, CPF se usar)

### 8.5 Portal do cliente (moderno e simples)
**Objetivo:** cliente resolve sem chamar suporte.

**Tela inicial (após link):**
- “Olá, {nome}”
- Cards: Pets / Próximos atendimentos / Histórico / Assinaturas (se houver)
- CTA: “Solicitar agendamento” (pode abrir WhatsApp no MVP)

**Magic link (segurança + UX):**
- “Enviamos um link se este contato estiver cadastrado.” (sempre igual)
- Expiração curta (15–60min)
- Uso único (ou rotação)
- Rate limit e logs

### 8.6 Cadastro público (moderno e confiável)
- Multi-etapas (Tutor → Pets → Preferências → Revisão)
- Barra de progresso
- Possibilidade de adicionar “mais um pet”
- Anti-spam (honeypot + rate limit)
- Mensagens claras de erro
- Termos/consentimento bem explicados

---

## 9) Segurança (obrigatório)

### 9.1 Checklists essenciais
- `current_user_can()` em todas rotas admin
- `wp_verify_nonce()` em ações sensíveis
- Sanitização de entrada (telefone, email, texto)
- Escape de saída (`esc_html`, `esc_attr`, `wp_kses`)
- Prepared statements sempre (sem concatenação em SQL)
- Rate limiting em portal e endpoints públicos
- Não expor existência de e-mail/telefone (evitar enumeração)

### 9.2 Tokens do portal (recomendação técnica)
Criar tabela nova (sem mexer no legado):
- `wp_petos_portal_tokens`
  - id, client_id, token_hash, expires_at, used_at, created_at, metadata (ip/user_agent)

Guardar **hash** do token, nunca o token em texto puro.

---

## 10) Qualidade, testes e CI/CD

### 10.1 CI (GitHub Actions)
Pipeline mínimo:
- `composer validate`
- `php-cs-fixer` (check)
- `phpstan`
- `phpunit`
- build do admin/portal (`pnpm build`)

### 10.2 Testes (prioridade do MVP)
- Unit: validators, value objects, use cases
- Integration: repositories com banco de teste
- API: testes básicos de endpoints e permissões

---

## 11) Observabilidade e performance

### 11.1 Logging moderno
- Logger estruturado (níveis: debug/info/warn/error)
- Contexto: user_id, request_id, entity_id
- Mascarar campos sensíveis

### 11.2 Performance
- Índices no banco (após auditoria)
- Paginação e filtros server-side
- Cache para leituras (transients) onde fizer sentido

---

## 12) Roadmap por etapas (execução)

### Etapa 0 — Setup (base moderna)
- Criar `petos-core` com Composer + autoload PSR-4
- CI mínimo funcionando
- Estrutura de pastas conforme blueprint
- Doc `docs/architecture/decisions.md`

### Etapa 1 — Auditoria do banco (obrigatório)
- Export `schema.sql`
- Escrever `legacy-schema.md` e `mapping.md`
- Identificar tabelas e relações reais do legado

### Etapa 2 — Núcleo do domínio (sem UI)
- Domain + Application (use cases)
- Repositories interfaces
- Implementação `$wpdb` + `LegacySchemaMap`
- Testes unitários iniciais

### Etapa 3 — REST API v2
- Endpoints de Clientes, Pets, Atendimentos
- Auth + capabilities
- Erros padronizados

### Etapa 4 — Admin MVP (UI moderna)
- React/TS + DataTable + formulários
- Fluxos: listar, criar, editar
- Busca por telefone (essencial)

### Etapa 5 — Portal MVP
- Magic link seguro
- Página do portal com histórico e pets
- CTA para WhatsApp/agendamento

### Etapa 6 — Migração gradual
- Feature flags (v2 liga por módulo)
- Conviver com v1 e desligar aos poucos

---

## 13) Templates de prompts para GitHub Copilot

### Prompt base (sempre)
> “Implemente em PHP 8.2 com strict_types, PSR-12, SOLID e DRY. Use namespaces e Composer PSR-4. Sem funções globais (exceto bootstrap). Valide e sanitize todos inputs. Todo SQL via `$wpdb` com prepared statements. Crie testes PHPUnit para regras críticas. Não coloque regra de negócio em controllers.”

### Repository
> “Implemente `WpdbClientRepository` (save/find/search) usando `$wpdb` e prepared statements. Mapeie DB↔Entidade via Mapper. Inclua tratamento de erro e logging estruturado.”

### REST Controller
> “Crie rotas REST `/dps/v2/clients` com permission_callback por capability. Faça DTO + validação e chame use case. Retorne JSON consistente com errors e status codes.”

### UI (Admin)
> “Crie UI em React + TS com DataTable (paginação, filtro, sort), formulários com validação, estados de loading e toasts. Use design tokens e componentes reutilizáveis. Acessível e responsivo.”

---

## 14) Definição de pronto (DoD)

### MVP está pronto quando:
- ✅ Plugin v2 instala e **enxerga dados existentes** (clientes/pets/atendimentos)\n- ✅ CRUD completo para clientes, pets, atendimentos\n- ✅ Portal mostra resumo e histórico via link mágico seguro\n- ✅ Segurança aplicada (nonce/capabilities/rate limiting/SQL seguro)\n- ✅ CI passando (lint + phpstan + phpunit + build)\n- ✅ Documentação mínima (arquitetura + banco + API + runbook)\n\n---\n\n## Próximo passo imediato (para começar hoje)\n1. Gerar `schema.sql` do banco atual (estrutura).\n2. Criar `docs/database/legacy-schema.md` e mapear tabelas/colunas reais.\n3. Implementar `LegacySchemaMap` + `WpdbClientRepository`.\n4. Subir o primeiro endpoint `/clients` + uma lista simples no admin.\n\n---\n\n**Fim.**\n