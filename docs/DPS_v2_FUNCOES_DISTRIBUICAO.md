# DPS v2 — Catálogo de Funções e Distribuição por Módulos (Complementar)

> Documento complementar para recriação do sistema. Consolida as **APIs públicas** (funções globais e métodos) do DPS e sugere uma distribuição moderna entre **Core** e **Add-ons**.

> Fonte: *DPS Functions Reference* (v2.6.0, atualizado em dezembro/2024). Gerado em 02/02/2026.

> **NOTA:** Este documento foi atualizado para incluir todas as funções do plano de criação do novo sistema (Blueprint e Plano de Execução), com redistribuição otimizada seguindo os princípios de Clean Architecture.

---

## Índice de módulos

- [Base Plugin (Core)](#base-plugin-core)
  - [Domain Layer](#domain-layer)
  - [Application Layer](#application-layer)
  - [Infrastructure Layer](#infrastructure-layer)
  - [UI Layer](#ui-layer)
- [Client Portal Add-on](#client-portal-add-on)
- [Communications Add-on](#communications-add-on)
- [Finance Add-on](#finance-add-on)
- [Loyalty Add-on](#loyalty-add-on)
- [Push Add-on](#push-add-on)
- [AI Add-on](#ai-add-on)
- [Agenda Add-on](#agenda-add-on)
- [Stats Add-on](#stats-add-on)
- [Services Add-on](#services-add-on)
- [Backup Add-on](#backup-add-on)
- [Booking Add-on](#booking-add-on)
- [Groomers Add-on](#groomers-add-on)
- [Payment Add-on](#payment-add-on)
- [Registration Add-on](#registration-add-on)
- [Stock Add-on](#stock-add-on)
- [Subscription Add-on](#subscription-add-on)

---

## Base Plugin (Core)

O Core segue a **Clean Architecture** com 4 camadas: Domain, Application, Infrastructure e UI.

### Funções globais

- `dps_get_template()` — Localiza e carrega um template, permitindo override pelo tema.
- `dps_get_template_path()` — Retorna o caminho do template que seria carregado, sem incluí-lo.
- `dps_is_template_overridden()` — Verifica se um template está sendo sobrescrito pelo tema.
- `dps_log()` — Função de logging global com níveis (debug, info, warning, error).
- `dps_dispatch_event()` — Dispara um evento de domínio para listeners registrados.
- `dps_container()` — Retorna instância do container de injeção de dependência.

---

### Domain Layer

> Entidades, Value Objects, Interfaces de Repository e Eventos de Domínio.

#### Entidades (Entities)

##### Client (Tutor)
*Representa um cliente/tutor no sistema.*
- `Client::getId()` — Retorna o identificador único do cliente.
- `Client::getName()` — Retorna o nome do cliente.
- `Client::getPhone()` — Retorna o telefone/WhatsApp do cliente.
- `Client::getEmail()` — Retorna o email do cliente (opcional).
- `Client::getAddress()` — Retorna o endereço completo do cliente.
- `Client::getCpf()` — Retorna o CPF do cliente (opcional).
- `Client::getCreatedAt()` — Retorna a data de cadastro.
- `Client::changeName()` — Altera o nome do cliente com validação.
- `Client::changePhone()` — Altera o telefone com validação.
- `Client::changeEmail()` — Altera o email com validação.
- `Client::changeAddress()` — Altera o endereço do cliente.

##### Pet
*Representa um pet vinculado a um cliente.*
- `Pet::getId()` — Retorna o identificador único do pet.
- `Pet::getClientId()` — Retorna o ID do tutor/cliente.
- `Pet::getName()` — Retorna o nome do pet.
- `Pet::getSpecies()` — Retorna a espécie (dog/cat).
- `Pet::getBreed()` — Retorna a raça do pet.
- `Pet::getSize()` — Retorna o porte (small/medium/large/giant).
- `Pet::getCoatType()` — Retorna o tipo de pelagem.
- `Pet::getSex()` — Retorna o sexo do pet.
- `Pet::getWeight()` — Retorna o peso em kg.
- `Pet::getBirthDate()` — Retorna a data de nascimento.
- `Pet::getAggressiveness()` — Retorna o nível de agressividade (docile/moderate/aggressive).
- `Pet::getRestrictions()` — Retorna restrições de saúde ou manejo.
- `Pet::getGroomingNotes()` — Retorna notas específicas para tosa.

##### Appointment (Atendimento/Agendamento)
*Representa um agendamento ou atendimento de Banho e Tosa.*
- `Appointment::getId()` — Retorna o identificador único do agendamento.
- `Appointment::getClientId()` — Retorna o ID do cliente.
- `Appointment::getPetId()` — Retorna o ID do pet.
- `Appointment::getScheduledAt()` — Retorna a data/hora agendada.
- `Appointment::getStatus()` — Retorna o status (scheduled/in_progress/completed/cancelled/no_show).
- `Appointment::getServices()` — Retorna lista de serviços solicitados.
- `Appointment::getNotes()` — Retorna notas do atendimento.
- `Appointment::getTotalAmount()` — Retorna o valor total do atendimento.
- `Appointment::getGroomerId()` — Retorna o ID do tosador responsável (opcional).
- `Appointment::schedule()` — Agenda o atendimento com validação de data/horário.
- `Appointment::start()` — Inicia o atendimento (muda status para in_progress).
- `Appointment::complete()` — Finaliza o atendimento com sucesso.
- `Appointment::cancel()` — Cancela o agendamento.
- `Appointment::markAsNoShow()` — Marca como não comparecimento.

#### Value Objects

##### ClientId
*Identificador único imutável de cliente.*
- `ClientId::__construct()` — Cria instância com validação.
- `ClientId::getValue()` — Retorna o valor do ID.
- `ClientId::equals()` — Compara com outro ClientId.
- `ClientId::generate()` — Gera novo ID único (factory method).

##### PetId
*Identificador único imutável de pet.*
- `PetId::__construct()` — Cria instância com validação.
- `PetId::getValue()` — Retorna o valor do ID.
- `PetId::equals()` — Compara com outro PetId.

##### AppointmentId
*Identificador único imutável de agendamento.*
- `AppointmentId::__construct()` — Cria instância com validação.
- `AppointmentId::getValue()` — Retorna o valor do ID.
- `AppointmentId::equals()` — Compara com outro AppointmentId.

##### PhoneNumber
*Número de telefone brasileiro normalizado e validado.*
- `PhoneNumber::__construct()` — Cria instância com validação de formato brasileiro.
- `PhoneNumber::getValue()` — Retorna o número normalizado (apenas dígitos).
- `PhoneNumber::getFormatted()` — Retorna formatado para exibição (xx) xxxxx-xxxx.
- `PhoneNumber::getWhatsAppLink()` — Retorna link wa.me completo.
- `PhoneNumber::equals()` — Compara com outro PhoneNumber.
- `PhoneNumber::isValid()` — Valida se string representa telefone brasileiro válido (static).

##### Email
*Endereço de email validado.*
- `Email::__construct()` — Cria instância com validação de formato.
- `Email::getValue()` — Retorna o endereço de email.
- `Email::equals()` — Compara com outro Email.
- `Email::isValid()` — Valida formato de email (static).

##### Money
*Valor monetário em centavos (evita problemas de ponto flutuante).*
- `Money::__construct()` — Cria instância a partir de centavos.
- `Money::fromDecimal()` — Cria instância a partir de valor decimal (factory method).
- `Money::fromBrazilianFormat()` — Cria a partir de string no formato brasileiro (factory method).
- `Money::getCents()` — Retorna valor em centavos.
- `Money::getDecimal()` — Retorna valor decimal.
- `Money::format()` — Formata para exibição com símbolo de moeda.
- `Money::formatBrazilian()` — Formata no padrão brasileiro (R$ 1.234,56).
- `Money::add()` — Soma dois valores Money.
- `Money::subtract()` — Subtrai dois valores Money.
- `Money::multiply()` — Multiplica por um fator.
- `Money::equals()` — Compara com outro Money.
- `Money::isZero()` — Verifica se é zero.
- `Money::isPositive()` — Verifica se é positivo.
- `Money::isNegative()` — Verifica se é negativo.

##### DateRange
*Intervalo de datas imutável.*
- `DateRange::__construct()` — Cria instância com data início e fim.
- `DateRange::getStart()` — Retorna data de início.
- `DateRange::getEnd()` — Retorna data de fim.
- `DateRange::contains()` — Verifica se uma data está dentro do intervalo.
- `DateRange::overlaps()` — Verifica se há sobreposição com outro intervalo.
- `DateRange::getDays()` — Retorna número de dias no intervalo.

##### Address
*Endereço completo validado.*
- `Address::__construct()` — Cria instância com campos de endereço.
- `Address::getStreet()` — Retorna logradouro.
- `Address::getNumber()` — Retorna número.
- `Address::getComplement()` — Retorna complemento.
- `Address::getNeighborhood()` — Retorna bairro.
- `Address::getCity()` — Retorna cidade.
- `Address::getState()` — Retorna estado (UF).
- `Address::getZipCode()` — Retorna CEP.
- `Address::getFormatted()` — Retorna endereço formatado em uma linha.
- `Address::getGoogleMapsUrl()` — Retorna URL do Google Maps para o endereço.

#### Enums

##### Species
*Espécie do pet.*
- `Species::Dog` — Cachorro.
- `Species::Cat` — Gato.
- `Species::label()` — Retorna label traduzido.

##### PetSize
*Porte do pet.*
- `PetSize::Small` — Pequeno (até 10kg).
- `PetSize::Medium` — Médio (10-25kg).
- `PetSize::Large` — Grande (25-45kg).
- `PetSize::Giant` — Gigante (acima de 45kg).
- `PetSize::label()` — Retorna label traduzido.

##### CoatType
*Tipo de pelagem.*
- `CoatType::Short` — Curta.
- `CoatType::Medium` — Média.
- `CoatType::Long` — Longa.
- `CoatType::Double` — Dupla.
- `CoatType::Hairless` — Sem pelo.
- `CoatType::label()` — Retorna label traduzido.

##### Aggressiveness
*Nível de agressividade.*
- `Aggressiveness::Docile` — Dócil.
- `Aggressiveness::Moderate` — Moderado.
- `Aggressiveness::Aggressive` — Agressivo.
- `Aggressiveness::label()` — Retorna label traduzido.

##### AppointmentStatus
*Status do agendamento.*
- `AppointmentStatus::Scheduled` — Agendado.
- `AppointmentStatus::InProgress` — Em Atendimento.
- `AppointmentStatus::Completed` — Concluído.
- `AppointmentStatus::Cancelled` — Cancelado.
- `AppointmentStatus::NoShow` — Não Compareceu.
- `AppointmentStatus::label()` — Retorna label traduzido.
- `AppointmentStatus::color()` — Retorna cor para UI.

##### ServiceType
*Tipos de serviço de Banho e Tosa.*
- `ServiceType::Bath` — Banho.
- `ServiceType::HygienicGrooming` — Tosa Higiênica.
- `ServiceType::FullGrooming` — Tosa Completa.
- `ServiceType::Hydration` — Hidratação.
- `ServiceType::Detangling` — Desembaraço.
- `ServiceType::NailTrim` — Corte de Unha.
- `ServiceType::EarCleaning` — Limpeza de Ouvido.
- `ServiceType::label()` — Retorna label traduzido.

#### Repository Interfaces

> Interfaces definidas no Domain, implementadas no Infrastructure.

##### ClientRepositoryInterface
*Interface para persistência de clientes.*
- `ClientRepositoryInterface::findById()` — Busca cliente por ID.
- `ClientRepositoryInterface::findByPhone()` — Busca cliente por telefone.
- `ClientRepositoryInterface::findByEmail()` — Busca cliente por email.
- `ClientRepositoryInterface::save()` — Salva cliente (criar ou atualizar).
- `ClientRepositoryInterface::delete()` — Remove cliente.
- `ClientRepositoryInterface::search()` — Busca clientes com filtros e paginação.
- `ClientRepositoryInterface::nextId()` — Gera próximo ID disponível.

##### PetRepositoryInterface
*Interface para persistência de pets.*
- `PetRepositoryInterface::findById()` — Busca pet por ID.
- `PetRepositoryInterface::findByClient()` — Lista pets de um cliente.
- `PetRepositoryInterface::save()` — Salva pet (criar ou atualizar).
- `PetRepositoryInterface::delete()` — Remove pet.
- `PetRepositoryInterface::countByClient()` — Conta pets de um cliente.
- `PetRepositoryInterface::nextId()` — Gera próximo ID disponível.

##### AppointmentRepositoryInterface
*Interface para persistência de agendamentos.*
- `AppointmentRepositoryInterface::findById()` — Busca agendamento por ID.
- `AppointmentRepositoryInterface::findByClient()` — Lista agendamentos de um cliente.
- `AppointmentRepositoryInterface::findByPet()` — Lista agendamentos de um pet.
- `AppointmentRepositoryInterface::findByDateRange()` — Lista agendamentos em um período.
- `AppointmentRepositoryInterface::findByStatus()` — Lista agendamentos por status.
- `AppointmentRepositoryInterface::save()` — Salva agendamento (criar ou atualizar).
- `AppointmentRepositoryInterface::delete()` — Remove agendamento.
- `AppointmentRepositoryInterface::nextId()` — Gera próximo ID disponível.

#### Domain Events

##### ClientCreated
*Disparado quando um novo cliente é cadastrado.*
- `ClientCreated::getClientId()` — Retorna ID do cliente criado.
- `ClientCreated::getOccurredAt()` — Retorna timestamp do evento.

##### ClientUpdated
*Disparado quando dados de um cliente são atualizados.*
- `ClientUpdated::getClientId()` — Retorna ID do cliente.
- `ClientUpdated::getChangedFields()` — Retorna campos alterados.

##### PetAddedToClient
*Disparado quando um pet é vinculado a um cliente.*
- `PetAddedToClient::getPetId()` — Retorna ID do pet.
- `PetAddedToClient::getClientId()` — Retorna ID do cliente.

##### AppointmentScheduled
*Disparado quando um agendamento é criado.*
- `AppointmentScheduled::getAppointmentId()` — Retorna ID do agendamento.
- `AppointmentScheduled::getClientId()` — Retorna ID do cliente.
- `AppointmentScheduled::getPetId()` — Retorna ID do pet.
- `AppointmentScheduled::getScheduledAt()` — Retorna data/hora agendada.

##### AppointmentCompleted
*Disparado quando um atendimento é finalizado.*
- `AppointmentCompleted::getAppointmentId()` — Retorna ID do agendamento.
- `AppointmentCompleted::getCompletedAt()` — Retorna timestamp de conclusão.
- `AppointmentCompleted::getTotalAmount()` — Retorna valor total.

##### AppointmentCancelled
*Disparado quando um agendamento é cancelado.*
- `AppointmentCancelled::getAppointmentId()` — Retorna ID do agendamento.
- `AppointmentCancelled::getReason()` — Retorna motivo do cancelamento.

---

### Application Layer

> Casos de uso (Use Cases), Commands, Queries, DTOs e Handlers.

#### Commands e Handlers — Clientes

##### CreateClientCommand / CreateClientHandler
*Criar novo cliente.*
- `CreateClientCommand::__construct()` — Recebe name, phone, email (opcional), address (opcional).
- `CreateClientHandler::handle()` — Valida, cria entidade, persiste e dispara ClientCreated.

##### UpdateClientCommand / UpdateClientHandler
*Atualizar dados de cliente existente.*
- `UpdateClientCommand::__construct()` — Recebe clientId e campos a atualizar.
- `UpdateClientHandler::handle()` — Valida, atualiza entidade, persiste e dispara ClientUpdated.

##### DeleteClientCommand / DeleteClientHandler
*Remover cliente (soft delete recomendado).*
- `DeleteClientCommand::__construct()` — Recebe clientId.
- `DeleteClientHandler::handle()` — Valida dependências, remove e dispara ClientDeleted.

#### Queries e Handlers — Clientes

##### GetClientByIdQuery / GetClientByIdHandler
*Buscar cliente por ID.*
- `GetClientByIdQuery::__construct()` — Recebe clientId.
- `GetClientByIdHandler::handle()` — Retorna ClientDTO ou null.

##### SearchClientsQuery / SearchClientsHandler
*Buscar clientes com filtros e paginação.*
- `SearchClientsQuery::__construct()` — Recebe search, page, perPage, filters.
- `SearchClientsHandler::handle()` — Retorna PaginatedResult<ClientDTO>.

#### Commands e Handlers — Pets

##### AddPetToClientCommand / AddPetToClientHandler
*Adicionar pet a um cliente.*
- `AddPetToClientCommand::__construct()` — Recebe clientId e dados do pet.
- `AddPetToClientHandler::handle()` — Cria pet, persiste e dispara PetAddedToClient.

##### UpdatePetCommand / UpdatePetHandler
*Atualizar dados de um pet.*
- `UpdatePetCommand::__construct()` — Recebe petId e campos a atualizar.
- `UpdatePetHandler::handle()` — Valida, atualiza e persiste.

##### DeletePetCommand / DeletePetHandler
*Remover pet.*
- `DeletePetCommand::__construct()` — Recebe petId.
- `DeletePetHandler::handle()` — Valida dependências e remove.

#### Queries e Handlers — Pets

##### GetPetByIdQuery / GetPetByIdHandler
*Buscar pet por ID.*
- `GetPetByIdQuery::__construct()` — Recebe petId.
- `GetPetByIdHandler::handle()` — Retorna PetDTO ou null.

##### ListPetsByClientQuery / ListPetsByClientHandler
*Listar pets de um cliente.*
- `ListPetsByClientQuery::__construct()` — Recebe clientId.
- `ListPetsByClientHandler::handle()` — Retorna array de PetDTO.

#### Commands e Handlers — Agendamentos

##### ScheduleAppointmentCommand / ScheduleAppointmentHandler
*Agendar novo atendimento.*
- `ScheduleAppointmentCommand::__construct()` — Recebe clientId, petId, scheduledAt, services.
- `ScheduleAppointmentHandler::handle()` — Valida disponibilidade, cria agendamento e dispara AppointmentScheduled.

##### UpdateAppointmentCommand / UpdateAppointmentHandler
*Atualizar agendamento.*
- `UpdateAppointmentCommand::__construct()` — Recebe appointmentId e campos.
- `UpdateAppointmentHandler::handle()` — Valida e atualiza.

##### CancelAppointmentCommand / CancelAppointmentHandler
*Cancelar agendamento.*
- `CancelAppointmentCommand::__construct()` — Recebe appointmentId e reason (opcional).
- `CancelAppointmentHandler::handle()` — Cancela e dispara AppointmentCancelled.

##### CompleteAppointmentCommand / CompleteAppointmentHandler
*Finalizar atendimento.*
- `CompleteAppointmentCommand::__construct()` — Recebe appointmentId, notes (opcional), totalAmount.
- `CompleteAppointmentHandler::handle()` — Finaliza e dispara AppointmentCompleted.

#### Queries e Handlers — Agendamentos

##### GetAppointmentByIdQuery / GetAppointmentByIdHandler
*Buscar agendamento por ID.*
- `GetAppointmentByIdQuery::__construct()` — Recebe appointmentId.
- `GetAppointmentByIdHandler::handle()` — Retorna AppointmentDTO ou null.

##### ListAppointmentsByClientQuery / ListAppointmentsByClientHandler
*Listar agendamentos de um cliente.*
- `ListAppointmentsByClientQuery::__construct()` — Recebe clientId, filters.
- `ListAppointmentsByClientHandler::handle()` — Retorna array de AppointmentDTO.

##### ListAppointmentsByDateRangeQuery / ListAppointmentsByDateRangeHandler
*Listar agendamentos por período.*
- `ListAppointmentsByDateRangeQuery::__construct()` — Recebe startDate, endDate, filters.
- `ListAppointmentsByDateRangeHandler::handle()` — Retorna array de AppointmentDTO.

#### DTOs (Data Transfer Objects)

##### ClientDTO
*Dados de cliente para transferência entre camadas.*
- `ClientDTO::id` — ID do cliente.
- `ClientDTO::name` — Nome do cliente.
- `ClientDTO::phone` — Telefone.
- `ClientDTO::phoneFormatted` — Telefone formatado.
- `ClientDTO::email` — Email (nullable).
- `ClientDTO::address` — Endereço (nullable).
- `ClientDTO::petsCount` — Quantidade de pets.
- `ClientDTO::createdAt` — Data de cadastro.

##### PetDTO
*Dados de pet para transferência.*
- `PetDTO::id` — ID do pet.
- `PetDTO::clientId` — ID do tutor.
- `PetDTO::name` — Nome do pet.
- `PetDTO::species` — Espécie.
- `PetDTO::breed` — Raça.
- `PetDTO::size` — Porte.
- `PetDTO::coatType` — Tipo de pelagem.
- `PetDTO::aggressiveness` — Nível de agressividade.

##### AppointmentDTO
*Dados de agendamento para transferência.*
- `AppointmentDTO::id` — ID do agendamento.
- `AppointmentDTO::clientId` — ID do cliente.
- `AppointmentDTO::petId` — ID do pet.
- `AppointmentDTO::clientName` — Nome do cliente (denormalizado).
- `AppointmentDTO::petName` — Nome do pet (denormalizado).
- `AppointmentDTO::scheduledAt` — Data/hora agendada.
- `AppointmentDTO::status` — Status atual.
- `AppointmentDTO::services` — Lista de serviços.
- `AppointmentDTO::totalAmount` — Valor total.

##### PaginatedResult
*Resultado paginado genérico.*
- `PaginatedResult::items` — Array de itens.
- `PaginatedResult::total` — Total de registros.
- `PaginatedResult::page` — Página atual.
- `PaginatedResult::perPage` — Itens por página.
- `PaginatedResult::totalPages` — Total de páginas.
- `PaginatedResult::hasNext()` — Verifica se há próxima página.
- `PaginatedResult::hasPrevious()` — Verifica se há página anterior.

---

### Infrastructure Layer

> Implementações concretas, adapters WordPress, persistência e segurança.

#### Container e Bootstrap

##### DPS_Container
*Container de injeção de dependência minimalista.*
- `DPS_Container::get_instance()` — Retorna instância singleton do container.
- `DPS_Container::bind()` — Registra binding de interface para implementação.
- `DPS_Container::singleton()` — Registra binding singleton.
- `DPS_Container::make()` — Resolve e retorna instância de uma classe/interface.
- `DPS_Container::has()` — Verifica se um binding existe.

##### DPS_Bootstrap
*Bootstrap do plugin WordPress.*
- `DPS_Bootstrap::init()` — Inicializa o plugin, registra hooks e carrega dependências.
- `DPS_Bootstrap::register_services()` — Registra serviços no container.
- `DPS_Bootstrap::register_routes()` — Registra rotas REST API.
- `DPS_Bootstrap::register_hooks()` — Registra action e filter hooks.
- `DPS_Bootstrap::activate()` — Executado na ativação do plugin.
- `DPS_Bootstrap::deactivate()` — Executado na desativação do plugin.

#### Event System

##### DPS_Event_Dispatcher
*Sistema de eventos de domínio.*
- `DPS_Event_Dispatcher::get_instance()` — Retorna instância singleton.
- `DPS_Event_Dispatcher::dispatch()` — Dispara um evento para todos os listeners.
- `DPS_Event_Dispatcher::listen()` — Registra um listener para um tipo de evento.
- `DPS_Event_Dispatcher::forget()` — Remove listeners de um evento.

#### Repositories (Implementações)

##### WpdbClientRepository
*Implementação do ClientRepository usando $wpdb.*
- `WpdbClientRepository::findById()` — Busca cliente por ID no banco.
- `WpdbClientRepository::findByPhone()` — Busca cliente por telefone.
- `WpdbClientRepository::findByEmail()` — Busca cliente por email.
- `WpdbClientRepository::save()` — Persiste cliente (INSERT ou UPDATE).
- `WpdbClientRepository::delete()` — Remove cliente do banco.
- `WpdbClientRepository::search()` — Busca com filtros e paginação.
- `WpdbClientRepository::nextId()` — Gera próximo ID (auto-increment ou UUID).

##### WpdbPetRepository
*Implementação do PetRepository usando $wpdb.*
- `WpdbPetRepository::findById()` — Busca pet por ID.
- `WpdbPetRepository::findByClient()` — Lista pets de um cliente.
- `WpdbPetRepository::save()` — Persiste pet.
- `WpdbPetRepository::delete()` — Remove pet.
- `WpdbPetRepository::countByClient()` — Conta pets de um cliente.

##### WpdbAppointmentRepository
*Implementação do AppointmentRepository usando $wpdb.*
- `WpdbAppointmentRepository::findById()` — Busca agendamento por ID.
- `WpdbAppointmentRepository::findByClient()` — Lista por cliente.
- `WpdbAppointmentRepository::findByPet()` — Lista por pet.
- `WpdbAppointmentRepository::findByDateRange()` — Lista por período.
- `WpdbAppointmentRepository::findByStatus()` — Lista por status.
- `WpdbAppointmentRepository::save()` — Persiste agendamento.
- `WpdbAppointmentRepository::delete()` — Remove agendamento.

##### LegacySchemaMap
*Mapeamento de nomes de tabelas/colunas do banco legado.*
- `LegacySchemaMap::getTableName()` — Retorna nome da tabela com prefixo.
- `LegacySchemaMap::getColumnName()` — Retorna nome real da coluna.
- `LegacySchemaMap::getClientsTable()` — Retorna nome da tabela de clientes.
- `LegacySchemaMap::getPetsTable()` — Retorna nome da tabela de pets.
- `LegacySchemaMap::getAppointmentsTable()` — Retorna nome da tabela de agendamentos.

#### REST API v2 Controllers

##### DPS_REST_Clients_Controller
*Controller REST para gestão de clientes.*
- `DPS_REST_Clients_Controller::register_routes()` — Registra rotas /dps/v2/clients.
- `DPS_REST_Clients_Controller::get_items()` — GET /clients — Lista clientes.
- `DPS_REST_Clients_Controller::get_item()` — GET /clients/{id} — Detalhes do cliente.
- `DPS_REST_Clients_Controller::create_item()` — POST /clients — Criar cliente.
- `DPS_REST_Clients_Controller::update_item()` — PUT /clients/{id} — Atualizar cliente.
- `DPS_REST_Clients_Controller::delete_item()` — DELETE /clients/{id} — Remover cliente.
- `DPS_REST_Clients_Controller::get_item_permissions_check()` — Verifica permissões para operações.
- `DPS_REST_Clients_Controller::get_item_schema()` — Retorna schema JSON do cliente.

##### DPS_REST_Pets_Controller
*Controller REST para gestão de pets.*
- `DPS_REST_Pets_Controller::register_routes()` — Registra rotas /dps/v2/clients/{id}/pets e /dps/v2/pets.
- `DPS_REST_Pets_Controller::get_items()` — GET /pets ou /clients/{id}/pets — Lista pets.
- `DPS_REST_Pets_Controller::get_item()` — GET /pets/{id} — Detalhes do pet.
- `DPS_REST_Pets_Controller::create_item()` — POST /clients/{id}/pets — Criar pet.
- `DPS_REST_Pets_Controller::update_item()` — PUT /pets/{id} — Atualizar pet.
- `DPS_REST_Pets_Controller::delete_item()` — DELETE /pets/{id} — Remover pet.

##### DPS_REST_Appointments_Controller
*Controller REST para gestão de agendamentos.*
- `DPS_REST_Appointments_Controller::register_routes()` — Registra rotas /dps/v2/appointments.
- `DPS_REST_Appointments_Controller::get_items()` — GET /appointments — Lista agendamentos.
- `DPS_REST_Appointments_Controller::get_item()` — GET /appointments/{id} — Detalhes.
- `DPS_REST_Appointments_Controller::create_item()` — POST /appointments — Criar agendamento.
- `DPS_REST_Appointments_Controller::update_item()` — PUT /appointments/{id} — Atualizar.
- `DPS_REST_Appointments_Controller::delete_item()` — DELETE /appointments/{id} — Cancelar/remover.
- `DPS_REST_Appointments_Controller::complete_item()` — POST /appointments/{id}/complete — Finalizar.
- `DPS_REST_Appointments_Controller::cancel_item()` — POST /appointments/{id}/cancel — Cancelar.

#### Security (Rate Limiting e Validação)

##### DPS_Rate_Limiter
*Controle de rate limiting para proteção contra abuso.*
- `DPS_Rate_Limiter::check()` — Verifica se requisição está dentro do limite.
- `DPS_Rate_Limiter::hit()` — Registra uma requisição.
- `DPS_Rate_Limiter::remaining()` — Retorna requisições restantes.
- `DPS_Rate_Limiter::clear()` — Limpa contadores de um IP/usuário.

### APIs existentes (classes e métodos públicos)

#### DPS_Addon_Manager
*Gerenciador central de add-ons. Fornece listagem, categorização e verificação de instalação.*
- `DPS_Addon_Manager::get_instance()` — Gerenciador de Add-ons do DPS.
- `DPS_Addon_Manager::get_all_addons()` — Construtor privado para singleton.
- `DPS_Addon_Manager::get_categories()` — Retorna categorias de add-ons com labels traduzidos.
- `DPS_Addon_Manager::get_addons_by_category()` — Retorna add-ons agrupados por categoria.
- `DPS_Addon_Manager::is_installed()` — Verifica se um add-on está instalado (arquivo existe).
- `DPS_Addon_Manager::is_active()` — Verifica se um add-on está ativo.
- `DPS_Addon_Manager::get_addon_file()` — Retorna o caminho completo do arquivo principal do add-on.
- `DPS_Addon_Manager::get_dependents()` — Retorna add-ons que dependem de um determinado add-on.

#### DPS_URL_Builder
*Helper para construção consistente de URLs de edição, exclusão e visualização.*
- `DPS_URL_Builder::build_edit_url()` — Helper class para construção de URLs do painel.
- `DPS_URL_Builder::build_delete_url()` — Constrói URL para excluir um registro com nonce de segurança.
- `DPS_URL_Builder::build_view_url()` — Constrói URL para visualizar detalhes de um registro.
- `DPS_URL_Builder::build_tab_url()` — Constrói URL para uma aba específica.
- `DPS_URL_Builder::build_schedule_url()` — Constrói URL para agendar atendimento para um cliente específico.
- `DPS_URL_Builder::remove_action_params()` — Remove parâmetros de ação da URL.
- `DPS_URL_Builder::safe_get_permalink()` — Safe wrapper for get_permalink() that always returns a string.
- `DPS_URL_Builder::get_clean_current_url()` — Obtém URL base da página atual sem parâmetros de ação.

#### DPS_Cache_Control
*Controle de cache: desabilita cache para páginas com shortcodes DPS, evitando conteúdo desatualizado.*
- `DPS_Cache_Control::init()` — Classe responsável pelo controle de cache das páginas do DPS.
- `DPS_Cache_Control::maybe_disable_cache_by_url_params()` — Desabilita cache baseado em parâmetros de URL específicos do DPS.
- `DPS_Cache_Control::maybe_disable_page_cache()` — Verifica se a página atual contém shortcodes DPS e desabilita cache. Este método é executado no hook 'template_redirect', antes que qualquer output seja enviado ao navegador.
- `DPS_Cache_Control::disable_cache()` — Verifica se o conteúdo da página atual contém shortcodes do DPS.
- `DPS_Cache_Control::send_nocache_headers()` — Envia os headers HTTP de no-cache. Este método é chamado tanto pelo hook 'send_headers' quanto diretamente quando necessário.
- `DPS_Cache_Control::disable_admin_cache()` — Desabilita cache para páginas administrativas do DPS. Garante que todas as páginas admin do DPS não sejam cacheadas, independente de shortcodes.
- `DPS_Cache_Control::force_no_cache()` — Método público para forçar desabilitação de cache.
- `DPS_Cache_Control::register_shortcode()` — Adiciona um shortcode à lista de shortcodes DPS. Permite que add-ons registrem seus próprios shortcodes para desabilitação automática de cache.

#### DPS_CPT_Helper
*Helper para registrar Custom Post Types com opções padronizadas.*
- `DPS_CPT_Helper::register()` — Executa o registro do CPT com argumentos opcionais adicionais.

#### DPS_GitHub_Updater
*Sistema de atualização automática via GitHub Releases.*
- `DPS_GitHub_Updater::get_instance()` — DPS GitHub Updater Classe responsável por verificar e gerenciar atualizações dos plugins DPS diretamente do repositório GitHub.
- `DPS_GitHub_Updater::check_for_updates()` — Construtor privado para singleton.
- `DPS_GitHub_Updater::plugin_info()` — Fornece informações detalhadas do plugin para o popup.
- `DPS_GitHub_Updater::after_install()` — Obtém dados da release mais recente do GitHub.
- `DPS_GitHub_Updater::maybe_force_check()` — Verifica se deve forçar checagem de atualizações. Requer nonce válido para proteção CSRF.
- `DPS_GitHub_Updater::update_notice()` — Exibe aviso sobre atualizações disponíveis.
- `DPS_GitHub_Updater::force_check()` — Método público para forçar verificação de atualizações.
- `DPS_GitHub_Updater::get_managed_plugins()` — Retorna a lista de plugins gerenciados.

#### DPS_Logger
*Sistema centralizado de logs do DPS.*
- `DPS_Logger::log()` — Registra log genérico.
- `DPS_Logger::debug()` — Registra log de debug.
- `DPS_Logger::info()` — Registra log de informação.
- `DPS_Logger::warning()` — Registra log de aviso.
- `DPS_Logger::error()` — Registra log de erro.

#### DPS_Request_Validator
*Validação de requisições, nonces e capabilities.*
- `DPS_Request_Validator::verify_ajax_nonce()` — Verifica nonce para requisições AJAX.
- `DPS_Request_Validator::verify_ajax_admin()` — Verifica nonce e capability para AJAX admin.
- `DPS_Request_Validator::verify_admin_form()` — Verifica nonce de formulário admin (POST).
- `DPS_Request_Validator::get_post_int()` — Obtém e sanitiza valor inteiro do POST.
- `DPS_Request_Validator::get_post_string()` — Obtém e sanitiza string do POST.
- `DPS_Request_Validator::get_post_textarea()` — Obtém e sanitiza textarea do POST.
- `DPS_Request_Validator::get_post_checkbox()` — Obtém valor de checkbox do POST.
- `DPS_Request_Validator::send_json_success()` — Envia resposta JSON de sucesso padronizada.
- `DPS_Request_Validator::send_json_error()` — Envia resposta JSON de erro padronizada.

#### DPS_Client_Helper
*Centraliza acesso a dados de clientes, seguindo o princípio DRY. Suporta tanto CPT dps_client quanto usuários WordPress.*
- `DPS_Client_Helper::get_phone()` — Obtém o número de telefone do cliente.
- `DPS_Client_Helper::get_email()` — Obtém o endereço de email do cliente.
- `DPS_Client_Helper::get_whatsapp()` — Obtém o número WhatsApp do cliente.
- `DPS_Client_Helper::get_name()` — Obtém o nome do cliente.
- `DPS_Client_Helper::get_display_name()` — Obtém o nome do cliente formatado para UI.
- `DPS_Client_Helper::get_address()` — Obtém o endereço completo formatado.
- `DPS_Client_Helper::get_all_data()` — Obtém todos os metadados do cliente de uma só vez.
- `DPS_Client_Helper::has_valid_phone()` — Verifica se o cliente tem um número de telefone válido.
- `DPS_Client_Helper::has_valid_email()` — Verifica se o cliente tem um email válido.
- `DPS_Client_Helper::get_pets()` — Obtém os pets associados ao cliente.
- `DPS_Client_Helper::get_pets_count()` — Obtém a contagem de pets do cliente.
- `DPS_Client_Helper::get_primary_pet()` — Obtém o primeiro pet do cliente.
- `DPS_Client_Helper::format_contact_info()` — Formata informações de contato como HTML.
- `DPS_Client_Helper::get_for_display()` — Obtém dados do cliente formatados e prontos para UI.
- `DPS_Client_Helper::search_by_phone()` — Busca cliente por número de telefone.
- `DPS_Client_Helper::search_by_email()` — Busca cliente por email.

#### DPS_Money_Helper
*Utilitários para conversão e formatação de valores monetários.*
- `DPS_Money_Helper::parse_brazilian_format()` — Converte string em formato brasileiro para centavos.
- `DPS_Money_Helper::format_to_brazilian()` — Formata valor em centavos para string no formato brasileiro.
- `DPS_Money_Helper::format_currency()` — Formata valor em centavos com símbolo de moeda.
- `DPS_Money_Helper::format_currency_from_decimal()` — Formata valor decimal (reais) com símbolo.
- `DPS_Money_Helper::decimal_to_cents()` — Converte valor decimal para centavos.
- `DPS_Money_Helper::cents_to_decimal()` — Converte centavos para valor decimal.
- `DPS_Money_Helper::format_decimal_to_brazilian()` — Formata valor decimal para formato brasileiro.
- `DPS_Money_Helper::is_valid_money_string()` — Valida se string representa valor monetário válido.
- `DPS_Money_Helper::sanitize_post_price_field()` — Sanitiza e converte campo de preço do POST para float.

#### DPS_Query_Helper
*Utilitários para construção de consultas WP_Query padronizadas e eficientes.*
- `DPS_Query_Helper::build_base_query_args()` — Constrói argumentos base para consulta de posts.
- `DPS_Query_Helper::get_all_posts_by_type()` — Obtém todos os posts de um tipo específico.
- `DPS_Query_Helper::get_paginated_posts()` — Obtém posts paginados.
- `DPS_Query_Helper::count_posts_by_type()` — Obtém contagem de posts.

#### DPS_Phone_Helper
*Formatação e validação de números de telefone brasileiros.*
- `DPS_Phone_Helper::format_for_whatsapp()` — Formata número para WhatsApp (formato internacional).
- `DPS_Phone_Helper::format_for_display()` — Formata número para exibição no formato brasileiro.
- `DPS_Phone_Helper::is_valid_brazilian_phone()` — Valida se número é um telefone brasileiro válido.

#### DPS_Message_Helper
*Helper para mensagens/avisos padronizados (ex.: sucesso/erro) em fluxos do DPS (admin e/ou frontend).*
- `DPS_Message_Helper::add_success()` — Adiciona uma mensagem de sucesso (notice) padronizada.
- `DPS_Message_Helper::add_error()` — Adiciona uma mensagem de erro (notice) padronizada.

#### DPS_IP_Helper
*Helper para obtenção segura do IP do visitante/cliente (com validação e fallback).*
- `DPS_IP_Helper::get_ip()` — Retorna o IP do cliente/visitante de forma segura (com validações e fallback).

#### DPS_Admin_Tabs_Helper
*Helper para organização e renderização de abas/tabs no admin do DPS.*
- `DPS_Admin_Tabs_Helper::register_tab()` — Registra uma nova aba.
- `DPS_Admin_Tabs_Helper::get_tabs()` — Retorna todas as abas registradas.
- `DPS_Admin_Tabs_Helper::render_tabs()` — Renderiza navegação de abas.
- `DPS_Admin_Tabs_Helper::get_current_tab()` — Retorna a aba ativa atual.

---

### UI Layer

> Componentes de interface, Design System e recursos de UI.

#### Design System

##### Design Tokens
*Valores padronizados de design para consistência visual.*
- **Cores:** primary, secondary, success, warning, error, neutral
- **Tipografia:** escala de tamanhos (xs, sm, base, lg, xl, 2xl, etc.)
- **Espaçamento:** escala de 4px (1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
- **Raio de borda:** none, sm, md, lg, full
- **Sombras:** sm, md, lg, xl
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px)

#### Componentes Base (React/TS)

##### Button
*Botão reutilizável com variantes e estados.*
- Props: `variant`, `size`, `disabled`, `loading`, `onClick`, `children`
- Variantes: primary, secondary, danger, ghost, link

##### Input
*Campo de entrada de texto.*
- Props: `type`, `label`, `error`, `disabled`, `required`, `placeholder`
- Suporte a máscara (telefone, CPF)

##### Select
*Dropdown de seleção.*
- Props: `options`, `value`, `onChange`, `label`, `error`, `placeholder`

##### DataTable
*Tabela de dados com recursos avançados.*
- Props: `data`, `columns`, `pagination`, `sortable`, `searchable`, `onRowClick`
- Features: paginação, ordenação, filtro, seleção de linhas

##### Modal / Dialog
*Janela modal para confirmações e formulários.*
- Props: `open`, `onClose`, `title`, `size`, `children`

##### Toast / Notification
*Notificações temporárias.*
- Tipos: success, error, warning, info
- Posições configuráveis

##### Form Components
*Componentes de formulário específicos.*
- PhoneInput: Campo de telefone com máscara brasileira
- MoneyInput: Campo de valor monetário
- DatePicker: Seletor de data
- SearchInput: Campo de busca com debounce

#### Admin Pages (React/TS)

##### ClientsPage
*Página de listagem e gestão de clientes.*
- Listagem com DataTable
- Busca por nome/telefone
- Ações: criar, editar, ver detalhes

##### ClientFormPage
*Formulário de criação/edição de cliente.*
- Campos validados
- Vinculação de pets
- Histórico de atendimentos

##### PetsPage
*Página de listagem de pets.*
- Filtros por porte, espécie
- Visualização por cliente

##### AppointmentsPage
*Página de agendamentos.*
- Visualização em calendário e lista
- Filtros por status, data
- Criação rápida

##### DashboardPage
*Dashboard principal do admin.*
- Resumo do dia
- Próximos atendimentos
- Alertas e notificações

---

## Client Portal Add-on

### Funções globais

- `dps_get_portal_page_url()` — Obtém a URL da página do Portal do Cliente.
- `dps_get_portal_page_id()` — Obtém o ID da página do Portal do Cliente.
- `dps_get_page_by_title_compat()` — Busca uma página pelo título de forma compatível com WordPress 6.2+.
- `dps_get_tosa_consent_page_url()` — Obtém a URL da página de Consentimento de Tosa com Máquina.
- `dps_portal_assert_client_owns_resource()` — Valida se um recurso pertence ao cliente autenticado.

### APIs (classes e métodos públicos)

#### DPS_Portal_Session_Manager
*Gerenciamento de sessões autenticadas de clientes.*
- `DPS_Portal_Session_Manager::get_instance()` — Gerenciador de sessões do Portal do Cliente Esta classe gerencia a autenticação e sessão dos clientes no portal, independente do sistema de usuários do WordPress.
- `DPS_Portal_Session_Manager::authenticate_client()` — Construtor privado para singleton
- `DPS_Portal_Session_Manager::get_authenticated_client_id()` — Retorna o ID do cliente autenticado
- `DPS_Portal_Session_Manager::is_authenticated()` — Verifica se há um cliente autenticado
- `DPS_Portal_Session_Manager::validate_session()` — Valida a sessão atual Remove sessões expiradas ou inválidas
- `DPS_Portal_Session_Manager::logout()` — Faz logout do cliente

#### DPS_Portal_Token_Manager
*Geração e validação de tokens de acesso único (Magic Links).*
- `DPS_Portal_Token_Manager::get_instance()` — Retorna instância singleton do gerenciador de tokens.
- `DPS_Portal_Token_Manager::maybe_create_table()` — Cria a tabela de tokens (wp_petos_portal_tokens) se não existir.
- `DPS_Portal_Token_Manager::generate_token()` — Gera novo token de acesso único com expiração configurável.
- `DPS_Portal_Token_Manager::validate_token()` — Valida um token e retorna dados do cliente se válido. Implementa rate limiting para prevenir brute force (5 tentativas/hora por IP), cache negativo de tokens inválidos (5 min), e logging de tentativas para auditoria.
- `DPS_Portal_Token_Manager::mark_as_used()` — Marca token como usado após autenticação bem-sucedida.
- `DPS_Portal_Token_Manager::revoke_tokens()` — Revoga todos os tokens ativos de um cliente.
- `DPS_Portal_Token_Manager::cleanup_expired()` — Remove tokens expirados do banco (executado via cron).

> **Nota sobre Repositories:** Os repositories do Portal (`DPS_Client_Repository`, `DPS_Pet_Repository`, `DPS_Appointment_Repository`, `DPS_Finance_Repository`) utilizam internamente as implementações do Core (`WpdbClientRepository`, `WpdbPetRepository`, `WpdbAppointmentRepository`). Eles são mantidos como facades para compatibilidade, delegando para o Core.

#### DPS_Portal_Client_Facade
*Facade para acesso a dados de clientes no contexto do Portal. Delega para WpdbClientRepository do Core.*
- `DPS_Portal_Client_Facade::get_instance()` — Retorna instância singleton.
- `DPS_Portal_Client_Facade::get_client_by_id()` — Busca cliente por ID.
- `DPS_Portal_Client_Facade::get_client_by_email()` — Busca cliente por email.
- `DPS_Portal_Client_Facade::get_client_by_phone()` — Busca cliente por telefone.

#### DPS_Portal_Pet_Facade
*Facade para acesso a dados de pets no contexto do Portal. Delega para WpdbPetRepository do Core.*
- `DPS_Portal_Pet_Facade::get_instance()` — Retorna instância singleton.
- `DPS_Portal_Pet_Facade::get_pet()` — Busca pet por ID.
- `DPS_Portal_Pet_Facade::get_pets_by_client()` — Busca todos os pets de um cliente.
- `DPS_Portal_Pet_Facade::pet_belongs_to_client()` — Verifica se um pet pertence a um cliente.

#### DPS_Portal_Appointment_Facade
*Facade para acesso a agendamentos no contexto do Portal.*
- `DPS_Portal_Appointment_Facade::get_instance()` — Retorna instância singleton.
- `DPS_Portal_Appointment_Facade::get_upcoming()` — Lista próximos agendamentos do cliente.
- `DPS_Portal_Appointment_Facade::get_history()` — Lista histórico de agendamentos.
- `DPS_Portal_Appointment_Facade::get_by_id()` — Busca agendamento específico com validação de propriedade.

#### DPS_Portal_REST_Controller
*Controller REST específico do Portal do Cliente.*
- `DPS_Portal_REST_Controller::register_routes()` — Registra rotas /dps/v2/portal/*.
- `DPS_Portal_REST_Controller::request_magic_link()` — POST /portal/request-link — Solicita magic link.
- `DPS_Portal_REST_Controller::validate_token()` — POST /portal/validate — Valida token e inicia sessão.
- `DPS_Portal_REST_Controller::get_session()` — GET /portal/session — Retorna dados da sessão atual.
- `DPS_Portal_REST_Controller::get_summary()` — GET /portal/summary — Retorna resumo do cliente (pets, próximos atendimentos).
- `DPS_Portal_REST_Controller::logout()` — POST /portal/logout — Encerra sessão.

## Communications Add-on

### APIs (classes e métodos públicos)

#### DPS_Communications_API
*API principal para envio de comunicações. Interface única para WhatsApp, Email e SMS.*
- `DPS_Communications_API::get_instance()` — API centralizada de comunicações Esta classe centraliza toda a lógica de envio de comunicações (WhatsApp, e-mail, SMS) no sistema DPS.
- `DPS_Communications_API::get_last_error()` — Construtor privado (singleton)
- `DPS_Communications_API::send_whatsapp()` — Registra log de forma segura, verificando disponibilidade do DPS_Logger.
- `DPS_Communications_API::send_email()` — Envia e-mail Método central para envio de e-mails no sistema.
- `DPS_Communications_API::send_appointment_reminder()` — Envia lembrete de agendamento Método específico para envio de lembretes de agendamentos. Busca dados do agendamento e usa template configurado.
- `DPS_Communications_API::send_payment_notification()` — Envia notificação de pagamento

#### DPS_Communications_History
*Gerenciamento de histórico: rastreamento e consulta de mensagens enviadas.*
- `DPS_Communications_History::get_instance()` — Gerenciador de histórico de comunicações Esta classe gerencia a tabela de histórico de comunicações, registrando todas as mensagens enviadas (WhatsApp, e-mail, SMS).
- `DPS_Communications_History::get_table_name()` — Construtor
- `DPS_Communications_History::table_exists()` — Verifica se a tabela existe
- `DPS_Communications_History::maybe_create_table()` — Cria ou atualiza a tabela de histórico
- `DPS_Communications_History::log_communication()` — Registra uma nova comunicação no histórico
- `DPS_Communications_History::update_status()` — Atualiza o status de uma comunicação

#### DPS_Communications_Retry
*Sistema de retry automático para mensagens que falharam.*
- `DPS_Communications_Retry::get_instance()` — Gerenciador de retry com exponential backoff Esta classe implementa lógica de retry com exponential backoff para falhas de envio de comunicações.
- `DPS_Communications_Retry::schedule_retry()` — Construtor
- `DPS_Communications_Retry::process_retry()` — Processa o retry de uma comunicação
- `DPS_Communications_Retry::cleanup_expired_retries()` — Calcula o delay do backoff exponencial com jitter
- `DPS_Communications_Retry::get_stats()` — Obtém estatísticas de retries

#### DPS_Communications_Webhook
*Webhooks para receber confirmações de status de mensagens.*
- `DPS_Communications_Webhook::get_instance()` — Gerenciador de webhooks de status de entrega Esta classe gerencia webhooks recebidos de gateways de comunicação para atualizar o status de entrega das mensagens.
- `DPS_Communications_Webhook::maybe_generate_secret()` — Construtor
- `DPS_Communications_Webhook::get_secret()` — Obtém o secret do webhook
- `DPS_Communications_Webhook::get_webhook_url()` — Obtém a URL do webhook
- `DPS_Communications_Webhook::register_routes()` — Registra rotas REST
- `DPS_Communications_Webhook::verify_webhook()` — Verifica autenticidade do webhook

#### DPS_WhatsApp_Helper
*Geração de links e mensagens padronizadas para WhatsApp.*
- `DPS_WhatsApp_Helper::get_link_to_team()` — Gera link WhatsApp para cliente enviar mensagem à equipe.
- `DPS_WhatsApp_Helper::get_link_to_client()` — Gera link WhatsApp para equipe enviar mensagem ao cliente.
- `DPS_WhatsApp_Helper::get_portal_access_request_message()` — Gera mensagem padrão para cliente solicitar acesso ao portal.
- `DPS_WhatsApp_Helper::get_portal_link_message()` — Gera mensagem padrão para envio de link do portal ao cliente.
- `DPS_WhatsApp_Helper::get_appointment_confirmation_message()` — Gera mensagem de confirmação de agendamento.
- `DPS_WhatsApp_Helper::get_payment_request_message()` — Gera mensagem de cobrança.

## Finance Add-on

### APIs (classes e métodos públicos)

#### DPS_Finance_API
*API principal: criação/atualização de cobranças, marcação de pagamentos, consultas.*
- `DPS_Finance_API::create_or_update_charge()` — API Financeira Centralizada do DPS Fornece interface pública para operações financeiras, centralizando toda a lógica de criação, atualização e consulta de cobranças/transações.
- `DPS_Finance_API::mark_as_paid()` — Disparado após atualizar uma cobrança existente.
- `DPS_Finance_API::mark_as_pending()` — Disparado quando uma cobrança é marcada como paga. Hook mantido para compatibilidade com Loyalty e outros add-ons.
- `DPS_Finance_API::mark_as_cancelled()` — Marcar cobrança como cancelada.
- `DPS_Finance_API::get_charge()` — Buscar dados de uma cobrança.
- `DPS_Finance_API::get_charges_by_appointment()` — Buscar todas as cobranças de um agendamento.
- `DPS_Finance_API::delete_charges_by_appointment()` — Remover todas as cobranças de um agendamento. Usado quando agendamento é excluído. Remove também parcelas vinculadas.

#### DPS_Finance_Audit
*Auditoria: rastreamento de alterações em transações financeiras.*
- `DPS_Finance_Audit::init()` — Gerencia auditoria de alterações financeiras.
- `DPS_Finance_Audit::log_event()` — Registra evento de auditoria.
- `DPS_Finance_Audit::get_logs()` — Obtém IP do cliente de forma segura.
- `DPS_Finance_Audit::count_logs()` — Conta total de logs de auditoria.
- `DPS_Finance_Audit::register_audit_page()` — Registra página de auditoria no menu admin.
- `DPS_Finance_Audit::render_audit_page()` — Renderiza página de auditoria.

#### DPS_Finance_Reminders
*Sistema de lembretes automáticos para pagamentos pendentes.*
- `DPS_Finance_Reminders::init()` — Gerencia lembretes automáticos de pagamento.
- `DPS_Finance_Reminders::clear_scheduled_hook()` — Limpa evento cron agendado.
- `DPS_Finance_Reminders::process_reminders()` — Processa lembretes de pagamento (executado diariamente via cron).
- `DPS_Finance_Reminders::is_enabled()` — Envia lembretes ANTES do vencimento.
- `DPS_Finance_Reminders::render_settings_section()` — Renderiza seção de configurações de lembretes.
- `DPS_Finance_Reminders::save_settings()` — Salva configurações de lembretes.

#### DPS_Finance_Revenue_Query
*Consultas otimizadas de receita e métricas financeiras.*
- `DPS_Finance_Revenue_Query::sum_by_period()` — Helper para consultar faturamento a partir de metas históricas.

## Loyalty Add-on

### APIs (classes e métodos públicos)

#### DPS_Loyalty_API
*API pública do sistema de fidelidade.*
- `DPS_Loyalty_API::add_points()` — Adiciona pontos ao cliente.
- `DPS_Loyalty_API::get_points()` — Obtém saldo de pontos do cliente.
- `DPS_Loyalty_API::redeem_points()` — Resgata pontos do cliente.
- `DPS_Loyalty_API::add_credit()` — Adiciona crédito ao cliente (em centavos).
- `DPS_Loyalty_API::get_credit()` — Obtém saldo de crédito do cliente (em centavos).
- `DPS_Loyalty_API::use_credit()` — Usa crédito do cliente.
- `DPS_Loyalty_API::get_referral_code()` — Obtém código de indicação do cliente.
- `DPS_Loyalty_API::get_referral_url()` — Obtém URL de indicação do cliente.
- `DPS_Loyalty_API::get_loyalty_tier()` — Obtém nível de fidelidade do cliente.
- `DPS_Loyalty_API::get_top_clients()` — Obtém ranking dos melhores clientes.

#### DPS_Loyalty_Achievements
*API de conquistas/achievements do programa de fidelidade (regras e premiações).*
- *(Sem métodos públicos listados no documento de referência.)*

## Push Add-on

### APIs (classes e métodos públicos)

#### DPS_Push_API
*API de push notifications usando Web Push Protocol (VAPID).*
- `DPS_Push_API::get_instance()` — Retorna instância singleton da API de Push.
- `DPS_Push_API::generate_vapid_keys()` — Gera par de chaves VAPID para Web Push.
- `DPS_Push_API::get_vapid_public_key()` — Retorna a chave pública VAPID para uso no frontend.
- `DPS_Push_API::send_to_user()` — Envia notificação push para um usuário específico.
- `DPS_Push_API::send_to_all_admins()` — Envia notificação para todos os administradores.
- `DPS_Push_API::send_to_subscribers()` — Envia notificação para lista de subscribers.
- `DPS_Push_API::subscribe()` — Registra nova subscription de push.
- `DPS_Push_API::unsubscribe()` — Remove subscription de push.

#### DPS_Push_Subscription_Manager
*Gerenciamento de subscriptions de push notifications.*
- `DPS_Push_Subscription_Manager::get_instance()` — Retorna instância singleton.
- `DPS_Push_Subscription_Manager::save_subscription()` — Salva uma nova subscription.
- `DPS_Push_Subscription_Manager::get_subscriptions_by_user()` — Lista subscriptions de um usuário.
- `DPS_Push_Subscription_Manager::delete_subscription()` — Remove subscription.
- `DPS_Push_Subscription_Manager::cleanup_expired()` — Remove subscriptions expiradas ou inválidas.

#### DPS_Email_Reports
*Geração e envio de relatórios por e-mail (ex.: para admin ou rotinas).*
- `DPS_Email_Reports::get_instance()` — Retorna instância singleton.
- `DPS_Email_Reports::generate_daily_report()` — Gera relatório diário de atendimentos.
- `DPS_Email_Reports::generate_weekly_report()` — Gera relatório semanal.
- `DPS_Email_Reports::generate_monthly_report()` — Gera relatório mensal.
- `DPS_Email_Reports::send_report()` — Envia relatório por email para destinatários configurados.
- `DPS_Email_Reports::schedule_reports()` — Agenda envio automático de relatórios via cron.

## AI Add-on

### Funções globais

- `dps_ai_log()` — Logger genérico do AI Add-on com escolha de nível e contexto (não detalhado no documento).
- `dps_ai_log_debug()` — Logger condicional para o AI Add-on.
- `dps_ai_log_info()` — Registra uma mensagem informativa. Útil para eventos normais do sistema que valem documentação. Não é registrado em produção (a menos que debug_logging esteja habilitado).
- `dps_ai_log_warning()` — Registra uma mensagem de aviso. Indica situações anormais que não são necessariamente erros. Não é registrado em produção (a menos que debug_logging esteja habilitado).
- `dps_ai_log_error()` — Registra uma mensagem de erro. Indica falhas críticas que requerem atenção. Sempre é registrado, mesmo em produção.
- `dps_ai_log_conversation()` — Registra mensagens de uma conversa (role + conteúdo) vinculadas a um ID de conversa (não detalhado no documento).

### APIs (classes e métodos públicos)

#### DPS_AI_Assistant
*Assistente principal: processamento de mensagens e geração de respostas.*
- `DPS_AI_Assistant::answer_portal_question()` — Assistente de IA do DPS. Este arquivo contém a classe responsável por todas as regras de negócio da IA, incluindo o system prompt restritivo e a montagem de contexto.
- `DPS_AI_Assistant::get_base_system_prompt()` — Verifica se a pergunta contém palavras-chave do contexto permitido.
- `DPS_AI_Assistant::get_base_system_prompt_with_language()` — Retorna o prompt base do sistema com instrução de idioma. Adiciona instrução explícita para que a IA responda no idioma configurado.
- `DPS_AI_Assistant::invalidate_context_cache()` — Obtém contexto do cliente com cache via Transients. Cacheia o contexto por 5 minutos para evitar reconstrução repetitiva a cada pergunta do mesmo cliente.

#### DPS_AI_Knowledge_Base
*Base de conhecimento: busca semântica e contextual.*
- `DPS_AI_Knowledge_Base::get_instance()` — Base de Conhecimento do AI Add-on. Gerencia artigos e FAQs que são incluídos no contexto da IA para respostas mais precisas e personalizadas.
- `DPS_AI_Knowledge_Base::register_post_type()` — Construtor privado.
- `DPS_AI_Knowledge_Base::register_taxonomy()` — Registra a taxonomia de categorias.
- `DPS_AI_Knowledge_Base::add_meta_boxes()` — Cria termos padrão da taxonomia. Chamado apenas uma vez durante a primeira inicialização.

#### DPS_AI_Client
*Cliente HTTP para consumo de provedores de IA (ex.: OpenAI) com autenticação, retries e timeouts.*
- *(Sem métodos públicos listados no documento de referência.)*

## Agenda Add-on

### APIs (classes e métodos públicos)

#### DPS_Agenda_Capacity_Helper
*Gerenciamento de capacidade: slots disponíveis por período.*
- `DPS_Agenda_Capacity_Helper::get_default_capacity_config()` — Helper para gerenciamento de capacidade e lotação da AGENDA.
- `DPS_Agenda_Capacity_Helper::get_capacity_config()` — Obtém a configuração de capacidade atual.
- `DPS_Agenda_Capacity_Helper::save_capacity_config()` — Salva a configuração de capacidade.
- `DPS_Agenda_Capacity_Helper::get_capacity_for_period()` — Retorna a capacidade para um slot específico.
- `DPS_Agenda_Capacity_Helper::get_period_from_time()` — Determina o período (morning/afternoon) baseado em um horário.
- `DPS_Agenda_Capacity_Helper::get_capacity_heatmap_data()` — Retorna dados de heatmap de capacidade para um intervalo de datas.

#### DPS_Agenda_GPS_Helper
*Funcionalidades GPS: cálculo de rotas e distâncias.*
- `DPS_Agenda_GPS_Helper::get_shop_address()` — Helper para geração de rotas GPS na AGENDA. Centraliza a lógica de construção de URLs do Google Maps para rotas, SEMPRE do endereço do Banho e Tosa até o endereço do cliente.
- `DPS_Agenda_GPS_Helper::get_client_address()` — Retorna o endereço do cliente de um agendamento.
- `DPS_Agenda_GPS_Helper::get_route_url()` — Monta a URL de rota do Google Maps. IMPORTANTE: SEMPRE monta a rota do Banho e Tosa até o cliente. Não implementa o trajeto inverso nesta fase.
- `DPS_Agenda_GPS_Helper::render_route_button()` — Renderiza botão "Abrir rota" se houver dados suficientes.
- `DPS_Agenda_GPS_Helper::render_map_link()` — Renderiza link de mapa simples (apenas destino, sem rota). Mantido para compatibilidade com o código existente.
- `DPS_Agenda_GPS_Helper::is_shop_address_configured()` — Verifica se a configuração de endereço da loja está definida.

#### DPS_Agenda_Payment_Helper
*Helper para processar pagamentos de agendamentos.*
- `DPS_Agenda_Payment_Helper::get_payment_status()` — Helper para consolidar status de pagamento na AGENDA. Centraliza a lógica de obtenção de status de pagamento, evitando duplicação de código entre diferentes componentes da agenda.
- `DPS_Agenda_Payment_Helper::get_payment_badge_config()` — Retorna a configuração de badge para um status de pagamento.
- `DPS_Agenda_Payment_Helper::get_payment_details()` — Retorna detalhes de pagamento para tooltip/popover.
- `DPS_Agenda_Payment_Helper::render_payment_badge()` — Renderiza badge de status de pagamento.
- `DPS_Agenda_Payment_Helper::render_payment_tooltip()` — Renderiza tooltip com detalhes de pagamento.
- `DPS_Agenda_Payment_Helper::render_resend_button()` — Renderiza botão "Reenviar link de pagamento" se aplicável.

## Stats Add-on

### APIs (classes e métodos públicos)

#### DPS_Stats_API
*API de estatísticas: métricas de agendamentos, receita e performance.*
- `DPS_Stats_API::bump_cache_version()` — API pública do Stats Add-on Centraliza toda a lógica de estatísticas e métricas para reutilização por outros add-ons e facilitar manutenção.
- `DPS_Stats_API::get_appointments_count()` — Obtém contagem de atendimentos no período.
- `DPS_Stats_API::get_revenue_total()` — Obtém total de receitas pagas no período.
- `DPS_Stats_API::get_expenses_total()` — Obtém total de despesas pagas no período.
- `DPS_Stats_API::get_financial_totals()` — Obtém totais financeiros do período (receita e despesas).
- `DPS_Stats_API::get_inactive_pets()` — Obtém pets inativos (sem atendimento há X dias).
- `DPS_Stats_API::get_top_services()` — Obtém serviços mais solicitados no período.
- `DPS_Stats_API::get_period_comparison()` — Calcula comparativo entre período atual e período anterior.

## Services Add-on

### APIs (classes e métodos públicos)

#### DPS_Services_API
*API de serviços: CRUD e consulta de serviços disponíveis.*
- `DPS_Services_API::get_service()` — API pública do Services Add-on Centraliza toda a lógica de serviços, cálculo de preços e informações detalhadas para reutilização por outros add-ons (Agenda, Finance, Portal, etc.)
- `DPS_Services_API::calculate_price()` — Calcula o preço de um serviço com base no porte do pet.
- `DPS_Services_API::calculate_appointment_total()` — Calcula o total de um agendamento com base nos serviços e pets selecionados.
- `DPS_Services_API::get_services_details()` — Obtém detalhes de serviços de um agendamento. Estrutura retornada: [ 'services' => [ ['name' => string, 'price' => float], ... ], 'total' => float, ]
- `DPS_Services_API::calculate_package_price()` — Normaliza o porte do pet para formato padrão.
- `DPS_Services_API::get_price_history()` — Obtém o histórico de alterações de preço de um serviço.

## Backup Add-on

### APIs (classes e métodos públicos)

#### DPS_Backup_Addon
*Classe principal de gerenciamento; registra menus, renderiza interface administrativa, processa formulários e requisições AJAX.*
- `DPS_Backup_Addon::get_instance()` — Retorna a instância singleton do add-on.
- `DPS_Backup_Addon::register_admin_menu()` — Registra o submenu "Backup" no admin do WordPress sob o menu principal "desi.pet by PRObst".
- `DPS_Backup_Addon::enqueue_admin_assets()` — Enfileira CSS e JavaScript para a página de backup no admin.
- `DPS_Backup_Addon::render_admin_page()` — Renderiza a página principal de backup e restauração no admin, incluindo configurações, botões de ação e histórico.
- `DPS_Backup_Addon::handle_save_settings()` — Processa o formulário de configurações de agendamento de backup.
- `DPS_Backup_Addon::handle_export()` — Processa a requisição de exportação manual de backup (download JSON).
- `DPS_Backup_Addon::handle_import()` — Processa o upload e restauração de arquivo de backup.
- `DPS_Backup_Addon::ajax_compare_backup()` — Endpoint AJAX para comparar backup com dados atuais.
- `DPS_Backup_Addon::ajax_delete_backup()` — Endpoint AJAX para deletar backup do histórico.
- `DPS_Backup_Addon::ajax_download_backup()` — Endpoint AJAX para baixar backup do histórico.
- `DPS_Backup_Addon::ajax_restore_from_history()` — Endpoint AJAX para restaurar backup do histórico.

#### DPS_Backup_Exporter
*Exportador de dados em formatos completo, seletivo ou diferencial.*
- `DPS_Backup_Exporter::build_complete_backup()` — Cria backup completo de todos os componentes disponíveis.
- `DPS_Backup_Exporter::build_selective_backup()` — Cria backup seletivo com componentes especificados.
- `DPS_Backup_Exporter::build_differential_backup()` — Cria backup diferencial desde uma data específica (apenas registros modificados).
- `DPS_Backup_Exporter::export_transactions()` — Exporta transações financeiras com validação de relacionamentos.
- `DPS_Backup_Exporter::get_component_counts()` — Retorna contagem de registros para todos os componentes disponíveis.

#### DPS_Backup_History
*Gerencia registros de histórico de backups e armazenamento de arquivos.*
- `DPS_Backup_History::get_history()` — Recupera histórico de backups, ordenado do mais recente para o mais antigo.
- `DPS_Backup_History::add_entry()` — Adiciona nova entrada ao histórico, aplicando retenção automática.
- `DPS_Backup_History::remove_entry()` — Remove backup do histórico e deleta o arquivo.
- `DPS_Backup_History::save_backup_file()` — Salva conteúdo JSON do backup no disco com segurança.
- `DPS_Backup_History::format_size()` — Formata bytes para formato legível (KB, MB, GB).

#### DPS_Backup_Scheduler
*Gerencia agendamento automático de backups via WordPress cron.*
- `DPS_Backup_Scheduler::init()` — Inicializa hooks e filtros do agendador.
- `DPS_Backup_Scheduler::schedule()` — Agenda backup automático baseado nas configurações.
- `DPS_Backup_Scheduler::is_scheduled()` — Verifica se backup está agendado.
- `DPS_Backup_Scheduler::get_next_run()` — Retorna timestamp da próxima execução agendada.

#### DPS_Backup_Comparator
*Compara dados de backup com estado atual do sistema.*
- `DPS_Backup_Comparator::compare()` — Compara backup com dados atuais, retorna comparação detalhada.
- `DPS_Backup_Comparator::format_summary()` — Formata comparação como tabela HTML com avisos.

#### DPS_Backup_Settings
*Gerencia configurações de operações de backup.*
- `DPS_Backup_Settings::get_all()` — Recupera todas as configurações com defaults mesclados.
- `DPS_Backup_Settings::get()` — Obtém valor de uma configuração específica.
- `DPS_Backup_Settings::set()` — Define valor de uma configuração.
- `DPS_Backup_Settings::get_available_components()` — Retorna componentes disponíveis para backup.
- `DPS_Backup_Settings::get_retention_days()` — Retorna número de dias para retenção de backups.
- `DPS_Backup_Settings::get_schedule_frequency()` — Retorna frequência de backup agendado (daily, weekly, monthly).

## Booking Add-on

### Funções globais

- `dps_booking_check_base_plugin()` — Verifica se o plugin base está ativo; exibe aviso de erro se ausente.
- `dps_booking_load_textdomain()` — Carrega arquivos de tradução para o add-on de booking.
- `dps_booking_init_addon()` — Inicializa a instância singleton do Booking Add-on.

### APIs (classes e métodos públicos)

#### DPS_Booking_Addon
*Classe principal fornecendo página dedicada de agendamento com mesma funcionalidade do Painel de Gestão DPS.*
- `DPS_Booking_Addon::get_instance()` — Retorna instância singleton do add-on.
- `DPS_Booking_Addon::activate()` — Cria página de agendamento na ativação do plugin.
- `DPS_Booking_Addon::enqueue_assets()` — Enfileira CSS/JS para página de agendamento; carrega apenas na página de booking ou onde o shortcode existe.
- `DPS_Booking_Addon::render_booking_form()` — Renderiza formulário completo de agendamento com verificações de permissão.
- `DPS_Booking_Addon::capture_saved_appointment()` — Captura dados de agendamento salvo e armazena em transient para exibição de confirmação.

## Groomers Add-on

### APIs (classes e métodos públicos)

#### DPS_Groomers_Addon
*Classe principal do add-on gerenciando perfis de staff, portal via shortcodes, avaliações e comissões.*
- `DPS_Groomers_Addon::get_instance()` — Recupera instância singleton do add-on.
- `DPS_Groomers_Addon::get_portal_page_url()` — Retorna URL da página do portal de tosadores.
- `DPS_Groomers_Addon::render_groomer_portal_shortcode()` — Renderiza shortcode [dps_groomer_portal] com dashboard, agenda e abas de avaliações.
- `DPS_Groomers_Addon::render_groomer_dashboard_shortcode()` — Renderiza shortcode [dps_groomer_dashboard] com stats e gráficos de desempenho.
- `DPS_Groomers_Addon::render_groomer_agenda_shortcode()` — Renderiza shortcode [dps_groomer_agenda] com calendário de agendamentos do tosador.
- `DPS_Groomers_Addon::generate_staff_commission()` — Gera automaticamente comissões de staff quando pagamento é confirmado; divide proporcionalmente entre staff vinculado.
- `DPS_Groomers_Addon::get_groomer_rating()` — Retorna avaliação média do tosador e contagem total de avaliações.
- `DPS_Groomers_Addon::get_staff_types()` — Retorna tipos de staff disponíveis com traduções.
- `DPS_Groomers_Addon::activate()` — Adiciona role dps_groomer na ativação do plugin.

#### DPS_Groomer_Session_Manager
*Gerencia autenticação e sessões do portal de tosadores via magic links sem login tradicional.*
- `DPS_Groomer_Session_Manager::get_instance()` — Recupera a instância singleton do gerenciador de sessões.
- `DPS_Groomer_Session_Manager::authenticate_groomer()` — Autentica um tosador, retorna true em caso de sucesso; valida role do usuário e regenera session ID.
- `DPS_Groomer_Session_Manager::get_authenticated_groomer_id()` — Retorna ID do tosador autenticado ou 0 se não autenticado.
- `DPS_Groomer_Session_Manager::is_groomer_authenticated()` — Verifica se algum tosador está atualmente autenticado.
- `DPS_Groomer_Session_Manager::validate_session()` — Valida expiração da sessão atual (tempo de vida de 24h).
- `DPS_Groomer_Session_Manager::logout()` — Limpa dados de sessão do tosador.
- `DPS_Groomer_Session_Manager::get_logout_url()` — Gera URL de logout com nonce e parâmetro de redirecionamento opcional.
- `DPS_Groomer_Session_Manager::get_authenticated_groomer()` — Retorna objeto WP_User do tosador autenticado ou false.

#### DPS_Groomer_Token_Manager
*Gerencia geração, validação, revogação e limpeza de tokens de magic link para acesso ao portal.*
- `DPS_Groomer_Token_Manager::get_instance()` — Recupera a instância singleton do gerenciador de tokens.
- `DPS_Groomer_Token_Manager::generate_token()` — Gera novo token de acesso; retorna token em texto plano ou false em caso de erro.
- `DPS_Groomer_Token_Manager::validate_token()` — Valida token e retorna dados se válido; verifica expiração, uso e status de revogação.
- `DPS_Groomer_Token_Manager::revoke_tokens()` — Revoga todos os tokens ativos de um tosador; retorna contagem de revogados ou false em erro.
- `DPS_Groomer_Token_Manager::get_groomer_stats()` — Retorna estatísticas de tokens: total_generated, total_used, active_tokens, last_used_at.
- `DPS_Groomer_Token_Manager::get_active_tokens()` — Lista todos os tokens ativos de um tosador com ID, tipo, datas e IP.

## Payment Add-on

### APIs (classes e métodos públicos)

#### DPS_Payment_Addon
*Gerenciador principal de integração MercadoPago: geração de links, webhooks e injeção de informações de pagamento em mensagens.*
- `DPS_Payment_Addon::get_instance()` — Recupera instância singleton do add-on de pagamentos.
- `DPS_Payment_Addon::enqueue_admin_assets()` — Enfileira CSS e JavaScript na página de configurações de pagamento.
- `DPS_Payment_Addon::register_settings()` — Registra configurações WordPress para access token, chave PIX e webhook secret com callbacks de sanitização.
- `DPS_Payment_Addon::sanitize_access_token()` — Sanitiza access token do MercadoPago - remove espaços e caracteres inválidos.
- `DPS_Payment_Addon::sanitize_webhook_secret()` — Sanitiza webhook secret - remove caracteres de controle mas permite especiais para senhas fortes.
- `DPS_Payment_Addon::add_settings_page()` — Adiciona página de configurações no submenu "desi.pet by PRObst".
- `DPS_Payment_Addon::render_settings_page()` — Renderiza página completa de configurações de pagamento com indicador de status.
- `DPS_Payment_Addon::maybe_generate_payment_link()` — Gera link de pagamento para agendamentos finalizados e armazena como post meta.
- `DPS_Payment_Addon::inject_payment_link_in_message()` — Filtro que injeta link de pagamento e informações PIX em mensagens WhatsApp.
- `DPS_Payment_Addon::maybe_handle_mp_notification()` — Processa notificações/webhooks do MercadoPago.

#### DPS_MercadoPago_Config
*Gerencia credenciais seguras do MercadoPago com sistema de fallback prioritário (constantes → opções do banco).*
- `DPS_MercadoPago_Config::get_access_token()` — Recupera access token do MercadoPago.
- `DPS_MercadoPago_Config::get_public_key()` — Recupera public key do MercadoPago.
- `DPS_MercadoPago_Config::get_webhook_secret()` — Recupera webhook secret para validação.
- `DPS_MercadoPago_Config::is_access_token_from_constant()` — Verifica se access token é definido via constante DPS_MERCADOPAGO_ACCESS_TOKEN.
- `DPS_MercadoPago_Config::get_masked_credential()` — Retorna credencial mascarada para exibição segura na UI.
- `DPS_MercadoPago_Config::is_configured()` — Verifica se as credenciais estão configuradas.
- `DPS_MercadoPago_Config::validate_credentials()` — Valida credenciais fazendo requisição de teste à API.

## Registration Add-on

### Funções globais

- `dps_registration_check_base_plugin()` — Verifica se o plugin base DPS está ativo; exibe aviso administrativo se ausente.
- `dps_registration_load_textdomain()` — Carrega domínio de tradução do plugin para localização.

### APIs (classes e métodos públicos)

#### DPS_Registration_Addon
*Classe principal gerenciando formulário de registro de clientes/pets, confirmação por email, API endpoints e configurações.*
- `DPS_Registration_Addon::get_instance()` — Retorna instância singleton do add-on.
- `DPS_Registration_Addon::deactivate()` — Limpeza na desativação do plugin.
- `DPS_Registration_Addon::activate()` — Cria página de registro na ativação do plugin.
- `DPS_Registration_Addon::register_settings()` — Registra configurações WordPress para configuração do plugin.
- `DPS_Registration_Addon::render_settings_page()` — Renderiza página de configurações no admin.
- `DPS_Registration_Addon::render_pending_clients_page()` — Renderiza lista de confirmações de clientes pendentes.
- `DPS_Registration_Addon::register_rest_routes()` — Registra endpoint REST API para registro.
- `DPS_Registration_Addon::rest_register_permission_check()` — Verifica permissões para acesso ao endpoint REST.
- `DPS_Registration_Addon::handle_rest_register()` — Processa registro de cliente via REST API.
- `DPS_Registration_Addon::maybe_handle_registration()` — Processa submissão de formulário do frontend.
- `DPS_Registration_Addon::maybe_handle_email_confirmation()` — Processa confirmação de email via token na URL.
- `DPS_Registration_Addon::render_registration_form()` — Renderiza shortcode de formulário de registro multi-etapa.
- `DPS_Registration_Addon::send_confirmation_reminders()` — Envia emails de lembrete para clientes não confirmados após 24h.
- `DPS_Registration_Addon::get_pet_fieldset_html()` — Gera HTML para um único fieldset de pet.

## Stock Add-on

### Funções globais

- `dps_stock_check_base_plugin()` — Verifica se o plugin base DPS está ativo antes de carregar o add-on.
- `dps_stock_load_textdomain()` — Carrega domínio de texto para traduções do Stock add-on.
- `dps_stock_init_addon()` — Inicializa o Stock add-on após disparo do hook init.

### APIs (classes e métodos públicos)

#### DPS_Stock_Addon
*Classe principal gerenciando sistema de inventário, registro de CPT, integração de UI e dedução de estoque.*
- `DPS_Stock_Addon::get_instance()` — Retorna instância singleton do add-on.
- `DPS_Stock_Addon::register_stock_cpt()` — Registra custom post type para itens de estoque.
- `DPS_Stock_Addon::register_meta_boxes()` — Adiciona meta box 'dps_stock_details' ao CPT de estoque para edição.
- `DPS_Stock_Addon::render_stock_metabox()` — Renderiza UI da metabox com campos de unidade, quantidade e quantidade mínima.
- `DPS_Stock_Addon::save_stock_meta()` — Salva unidade, quantidade e valores mínimos em post meta com validação.
- `DPS_Stock_Addon::can_access_stock()` — Verifica se usuário atual tem capability de gestão de estoque ou é admin.
- `DPS_Stock_Addon::add_stock_tab()` — Adiciona aba "Estoque" à navegação do dashboard principal.
- `DPS_Stock_Addon::add_stock_section()` — Renderiza seção de gestão de estoque no dashboard principal.
- `DPS_Stock_Addon::render_stock_page()` — Retorna HTML completo para página de inventário de estoque.
- `DPS_Stock_Addon::maybe_handle_appointment_completion()` — Deduz automaticamente estoque quando agendamento é finalizado.
- `DPS_Stock_Addon::activate()` — Executa na ativação do plugin.
- `DPS_Stock_Addon::ensure_roles_have_capability()` — Concede capability 'dps_manage_stock' para roles administrator e dps_reception.
- `DPS_Stock_Addon::get_low_stock_items()` — Lista itens com estoque abaixo do mínimo.
- `DPS_Stock_Addon::adjust_stock()` — Ajusta quantidade de estoque de um item.

## Subscription Add-on

### Funções globais

- `dps_subscription_check_base_plugin()` — Verifica se o plugin base DPS está ativo.
- `dps_subscription_load_textdomain()` — Carrega arquivos de tradução para o subscription add-on.

### APIs (classes e métodos públicos)

#### DPS_Subscription_Addon
*Classe principal de implementação do add-on de assinaturas.*
- `DPS_Subscription_Addon::enqueue_assets()` — Enfileira assets CSS/JS e localiza strings i18n para UI de gestão de assinaturas.
- `DPS_Subscription_Addon::register_subscription_cpt()` — Registra custom post type 'dps_subscription' para armazenar dados de assinaturas.
- `DPS_Subscription_Addon::add_subscriptions_tab()` — Adiciona aba de navegação "Assinaturas" à UI do plugin base.
- `DPS_Subscription_Addon::add_subscriptions_section()` — Renderiza conteúdo da seção de assinaturas na UI do plugin base.
- `DPS_Subscription_Addon::maybe_handle_subscription_request()` — Processa todas as ações de assinatura: save, cancel, restore, delete, renew e atualizações de status de pagamento (com validação de nonce).
- `DPS_Subscription_Addon::handle_subscription_payment_status()` — Atualiza status de pagamento de assinatura desde gateway de pagamento externo; sincroniza com módulo financeiro.
- `DPS_Subscription_Addon::maybe_sync_finance_on_save()` — Sincroniza registros financeiros de assinatura após operações de salvamento.


---

## Notas de cobertura e alterações

### Sobre este documento

Este catálogo foi **atualizado** para incluir todas as funções descritas no plano de criação do novo sistema (conforme `PETOS_BLUEPRINT.md` e `PETOS_PLANO_EXECUCAO.md`).

### Alterações principais realizadas

1. **Adição de Domain Layer ao Core:**
   - Entidades: `Client`, `Pet`, `Appointment`
   - Value Objects: `ClientId`, `PetId`, `AppointmentId`, `PhoneNumber`, `Email`, `Money`, `DateRange`, `Address`
   - Enums: `Species`, `PetSize`, `CoatType`, `Aggressiveness`, `AppointmentStatus`, `ServiceType`
   - Repository Interfaces: `ClientRepositoryInterface`, `PetRepositoryInterface`, `AppointmentRepositoryInterface`
   - Domain Events: `ClientCreated`, `ClientUpdated`, `PetAddedToClient`, `AppointmentScheduled`, `AppointmentCompleted`, `AppointmentCancelled`

2. **Adição de Application Layer ao Core:**
   - Commands/Handlers para CRUD de Clientes, Pets e Agendamentos
   - Queries/Handlers para consultas
   - DTOs: `ClientDTO`, `PetDTO`, `AppointmentDTO`, `PaginatedResult`

3. **Adição de Infrastructure Layer ao Core:**
   - Container e Bootstrap: `DPS_Container`, `DPS_Bootstrap`
   - Event System: `DPS_Event_Dispatcher`
   - Repositories (implementações): `WpdbClientRepository`, `WpdbPetRepository`, `WpdbAppointmentRepository`
   - `LegacySchemaMap` para mapeamento do banco legado
   - REST API v2 Controllers: `DPS_REST_Clients_Controller`, `DPS_REST_Pets_Controller`, `DPS_REST_Appointments_Controller`
   - Security: `DPS_Rate_Limiter`

4. **Adição de UI Layer ao Core:**
   - Design System com Design Tokens
   - Componentes Base (React/TS): Button, Input, Select, DataTable, Modal, Toast, etc.
   - Admin Pages: ClientsPage, PetsPage, AppointmentsPage, DashboardPage

5. **Redistribuição de Repositories:**
   - Os repositories (`DPS_Client_Repository`, `DPS_Pet_Repository`, etc.) foram movidos para o Core
   - Client Portal Add-on agora usa facades que delegam para o Core

6. **Correções de erros de copy-paste:**
   - Removidas funções incorretas de `DPS_Push_API` (referências ao AI Add-on)
   - Removidas funções incorretas de `DPS_Backup_Settings`, `DPS_MercadoPago_Config`, `DPS_Registration_Addon` e `DPS_Stock_Addon`

7. **Adição de REST API do Portal:**
   - `DPS_Portal_REST_Controller` com endpoints para magic link, validação de token, sessão e logout

### Princípios de distribuição

A redistribuição segue os princípios da **Clean Architecture**:

- **Core (Base Plugin):** Contém toda a lógica de domínio, casos de uso, persistência e infraestrutura compartilhada. É independente de add-ons e pode funcionar sozinho para o MVP.

- **Add-ons:** Estendem funcionalidades do Core sem modificá-lo. Comunicam-se via eventos de domínio e APIs públicas.

### Recomendações

- Para classes sem lista de métodos completa, confirmar as assinaturas no código atual antes de finalizar a paridade no DPS v2.
- Manter este documento atualizado conforme novas funcionalidades forem implementadas.
- Seguir as convenções definidas em `CONVENCOES.md` para nomenclatura e estrutura de código.
