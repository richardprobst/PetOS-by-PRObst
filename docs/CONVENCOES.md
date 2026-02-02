# 📏 Convenções de Código — PetOS By PRObst

Este documento define os padrões de código a serem seguidos em todo o projeto.

---

## 📋 Sumário

1. [PHP](#php)
2. [TypeScript/React](#typescriptreact)
3. [SQL/Banco de Dados](#sqlbanco-de-dados)
4. [Git](#git)
5. [Documentação](#documentação)
6. [Testes](#testes)

---

## PHP

### Configuração Obrigatória

Todo arquivo PHP deve começar com:

```php
<?php

declare(strict_types=1);

namespace PetOS\[Camada]\[Modulo];

// imports...
```

### PSR-12

Seguimos estritamente o PSR-12. Use PHP-CS-Fixer para garantir conformidade.

```bash
composer cs-fix
```

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Namespace | PascalCase | `PetOS\Domain\Client` |
| Classe | PascalCase | `ClientRepository` |
| Interface | PascalCase (sem prefixo I) | `ClientRepository` |
| Trait | PascalCase | `HasTimestamps` |
| Método | camelCase | `findById()` |
| Propriedade | camelCase | `$clientId` |
| Constante | UPPER_SNAKE | `TABLE_NAME` |
| Variável | camelCase | `$userEmail` |
| Parâmetro | camelCase | `string $phoneNumber` |

### Estrutura de Classes

```php
<?php

declare(strict_types=1);

namespace PetOS\Domain\Client;

use PetOS\Domain\Shared\PhoneNumber;
use InvalidArgumentException;

/**
 * Representa um cliente (tutor) no sistema.
 */
final class Client
{
    // 1. Constantes
    private const MIN_NAME_LENGTH = 2;

    // 2. Propriedades (readonly quando possível)
    private readonly ClientId $id;
    private string $name;
    private PhoneNumber $phone;
    private ?Email $email;

    // 3. Construtor
    public function __construct(
        ClientId $id,
        string $name,
        PhoneNumber $phone,
        ?Email $email = null,
    ) {
        $this->validateName($name);
        
        $this->id = $id;
        $this->name = $name;
        $this->phone = $phone;
        $this->email = $email;
    }

    // 4. Getters
    public function getId(): ClientId
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    // 5. Métodos de domínio (comportamento)
    public function changeName(string $name): void
    {
        $this->validateName($name);
        $this->name = $name;
    }

    // 6. Métodos privados
    private function validateName(string $name): void
    {
        if (strlen(trim($name)) < self::MIN_NAME_LENGTH) {
            throw new InvalidArgumentException(
                'Nome deve ter pelo menos ' . self::MIN_NAME_LENGTH . ' caracteres'
            );
        }
    }
}
```

### Tipos

**SEMPRE** declare tipos em:
- Parâmetros de função/método
- Retorno de função/método
- Propriedades de classe

```php
// ✅ Correto
public function findById(ClientId $id): ?Client
{
    return $this->clients[$id->getValue()] ?? null;
}

// ❌ Incorreto
public function findById($id)
{
    return $this->clients[$id] ?? null;
}
```

### Value Objects

Value objects são imutáveis e validam no construtor:

```php
<?php

declare(strict_types=1);

namespace PetOS\Domain\Shared;

use InvalidArgumentException;

final class PhoneNumber
{
    private string $value;

    public function __construct(string $phone)
    {
        $normalized = preg_replace('/\D/', '', $phone);
        
        if (!$this->isValid($normalized)) {
            throw new InvalidArgumentException('Telefone inválido: ' . $phone);
        }
        
        $this->value = $normalized;
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function equals(PhoneNumber $other): bool
    {
        return $this->value === $other->value;
    }

    private function isValid(string $phone): bool
    {
        $length = strlen($phone);
        return $length === 10 || $length === 11;
    }
}
```

### Enums

Use enums nativos do PHP 8.1+:

```php
<?php

declare(strict_types=1);

namespace PetOS\Domain\Pet\Enums;

enum Species: string
{
    case Dog = 'dog';
    case Cat = 'cat';

    public function label(): string
    {
        return match ($this) {
            self::Dog => 'Cachorro',
            self::Cat => 'Gato',
        };
    }
}
```

### Exceções

Crie exceções específicas de domínio:

```php
<?php

declare(strict_types=1);

namespace PetOS\Domain\Client\Exceptions;

use DomainException;

final class ClientAlreadyExistsException extends DomainException
{
    public static function withPhone(string $phone): self
    {
        return new self("Já existe um cliente com o telefone: {$phone}");
    }
}
```

### Injeção de Dependência

Use constructor injection:

```php
<?php

declare(strict_types=1);

namespace PetOS\Application\Client\Commands\CreateClient;

final class CreateClientHandler
{
    public function __construct(
        private readonly ClientRepository $repository,
        private readonly EventDispatcher $events,
    ) {}
}
```

### WordPress/wpdb

**SEMPRE** use prepared statements:

```php
// ✅ Correto
$result = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$this->table} WHERE id = %d",
        $id
    ),
    ARRAY_A
);

// ❌ NUNCA FAZER
$result = $wpdb->get_row("SELECT * FROM {$this->table} WHERE id = $id");
```

---

## TypeScript/React

### Configuração

TypeScript em modo strict:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Componente | PascalCase | `ClientCard.tsx` |
| Hook | camelCase (use prefix) | `useClients.ts` |
| Tipo/Interface | PascalCase | `Client`, `ClientProps` |
| Variável/Função | camelCase | `fetchClients` |
| Constante | UPPER_SNAKE ou camelCase | `API_URL`, `defaultPageSize` |
| Arquivo de componente | PascalCase | `ClientCard.tsx` |
| Arquivo de hook | camelCase | `useClients.ts` |
| Arquivo de tipos | camelCase | `client.ts` |

### Componentes

Use function components com tipos explícitos:

```tsx
import { ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size])}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
```

### Tipos

Defina tipos em arquivos separados:

```typescript
// types/client.ts
export interface Client {
  id: string;
  name: string;
  phone: string;
  phoneFormatted: string;
  email: string | null;
  petsCount: number;
  createdAt: string;
}

export interface CreateClientInput {
  name: string;
  phone: string;
  email?: string;
}

export interface ClientFilters {
  search?: string;
  page?: number;
  perPage?: number;
}
```

### Hooks

Hooks customizados para lógica reutilizável:

```typescript
// hooks/useClients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import type { Client, CreateClientInput, ClientFilters } from '@/types/client';

export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientService.list(filters),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientInput) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
```

### Serviços de API

```typescript
// services/clientService.ts
import { api } from '@/lib/api';
import type { Client, CreateClientInput, ClientFilters, PaginatedResult } from '@/types/client';

export const clientService = {
  async list(filters: ClientFilters): Promise<PaginatedResult<Client>> {
    const response = await api.get('/petos/v1/clients', { params: filters });
    return response.data;
  },

  async get(id: string): Promise<Client> {
    const response = await api.get(`/petos/v1/clients/${id}`);
    return response.data.data;
  },

  async create(data: CreateClientInput): Promise<Client> {
    const response = await api.post('/petos/v1/clients', data);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateClientInput>): Promise<Client> {
    const response = await api.put(`/petos/v1/clients/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/petos/v1/clients/${id}`);
  },
};
```

### Imports

Ordem de imports:

```typescript
// 1. React e bibliotecas core
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Bibliotecas de terceiros
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// 3. Componentes internos (absolutos)
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';

// 4. Hooks internos
import { useClients } from '@/hooks/useClients';

// 5. Tipos
import type { Client } from '@/types/client';

// 6. Estilos e assets
import './ClientList.css';
```

---

## SQL/Banco de Dados

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Tabela | snake_case, prefixo wp_petos_ | `wp_petos_clients` |
| Coluna | snake_case | `client_id` |
| Chave primária | id | `id` |
| Chave estrangeira | {tabela_singular}_id | `client_id` |
| Índice | idx_{tabela}_{colunas} | `idx_clients_phone` |
| Timestamps | created_at, updated_at | - |

### Tabelas Novas

Estrutura padrão:

```sql
CREATE TABLE wp_petos_[nome] (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- colunas específicas
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- índices
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Queries

```php
// SELECT
$client = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT id, name, phone, email, created_at
         FROM {$table}
         WHERE id = %d AND deleted_at IS NULL",
        $id
    ),
    ARRAY_A
);

// INSERT
$wpdb->insert(
    $table,
    [
        'name' => $name,
        'phone' => $phone,
        'email' => $email,
    ],
    ['%s', '%s', '%s']
);

// UPDATE
$wpdb->update(
    $table,
    ['name' => $newName],
    ['id' => $id],
    ['%s'],
    ['%d']
);
```

---

## Git

### Branches

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Feature | feature/[modulo]-[descrição] | `feature/client-crud` |
| Bugfix | fix/[descrição] | `fix/phone-validation` |
| Hotfix | hotfix/[descrição] | `hotfix/auth-bypass` |
| Refactor | refactor/[descrição] | `refactor/repository-pattern` |

### Commits

Formato: `type(scope): description`

Tipos:
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `refactor`: refatoração sem mudança de comportamento
- `test`: adição ou correção de testes
- `docs`: documentação
- `style`: formatação (sem mudança de código)
- `chore`: tarefas de build, CI, etc.

Exemplos:
```
feat(client): add create client use case
fix(phone): correct brazilian phone validation
refactor(repository): extract mapper to separate class
test(client): add unit tests for PhoneNumber value object
docs(readme): update setup instructions
```

### Pull Requests

Título: `[Tipo] Descrição breve`

Descrição:
```markdown
## O que foi feito
- [lista de mudanças]

## Como testar
1. [passos para testar]

## Checklist
- [ ] Testes passando
- [ ] PHPStan passando
- [ ] Documentação atualizada
```

---

## Documentação

### PHPDoc

```php
/**
 * Busca um cliente pelo ID.
 *
 * @param ClientId $id ID do cliente
 * @return Client|null Cliente encontrado ou null se não existir
 * @throws RepositoryException Se houver erro na consulta
 */
public function findById(ClientId $id): ?Client
```

### JSDoc (TypeScript)

```typescript
/**
 * Hook para gerenciar lista de clientes.
 *
 * @param filters - Filtros de busca
 * @returns Query result com lista paginada de clientes
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useClients({ search: 'João' });
 * ```
 */
export function useClients(filters: ClientFilters = {}) {
```

### README de Módulo

Cada módulo maior deve ter um README:

```markdown
# [Nome do Módulo]

## Propósito
[Descrição breve]

## Estrutura
[Árvore de arquivos]

## Uso
[Exemplos de código]

## Dependências
[Outros módulos que este usa]
```

---

## Testes

### Nomenclatura de Testes

```php
// Formato: test_[ação]_[condição]_[resultado]
public function test_create_client_with_valid_data_returns_client(): void
public function test_create_client_with_invalid_phone_throws_exception(): void
public function test_find_client_by_phone_when_exists_returns_client(): void
public function test_find_client_by_phone_when_not_exists_returns_null(): void
```

### Estrutura de Teste

```php
<?php

declare(strict_types=1);

namespace PetOS\Tests\Unit\Domain\Shared;

use PHPUnit\Framework\TestCase;
use PetOS\Domain\Shared\PhoneNumber;
use InvalidArgumentException;

final class PhoneNumberTest extends TestCase
{
    /**
     * @test
     * @dataProvider validPhonesProvider
     */
    public function create_with_valid_phone_succeeds(string $input, string $expected): void
    {
        $phone = new PhoneNumber($input);
        
        $this->assertSame($expected, $phone->getValue());
    }

    /**
     * @test
     * @dataProvider invalidPhonesProvider
     */
    public function create_with_invalid_phone_throws_exception(string $input): void
    {
        $this->expectException(InvalidArgumentException::class);
        
        new PhoneNumber($input);
    }

    public static function validPhonesProvider(): array
    {
        return [
            'celular com DDD' => ['11999998888', '11999998888'],
            'celular formatado' => ['(11) 99999-8888', '11999998888'],
            'fixo com DDD' => ['1133334444', '1133334444'],
        ];
    }

    public static function invalidPhonesProvider(): array
    {
        return [
            'muito curto' => ['123456789'],
            'muito longo' => ['123456789012'],
            'vazio' => [''],
            'letras' => ['abcdefghij'],
        ];
    }
}
```

### Mocks

Use mocks para isolar unidades:

```php
public function test_create_client_saves_and_dispatches_event(): void
{
    // Arrange
    $repository = $this->createMock(ClientRepository::class);
    $events = $this->createMock(EventDispatcher::class);
    
    $repository
        ->method('findByPhone')
        ->willReturn(null);
    
    $repository
        ->method('nextId')
        ->willReturn(new ClientId('123'));
    
    $repository
        ->expects($this->once())
        ->method('save');
    
    $events
        ->expects($this->once())
        ->method('dispatch')
        ->with($this->isInstanceOf(ClientCreated::class));
    
    $handler = new CreateClientHandler($repository, $events);
    $command = new CreateClientCommand('João', '11999998888', null);
    
    // Act
    $result = $handler->handle($command);
    
    // Assert
    $this->assertSame('João', $result->name);
}
```

---

**Mantenha este documento atualizado conforme o projeto evolui.**
