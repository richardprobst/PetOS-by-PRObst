# 📖 Glossário — PetOS By PRObst

Este documento define os termos e conceitos utilizados no sistema PetOS.

---

## 🐾 Domínio de Negócio (Banho e Tosa)

### Cliente / Tutor
O **dono do pet**. Pessoa física que traz o animal para os serviços de banho e tosa.
- Identificado principalmente pelo **telefone/WhatsApp**
- Pode ter múltiplos pets
- Possui histórico de atendimentos

### Pet
Animal de estimação cadastrado no sistema.
- Vinculado a um único tutor (cliente)
- Atributos específicos para B&T: porte, pelagem, agressividade
- Histórico individual de atendimentos

### Atendimento / Agendamento
Serviço de banho e/ou tosa agendado ou realizado.
- Vinculado a um pet (e por extensão, ao cliente)
- Possui data/hora, status e serviços realizados
- Pode ter notas do tosador

### Serviços de B&T

| Serviço | Código | Descrição |
|---------|--------|-----------|
| Banho | `bath` | Banho com shampoo e secagem |
| Tosa Higiênica | `hygienic_grooming` | Tosa das partes íntimas, patas e face |
| Tosa Completa | `full_grooming` | Tosa de todo o corpo |
| Hidratação | `hydration` | Tratamento de hidratação do pelo |
| Desembaraço | `detangling` | Remoção de nós no pelo |
| Corte de Unha | `nail_trim` | Corte das unhas |
| Limpeza de Ouvido | `ear_cleaning` | Limpeza dos ouvidos |

### Status de Atendimento

| Status | Código | Descrição |
|--------|--------|-----------|
| Agendado | `scheduled` | Agendamento confirmado, aguardando data |
| Em Atendimento | `in_progress` | Pet está sendo atendido |
| Concluído | `completed` | Atendimento finalizado com sucesso |
| Cancelado | `cancelled` | Agendamento cancelado |
| Não Compareceu | `no_show` | Cliente não compareceu |

### Porte do Pet

| Porte | Código | Descrição | Exemplo de Raças |
|-------|--------|-----------|------------------|
| Pequeno | `small` | Até 10kg | Poodle Toy, Shih Tzu |
| Médio | `medium` | 10-25kg | Beagle, Cocker |
| Grande | `large` | 25-45kg | Labrador, Golden |
| Gigante | `giant` | Acima de 45kg | São Bernardo, Dogue |

### Tipo de Pelagem

| Tipo | Código | Descrição |
|------|--------|-----------|
| Curta | `short` | Pelo rente ao corpo |
| Média | `medium` | Pelo de comprimento moderado |
| Longa | `long` | Pelo longo, precisa de manutenção frequente |
| Dupla | `double` | Subpelo + pelo de cobertura |
| Sem Pelo | `hairless` | Raças sem pelo (Chinês de Crista) |

### Nível de Agressividade

| Nível | Código | Descrição |
|-------|--------|-----------|
| Dócil | `docile` | Tranquilo, aceita bem o manejo |
| Moderado | `moderate` | Precisa de atenção, pode reagir |
| Agressivo | `aggressive` | Requer manejo especial, pode morder |

---

## 🏗️ Arquitetura e Código

### Clean Architecture
Arquitetura de software onde o código é organizado em camadas concêntricas, com o domínio no centro e independente de frameworks/bibliotecas externas.

**Camadas (de dentro para fora):**
1. **Domain** - Entidades e regras de negócio
2. **Application** - Casos de uso
3. **Infrastructure** - Frameworks, banco de dados, APIs
4. **UI** - Interface do usuário

### Entidade
Objeto do domínio que possui identidade única (ID) e ciclo de vida. Exemplo: `Client`, `Pet`, `Appointment`.

### Value Object
Objeto imutável que representa um conceito do domínio, identificado pelos seus atributos (não tem ID). Exemplo: `PhoneNumber`, `Email`, `Money`.

### Repository
Interface que abstrai o acesso a dados. O domínio define a interface, a infraestrutura implementa.

```php
// Domain define
interface ClientRepository {
    public function findById(ClientId $id): ?Client;
}

// Infrastructure implementa
class WpdbClientRepository implements ClientRepository {
    public function findById(ClientId $id): ?Client { ... }
}
```

### Use Case / Caso de Uso
Classe que orquestra uma operação de negócio. Recebe um Command/Query, executa a lógica e retorna um DTO.

### Command
Objeto que representa uma intenção de mudar o estado do sistema.
```php
class CreateClientCommand {
    public function __construct(
        public readonly string $name,
        public readonly string $phone,
    ) {}
}
```

### Query
Objeto que representa uma consulta (leitura) de dados.
```php
class GetClientByIdQuery {
    public function __construct(
        public readonly string $clientId,
    ) {}
}
```

### DTO (Data Transfer Object)
Objeto simples para transferir dados entre camadas. Não contém lógica de negócio.

### Handler
Classe que processa um Command ou Query.

### Event / Evento de Domínio
Notificação de que algo aconteceu no domínio. Usado para desacoplar módulos.
```php
class ClientCreated {
    public function __construct(
        public readonly ClientId $clientId,
    ) {}
}
```

### Mapper
Classe que converte dados entre formatos (ex.: array do banco → entidade).

---

## 🔌 WordPress

### Plugin
Extensão do WordPress. O PetOS é implementado como um plugin.

### Hook
Ponto de extensão do WordPress. Tipos:
- **Action**: executa código em determinado momento
- **Filter**: modifica dados

### REST API
API HTTP do WordPress. Endpoints registrados em `/wp-json/`.

### Capability
Permissão no WordPress. Exemplo: `petos_manage_clients`.

### Nonce
Token de segurança do WordPress para prevenir CSRF.

### $wpdb
Objeto global do WordPress para acesso ao banco de dados.

### Transient
Cache temporário do WordPress.

---

## 🔐 Segurança

### Sanitização
Limpeza de dados de entrada para remover caracteres perigosos.
```php
$name = sanitize_text_field($_POST['name']);
```

### Escape
Preparação de dados de saída para exibição segura.
```php
echo esc_html($name);
```

### Prepared Statement
Query SQL com placeholders, prevenindo SQL Injection.
```php
$wpdb->prepare("SELECT * FROM users WHERE id = %d", $id);
```

### Rate Limiting
Limitação de requisições por tempo para prevenir abuso.

### Magic Link
Link de acesso único enviado por email/WhatsApp. Substitui senha para o portal do cliente.

### Token
String criptográfica usada para autenticação. Deve ser armazenado como hash.

---

## 💻 Frontend

### React
Biblioteca JavaScript para construção de interfaces.

### TypeScript
Superset tipado de JavaScript.

### Hook (React)
Função que permite usar estado e outros recursos em componentes funcionais.
- `useState`: estado local
- `useEffect`: efeitos colaterais
- `useContext`: contexto global
- Custom hooks: `useClients`, `usePets`, etc.

### Componente
Bloco de UI reutilizável.

### Tailwind CSS
Framework CSS utility-first.

### Vite
Ferramenta de build rápida para projetos frontend.

### Design Token
Valores de design padronizados (cores, espaçamentos, tipografia).

---

## 🧪 Qualidade

### PHPStan
Ferramenta de análise estática para PHP. Encontra erros sem executar o código.

### PHPUnit
Framework de testes unitários para PHP.

### PHPUnit
Framework de testes para PHP.

### Vitest / Jest
Frameworks de testes para JavaScript/TypeScript.

### Teste Unitário
Testa uma unidade isolada (classe, função).

### Teste de Integração
Testa a interação entre componentes.

### Teste E2E (End-to-End)
Testa o sistema completo do ponto de vista do usuário.

### CI/CD
Continuous Integration / Continuous Deployment. Automação de testes e deploy.

### Code Coverage
Métrica de quanto código é coberto por testes.

---

## 📊 Banco de Dados

### Schema
Estrutura do banco de dados (tabelas, colunas, índices).

### Migração
Script para alterar a estrutura do banco de forma versionada.

### Legado
Sistema ou dados antigos que precisam ser mantidos compatíveis.

### LegacySchemaMap
Classe que mapeia nomes de tabelas/colunas do banco existente.

---

## 📝 Abreviações Comuns

| Sigla | Significado |
|-------|-------------|
| B&T | Banho e Tosa |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| CRUD | Create, Read, Update, Delete |
| DTO | Data Transfer Object |
| DI | Dependency Injection |
| DRY | Don't Repeat Yourself |
| SOLID | Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion |
| PSR | PHP Standards Recommendations |
| MVP | Minimum Viable Product |
| UI | User Interface |
| UX | User Experience |
| WP | WordPress |

---

## 🔗 Referências

- [PHP-FIG PSR](https://www.php-fig.org/psr/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Adicione novos termos conforme o projeto evolui.**
