# Changelog

Todas as mudanças relevantes do projeto **PetOS** devem ser registradas neste arquivo.

Este documento segue, com adaptações, a ideia do **Keep a Changelog**, usando linguagem clara e categorias padronizadas para facilitar acompanhamento de evolução do produto e do repositório.

## Como usar este arquivo

- Registrar mudanças relevantes de produto, arquitetura, segurança, banco de dados, integrações, testes e documentação.
- Atualizar o changelog em toda alteração significativa aprovada para o repositório.
- Não usar este arquivo para listar detalhes triviais ou ruído de implementação sem impacto real.
- Sempre que possível, manter alinhamento entre as entradas do changelog, o **PRD do PetOS**, o **AGENTS.md** e o histórico de entregas por fase.

## Categorias padrão

- **Added**: novas funcionalidades, novos documentos, novas integrações.
- **Changed**: mudanças de comportamento, arquitetura, regras ou fluxos existentes.
- **Fixed**: correções de bugs, falhas de validação, segurança, regressões e inconsistências.
- **Deprecated**: recursos, fluxos ou padrões marcados para descontinuação futura.
- **Removed**: remoções efetivas de funcionalidades, arquivos, fluxos ou dependências.
- **Security**: mudanças diretamente ligadas a segurança, autenticação, autorização, auditoria, dados sensíveis, pagamentos ou webhooks.

## Política de versão

O projeto pode adotar **Semantic Versioning** quando a base do sistema estiver operacionalmente estável.

Até lá, recomenda-se o uso de versões iniciais no padrão:

- `0.1.0` → estrutura inicial do projeto
- `0.2.0` → MVP parcial com blocos principais
- `0.3.0` → MVP funcional consolidado
- `0.4.0+` → evolução do MVP, Fase 2 e adições relevantes

## Datas

Usar o formato:

`YYYY-MM-DD`

Exemplo:

`2026-03-30`

---

## [Unreleased]

### Added
- Estrutura inicial de documentação e governança do repositório.
- Arquivos-base para operação do projeto, incluindo README, AGENTS, CONTRIBUTING, SECURITY e variáveis de ambiente de exemplo.

### Changed
- Definição de fluxo inicial para organização de documentação e preparação do repositório.

### Security
- Diretrizes iniciais de segurança, incluindo tratamento de segredos, pagamentos, uploads, auditoria e autenticação.

---

## [0.1.0] - 2026-03-30

### Added
- PRD inicial consolidado do **PetOS**.
- Definição da stack principal: **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **MySQL**, **Prisma**, **Route Handlers** e **Auth.js / NextAuth.js**.
- Estrutura inicial de documentação para desenvolvimento assistido por IA.
- Definição do escopo do **MVP**, **Fase 2**, **Fase 3** e **Roadmap Futuro**.
- Diretrizes de segurança, RBAC, auditoria, pagamentos e integrações externas.

### Changed
- Consolidação da decisão de manter o PetOS como **sistema próprio**, e não baseado em WordPress.
- Refinamento da arquitetura do projeto para aderir ao modelo fullstack com Next.js.

### Security
- Definição inicial de cuidados obrigatórios com autenticação, autorização, webhooks, dados sensíveis e pagamentos.

---

## Modelo para futuras entradas

```md
## [0.x.x] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Deprecated
- ...

### Removed
- ...

### Security
- ...
```

## O que deve entrar no changelog

Inclua no changelog quando houver:

- nova funcionalidade do produto;
- mudança de regra de negócio;
- alteração de schema Prisma ou migração relevante;
- alteração de autenticação, RBAC ou auditoria;
- adição ou troca de gateway, webhook ou integração externa;
- mudança de comportamento de agendamento, status, pagamentos ou comissão;
- correção importante de segurança ou bug operacional;
- mudança de arquitetura, convenções ou políticas do repositório.

## O que normalmente não precisa entrar

Normalmente não incluir:

- ajustes cosméticos sem impacto real;
- refactors triviais internos sem mudança de comportamento;
- pequenas correções textuais sem impacto no uso do projeto;
- experimentos descartados antes de entrar no fluxo principal.

## Relação com outros arquivos do projeto

Este arquivo deve ser lido em conjunto com:

- `README.md`
- `PetOS_PRD.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

Se houver conflito entre o changelog e o PRD sobre comportamento esperado do produto, o **PRD** permanece como referência principal de especificação.
