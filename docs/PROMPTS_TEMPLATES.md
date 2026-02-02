# 📋 Templates de Prompts — PetOS By PRObst

Este documento contém templates prontos para solicitar implementações ao GitHub Copilot. Use-os como base e adapte conforme necessário.

---

## 🎯 Prompt Base (Usar Sempre)

Inclua este contexto em toda solicitação:

```
Estamos desenvolvendo o PetOS By PRObst, um sistema de Banho e Tosa.
Stack: PHP 8.2+, WordPress (host), Clean Architecture, React + TypeScript.
Siga os padrões em docs/GUIA_COPILOT.md e docs/CONVENCOES.md.
```

---

## 📦 Domain Layer

### Criar Entidade
```
## Contexto
Sistema PetOS, Fase 2 - Núcleo do Domínio.
[Descreva o que já existe]

## Tarefa
Criar a entidade [NOME] no namespace PetOS\Domain\[Modulo].

## Atributos
- id: [NOME]Id (value object)
- [listar outros atributos com tipos]

## Regras de Negócio
- [listar validações e regras]

## Requisitos Técnicos
- PHP 8.2 com strict_types
- Readonly properties onde possível
- Validação nos setters que alteram estado
- Métodos de domínio para operações complexas

## Arquivos de Referência
- src/Domain/Client/Client.php (padrão)

## Entregáveis
- Entidade em src/Domain/[Modulo]/[Nome].php
- Teste em tests/Unit/Domain/[Modulo]/[Nome]Test.php
```

### Criar Value Object
```
## Contexto
Sistema PetOS, Fase 2 - Núcleo do Domínio.

## Tarefa
Criar value object [NOME] no namespace PetOS\Domain\Shared (ou módulo específico).

## Comportamento
- Imutável
- Validação no construtor
- [descrever regras de validação]

## Métodos
- getValue(): [tipo] - valor puro
- [outros métodos de formatação/comparação]

## Exemplos de Uso
- Válido: [exemplos]
- Inválido: [exemplos]

## Entregáveis
- Value object em src/Domain/Shared/[Nome].php
- Teste em tests/Unit/Domain/Shared/[Nome]Test.php
```

### Criar Enum
```
## Contexto
Sistema PetOS, precisamos de um enum para [CONTEXTO].

## Tarefa
Criar enum [NOME] no namespace PetOS\Domain\[Modulo]\Enums.

## Valores
- [VALOR_1]: "[label para UI]"
- [VALOR_2]: "[label para UI]"
- [...]

## Métodos (se necessário)
- label(): string - retorna nome amigável
- [outros]

## Entregáveis
- Enum em src/Domain/[Modulo]/Enums/[Nome].php
- Incluir no autoload se necessário
```

### Criar Interface de Repository
```
## Contexto
Sistema PetOS, Fase 2 - precisamos da interface de repositório para [ENTIDADE].

## Tarefa
Criar interface [Nome]Repository no namespace PetOS\Domain\[Modulo].

## Métodos
- save([Entidade] $entity): void
- findById([Entidade]Id $id): ?[Entidade]
- [outros métodos de busca necessários]
- nextId(): [Entidade]Id

## Regras
- Interface apenas, sem implementação
- Tipos estritos em todos parâmetros e retornos
- Usar value objects para IDs

## Entregáveis
- Interface em src/Domain/[Modulo]/[Nome]Repository.php
```

---

## 🔧 Application Layer

### Criar Use Case (Command)
```
## Contexto
Sistema PetOS, Fase 2 - Application Layer.
[Descreva a entidade/módulo relacionado]

## Tarefa
Criar use case [AçãoNome] para [descrição do que faz].

## Input (Command)
- [campo1]: [tipo] - [descrição]
- [campo2]: [tipo] - [descrição]

## Output (DTO)
- [Entidade]DTO com campos necessários para a UI

## Regras de Negócio
- [validações]
- [regras específicas]

## Eventos a Disparar
- [NomeEvento] após [ação]

## Erros Possíveis
- [NomeException]: quando [condição]

## Estrutura de Arquivos
```
src/Application/[Modulo]/Commands/[AçãoNome]/
├── [AçãoNome]Command.php
└── [AçãoNome]Handler.php
```

## Entregáveis
- Command e Handler nos caminhos acima
- DTO se ainda não existir
- Teste unitário do Handler
```

### Criar Use Case (Query)
```
## Contexto
Sistema PetOS, Fase 2 - Application Layer.

## Tarefa
Criar query [AçãoNome] para [descrição do que busca].

## Input (Query)
- [filtro1]: [tipo] - [descrição]
- [paginação se aplicável]

## Output
- [Entidade]DTO ou Collection de DTOs
- Incluir metadados de paginação se aplicável

## Estrutura de Arquivos
```
src/Application/[Modulo]/Queries/[AçãoNome]/
├── [AçãoNome]Query.php
└── [AçãoNome]Handler.php
```

## Entregáveis
- Query e Handler nos caminhos acima
- Teste unitário
```

### Criar DTO
```
## Contexto
Sistema PetOS, precisamos de DTO para [CONTEXTO].

## Tarefa
Criar [Nome]DTO no namespace PetOS\Application\[Modulo]\DTOs.

## Campos
- [campo1]: [tipo]
- [campo2]: [tipo]

## Métodos
- fromEntity([Entidade] $entity): self
- toArray(): array

## Requisitos
- Readonly class
- Construtor com named parameters
- Método estático de factory

## Entregáveis
- DTO em src/Application/[Modulo]/DTOs/[Nome]DTO.php
```

---

## 🏗️ Infrastructure Layer

### Criar Repository Implementation
```
## Contexto
Sistema PetOS, Fase 2 - Infrastructure.
Interface: PetOS\Domain\[Modulo]\[Nome]Repository

## Tarefa
Implementar Wpdb[Nome]Repository usando $wpdb.

## Tabela do Banco
- Nome: wp_petos_[tabela] (ou tabela legado existente)
- Colunas: [listar colunas com tipos]

## Requisitos
- Usar LegacySchemaMap para nomes de tabelas/colunas
- Prepared statements em TODAS as queries
- Mapper para converter DB ↔ Entidade
- Tratamento de erros com logging

## Entregáveis
- Repository em src/Infrastructure/Persistence/WordPress/Wpdb[Nome]Repository.php
- Mapper em src/Infrastructure/Persistence/Mappers/[Nome]Mapper.php
- Teste de integração
```

### Criar REST Controller
```
## Contexto
Sistema PetOS, Fase 3 - API REST.
Módulo: [MODULO]

## Tarefa
Criar [Nome]Controller para endpoints REST de [recurso].

## Endpoints
| Método | Rota | Ação | Permission |
|--------|------|------|------------|
| GET | /petos/v1/[recursos] | list | petos_view_[recursos] |
| GET | /petos/v1/[recursos]/{id} | get | petos_view_[recursos] |
| POST | /petos/v1/[recursos] | create | petos_manage_[recursos] |
| PUT | /petos/v1/[recursos]/{id} | update | petos_manage_[recursos] |
| DELETE | /petos/v1/[recursos]/{id} | delete | petos_manage_[recursos] |

## Requisitos
- Injeção de dependência dos Handlers
- Sanitização de todos inputs
- Resposta JSON padronizada { success, data, errors, meta }
- Tratamento de exceções com códigos apropriados

## Entregáveis
- Controller em src/Infrastructure/Http/Controllers/[Nome]Controller.php
- Registro de rotas em src/Infrastructure/Http/Routes/[modulo]Routes.php
- Testes de API
```

---

## 💻 Frontend (React/TypeScript)

### Criar Componente de Lista
```
## Contexto
Sistema PetOS, Fase 4 - Admin UI.
Recurso: [RECURSO]

## Tarefa
Criar página de listagem de [recursos] com DataTable.

## Funcionalidades
- Tabela com colunas: [listar colunas]
- Busca por [campos de busca]
- Paginação server-side
- Ordenação por [colunas ordenáveis]
- Ação: Ver detalhes, Editar, [outras]

## Estados
- Loading (skeleton)
- Vazio (empty state com CTA)
- Erro (mensagem + retry)
- Sucesso (tabela com dados)

## Requisitos
- TypeScript strict
- Componentes do design system (DataTable, Button, etc.)
- Hook customizado para fetch (useClients, etc.)
- Acessibilidade (aria-labels, navegação por teclado)

## Entregáveis
- Página em resources/admin/src/pages/[Recursos]ListPage.tsx
- Hook em resources/admin/src/hooks/use[Recursos].ts
- Tipos em resources/admin/src/types/[recurso].ts
```

### Criar Formulário
```
## Contexto
Sistema PetOS, Fase 4 - Admin UI.
Recurso: [RECURSO]

## Tarefa
Criar formulário de criação/edição de [recurso].

## Campos
| Campo | Tipo | Validação | Obrigatório |
|-------|------|-----------|-------------|
| [nome] | text | min 2 chars | Sim |
| [telefone] | tel | formato BR | Sim |
| [email] | email | formato válido | Não |
| [...] | [...] | [...] | [...] |

## Funcionalidades
- Validação inline (ao sair do campo)
- Máscaras de input (telefone, CPF se houver)
- Estados: idle, submitting, success, error
- Toast de feedback
- Confirmação antes de sair com alterações

## Modo
- Criar: campos vazios, botão "Criar [Recurso]"
- Editar: campos preenchidos, botão "Salvar Alterações"

## Entregáveis
- Componente em resources/admin/src/components/[Recurso]Form.tsx
- Schema de validação em resources/admin/src/schemas/[recurso]Schema.ts
```

### Criar Hook de API
```
## Contexto
Sistema PetOS, Fase 4 - Admin UI.

## Tarefa
Criar hook use[Recursos] para integração com API REST.

## Funcionalidades
- fetch[Recursos](filters, pagination): Promise<PaginatedResult>
- create[Recurso](data): Promise<Recurso>
- update[Recurso](id, data): Promise<Recurso>
- delete[Recurso](id): Promise<void>

## Requisitos
- React Query (TanStack Query) para cache e mutations
- Tipos TypeScript estritos
- Tratamento de erros consistente
- Loading states

## Entregáveis
- Hook em resources/admin/src/hooks/use[Recursos].ts
- Tipos em resources/admin/src/types/[recurso].ts
- Serviço em resources/admin/src/services/[recurso]Service.ts
```

---

## 🧪 Testes

### Criar Teste Unitário
```
## Contexto
Sistema PetOS, testando [COMPONENTE/CLASSE].

## Tarefa
Criar testes unitários para [Nome].

## Cenários a Testar
- [cenário 1]: [resultado esperado]
- [cenário 2]: [resultado esperado]
- [cenário edge case]: [resultado esperado]

## Requisitos
- PHPUnit 10+
- Mocks para dependências
- Data providers para múltiplos cenários
- Nomes descritivos (test_[ação]_[condição]_[resultado])

## Entregáveis
- Teste em tests/Unit/[caminho]/[Nome]Test.php
```

### Criar Teste de Integração
```
## Contexto
Sistema PetOS, testando integração [COMPONENTE] com [OUTRO].

## Tarefa
Criar teste de integração para [funcionalidade].

## Cenários
- [cenário com banco real]
- [cenário de erro]

## Setup
- Usar banco de teste do WordPress
- Fixtures necessárias: [listar]

## Entregáveis
- Teste em tests/Integration/[caminho]/[Nome]IntegrationTest.php
```

---

## 🔐 Segurança

### Revisar Segurança de Endpoint
```
## Contexto
Endpoint: [MÉTODO] [ROTA]

## Tarefa
Revisar e garantir segurança do endpoint.

## Checklist
- [ ] permission_callback com capability correta
- [ ] Verificação de nonce (se ação sensível)
- [ ] Sanitização de TODOS os parâmetros de entrada
- [ ] Prepared statements em queries
- [ ] Rate limiting (se endpoint público)
- [ ] Não expor existência de recursos (enumeração)

## Entregáveis
- Código corrigido se necessário
- Comentários explicando decisões de segurança
```

---

## 📊 Banco de Dados

### Mapear Tabela Legado
```
## Contexto
Sistema PetOS, Fase 1 - Auditoria do Banco.

## Tarefa
Documentar tabela [NOME_TABELA] do banco legado.

## Formato
```markdown
## [nome_tabela]

**Propósito:** [descrição]

| Coluna | Tipo | Null | Default | Descrição |
|--------|------|------|---------|-----------|
| id | BIGINT | NO | AUTO_INCREMENT | PK |
| [col] | [tipo] | [yes/no] | [default] | [desc] |

**Índices:**
- PRIMARY (id)
- [outros índices]

**Relacionamentos:**
- [tabela_relacionada].coluna → esta.coluna
```

## Entregáveis
- Documentação em docs/database/legacy-schema.md
```

### Criar Nova Tabela
```
## Contexto
Sistema PetOS, precisamos de nova tabela para [FUNCIONALIDADE].
Esta tabela NÃO altera o legado.

## Tarefa
Definir schema para tabela wp_petos_[nome].

## Colunas Necessárias
- [coluna1]: [tipo] - [descrição]
- [coluna2]: [tipo] - [descrição]

## Requisitos
- Prefixo wp_petos_
- Chaves estrangeiras lógicas (sem FK real)
- Índices para buscas frequentes
- Campos de auditoria (created_at, updated_at)

## Entregáveis
- SQL de criação
- Documentação da tabela
- Código de migração no Activator do plugin
```

---

## 🎨 Design System

### Criar Componente UI
```
## Contexto
Sistema PetOS, Design System.

## Tarefa
Criar componente [Nome] reutilizável.

## Variantes
- [variant1]: [descrição visual]
- [variant2]: [descrição visual]

## Props
- [prop1]: [tipo] - [descrição]
- [prop2]: [tipo] - [descrição]

## Estados
- Default
- Hover
- Focus
- Disabled
- Loading (se aplicável)

## Acessibilidade
- [requisitos de aria]
- [navegação por teclado]

## Entregáveis
- Componente em resources/admin/src/components/ui/[Nome].tsx
- Storybook story (se houver)
- Testes de acessibilidade
```

---

**Use estes templates como ponto de partida. Adapte conforme o contexto específico da tarefa.**
