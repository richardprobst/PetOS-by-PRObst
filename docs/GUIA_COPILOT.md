# 🤖 Guia para GitHub Copilot — PetOS By PRObst

**Sistema:** PetOS By PRObst  
**Assistente:** GitHub Copilot com Claude Opus 4.5  
**Foco:** Sistema exclusivo de **Banho e Tosa**

---

## 📋 Sobre Este Guia

Este documento serve como **referência principal** para o GitHub Copilot com Claude Opus 4.5 durante o desenvolvimento do sistema PetOS. Ele contém contexto, regras, padrões e instruções que devem ser seguidas em todas as interações.

---

## 🎯 Contexto do Projeto

### O que é o PetOS?
PetOS é um sistema de gestão **exclusivo para Banho e Tosa** de pets, desenvolvido como plugin WordPress com arquitetura Clean/Hexagonal.

### Objetivo Principal
Criar um sistema moderno, seguro e escalável para gerenciar:
- **Clientes (Tutores)** - Donos dos pets
- **Pets** - Animais cadastrados com informações específicas de B&T
- **Agendamentos** - Serviços de banho, tosa e cuidados
- **Portal do Cliente** - Acesso via Magic Link para visualizar histórico

### Stack Tecnológica
| Camada | Tecnologia |
|--------|------------|
| Backend | PHP 8.2+, WordPress (host), Clean Architecture |
| Frontend Admin | React 18+, TypeScript, Tailwind CSS, Vite |
| Frontend Portal | React 18+, TypeScript, Tailwind CSS, Vite |
| Banco de Dados | MySQL (compatível com dados existentes) |
| Testes | PHPUnit, PHPStan, Jest/Vitest |
| CI/CD | GitHub Actions |

---

## 📁 Estrutura do Projeto

```
B-T-By-PRObst/
├── docs/                           # 📚 Documentação
│   ├── PETOS_BLUEPRINT.md          # Arquitetura e decisões técnicas
│   ├── PETOS_PLANO_EXECUCAO.md     # Plano de execução em 6 fases
│   ├── GUIA_COPILOT.md             # Este documento
│   ├── PROMPTS_TEMPLATES.md        # Templates de prompts por módulo
│   ├── CONVENCOES.md               # Padrões de código
│   └── GLOSSARIO.md                # Termos e conceitos
├── plugins/
│   └── petos-core/                 # 🔌 Plugin WordPress principal
│       ├── petos-core.php          # Bootstrap
│       ├── composer.json
│       ├── src/
│       │   ├── Domain/             # Entidades e regras de negócio
│       │   ├── Application/        # Casos de uso
│       │   ├── Infrastructure/     # Adapters (WP, DB)
│       │   └── UI/                 # Controllers REST
│       ├── resources/
│       │   ├── admin/              # React App Admin
│       │   └── portal/             # React App Portal Cliente
│       └── tests/
├── .github/workflows/              # CI/CD
└── README.md
```

---

## ⚖️ Regras Inegociáveis

### 1. Arquitetura Clean (SEMPRE)
```
✅ Domain não depende de nada externo
✅ Application depende apenas do Domain
✅ Infrastructure implementa interfaces do Domain
✅ UI (Controllers) usa Application/Use Cases

❌ NUNCA colocar regra de negócio em Controllers
❌ NUNCA usar $wpdb diretamente fora de Infrastructure
❌ NUNCA acessar $_POST/$_GET diretamente em Use Cases
```

### 2. PHP Moderno (SEMPRE)
```php
<?php
declare(strict_types=1);

namespace PetOS\Domain\Client;

// ✅ Tipos em tudo
// ✅ Namespaces PSR-4
// ✅ Readonly properties quando possível
// ✅ Enums para valores fixos
```

### 3. Segurança (OBRIGATÓRIO)
```php
// ✅ Prepared statements SEMPRE
$wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id);

// ✅ Sanitização de entrada
$phone = sanitize_text_field($input['phone']);

// ✅ Escape de saída
echo esc_html($name);

// ✅ Verificar permissões
if (!current_user_can('petos_manage_clients')) {
    return new WP_Error('forbidden', 'Sem permissão', ['status' => 403]);
}
```

### 4. Nomenclatura
| Contexto | Convenção | Exemplo |
|----------|-----------|---------|
| Classes PHP | PascalCase | `ClientRepository` |
| Métodos PHP | camelCase | `findById()` |
| Variáveis PHP | camelCase | `$clientId` |
| Constantes PHP | UPPER_SNAKE | `TABLE_CLIENTS` |
| Tabelas DB | snake_case | `wp_petos_clients` |
| Colunas DB | snake_case | `client_id` |
| Componentes React | PascalCase | `ClientCard.tsx` |
| Hooks React | camelCase (use) | `useClients.ts` |
| Arquivos TS | PascalCase ou kebab | `ClientCard.tsx` |

---

## 🔧 Padrões de Implementação

### Entidade de Domínio
```php
<?php
declare(strict_types=1);

namespace PetOS\Domain\Client;

final class Client
{
    public function __construct(
        private readonly ClientId $id,
        private string $name,
        private PhoneNumber $phone,
        private ?Email $email = null,
    ) {}

    public function getId(): ClientId
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function changeName(string $name): void
    {
        if (empty(trim($name))) {
            throw new InvalidArgumentException('Nome não pode ser vazio');
        }
        $this->name = trim($name);
    }
}
```

### Value Object
```php
<?php
declare(strict_types=1);

namespace PetOS\Domain\Shared;

final class PhoneNumber
{
    private string $value;

    public function __construct(string $phone)
    {
        $normalized = preg_replace('/\D/', '', $phone);
        
        if (strlen($normalized) < 10 || strlen($normalized) > 11) {
            throw new InvalidArgumentException('Telefone inválido');
        }
        
        $this->value = $normalized;
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function getFormatted(): string
    {
        $len = strlen($this->value);
        if ($len === 11) {
            return sprintf('(%s) %s-%s',
                substr($this->value, 0, 2),
                substr($this->value, 2, 5),
                substr($this->value, 7)
            );
        }
        return sprintf('(%s) %s-%s',
            substr($this->value, 0, 2),
            substr($this->value, 2, 4),
            substr($this->value, 6)
        );
    }
}
```

### Repository Interface
```php
<?php
declare(strict_types=1);

namespace PetOS\Domain\Client;

interface ClientRepository
{
    public function save(Client $client): void;
    public function findById(ClientId $id): ?Client;
    public function findByPhone(PhoneNumber $phone): ?Client;
    public function search(string $term, int $page = 1, int $perPage = 20): ClientCollection;
    public function nextId(): ClientId;
}
```

### Use Case
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

    public function handle(CreateClientCommand $command): ClientDTO
    {
        // Validar telefone único
        $existingClient = $this->repository->findByPhone(
            new PhoneNumber($command->phone)
        );
        
        if ($existingClient !== null) {
            throw new ClientAlreadyExistsException(
                'Já existe um cliente com este telefone'
            );
        }

        // Criar entidade
        $client = new Client(
            id: $this->repository->nextId(),
            name: $command->name,
            phone: new PhoneNumber($command->phone),
            email: $command->email ? new Email($command->email) : null,
        );

        // Persistir
        $this->repository->save($client);

        // Disparar evento
        $this->events->dispatch(new ClientCreated($client->getId()));

        // Retornar DTO
        return ClientDTO::fromEntity($client);
    }
}
```

### REST Controller
```php
<?php
declare(strict_types=1);

namespace PetOS\Infrastructure\Http\Controllers;

use WP_REST_Request;
use WP_REST_Response;

final class ClientController
{
    public function __construct(
        private readonly CreateClientHandler $createHandler,
        private readonly GetClientByIdHandler $getHandler,
    ) {}

    public function create(WP_REST_Request $request): WP_REST_Response
    {
        try {
            $command = new CreateClientCommand(
                name: sanitize_text_field($request->get_param('name')),
                phone: sanitize_text_field($request->get_param('phone')),
                email: sanitize_email($request->get_param('email') ?? ''),
            );

            $client = $this->createHandler->handle($command);

            return new WP_REST_Response([
                'success' => true,
                'data' => $client->toArray(),
            ], 201);

        } catch (ClientAlreadyExistsException $e) {
            return new WP_REST_Response([
                'success' => false,
                'errors' => [
                    ['code' => 'CLIENT_EXISTS', 'message' => $e->getMessage()]
                ],
            ], 409);

        } catch (InvalidArgumentException $e) {
            return new WP_REST_Response([
                'success' => false,
                'errors' => [
                    ['code' => 'VALIDATION_ERROR', 'message' => $e->getMessage()]
                ],
            ], 400);
        }
    }
}
```

### Componente React
```tsx
// components/ClientCard.tsx
import { Client } from '@/types/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Phone, Mail, Calendar } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onEdit?: (client: Client) => void;
}

export function ClientCard({ client, onEdit }: ClientCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{client.name}</span>
          <Badge variant="secondary">{client.petsCount} pets</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>{client.phoneFormatted}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{client.email}</span>
            </div>
          )}
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(client)}
            className="mt-4 w-full btn btn-primary"
          >
            Editar
          </button>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 🔄 Fluxo de Trabalho com Copilot

### 1. Antes de Implementar
Sempre pergunte/verifique:
- [ ] Qual fase do plano de execução estamos?
- [ ] Existe documentação/decisão prévia sobre isso?
- [ ] Qual o impacto no banco de dados existente?

### 2. Durante a Implementação
- Crie em camadas: Domain → Application → Infrastructure → UI
- Escreva testes junto com o código
- Documente decisões importantes

### 3. Após Implementar
- [ ] Código passa no PHPStan nível 6?
- [ ] Testes passando?
- [ ] Segurança verificada?
- [ ] Documentação atualizada?

---

## 📝 Como Solicitar Implementações

### Formato Recomendado de Prompt
```
## Contexto
[Descreva o módulo/fase atual e o que já foi feito]

## Tarefa
[Descreva claramente o que precisa ser implementado]

## Requisitos
- [Lista de requisitos específicos]

## Referências
- [Arquivos existentes para consultar]
- [Padrões a seguir]

## Critérios de Aceite
- [Como saber se está pronto]
```

### Exemplo
```
## Contexto
Estamos na Fase 2 (Núcleo do Domínio). Já criamos a entidade Client e
o value object PhoneNumber.

## Tarefa
Implementar a entidade Pet com todos os atributos específicos de Banho e Tosa.

## Requisitos
- Entidade Pet vinculada a Client (ClientId)
- Atributos: nome, espécie (enum), porte (enum), pelagem, raça, peso
- Atributos B&T: nível de agressividade (enum), restrições, notas de tosa
- Value objects onde fizer sentido

## Referências
- src/Domain/Client/Client.php (padrão de entidade)
- docs/PETOS_BLUEPRINT.md seção 6.1 (definição da entidade)

## Critérios de Aceite
- Entidade com validação nos setters
- Enums para Species, Size, CoatType, AggressionLevel
- Testes unitários para validações
- PHPStan nível 6 passando
```

---

## 🚫 O Que NUNCA Fazer

1. **Nunca alterar tabelas/colunas do banco legado**
2. **Nunca colocar SQL fora de Infrastructure/Persistence**
3. **Nunca criar funções globais (use classes e namespaces)**
4. **Nunca ignorar sanitização/escape de dados**
5. **Nunca pular verificação de permissões em endpoints**
6. **Nunca commitar credenciais ou dados sensíveis**
7. **Nunca remover código/testes existentes sem discussão**

---

## 📚 Documentos de Referência

| Documento | Conteúdo |
|-----------|----------|
| [PETOS_BLUEPRINT.md](./PETOS_BLUEPRINT.md) | Arquitetura, camadas, decisões técnicas |
| [PETOS_PLANO_EXECUCAO.md](./PETOS_PLANO_EXECUCAO.md) | Fases, tarefas, cronograma |
| [PROMPTS_TEMPLATES.md](./PROMPTS_TEMPLATES.md) | Templates prontos por módulo |
| [CONVENCOES.md](./CONVENCOES.md) | Padrões de código detalhados |
| [GLOSSARIO.md](./GLOSSARIO.md) | Termos e conceitos do domínio |

---

## ✅ Checklist de Qualidade (Toda Implementação)

```markdown
### Código
- [ ] PHP 8.2+ com strict_types
- [ ] Namespaces PSR-4 corretos
- [ ] Tipos em parâmetros e retornos
- [ ] Sem funções globais

### Arquitetura
- [ ] Respeita Clean Architecture
- [ ] Use Case para lógica de negócio
- [ ] Repository para persistência
- [ ] DTO para transferência de dados

### Segurança
- [ ] Inputs sanitizados
- [ ] Outputs escapados
- [ ] Prepared statements no SQL
- [ ] Permissões verificadas

### Testes
- [ ] Testes unitários para regras
- [ ] Testes de integração para repos
- [ ] PHPStan passando nível 6

### Frontend (se aplicável)
- [ ] TypeScript strict
- [ ] Componentes tipados
- [ ] Estados de loading/error
- [ ] Acessibilidade (aria, teclado)
```

---

**Versão:** 1.0  
**Última atualização:** Fevereiro 2026  
**Autor:** PRObst
