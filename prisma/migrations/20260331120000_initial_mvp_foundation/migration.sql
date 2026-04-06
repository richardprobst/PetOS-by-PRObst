-- CreateTable
CREATE TABLE `Unidades` (
    `id` VARCHAR(191) NOT NULL,
    `nome_unidade` VARCHAR(191) NOT NULL,
    `endereco` VARCHAR(255) NULL,
    `telefone` VARCHAR(32) NULL,
    `email` VARCHAR(191) NULL,
    `cnpj` VARCHAR(32) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(255) NULL,
    `telefone` VARCHAR(32) NULL,
    `tipo_usuario` ENUM('ADMIN', 'CLIENT', 'EMPLOYEE') NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuarios_email_key`(`email`),
    INDEX `Usuarios_unidade_id_idx`(`unidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Clientes` (
    `id` VARCHAR(191) NOT NULL,
    `endereco` VARCHAR(255) NULL,
    `cidade` VARCHAR(120) NULL,
    `estado` VARCHAR(64) NULL,
    `cep` VARCHAR(16) NULL,
    `preferencias_contato` VARCHAR(191) NULL,
    `observacoes_gerais` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pets` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `especie` VARCHAR(120) NOT NULL,
    `raca` VARCHAR(120) NULL,
    `data_nascimento` DATE NULL,
    `peso` DECIMAL(8, 2) NULL,
    `observacoes_saude` TEXT NULL,
    `alergias` TEXT NULL,
    `foto_url_principal` VARCHAR(512) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Pets_cliente_id_idx`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Servicos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `preco_base` DECIMAL(10, 2) NOT NULL,
    `duracao_estimada_minutos` INTEGER NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Servicos_unidade_id_idx`(`unidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Funcionarios` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cargo` VARCHAR(120) NOT NULL,
    `especialidade` VARCHAR(191) NULL,
    `comissao_percentual` DECIMAL(5, 2) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Funcionarios_unidade_id_idx`(`unidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agendamentos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `pet_id` VARCHAR(191) NOT NULL,
    `status_atual_id` VARCHAR(64) NOT NULL,
    `status_financeiro` ENUM('PENDING', 'PARTIAL', 'PAID', 'INVOICED', 'REFUNDED', 'REVERSED', 'EXEMPT') NOT NULL DEFAULT 'PENDING',
    `data_hora_inicio` DATETIME(3) NOT NULL,
    `data_hora_fim` DATETIME(3) NOT NULL,
    `observacoes_cliente` TEXT NULL,
    `observacoes_internas` TEXT NULL,
    `valor_total_estimado` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Agendamentos_unidade_id_data_hora_inicio_idx`(`unidade_id`, `data_hora_inicio`),
    INDEX `Agendamentos_cliente_id_data_hora_inicio_idx`(`cliente_id`, `data_hora_inicio`),
    INDEX `Agendamentos_pet_id_data_hora_inicio_idx`(`pet_id`, `data_hora_inicio`),
    INDEX `Agendamentos_status_atual_id_idx`(`status_atual_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgendamentoServicos` (
    `id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NOT NULL,
    `servico_id` VARCHAR(191) NOT NULL,
    `funcionario_id` VARCHAR(191) NULL,
    `preco_unitario_acordado` DECIMAL(10, 2) NOT NULL,
    `comissao_calculada` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `AgendamentoServicos_agendamento_id_idx`(`agendamento_id`),
    INDEX `AgendamentoServicos_servico_id_idx`(`servico_id`),
    INDEX `AgendamentoServicos_funcionario_id_idx`(`funcionario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusAtendimento` (
    `id` VARCHAR(64) NOT NULL,
    `nome_status` VARCHAR(120) NOT NULL,
    `descricao` TEXT NULL,
    `ordem_exibicao` INTEGER NOT NULL,

    UNIQUE INDEX `StatusAtendimento_nome_status_key`(`nome_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoStatusAgendamento` (
    `id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NOT NULL,
    `status_id` VARCHAR(64) NOT NULL,
    `data_hora_mudanca` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` VARCHAR(191) NULL,

    INDEX `HistoricoStatusAgendamento_agendamento_id_data_hora_mudanca_idx`(`agendamento_id`, `data_hora_mudanca`),
    INDEX `HistoricoStatusAgendamento_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplatesMensagem` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `nome_template` VARCHAR(191) NOT NULL,
    `tipo_comunicacao` ENUM('EMAIL', 'WHATSAPP') NOT NULL,
    `assunto` VARCHAR(191) NULL,
    `corpo_mensagem` TEXT NOT NULL,
    `variaveis_disponiveis` JSON NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `TemplatesMensagem_unidade_id_idx`(`unidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogsMensagens` (
    `id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `cliente_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `usuario_envio_id` VARCHAR(191) NULL,
    `tipo_comunicacao` ENUM('EMAIL', 'WHATSAPP') NOT NULL,
    `mensagem_enviada` TEXT NOT NULL,
    `data_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status_envio` ENUM('DRAFT', 'SENT', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',

    INDEX `LogsMensagens_agendamento_id_idx`(`agendamento_id`),
    INDEX `LogsMensagens_cliente_id_idx`(`cliente_id`),
    INDEX `LogsMensagens_template_id_idx`(`template_id`),
    INDEX `LogsMensagens_usuario_envio_id_idx`(`usuario_envio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransacoesFinanceiras` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NULL,
    `tipo_transacao` ENUM('REVENUE', 'EXPENSE', 'ADJUSTMENT') NOT NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `metodo_pagamento` ENUM('CASH', 'PIX', 'CARD', 'BOLETO', 'TRANSFER', 'OTHER') NULL,
    `status_pagamento` ENUM('PENDING', 'AUTHORIZED', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED', 'REVERSED', 'VOIDED') NOT NULL DEFAULT 'PENDING',
    `referencia_externa` VARCHAR(191) NULL,
    `data_transacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `TransacoesFinanceiras_unidade_id_data_transacao_idx`(`unidade_id`, `data_transacao`),
    INDEX `TransacoesFinanceiras_agendamento_id_idx`(`agendamento_id`),
    INDEX `TransacoesFinanceiras_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportCards` (
    `id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NOT NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `observacoes_gerais` TEXT NULL,
    `comportamento_pet` TEXT NULL,
    `produtos_usados` TEXT NULL,
    `recomendacao_retorno` TEXT NULL,
    `data_geracao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReportCards_agendamento_id_key`(`agendamento_id`),
    INDEX `ReportCards_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerfisAcesso` (
    `id` VARCHAR(191) NOT NULL,
    `nome_perfil` VARCHAR(120) NOT NULL,
    `descricao` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PerfisAcesso_nome_perfil_key`(`nome_perfil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `nome_permissao` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Permissoes_nome_permissao_key`(`nome_permissao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerfilPermissao` (
    `perfil_id` VARCHAR(191) NOT NULL,
    `permissao_id` VARCHAR(191) NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PerfilPermissao_permissao_id_idx`(`permissao_id`),
    PRIMARY KEY (`perfil_id`, `permissao_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsuarioPerfil` (
    `usuario_id` VARCHAR(191) NOT NULL,
    `perfil_id` VARCHAR(191) NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UsuarioPerfil_perfil_id_idx`(`perfil_id`),
    PRIMARY KEY (`usuario_id`, `perfil_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogsAuditoria` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `usuario_id` VARCHAR(191) NULL,
    `acao` VARCHAR(191) NOT NULL,
    `entidade_afetada` VARCHAR(191) NOT NULL,
    `entidade_id` VARCHAR(191) NULL,
    `data_hora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `detalhes_json` JSON NULL,

    INDEX `LogsAuditoria_unidade_id_idx`(`unidade_id`),
    INDEX `LogsAuditoria_usuario_id_data_hora_idx`(`usuario_id`, `data_hora`),
    INDEX `LogsAuditoria_entidade_afetada_entidade_id_idx`(`entidade_afetada`, `entidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfiguracoesUnidade` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `chave` VARCHAR(120) NOT NULL,
    `valor` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `ConfiguracoesUnidade_unidade_id_idx`(`unidade_id`),
    UNIQUE INDEX `ConfiguracoesUnidade_unidade_id_chave_key`(`unidade_id`, `chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Clientes` ADD CONSTRAINT `Clientes_id_fkey` FOREIGN KEY (`id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pets` ADD CONSTRAINT `Pets_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servicos` ADD CONSTRAINT `Servicos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Funcionarios` ADD CONSTRAINT `Funcionarios_id_fkey` FOREIGN KEY (`id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Funcionarios` ADD CONSTRAINT `Funcionarios_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamentos` ADD CONSTRAINT `Agendamentos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamentos` ADD CONSTRAINT `Agendamentos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamentos` ADD CONSTRAINT `Agendamentos_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `Pets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamentos` ADD CONSTRAINT `Agendamentos_status_atual_id_fkey` FOREIGN KEY (`status_atual_id`) REFERENCES `StatusAtendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgendamentoServicos` ADD CONSTRAINT `AgendamentoServicos_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgendamentoServicos` ADD CONSTRAINT `AgendamentoServicos_servico_id_fkey` FOREIGN KEY (`servico_id`) REFERENCES `Servicos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgendamentoServicos` ADD CONSTRAINT `AgendamentoServicos_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `Funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoStatusAgendamento` ADD CONSTRAINT `HistoricoStatusAgendamento_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoStatusAgendamento` ADD CONSTRAINT `HistoricoStatusAgendamento_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `StatusAtendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoStatusAgendamento` ADD CONSTRAINT `HistoricoStatusAgendamento_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplatesMensagem` ADD CONSTRAINT `TemplatesMensagem_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogsMensagens` ADD CONSTRAINT `LogsMensagens_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogsMensagens` ADD CONSTRAINT `LogsMensagens_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogsMensagens` ADD CONSTRAINT `LogsMensagens_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `TemplatesMensagem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogsMensagens` ADD CONSTRAINT `LogsMensagens_usuario_envio_id_fkey` FOREIGN KEY (`usuario_envio_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransacoesFinanceiras` ADD CONSTRAINT `TransacoesFinanceiras_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransacoesFinanceiras` ADD CONSTRAINT `TransacoesFinanceiras_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransacoesFinanceiras` ADD CONSTRAINT `TransacoesFinanceiras_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportCards` ADD CONSTRAINT `ReportCards_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportCards` ADD CONSTRAINT `ReportCards_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilPermissao` ADD CONSTRAINT `PerfilPermissao_perfil_id_fkey` FOREIGN KEY (`perfil_id`) REFERENCES `PerfisAcesso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilPermissao` ADD CONSTRAINT `PerfilPermissao_permissao_id_fkey` FOREIGN KEY (`permissao_id`) REFERENCES `Permissoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioPerfil` ADD CONSTRAINT `UsuarioPerfil_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioPerfil` ADD CONSTRAINT `UsuarioPerfil_perfil_id_fkey` FOREIGN KEY (`perfil_id`) REFERENCES `PerfisAcesso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogsAuditoria` ADD CONSTRAINT `LogsAuditoria_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogsAuditoria` ADD CONSTRAINT `LogsAuditoria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfiguracoesUnidade` ADD CONSTRAINT `ConfiguracoesUnidade_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

