# PetOS - Product Requirements Document (PRD)

## 1. Visão do Produto

O PetOS é um sistema de gestão (SaaS) para pet shops e serviços de banho e tosa, projetado para o mercado brasileiro. O objetivo é centralizar a operação, otimizar a gestão e melhorar a experiência do tutor, combinando funcionalidades essenciais com integrações de Inteligência Artificial para gerar insights e eficiência.

## 2. Escopo por Fases

O desenvolvimento do PetOS será dividido em fases, com foco em entregar valor incremental e garantir a estabilidade e segurança em cada etapa. A priorização das funcionalidades segue a diretriz de um MVP enxuto, focado nas operações essenciais e na experiência básica do tutor, seguido por fases de expansão e otimização.

### 2.1. MVP (Produto Mínimo Viável) - Foco em Core Operacional e Experiência do Tutor (8-12 Semanas)

**Objetivo**: Lançar uma versão funcional do PetOS que resolva os problemas mais críticos da operação de banho e tosa e ofereça uma experiência básica, mas eficaz, para o tutor. Este MVP será a base para futuras expansões.

**Funcionalidades Prioritárias (MVP)**:

*   **Agenda e Operação**:
    *   **Agendamento Inteligente**: Calendário interativo (visualização diária, semanal, mensal), criação, edição, cancelamento e reagendamento de serviços. Verificação de disponibilidade de tosadores e salas.
    *   **Estados do Atendimento**: Fluxo padronizado: `Agendado` → `Confirmado` → `Check-in` → `Em Atendimento` → `Pronto para Retirada` → `Concluído` → `Faturado`.
    *   **Check-in do Pet com Checklist**: Criação de um checklist personalizável para o check-in do pet.
*   **Cliente/Pet**:
    *   **Cadastro de Clientes e Pets**: Registro completo de clientes (dados de contato, histórico de serviços) e pets (nome, espécie, raça, data de nascimento, peso, observações de saúde, alergias, foto).
*   **Serviços**:
    *   **Gestão de Serviços**: Cadastro, edição e remoção de serviços oferecidos, com preço e duração estimada.
*   **Comunicação (WhatsApp Operacional)**:
    *   **Comunicação Manual Otimizada**: Ferramentas para gerar e enviar mensagens personalizadas via WhatsApp (integração via WhatsApp Web) e e-mail, com controle manual da equipe.
    *   **Templates de Mensagens Pré-definidas**: Modelos de mensagens para diversas situações (confirmação de agendamento, lembrete, etc.), personalizáveis antes do envio.
*   **Financeiro Básico**:
    *   **Registro de Receitas e Despesas**: Controle detalhado de todas as movimentações financeiras.
    *   **Controle de Contas a Pagar e Receber**: Programação de gastos recorrentes e acompanhamento de recebíveis.
*   **Portal do Tutor Básico (PWA)**:
    *   **Criação de Conta e Perfil**: Cadastro e visualização/edição de dados pessoais.
    *   **Gestão de Pets**: Visualização de pets cadastrados e histórico de serviços.
    *   **Agendamento Online**: Fluxo intuitivo para seleção de pet, serviço, data e horário disponíveis.
    *   **Notificações**: Recebimento de lembretes de agendamento e confirmações de serviço.
*   **Gestão da Equipe**:
    *   **Controle de Comissões**: Cálculo automático de comissões sobre vendas de produtos ou serviços por profissional.
*   **Report Card Simples**:
    *   Geração de um "relatório do banho/tosa" com observações e recomendação do próximo retorno.

### 2.2. Fase 2: Expansão e Otimização (6-10 Semanas)

**Objetivo**: Aprimorar as funcionalidades existentes, adicionar recursos de monetização e automação, e fortalecer a operação, com foco em eficiência e retenção.

**Funcionalidades da Fase 2**:

*   **Agenda e Operação**:
    *   **Capacidade por Profissional/Porte/Raça**: Definição de capacidade de atendimento por profissional, considerando porte e raça do pet.
    *   **Depósito/Pré-pagamento**: Opção de depósito ou pré-pagamento para proteção contra no-show.
    *   **Bloqueios de Agenda**: Ferramenta para bloquear horários específicos na agenda.
    *   **Waitlist**: Lista de espera para horários concorridos.
    *   **Otimização de Rotas para Táxi Dog**: Módulo para roteirização eficiente do serviço de transporte.
*   **Cliente/Pet**:
    *   **Motor de Documentos e Formulários**: Gestão de fichas de anamnese, autorizações de serviço, termos de transporte, vacinas/documentos e assinatura digital.
*   **Comercial/CRM**:
    *   **Review Booster**: Solicitação automática de avaliações pós-serviço.
    *   **Campanhas Segmentadas**: Criação de campanhas de marketing direcionadas.
    *   **Recuperação de Clientes Inativos**: Estratégias e ferramentas para reengajar clientes.
    *   **Ofertas por Perfil**: Geração de ofertas personalizadas com base no perfil do pet/cliente.
    *   **Gatilhos Pós-serviço**: Automações para comunicação e ofertas após a conclusão de um serviço.
*   **Financeiro/Fiscal**:
    *   **Integração para Emissão de NFS-e e NFC-e**: Conexão com provedores de API para emissão automatizada de notas fiscais.
    *   **No-show Protection e Cobrança Preventiva**: Regras para cobrança de taxas de no-show, depósitos via PIX/cartão.
*   **Produtos/Estoque**:
    *   **Ponto de Venda (PDV) Completo**: Frente de Caixa, Terminal de Vendas, Movimento PDV, Pré-Vendas.
    *   **Gerenciamento Abrangente de Estoque**: Alertas de estoque mínimo, relatórios de consumo, identificação de produtos parados/excedentes, acompanhamento de produtos próximos ao vencimento, transformação de unidade de medida, registro de saída de itens, entrada de compras via XML, impressão de etiquetas.
*   **Portal do Tutor (PWA Aprimorado)**:
    *   **Documentos, Vacinas, Assinaturas**: Acesso a documentos e histórico de vacinas.
    *   **Pagamentos e Alertas**: Gerenciamento de pagamentos e alertas personalizados.
    *   **Pré-Check-in e Jornada Completa**: Opção de pré-check-in e visão completa da jornada do pet.
*   **Gestão da Equipe**:
    *   **Time Clock e Payroll**: Controle de ponto e folha de pagamento.
    *   **Escalas**: Gerenciamento de escalas de trabalho.

### 2.3. Fase 3: IA Avançada e Escalabilidade (4-8 Semanas)

**Objetivo**: Integrar funcionalidades de IA de maior complexidade e preparar o sistema para expansão e otimização estratégica.

**Funcionalidades da Fase 3**:

*   **IA e Insights**:
    *   **Análise de Imagem (Visão Computacional)**: Identificação de raças/características, análise preliminar de saúde (olhos, pele, pelagem), verificação de condição pré/pós serviço, organização de galeria de fotos.
    *   **Análise Preditiva**: Previsão de demanda de serviços, gestão inteligente de estoque, identificação de clientes em risco de churn, otimização de preços dinâmica.
*   **Multiunidade e Expansão**:
    *   **Suporte a Multiunidade**: Modelagem do sistema para suportar múltiplas unidades/locais.

### 2.4. Roadmap Futuro

**Objetivo**: Funcionalidades de longo prazo que serão consideradas após a estabilização das fases anteriores, visando inovação e diferenciação no mercado.

*   **Integração com Wearables para Pets**: Monitoramento de saúde e atividade.
*   **Gamificação para Tutores**: Recompensas e engajamento.
*   **Mercado de Produtos Personalizados**: Sugestões de produtos customizados.
*   **Assistente Virtual por Voz**: Interação por voz para agendamentos e consultas.

## 3. Regras de Negócio Detalhadas

Esta seção detalha as regras de negócio que governam o comportamento do sistema PetOS, garantindo consistência e clareza nas operações.

### 3.1. Fluxo de Status do Atendimento (Padronizado)

O ciclo de vida de um agendamento e atendimento no PetOS seguirá a seguinte sequência de status, que será aplicada de forma consistente em todo o sistema:

*   **Agendado**: O serviço foi solicitado e registrado no sistema, aguardando confirmação.
*   **Confirmado**: O agendamento foi confirmado pelo estabelecimento ou pelo cliente.
*   **Check-in**: O pet chegou ao estabelecimento e o processo de check-in foi iniciado (com checklist).
*   **Em Atendimento**: O serviço está sendo executado pelo profissional.
*   **Pronto para Retirada**: O serviço foi concluído e o pet está pronto para ser retirado ou entregue.
*   **Concluído**: O pet foi retirado/entregue e o serviço foi finalizado.
*   **Faturado**: O pagamento pelo serviço foi processado e registrado.

### 3.2. Regras de No-Show, Cancelamento e Reagendamento

*   **No-Show**: Um agendamento é considerado `No-Show` se o cliente não comparecer ou não entrar em contato até X minutos após o horário agendado. Regras de cobrança de taxa de no-show podem ser configuradas (ver **No-show Protection** na Fase 2).
*   **Cancelamento**: Clientes podem cancelar agendamentos até Y horas antes do horário agendado sem penalidade. Cancelamentos fora deste período podem incorrer em taxas ou perda de depósito (se aplicável).
*   **Reagendamento**: Clientes podem reagendar serviços até Z horas antes do horário agendado. Reagendamentos fora deste período podem ser tratados como cancelamento e novo agendamento, sujeitos às regras de cancelamento.

### 3.3. Depósitos e Pré-pagamento

*   **Depósito Obrigatório**: Para determinados serviços ou clientes (definidos por regras de negócio), um depósito pode ser exigido no momento do agendamento para confirmar a reserva.
*   **Pré-pagamento**: Clientes podem optar por pagar o valor total do serviço antecipadamente, garantindo a reserva e agilizando o processo no dia do atendimento.
*   **Regras de Reembolso**: Em caso de cancelamento ou reagendamento, as regras de reembolso do depósito/pré-pagamento serão definidas (ex: reembolso total, parcial, crédito para futuros serviços).

### 3.4. Validade de Pacotes e Créditos do Cliente

*   **Validade de Pacotes**: Pacotes de serviços terão uma data de validade definida. Serviços não utilizados dentro deste período expirarão.
*   **Créditos do Cliente**: Clientes podem ter créditos no sistema (resultantes de reembolsos, promoções, etc.). Estes créditos podem ser utilizados para abater o valor de futuros serviços ou produtos.

### 3.5. Regras de Comissão para Profissionais

*   **Cálculo de Comissão**: A comissão dos profissionais será calculada com base em um percentual definido sobre o valor dos serviços que eles executam. Este percentual pode variar por tipo de serviço ou por profissional.
*   **Base de Cálculo**: A comissão será calculada sobre o valor `Faturado` do serviço, após descontos e antes de impostos.

### 3.6. Integração do Táxi Dog com Agenda e Financeiro

*   **Agendamento Integrado**: O serviço de Táxi Dog será agendado em conjunto com o serviço de banho e tosa, com horários de coleta e entrega definidos na agenda.
*   **Custo do Transporte**: O custo do Táxi Dog será adicionado automaticamente ao valor total do serviço e refletido no módulo financeiro.
*   **Comissão do Motorista**: Se aplicável, a comissão do motorista do Táxi Dog será calculada separadamente ou como parte da comissão geral do profissional responsável pelo atendimento.

## 4. Modelagem do Banco de Dados MySQL

A estrutura do banco de dados MySQL será robusta e escalável, projetada para suportar todas as funcionalidades do PetOS, incluindo as complexidades de agendamentos, pagamentos, documentos e multiunidade. A seguir, as tabelas principais e seus campos, com foco nas novas entidades e relacionamentos.

### 4.1. Diagrama de Entidade-Relacionamento (DER) - Conceitual

(Um diagrama DER conceitual seria inserido aqui, mostrando as principais entidades e seus relacionamentos. Para fins deste documento textual, as tabelas serão descritas abaixo.)

### 4.2. Tabelas e Campos Detalhados

| Tabela | Campos Principais | Observações |
| :--- | :--- | :--- |
| `Usuarios` | `id`, `nome`, `email`, `senha_hash`, `telefone`, `tipo_usuario` (admin, cliente, funcionario), `data_cadastro`, `ativo`, `unidade_id` (FK, NULLABLE para usuários globais) | Armazena dados de login e perfil básico. `senha_hash` para segurança. `unidade_id` para multiunidade. |
| `Clientes` | `id` (FK para Usuarios.id), `endereco`, `cidade`, `estado`, `cep`, `preferencias_contato`, `observacoes_gerais` | Detalhes específicos do cliente. |
| `Pets` | `id`, `cliente_id` (FK), `nome`, `especie`, `raca`, `data_nascimento`, `peso`, `observacoes_saude`, `alergias`, `foto_url_principal` | Detalhes do pet. `foto_url_principal` para a imagem principal. |
| `Servicos` | `id`, `nome`, `descricao`, `preco_base`, `duracao_estimada_minutos`, `ativo`, `unidade_id` (FK, NULLABLE para serviços globais) | Serviços oferecidos. `unidade_id` para serviços específicos de uma unidade. |
| `Funcionarios` | `id` (FK para Usuarios.id), `cargo`, `especialidade`, `comissao_percentual`, `unidade_id` (FK) | Detalhes do funcionário. `unidade_id` para vincular a uma unidade. |
| `Agendamentos` | `id`, `cliente_id` (FK), `pet_id` (FK), `data_hora_inicio`, `data_hora_fim`, `status_atual` (FK para StatusAtendimento.id), `observacoes_cliente`, `observacoes_internas`, `valor_total_estimado`, `unidade_id` (FK) | Agendamentos de serviços. `status_atual` para o status corrente. `unidade_id` para multiunidade. |
| `AgendamentoServicos` | `id`, `agendamento_id` (FK), `servico_id` (FK), `funcionario_id` (FK), `preco_unitario_acordado`, `comissao_calculada` | Permite múltiplos serviços por agendamento. |
| `StatusAtendimento` | `id`, `nome_status`, `descricao`, `ordem_exibicao` | Tabela de lookup para padronizar os status de atendimento. |
| `HistoricoStatusAgendamento` | `id`, `agendamento_id` (FK), `status_id` (FK para StatusAtendimento.id), `data_hora_mudanca`, `usuario_id` (FK) | Registra todas as mudanças de status de um agendamento. |
| `Documentos` | `id`, `agendamento_id` (FK, NULLABLE), `pet_id` (FK, NULLABLE), `cliente_id` (FK, NULLABLE), `tipo_documento` (anamnese, autorizacao, vacina, termo), `url_arquivo`, `data_upload`, `usuario_upload_id` (FK) | Armazena referências a documentos digitais. |
| `Assinaturas` | `id`, `documento_id` (FK), `usuario_id` (FK, NULLABLE para cliente), `nome_assinante`, `data_assinatura`, `metodo_assinatura` (digital, manual) | Registra assinaturas em documentos. |
| `Midia` | `id`, `pet_id` (FK, NULLABLE), `agendamento_id` (FK, NULLABLE), `url_arquivo`, `tipo_midia` (foto, video), `descricao`, `data_upload` | Armazena URLs de fotos (antes/depois) e outros arquivos de mídia. |
| `TransacoesFinanceiras` | `id`, `agendamento_id` (FK, NULLABLE), `tipo_transacao` (receita, despesa, deposito, reembolso), `descricao`, `valor`, `data_transacao`, `metodo_pagamento`, `status_pagamento`, `referencia_externa` (ID da transação no gateway) | Detalha todas as movimentações financeiras. |
| `Depositos` | `id`, `cliente_id` (FK), `agendamento_id` (FK, NULLABLE), `valor`, `data_deposito`, `status` (pendente, confirmado, reembolsado) | Registra depósitos de segurança. |
| `Reembolsos` | `id`, `transacao_financeira_id` (FK), `valor`, `data_reembolso`, `motivo` | Registra reembolsos. |
| `Planos` | `id`, `nome`, `descricao`, `valor_mensal`, `servicos_inclusos`, `validade_dias` | Planos de serviço. |
| `AssinaturasPlanos` | `id`, `cliente_id` (FK), `plano_id` (FK), `data_inicio`, `data_fim`, `status` (ativo, cancelado, expirado) | Assinaturas de planos por cliente. |
| `CreditosCliente` | `id`, `cliente_id` (FK), `valor_total`, `valor_utilizado`, `data_ultima_atualizacao` | Saldo de créditos do cliente. |
| `UsoCredito` | `id`, `credito_id` (FK), `transacao_financeira_id` (FK), `valor_utilizado`, `data_uso` | Histórico de uso de créditos. |
| `ListaEspera` | `id`, `cliente_id` (FK), `pet_id` (FK), `servico_desejado_id` (FK), `data_desejada`, `observacoes`, `data_solicitacao`, `status` | Gerencia clientes em lista de espera. |
| `ReportCards` | `id`, `agendamento_id` (FK), `url_fotos_antes`, `url_fotos_depois`, `observacoes_gerais`, `comportamento_pet`, `produtos_usados`, `recomendacao_retorno`, `data_geracao` | Detalhes do report card do serviço. |
| `TemplatesMensagem` | `id`, `nome_template`, `tipo_comunicacao` (email, whatsapp), `assunto` (para email), `corpo_mensagem`, `variaveis_disponiveis` | Templates para mensagens pré-definidas. |
| `LogsMensagens` | `id`, `agendamento_id` (FK, NULLABLE), `cliente_id` (FK, NULLABLE), `template_id` (FK), `mensagem_enviada`, `data_envio`, `status_envio`, `usuario_envio_id` (FK) | Log de todas as mensagens enviadas. |
| `PerfisAcesso` | `id`, `nome_perfil`, `descricao` | Define perfis de acesso (ex: Administrador, Recepcionista, Tosador, Cliente). |
| `Permissoes` | `id`, `nome_permissao`, `descricao` | Define permissões granulares (ex: `agendamento.criar`, `cliente.editar`). |
| `PerfilPermissao` | `perfil_id` (FK), `permissao_id` (FK) | Tabela de junção para N:N entre perfis e permissões. |
| `UsuarioPerfil` | `usuario_id` (FK), `perfil_id` (FK) | Tabela de junção para N:N entre usuários e perfis. |
| `LogsAuditoria` | `id`, `usuario_id` (FK), `acao`, `entidade_afetada`, `entidade_id`, `data_hora`, `detalhes_json` | Registra ações importantes para auditoria e segurança. |
| `Unidades` | `id`, `nome_unidade`, `endereco`, `telefone`, `email`, `cnpj`, `ativo` | Suporte a multiunidade. |
| `ConfiguracoesUnidade` | `id`, `unidade_id` (FK), `chave`, `valor`, `descricao` | Configurações específicas por unidade. |

## 5. Arquitetura Técnica e Segurança

A arquitetura do PetOS será construída com foco em performance, escalabilidade, segurança e facilidade de manutenção, utilizando tecnologias modernas e comprovadas. A escolha definitiva para o backend será **Next.js API Routes**.

### 5.1. Stack Tecnológica

*   **Frontend**: **Next.js (React)** com **TypeScript** e **Tailwind CSS**.
    *   **Next.js**: Renderização no lado do servidor (SSR) e geração de sites estáticos (SSG) para performance e SEO. Utilização de API Routes para o backend integrado.
    *   **React**: Biblioteca robusta para interfaces de usuário interativas e reativas.
    *   **TypeScript**: Tipagem estática para maior robustez, detecção precoce de erros e melhor manutenibilidade do código.
    *   **Tailwind CSS**: Framework CSS utilitário para design responsivo, rápido e moderno, permitindo a criação de interfaces consistentes.
*   **Backend**: **Node.js** com **Next.js API Routes**.
    *   **Node.js**: Ambiente de execução JavaScript no servidor, compatível com a hospedagem na Hostinger.
    *   **Next.js API Routes**: Permite a criação de endpoints de API diretamente dentro do projeto Next.js, simplificando o desenvolvimento e a implantação de funcionalidades de backend.
*   **Banco de Dados**: **MySQL** (hospedado na Hostinger).
    *   Banco de dados relacional amplamente utilizado, confiável e com bom suporte, ideal para a estrutura de dados do PetOS.
*   **ORM (Object-Relational Mapper)**: **Prisma**.
    *   Simplifica a interação com o MySQL, gerando um cliente de banco de dados tipado, o que aumenta a segurança e a produtividade no desenvolvimento.
*   **Autenticação**: **NextAuth.js**.
    *   Solução robusta e flexível para gerenciamento de autenticação e autorização, suportando diferentes provedores e estratégias (e-mail/senha, OAuth).

### 5.2. Segurança

A segurança será um pilar fundamental em todas as fases do desenvolvimento do PetOS, seguindo as melhores práticas e incorporando medidas concretas.

*   **Desenvolvimento Seguro por Design**: A segurança será considerada desde a concepção de cada funcionalidade, não como um item a ser adicionado posteriormente.
*   **Perfis e Permissões (RBAC - Role-Based Access Control)**:
    *   Implementação de um sistema granular de perfis e permissões para controlar o acesso a funcionalidades e dados. Cada usuário (administrador, recepcionista, tosador, cliente) terá um perfil com permissões específicas.
    *   Exemplos: `admin.gerenciar_usuarios`, `agendamento.criar`, `cliente.visualizar_historico`.
*   **Auditoria (Logs de Auditoria)**:
    *   Registro detalhado de ações críticas realizadas por usuários no sistema (login, criação/edição/exclusão de dados sensíveis, alterações financeiras).
    *   Os logs incluirão usuário, ação, data/hora, entidade afetada e detalhes da alteração, sendo essenciais para rastreabilidade e conformidade.
*   **Política LGPD (Lei Geral de Proteção de Dados)**:
    *   Conformidade com a LGPD, garantindo a coleta, armazenamento, processamento e descarte de dados pessoais de forma segura e transparente.
    *   Inclui consentimento do usuário, direito ao esquecimento, acesso aos dados e relatórios de impacto à proteção de dados.
*   **Retenção de Dados**: Definição de políticas claras para a retenção de dados, garantindo que informações sensíveis não sejam armazenadas por mais tempo do que o necessário.
*   **Gestão de Arquivos Sensíveis**: Implementação de práticas seguras para o armazenamento e acesso a arquivos sensíveis (ex: fotos de pets, documentos), utilizando armazenamento em nuvem seguro (ex: AWS S3, Google Cloud Storage) com controle de acesso rigoroso.
*   **Backup e Recuperação**: Implementação de rotinas de backup regulares do banco de dados e arquivos, com planos de recuperação de desastres testados para garantir a continuidade do serviço.
*   **Rate Limiting**: Proteção contra ataques de força bruta e abuso de API através da limitação do número de requisições que um usuário ou IP pode fazer em um determinado período.
*   **Validação de Webhooks**: Implementação de mecanismos de validação para webhooks (ex: assinaturas digitais, segredos compartilhados) para garantir que as requisições recebidas são legítimas e não foram adulteradas.
*   **Criptografia**: Utilização de HTTPS para todas as comunicações, criptografia de senhas (hashing com salting) e, se necessário, criptografia de dados sensíveis no banco de dados (at-rest).
*   **Revisões de Código Contínuas**: Utilização de ferramentas de análise estática de código e revisões por pares para identificar vulnerabilidades e garantir a qualidade do código.
*   **Testes Abrangentes**: Testes unitários, de integração e de ponta a ponta para garantir o correto funcionamento e a segurança das funcionalidades.
*   **Monitoramento e Alertas**: Ferramentas de monitoramento para detectar anomalias, tentativas de acesso não autorizado e outras ameaças de segurança em tempo real.

## 6. Integração de Inteligência Artificial (IA) no PetOS via API

O sistema PetOS será aprimorado com integrações estratégicas de Inteligência Artificial via API, visando otimizar a operação, melhorar a experiência do cliente e fornecer insights valiosos. As principais áreas de integração incluem Análise de Imagem, Chatbots e Assistentes Virtuais, e Análise Preditiva.

### 6.1. Análise de Imagem (Visão Computacional)

**Descrição Completa:** Esta funcionalidade permitirá que o PetOS utilize APIs de visão computacional para processar imagens de pets, extraindo informações relevantes que podem auxiliar tanto a equipe administrativa quanto os clientes. A integração será feita através de APIs como Google Cloud Vision API ou modelos de IA especializados.

**Pontos de Integração no PetOS:**

*   **Identificação de Raças e Características**: Ao fazer o upload de uma foto do pet no cadastro, a IA pode sugerir a raça, cor da pelagem e outras características físicas. Isso agiliza o preenchimento do cadastro e garante maior precisão. [3]
*   **Análise Preliminar de Saúde (Olhos, Pele, Pelagem)**: Clientes ou a equipe podem fazer upload de fotos dos olhos, pele ou pelagem do pet. A IA pode realizar uma análise preliminar para identificar possíveis anomalias, como irritações na pele, sinais de infecção ocular ou problemas na pelagem. Esta funcionalidade serve como um alerta e não substitui o diagnóstico veterinário. [4]
*   **Verificação de Condição do Pet (Pré/Pós Banho e Tosa)**: Fotos do pet antes e depois do serviço podem ser analisadas pela IA para verificar a qualidade do serviço, identificar áreas que precisam de mais atenção ou registrar a condição do animal para fins de segurança e histórico. Isso pode ser útil para documentar o estado do pet e evitar contestações. [4]
*   **Organização de Galeria de Fotos**: A IA pode categorizar e taggear automaticamente as fotos dos pets, facilitando a busca e organização na galeria de cada animal.

### 6.2. Chatbots e Assistentes Virtuais

**Descrição Completa:** Esta integração permitirá que o PetOS ofereça suporte automatizado e interativo aos clientes e à equipe, utilizando APIs de processamento de linguagem natural (NLP) e geração de texto. Isso pode ser feito através de APIs como OpenAI API ou Google Gemini API.

**Pontos de Integração no PetOS:**

*   **Assistente de Agendamento Inteligente**: Um chatbot pode guiar o cliente através do processo de agendamento, respondendo a perguntas sobre serviços, horários disponíveis e preços, e até mesmo auxiliando na seleção do melhor serviço para o pet. [5]
*   **FAQ Interativo**: Um assistente virtual pode responder a perguntas frequentes de clientes sobre os serviços do banho e tosa, políticas da empresa, cuidados com pets, etc., reduzindo a carga de trabalho da equipe de atendimento. [5]
*   **Geração de Mensagens Personalizadas**: A IA pode gerar sugestões de mensagens personalizadas para clientes (ex: lembretes de aniversário do pet, ofertas especiais baseadas no histórico de serviços, mensagens de acompanhamento pós-serviço), que a equipe pode revisar e enviar manualmente via WhatsApp ou e-mail. [6]
*   **Suporte Interno para a Equipe**: Um assistente virtual pode ajudar a equipe administrativa a encontrar informações rapidamente no sistema, como histórico de um pet, detalhes de um serviço ou políticas internas.

### 6.3. Análise Preditiva e Recomendações

**Descrição Completa:** Esta funcionalidade utilizará APIs de IA para analisar dados históricos do PetOS e prever tendências, otimizar operações e oferecer recomendações personalizadas. Isso pode envolver o uso de modelos de Machine Learning para análise de dados.

**Pontos de Integração no PetOS:**

*   **Previsão de Demanda de Serviços**: A IA pode analisar o histórico de agendamentos para prever períodos de alta e baixa demanda, auxiliando na otimização da escala de funcionários e na gestão de recursos. [7]
*   **Gestão Inteligente de Estoque**: Previsão de consumo de insumos e produtos com base no histórico de vendas e agendamentos, minimizando o risco de falta ou excesso de estoque. [7]
*   **Recomendações Personalizadas de Serviços/Produtos**: Com base no histórico de serviços do pet, raça, idade e outras características, a IA pode sugerir serviços adicionais ou produtos relevantes para o cliente, aumentando o ticket médio e a satisfação. [7]
*   **Identificação de Clientes em Risco de Churn**: A IA pode analisar padrões de comportamento dos clientes para identificar aqueles que podem estar prestes a deixar de utilizar os serviços, permitindo ações proativas de retenção. [7]
*   **Otimização de Preços Dinâmica**: Para serviços ou produtos específicos, a IA pode sugerir ajustes de preços com base na demanda, concorrência e histórico de vendas, maximizando a receita. [8]

## 7. Backlog por Módulo

Para facilitar a execução do projeto, as funcionalidades serão organizadas em um backlog por módulo, indicando a fase de implementação, prioridade, dependências, complexidade e impacto no negócio. Esta tabela servirá como um guia para o desenvolvimento ágil.

| Funcionalidade | Módulo | Fase | Prioridade | Dependências | Complexidade | Impacto no Negócio |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Agendamento Inteligente | Agenda e Operação | MVP | Alta | - | Média | Alta |
| Estados do Atendimento | Agenda e Operação | MVP | Alta | - | Baixa | Alta |
| Check-in do Pet com Checklist | Agenda e Operação | MVP | Média | - | Baixa | Média |
| Cadastro de Clientes e Pets | Cliente/Pet | MVP | Alta | - | Média | Alta |
| Gestão de Serviços | Serviços | MVP | Alta | - | Baixa | Alta |
| Comunicação Manual Otimizada (WhatsApp Web) | Comunicação | MVP | Alta | - | Média | Alta |
| Templates de Mensagens Pré-definidas | Comunicação | MVP | Média | - | Baixa | Média |
| Registro de Receitas e Despesas | Financeiro | MVP | Alta | - | Média | Alta |
| Controle de Contas a Pagar e Receber | Financeiro | MVP | Média | - | Média | Média |
| Portal do Tutor Básico (PWA) | Portal do Tutor | MVP | Alta | Cadastro de Clientes/Pets, Agendamento | Alta | Alta |
| Controle de Comissões | Gestão da Equipe | MVP | Média | Agendamento, Financeiro | Média | Média |
| Report Card Simples | Cliente/Pet | MVP | Baixa | Agendamento | Baixa | Média |
| Capacidade por Profissional/Porte/Raça | Agenda e Operação | Fase 2 | Média | Agendamento | Média | Média |
| Depósito/Pré-pagamento | Financeiro | Fase 2 | Alta | Agendamento | Alta | Alta |
| Bloqueios de Agenda | Agenda e Operação | Fase 2 | Baixa | Agendamento | Baixa | Média |
| Waitlist | Agenda e Operação | Fase 2 | Média | Agendamento | Média | Média |
| Otimização de Rotas para Táxi Dog | Logística | Fase 2 | Média | Agendamento | Alta | Média |
| Motor de Documentos e Formulários | Cliente/Pet | Fase 2 | Média | - | Alta | Alta |
| Review Booster | Comercial/CRM | Fase 2 | Baixa | Comunicação | Média | Média |
| Campanhas Segmentadas | Comercial/CRM | Fase 2 | Média | Clientes | Média | Alta |
| Recuperação de Clientes Inativos | Comercial/CRM | Fase 2 | Média | Clientes | Média | Média |
| Ofertas por Perfil | Comercial/CRM | Fase 2 | Média | Clientes, IA | Alta | Alta |
| Gatilhos Pós-serviço | Comercial/CRM | Fase 2 | Média | Agendamento, Comunicação | Média | Média |
| Integração para Emissão de NFS-e e NFC-e | Financeiro | Fase 2 | Alta | Financeiro | Alta | Alta |
| No-show Protection e Cobrança Preventiva | Financeiro | Fase 2 | Alta | Agendamento, Financeiro | Alta | Alta |
| Ponto de Venda (PDV) Completo | Produtos/Estoque | Fase 2 | Alta | Financeiro, Estoque | Alta | Alta |
| Gerenciamento Abrangente de Estoque | Produtos/Estoque | Fase 2 | Média | - | Média | Alta |
| Portal do Tutor (PWA Aprimorado) | Portal do Tutor | Fase 2 | Alta | Documentos, Pagamentos | Alta | Alta |
| Time Clock e Payroll | Gestão da Equipe | Fase 2 | Média | Funcionários | Média | Média |
| Escalas | Gestão da Equipe | Fase 2 | Média | Funcionários, Agendamento | Média | Média |
| Análise de Imagem (Visão Computacional) | IA e Insights | Fase 3 | Alta | Mídia | Alta | Alta |
| Análise Preditiva | IA e Insights | Fase 3 | Alta | Dados Históricos | Alta | Alta |
| Suporte a Multiunidade | Multiunidade | Fase 3 | Alta | Todas as entidades | Alta | Alta |
| Integração com Wearables para Pets | Roadmap Futuro | Baixa | - | Alta | Média |
| Gamificação para Tutores | Roadmap Futuro | Baixa | - | Média | Média |
| Mercado de Produtos Personalizados | Roadmap Futuro | Média | - | Alta | Alta |
| Assistente Virtual por Voz | Roadmap Futuro | Média | - | IA, Comunicação | Alta | Alta |

## 8. Referências

[1] SimplesVet - Sistema para Pet Shop e Clínica Veterinária. Disponível em: [https://simples.vet/](https://simples.vet/)
[2] Pet Shop Control - Software para Pet Shop e Banho e Tosa. Disponível em: [https://petshopcontrol.com.br/](https://petshopcontrol.com.br/)
[3] Google Cloud Vision AI. Disponível em: [https://cloud.google.com/vision](https://cloud.google.com/vision)
[4] OpenAI API. Disponível em: [https://openai.com/docs/api-reference](https://openai.com/docs/api-reference)
[5] Google Gemini API. Disponível em: [https://ai.google.dev/](https://ai.google.dev/)
[6] Next.js Documentation. Disponível em: [https://nextjs.org/docs](https://nextjs.org/docs)
[7] TypeScript Documentation. Disponível em: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
[8] Tailwind CSS Documentation. Disponível em: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
[9] Prisma ORM Documentation. Disponível em: [https://www.prisma.io/docs](https://www.prisma.io/docs)
[10] NextAuth.js Documentation. Disponível em: [https://next-auth.js.org/](https://next-auth.js.org/)
