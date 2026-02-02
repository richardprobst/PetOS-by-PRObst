# 🐾 Plano de Execução — PetOS By PRObst

**Sistema:** PetOS By PRObst  
**Autor:** PRObst  
**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Foco:** Sistema exclusivo para **Banho e Tosa**

> **Nota:** Este plano segue as diretrizes do `PETOS_BLUEPRINT.md` com adaptações específicas para o nicho de Banho e Tosa.

---

## 📋 Sumário Executivo

O sistema será desenvolvido em **6 fases principais**, cada uma com entregas funcionais independentes, permitindo validação contínua e rollback seguro.

| Fase | Nome | Duração Estimada | Dependências |
|------|------|------------------|--------------|
| 0 | Setup & Infraestrutura | 1-2 semanas | Nenhuma |
| 1 | Auditoria de Banco de Dados | 3-5 dias | Fase 0 |
| 2 | Núcleo do Domínio (Backend) | 2-3 semanas | Fase 1 |
| 3 | API REST v2 | 1-2 semanas | Fase 2 |
| 4 | Admin MVP (UI) | 2-3 semanas | Fase 3 |
| 5 | Portal do Cliente | 1-2 semanas | Fase 3 |
| 6 | Migração & Go-Live | 1 semana | Fases 4 e 5 |

**Tempo total estimado:** 8-13 semanas

---

## 🎯 Escopo do MVP (Banho e Tosa)

### Funcionalidades Core
1. **Gestão de Clientes (Tutores)**
   - Cadastro, edição, busca e listagem
   - Histórico de atendimentos por cliente

2. **Gestão de Pets**
   - Vinculação ao tutor
   - Informações específicas para B&T (porte, pelagem, restrições, agressividade)
   - Histórico individual do pet

3. **Agendamentos de Banho e Tosa**
   - Criação, edição, cancelamento
   - Status: Agendado, Em Atendimento, Concluído, Cancelado
   - Serviços: Banho, Tosa Higiênica, Tosa Completa, Hidratação, etc.
   - Visualização por calendário e lista

4. **Portal do Cliente**
   - Acesso via Magic Link (sem senha)
   - Visualização de pets e histórico
   - Próximos agendamentos

---

## 📁 Estrutura Final do Repositório

```
B-T-By-PRObst/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Pipeline de CI
│       └── deploy.yml                # Deploy (futuro)
├── docs/
│   ├── architecture/
│   │   ├── decisions.md              # ADRs (Architectural Decision Records)
│   │   ├── clean-architecture.md     # Diagrama e explicação
│   │   └── folder-structure.md       # Guia da estrutura
│   ├── database/
│   │   ├── schema.sql                # Estrutura atual do banco
│   │   ├── legacy-schema.md          # Dicionário de dados legado
│   │   └── mapping.md                # Mapeamento feature → tabelas
│   ├── api/
│   │   └── rest-v2.md                # Documentação da API
│   └── ux/
│       ├── design-system.md          # Tokens e componentes
│       ├── admin-flows.md            # Fluxos do admin
│       └── portal-flows.md           # Fluxos do portal cliente
├── plugins/
│   └── petos-core/
│       ├── petos-core.php           # Bootstrap WordPress
│       ├── composer.json             # Dependências PHP
│       ├── composer.lock
│       ├── phpstan.neon              # Configuração PHPStan
│       ├── phpunit.xml               # Configuração testes
│       ├── .php-cs-fixer.php         # Configuração CS Fixer
│       ├── src/
│       │   ├── Domain/               # Entidades e regras de negócio
│       │   │   ├── Client/
│       │   │   ├── Pet/
│       │   │   ├── Appointment/
│       │   │   └── Shared/
│       │   ├── Application/          # Casos de uso
│       │   │   ├── Client/
│       │   │   ├── Pet/
│       │   │   ├── Appointment/
│       │   │   └── Portal/
│       │   ├── Infrastructure/       # Adapters e implementações
│       │   │   ├── WordPress/
│       │   │   ├── Persistence/
│       │   │   ├── Http/
│       │   │   └── Security/
│       │   └── UI/                   # Controllers e views
│       │       ├── Admin/
│       │       └── Portal/
│       ├── resources/
│       │   ├── admin/                # React/TS Admin
│       │   │   ├── src/
│       │   │   ├── package.json
│       │   │   └── vite.config.ts
│       │   └── portal/               # React/TS Portal
│       │       ├── src/
│       │       ├── package.json
│       │       └── vite.config.ts
│       ├── build/                    # Assets compilados
│       └── tests/
│           ├── Unit/
│           ├── Integration/
│           └── bootstrap.php
├── tools/
│   └── dev/
│       ├── setup.sh                  # Script de setup local
│       └── seed-data.php             # Dados de teste
├── PetOS_v2_BLUEPRINT_MODERNO.md       # Blueprint original
├── PLANO_EXECUCAO_PetOS_V2.md          # Este documento
└── README.md
```

---

## 🚀 FASE 0: Setup & Infraestrutura Base

**Objetivo:** Preparar o ambiente de desenvolvimento com toda a estrutura moderna.

### Tarefas

#### 0.1 Criar Estrutura de Diretórios
- [ ] Criar pasta `plugins/petos-core/`
- [ ] Criar pasta `docs/` com subpastas
- [ ] Criar pasta `tools/dev/`
- [ ] Criar pasta `.github/workflows/`

#### 0.2 Configurar Plugin WordPress
- [ ] Criar `petos-core.php` (bootstrap)
- [ ] Configurar headers do plugin WP
- [ ] Implementar autoload PSR-4

**Arquivo:** `plugins/petos-core/petos-core.php`
```php
<?php
/**
 * Plugin Name: PetOS Core v2 - Banho e Tosa
 * Description: Sistema moderno de gestão para Banho e Tosa
 * Version: 2.0.0
 * Author: PRObst
 * Requires PHP: 8.2
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit('Este arquivo deve ser carregado pelo WordPress.');
}

define('PetOS_V2_VERSION', '2.0.0');
define('PetOS_V2_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PetOS_V2_PLUGIN_URL', plugin_dir_url(__FILE__));

$autoloader = PetOS_V2_PLUGIN_DIR . 'vendor/autoload.php';
if (!file_exists($autoloader)) {
    add_action('admin_notices', function() {
        echo '<div class="error"><p><strong>PetOS Core v2:</strong> Execute <code>composer install</code> no diretório do plugin.</p></div>';
    });
    return;
}
require_once $autoloader;

// Bootstrap do plugin
add_action('plugins_loaded', function() {
    \PetOSv2\Infrastructure\WordPress\Bootstrap::init();
});
```

#### 0.3 Configurar Composer
- [ ] Criar `composer.json` com autoload PSR-4
- [ ] Definir namespace `PetOSv2\`
- [ ] Adicionar dependências iniciais

**Arquivo:** `plugins/petos-core/composer.json`
```json
{
    "name": "probst/petos-core",
    "description": "Sistema de Banho e Tosa - Core v2",
    "type": "wordpress-plugin",
    "license": "proprietary",
    "require": {
        "php": ">=8.2"
    },
    "require-dev": {
        "phpunit/phpunit": "^10.0",
        "phpstan/phpstan": "^1.10",
        "friendsofphp/php-cs-fixer": "^3.0"
    },
    "autoload": {
        "psr-4": {
            "PetOSv2\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "PetOSv2\\Tests\\": "tests/"
        }
    },
    "scripts": {
        "test": "phpunit",
        "analyze": "phpstan analyse src",
        "cs-fix": "php-cs-fixer fix src"
    }
}
```

#### 0.4 Configurar PHPStan
- [ ] Criar `phpstan.neon` nível 6

**Arquivo:** `plugins/petos-core/phpstan.neon`
```neon
parameters:
    level: 6
    paths:
        - src
    excludePaths:
        - vendor
    checkMissingIterableValueType: false
```

#### 0.5 Configurar PHPUnit
- [ ] Criar `phpunit.xml`
- [ ] Criar `tests/bootstrap.php`

#### 0.6 Configurar CI (GitHub Actions)
- [ ] Criar workflow de CI

**Arquivo:** `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  php:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          tools: composer
          
      - name: Install dependencies
        working-directory: plugins/petos-core
        run: composer install --prefer-dist --no-progress
        
      - name: Run PHPStan
        working-directory: plugins/petos-core
        run: composer analyze
        
      - name: Run Tests
        working-directory: plugins/petos-core
        run: composer test
```

#### 0.7 Documentação Inicial
- [ ] Criar `docs/architecture/decisions.md` (ADR inicial)
- [ ] Atualizar `README.md` com instruções

### Critérios de Aceitação - Fase 0
- [ ] Composer install roda sem erros
- [ ] PHPStan passa sem erros
- [ ] CI executa com sucesso
- [ ] Plugin ativa no WordPress sem erros

### Entregáveis
- Plugin WordPress básico funcional
- Estrutura de pastas completa
- CI configurado e rodando

---

## 🗄️ FASE 1: Auditoria do Banco de Dados

**Objetivo:** Documentar e entender completamente o banco de dados existente.

### Tarefas

#### 1.1 Exportar Schema Atual
- [ ] Gerar `docs/database/schema.sql`
- [ ] Documentar tabelas do PetOS atual

**Comando:**
```bash
mysqldump --no-data --routines --triggers --events DBNAME > docs/database/schema.sql
```

#### 1.2 Criar Dicionário de Dados
- [ ] Criar `docs/database/legacy-schema.md`
- [ ] Documentar cada tabela:
  - Nome
  - Descrição/propósito
  - Colunas com tipos
  - Relacionamentos
  - Índices

**Template para cada tabela:**
```markdown
## wp_petos_clientes (exemplo)

**Propósito:** Armazena dados dos tutores (clientes)

| Coluna | Tipo | Null | Descrição |
|--------|------|------|-----------|
| id | BIGINT(20) | NO | PK auto increment |
| nome | VARCHAR(255) | NO | Nome completo do cliente |
| telefone | VARCHAR(20) | NO | WhatsApp principal |
| email | VARCHAR(255) | YES | Email opcional |
| ...

**Relacionamentos:**
- Um cliente tem N pets (wp_petos_pets.client_id)
- Um cliente tem N atendimentos (wp_petos_atendimentos.client_id)

**Índices:**
- PRIMARY (id)
- idx_telefone (telefone)
```

#### 1.3 Criar Mapeamento Feature → Dados
- [ ] Criar `docs/database/mapping.md`

**Exemplo:**
```markdown
# Mapeamento de Features

## Gestão de Clientes
- **Tabela principal:** wp_petos_clientes
- **Colunas usadas:** id, nome, telefone, email, cpf, endereco, data_cadastro
- **Relacionamentos:** wp_petos_pets, wp_petos_atendimentos

## Gestão de Pets
- **Tabela principal:** wp_petos_pets
- **Colunas usadas:** id, client_id, nome, especie, porte, pelagem, raca, peso
- **Campos específicos B&T:** agressividade, restricoes, notas_tosa

## Agendamentos de B&T
- **Tabela principal:** wp_petos_atendimentos
- **Colunas usadas:** id, client_id, pet_id, data_hora, servico, status, valor
- **Serviços:** banho, tosa_higienica, tosa_completa, hidratacao
```

#### 1.4 Identificar Gaps e Melhorias
- [ ] Listar colunas/tabelas que precisam ser criadas (novas, sem alterar legado)
- [ ] Documentar em `docs/database/improvements.md`

### Critérios de Aceitação - Fase 1
- [ ] `schema.sql` gerado e commitado
- [ ] `legacy-schema.md` completo com todas as tabelas
- [ ] `mapping.md` vinculando features a dados
- [ ] Equipe revisou e validou documentação

### Entregáveis
- Documentação completa do banco de dados
- Mapa de dados para desenvolvimento

---

## 🏗️ FASE 2: Núcleo do Domínio (Backend)

**Objetivo:** Implementar a camada de domínio e aplicação com Clean Architecture.

### 2.1 Camada Domain

#### 2.1.1 Entidades

**Client (Tutor)**
```
src/Domain/Client/
├── Client.php              # Entidade
├── ClientId.php            # Value Object
├── ClientRepository.php    # Interface
└── Events/
    └── ClientCreated.php   # Evento de domínio
```

- [ ] Criar `Client` entity
- [ ] Criar `ClientId` value object
- [ ] Criar interface `ClientRepository`
- [ ] Criar evento `ClientCreated`

**Pet**
```
src/Domain/Pet/
├── Pet.php
├── PetId.php
├── PetRepository.php
├── Enums/
│   ├── Species.php         # Cachorro, Gato
│   ├── Size.php            # Pequeno, Médio, Grande, Gigante
│   ├── CoatType.php        # Curto, Médio, Longo, Duplo
│   └── AggressionLevel.php # Dócil, Moderado, Agressivo
└── Events/
    └── PetAddedToClient.php
```

- [ ] Criar `Pet` entity com atributos específicos de B&T
- [ ] Criar enums para classificações
- [ ] Criar interface `PetRepository`

**Appointment (Atendimento de B&T)**
```
src/Domain/Appointment/
├── Appointment.php
├── AppointmentId.php
├── AppointmentRepository.php
├── Enums/
│   ├── AppointmentStatus.php   # Scheduled, InProgress, Completed, Cancelled
│   └── ServiceType.php         # Bath, HygienicGrooming, FullGrooming, Hydration
├── ValueObjects/
│   ├── TimeSlot.php
│   └── ServiceList.php
└── Events/
    ├── AppointmentScheduled.php
    └── AppointmentCompleted.php
```

- [ ] Criar `Appointment` entity
- [ ] Criar enums de status e tipos de serviço
- [ ] Criar value objects `TimeSlot` e `ServiceList`

#### 2.1.2 Value Objects Compartilhados
```
src/Domain/Shared/
├── PhoneNumber.php         # Validação e normalização de telefone
├── Email.php               # Validação de email
├── Money.php               # Valores monetários
└── DateRange.php           # Intervalo de datas
```

- [ ] Implementar `PhoneNumber` com validação BR
- [ ] Implementar `Email` com validação
- [ ] Implementar `Money` para valores de serviços

### 2.2 Camada Application

#### 2.2.1 Casos de Uso - Clientes
```
src/Application/Client/
├── Commands/
│   ├── CreateClient/
│   │   ├── CreateClientCommand.php
│   │   └── CreateClientHandler.php
│   └── UpdateClient/
│       ├── UpdateClientCommand.php
│       └── UpdateClientHandler.php
├── Queries/
│   ├── GetClientById/
│   │   ├── GetClientByIdQuery.php
│   │   └── GetClientByIdHandler.php
│   └── SearchClients/
│       ├── SearchClientsQuery.php
│       └── SearchClientsHandler.php
└── DTOs/
    ├── ClientDTO.php
    └── ClientListDTO.php
```

- [ ] Implementar `CreateClientHandler`
- [ ] Implementar `UpdateClientHandler`
- [ ] Implementar `GetClientByIdHandler`
- [ ] Implementar `SearchClientsHandler` (busca por telefone/nome)
- [ ] Criar DTOs de entrada e saída

#### 2.2.2 Casos de Uso - Pets
```
src/Application/Pet/
├── Commands/
│   ├── AddPetToClient/
│   └── UpdatePet/
├── Queries/
│   └── ListPetsByClient/
└── DTOs/
    └── PetDTO.php
```

- [ ] Implementar handlers de Pet
- [ ] Criar DTOs

#### 2.2.3 Casos de Uso - Agendamentos
```
src/Application/Appointment/
├── Commands/
│   ├── ScheduleAppointment/
│   ├── UpdateAppointment/
│   ├── CancelAppointment/
│   └── CompleteAppointment/
├── Queries/
│   ├── ListAppointmentsByClient/
│   └── ListAppointmentsByDateRange/
└── DTOs/
    └── AppointmentDTO.php
```

- [ ] Implementar handlers de Appointment
- [ ] Criar DTOs
- [ ] Implementar validação de conflitos de horário

#### 2.2.4 Casos de Uso - Portal
```
src/Application/Portal/
├── Commands/
│   ├── RequestMagicLink/
│   └── ValidateMagicLink/
├── Queries/
│   └── GetPortalSummary/
└── DTOs/
    └── PortalSummaryDTO.php
```

- [ ] Implementar geração de Magic Link
- [ ] Implementar validação segura de token
- [ ] Criar resumo para o portal

### 2.3 Camada Infrastructure

#### 2.3.1 Persistência
```
src/Infrastructure/Persistence/
├── WordPress/
│   ├── WpdbClientRepository.php
│   ├── WpdbPetRepository.php
│   ├── WpdbAppointmentRepository.php
│   └── WpdbPortalTokenRepository.php
├── Mappers/
│   ├── ClientMapper.php
│   ├── PetMapper.php
│   └── AppointmentMapper.php
└── LegacySchemaMap.php     # Mapeamento de nomes de tabelas/colunas
```

- [ ] Criar `LegacySchemaMap` (fonte única de verdade para nomes do banco)
- [ ] Implementar `WpdbClientRepository`
- [ ] Implementar `WpdbPetRepository`
- [ ] Implementar `WpdbAppointmentRepository`
- [ ] Criar Mappers DB ↔ Entity

**Exemplo LegacySchemaMap:**
```php
<?php
declare(strict_types=1);

namespace PetOSv2\Infrastructure\Persistence;

final class LegacySchemaMap
{
    // Tabelas
    public const TABLE_CLIENTS = 'wp_petos_clientes';
    public const TABLE_PETS = 'wp_petos_pets';
    public const TABLE_APPOINTMENTS = 'wp_petos_atendimentos';
    
    // Colunas - Clientes
    public const COL_CLIENT_ID = 'id';
    public const COL_CLIENT_NAME = 'nome';
    public const COL_CLIENT_PHONE = 'telefone';
    // ... demais colunas
}
```

#### 2.3.2 WordPress Integration
```
src/Infrastructure/WordPress/
├── Bootstrap.php           # Inicialização do plugin
├── Hooks/
│   ├── AdminMenuHook.php
│   └── RestApiHook.php
├── Capabilities/
│   └── PetOSCapabilities.php
└── Container/
    └── ServiceContainer.php
```

- [ ] Implementar `Bootstrap` para inicialização
- [ ] Configurar container de DI simples
- [ ] Registrar capabilities do PetOS

#### 2.3.3 Segurança
```
src/Infrastructure/Security/
├── TokenGenerator.php
├── TokenValidator.php
├── RateLimiter.php
└── InputSanitizer.php
```

- [ ] Implementar geração segura de tokens (hash)
- [ ] Implementar rate limiting
- [ ] Criar sanitizadores de input

### 2.4 Testes

- [ ] Testes unitários para Value Objects
- [ ] Testes unitários para Entidades
- [ ] Testes unitários para Handlers
- [ ] Testes de integração para Repositories

### Critérios de Aceitação - Fase 2
- [ ] Todas as entidades criadas e testadas
- [ ] Todos os casos de uso implementados
- [ ] Repositories funcionando com banco legado
- [ ] PHPStan passa nível 6
- [ ] Cobertura de testes > 80% no Domain e Application

### Entregáveis
- Camada de domínio completa
- Casos de uso funcionais
- Repositórios integrados com banco existente
- Suite de testes

---

## 🔌 FASE 3: API REST v2

**Objetivo:** Criar API RESTful moderna para consumo pelo frontend.

### 3.1 Estrutura da API
```
src/Infrastructure/Http/
├── Controllers/
│   ├── ClientController.php
│   ├── PetController.php
│   ├── AppointmentController.php
│   └── PortalController.php
├── Middleware/
│   ├── AuthMiddleware.php
│   ├── RateLimitMiddleware.php
│   └── ValidationMiddleware.php
├── Requests/
│   ├── CreateClientRequest.php
│   ├── UpdateClientRequest.php
│   └── ...
├── Responses/
│   ├── ApiResponse.php
│   └── ErrorResponse.php
└── Routes/
    └── RestRoutes.php
```

### 3.2 Endpoints

#### Clientes
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/dps/v2/clients` | Listar clientes | Admin/Colaborador |
| GET | `/dps/v2/clients/{id}` | Obter cliente | Admin/Colaborador |
| POST | `/dps/v2/clients` | Criar cliente | Admin/Colaborador |
| PUT | `/dps/v2/clients/{id}` | Atualizar cliente | Admin/Colaborador |
| GET | `/dps/v2/clients/search?phone={phone}` | Buscar por telefone | Admin/Colaborador |

- [ ] Implementar `ClientController`
- [ ] Implementar rotas de clientes
- [ ] Validação e sanitização de inputs

#### Pets
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/dps/v2/clients/{id}/pets` | Pets do cliente | Admin/Colaborador |
| POST | `/dps/v2/clients/{id}/pets` | Adicionar pet | Admin/Colaborador |
| PUT | `/dps/v2/pets/{id}` | Atualizar pet | Admin/Colaborador |
| GET | `/dps/v2/pets/{id}` | Obter pet | Admin/Colaborador |

- [ ] Implementar `PetController`
- [ ] Implementar rotas de pets

#### Agendamentos (B&T)
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/dps/v2/appointments` | Listar agendamentos | Admin/Colaborador |
| GET | `/dps/v2/appointments/{id}` | Obter agendamento | Admin/Colaborador |
| POST | `/dps/v2/appointments` | Criar agendamento | Admin/Colaborador |
| PUT | `/dps/v2/appointments/{id}` | Atualizar agendamento | Admin/Colaborador |
| POST | `/dps/v2/appointments/{id}/complete` | Finalizar atendimento | Admin/Colaborador |
| POST | `/dps/v2/appointments/{id}/cancel` | Cancelar | Admin/Colaborador |
| GET | `/dps/v2/appointments/calendar?start={date}&end={date}` | Calendário | Admin/Colaborador |

- [ ] Implementar `AppointmentController`
- [ ] Implementar rotas de agendamentos
- [ ] Implementar filtros por data

#### Portal do Cliente
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/dps/v2/portal/request-link` | Solicitar magic link | Público (rate limit) |
| POST | `/dps/v2/portal/validate` | Validar token | Público |
| GET | `/dps/v2/portal/me` | Dados do cliente logado | Token Portal |
| GET | `/dps/v2/portal/me/pets` | Pets do cliente | Token Portal |
| GET | `/dps/v2/portal/me/appointments` | Histórico de B&T | Token Portal |

- [ ] Implementar `PortalController`
- [ ] Implementar rotas do portal
- [ ] Rate limiting rigoroso

### 3.3 Padrão de Resposta

**Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

**Erro:**
```json
{
  "success": false,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Telefone inválido",
      "field": "phone"
    }
  ]
}
```

- [ ] Implementar `ApiResponse` padronizado
- [ ] Implementar `ErrorResponse` consistente
- [ ] Códigos de erro documentados

### 3.4 Segurança da API

- [ ] Verificar `current_user_can()` em todas rotas admin
- [ ] Implementar nonce para ações sensíveis
- [ ] Rate limiting (10 req/min para portal público)
- [ ] Logging de requisições
- [ ] Não expor existência de dados (mensagens genéricas)

### Critérios de Aceitação - Fase 3
- [ ] Todos os endpoints implementados e documentados
- [ ] Autenticação funcionando corretamente
- [ ] Rate limiting ativo
- [ ] Testes de API passando
- [ ] Documentação da API completa

### Entregáveis
- API REST v2 completa
- Documentação em `docs/api/rest-v2.md`
- Collection Postman/Insomnia (opcional)

---

## 💻 FASE 4: Admin MVP (UI Moderna)

**Objetivo:** Interface administrativa moderna para gestão de B&T.

### 4.1 Setup do Frontend Admin
```
plugins/petos-core/resources/admin/
├── src/
│   ├── components/         # Componentes reutilizáveis
│   ├── pages/              # Páginas da aplicação
│   ├── hooks/              # Custom hooks
│   ├── services/           # API calls
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilitários
│   └── App.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

- [ ] Configurar projeto Vite + React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar ESLint + Prettier
- [ ] Criar build script para WordPress

### 4.2 Design System (Componentes Base)
```
src/components/
├── ui/
│   ├── Button/
│   ├── Input/
│   ├── Select/
│   ├── Modal/
│   ├── Toast/
│   ├── DataTable/
│   ├── Card/
│   ├── Badge/
│   ├── Skeleton/
│   └── EmptyState/
└── layout/
    ├── Sidebar/
    ├── Header/
    └── PageContainer/
```

- [ ] Criar tokens de design (cores, espaçamentos, tipografia)
- [ ] Implementar componentes base
- [ ] Documentar em `docs/ux/design-system.md`

### 4.3 Páginas do Admin

#### Dashboard
- [ ] Cards de resumo (atendimentos do dia, pendentes, etc.)
- [ ] Lista de próximos atendimentos
- [ ] Alertas importantes

#### Clientes
- [ ] Lista com DataTable (busca, paginação, ordenação)
- [ ] **Busca rápida por telefone** (destaque)
- [ ] Formulário de criação/edição
- [ ] Visualização de detalhes + pets + histórico

#### Pets
- [ ] Lista vinculada ao cliente
- [ ] Formulário com campos específicos de B&T
- [ ] Histórico de atendimentos do pet

#### Agendamentos
- [ ] Visualização em calendário (dia/semana)
- [ ] Lista de atendimentos
- [ ] Formulário de agendamento
- [ ] Fluxo: Agendar → Em Atendimento → Concluir
- [ ] Cancelamento com motivo

#### Configurações (apenas Admin)
- [ ] Serviços oferecidos (Banho, Tosa, etc.)
- [ ] Horários de funcionamento
- [ ] Colaboradores e permissões

### 4.4 Padrões de UX

- [ ] Loading states em todas as ações
- [ ] Toasts de feedback (sucesso/erro)
- [ ] Validação inline em formulários
- [ ] Máscaras de input (telefone, CPF)
- [ ] Estados vazios informativos
- [ ] Confirmação antes de ações destrutivas
- [ ] Responsivo (tablet/celular)
- [ ] Acessibilidade (teclado, ARIA)

### Critérios de Aceitação - Fase 4
- [ ] Todas as telas implementadas e funcionais
- [ ] Design consistente em todo o admin
- [ ] Busca por telefone funciona < 500ms
- [ ] Responsivo em tablet
- [ ] Build otimizado para produção
- [ ] Sem erros no console

### Entregáveis
- Admin funcional completo
- Build de produção
- Documentação de componentes

---

## 🌐 FASE 5: Portal do Cliente

**Objetivo:** Interface para clientes visualizarem seus dados e histórico.

### 5.1 Setup do Frontend Portal
```
plugins/petos-core/resources/portal/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

- [ ] Configurar projeto (similar ao admin)
- [ ] Compartilhar design tokens
- [ ] Configurar rota pública WordPress

### 5.2 Fluxo de Autenticação (Magic Link)

```
Fluxo:
1. Cliente acessa portal e informa telefone/email
2. Sistema envia link por WhatsApp/Email (se cadastrado)
3. Cliente clica no link com token
4. Sistema valida token e cria sessão
5. Cliente acessa dados
```

- [ ] Tela de solicitação de acesso
- [ ] Mensagem genérica (sem revelar se existe)
- [ ] Validação de token
- [ ] Sessão com tempo de expiração

### 5.3 Páginas do Portal

#### Home (após login)
- [ ] Saudação personalizada
- [ ] Cards resumo: Pets, Próximos agendamentos, Histórico
- [ ] CTA para WhatsApp (novo agendamento)

#### Meus Pets
- [ ] Lista de pets cadastrados
- [ ] Detalhes de cada pet
- [ ] Histórico de atendimentos por pet

#### Meus Agendamentos
- [ ] Próximos agendamentos
- [ ] Histórico completo
- [ ] Status de cada atendimento

### 5.4 Segurança do Portal

- [ ] Token com expiração curta (30-60 min)
- [ ] Uso único do token
- [ ] Rate limit na solicitação (3 req/5min por IP)
- [ ] Logging de acessos
- [ ] HTTPS obrigatório

### Critérios de Aceitação - Fase 5
- [ ] Magic link funcionando de forma segura
- [ ] Portal responsivo (mobile-first)
- [ ] Cliente visualiza dados corretamente
- [ ] Taxa de tentativas limitada
- [ ] UX simples e intuitiva

### Entregáveis
- Portal do cliente funcional
- Documentação de fluxos
- Guia de segurança

---

## 🚢 FASE 6: Migração & Go-Live

**Objetivo:** Transição segura do sistema antigo para o v2.

### 6.1 Feature Flags

- [ ] Implementar sistema de feature flags
- [ ] Flag para ativar admin v2
- [ ] Flag para ativar portal v2
- [ ] Controle por módulo

### 6.2 Testes em Produção (Shadow Mode)

- [ ] Rodar v2 em paralelo com v1
- [ ] Comparar resultados de leitura
- [ ] Validar integridade de escrita
- [ ] Monitorar performance

### 6.3 Rollout Gradual

```
Semana 1: Equipe interna (shadow mode)
Semana 2: 10% dos usuários admin
Semana 3: 50% dos usuários admin
Semana 4: 100% admin + portal beta
Semana 5: Portal para todos
```

- [ ] Plano de rollout documentado
- [ ] Procedimento de rollback
- [ ] Comunicação com usuários

### 6.4 Monitoramento

- [ ] Dashboard de erros
- [ ] Métricas de performance
- [ ] Alertas configurados

### 6.5 Documentação Final

- [ ] Runbook de operação
- [ ] FAQ para usuários
- [ ] Guia de troubleshooting

### Critérios de Aceitação - Fase 6
- [ ] Zero perda de dados
- [ ] Tempo de resposta < 500ms (P95)
- [ ] Rollback testado
- [ ] Equipe treinada
- [ ] Documentação completa

### Entregáveis
- Sistema v2 em produção
- v1 desativado (ou mantido para leitura)
- Documentação operacional

---

## 📊 Cronograma Visual

```
Semana  1  2  3  4  5  6  7  8  9  10 11 12 13
        ├──┴──┤                               Fase 0: Setup
              ├──┤                            Fase 1: Auditoria DB
                 ├────┴────┴────┤             Fase 2: Domínio
                                ├──┴──┤       Fase 3: API REST
                                      ├──────┴──────┤  Fase 4: Admin UI
                                                    ├──┴──┤  Fase 5: Portal
                                                          ├──┤  Fase 6: Go-Live
```

---

## ✅ Checklist Geral de Qualidade

### Código
- [ ] PHP 8.2+ com strict_types
- [ ] PSR-12 em todo código PHP
- [ ] TypeScript strict mode
- [ ] Sem funções globais
- [ ] Prepared statements em todo SQL
- [ ] Testes automatizados

### Segurança
- [ ] Inputs sanitizados
- [ ] Outputs escapados
- [ ] Capabilities verificadas
- [ ] Rate limiting ativo
- [ ] Tokens com hash
- [ ] Logging de ações sensíveis

### UX
- [ ] Responsivo
- [ ] Acessível (AA)
- [ ] Feedback de loading
- [ ] Mensagens de erro claras
- [ ] Validação inline
- [ ] Estados vazios

### DevOps
- [ ] CI passando
- [ ] Build automatizado
- [ ] Feature flags
- [ ] Monitoramento
- [ ] Backup do banco

---

## 🎯 Próximos Passos Imediatos

Para iniciar **hoje**:

1. **Criar estrutura de pastas** (30 min)
2. **Configurar Composer + autoload** (30 min)
3. **Configurar CI básico** (1 hora)
4. **Commit inicial do plugin v2** (15 min)

Depois:
5. **Gerar schema.sql do banco atual**
6. **Documentar tabelas existentes**
7. **Criar LegacySchemaMap**

---

## 📝 Notas e Sugestões Adicionais

### Sugestão 1: Nomenclatura em Português vs Inglês
**Recomendação:** Usar inglês no código (classes, variáveis) e português na UI (labels, mensagens).
- Código: `Client`, `Pet`, `Appointment`
- UI: "Cliente", "Pet", "Agendamento"

### Sugestão 2: Serviços de B&T Padronizados
Criar enum com serviços padrão:
- `Bath` (Banho)
- `HygienicGrooming` (Tosa Higiênica)
- `FullGrooming` (Tosa Completa)
- `Hydration` (Hidratação)
- `Detangling` (Desembaraço)
- `NailTrim` (Corte de Unha)
- `EarCleaning` (Limpeza de Ouvido)

### Sugestão 3: Campos Específicos de B&T para Pets
Campos importantes para o nicho:
- Tipo de pelagem (curta, média, longa, dupla)
- Frequência de nós
- Sensibilidade a produtos
- Comportamento durante banho/tosa
- Histórico de reações

### Sugestão 4: Integração WhatsApp (Pós-MVP)
Módulo futuro para:
- Confirmação de agendamento
- Lembrete 24h antes
- Envio do magic link
- Notificação de conclusão

---

**Fim do Plano de Execução**

*Documento vivo - atualizar conforme execução do projeto*
