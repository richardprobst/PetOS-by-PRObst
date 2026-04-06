-- CreateTable
CREATE TABLE `Documentos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `pet_id` VARCHAR(191) NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `usuario_upload_id` VARCHAR(191) NULL,
    `tipo_documento` ENUM('ANAMNESIS', 'SERVICE_AUTHORIZATION', 'TRANSPORT_AUTHORIZATION', 'VACCINATION_RECORD', 'OTHER') NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `chave_storage` VARCHAR(255) NOT NULL,
    `nome_arquivo_original` VARCHAR(255) NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `tamanho_bytes` BIGINT NOT NULL,
    `checksum` VARCHAR(191) NULL,
    `nivel_acesso` ENUM('PRIVATE', 'PROTECTED', 'PUBLIC') NOT NULL DEFAULT 'PROTECTED',
    `data_expiracao` DATETIME(3) NULL,
    `metadados_json` JSON NULL,
    `data_upload` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Documentos_unidade_id_idx`(`unidade_id`),
    INDEX `Documentos_cliente_id_idx`(`cliente_id`),
    INDEX `Documentos_pet_id_idx`(`pet_id`),
    INDEX `Documentos_agendamento_id_idx`(`agendamento_id`),
    INDEX `Documentos_usuario_upload_id_idx`(`usuario_upload_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assinaturas` (
    `id` VARCHAR(191) NOT NULL,
    `documento_id` VARCHAR(191) NOT NULL,
    `usuario_assinante_id` VARCHAR(191) NULL,
    `nome_assinante` VARCHAR(191) NOT NULL,
    `email_assinante` VARCHAR(191) NULL,
    `ip_assinante` VARCHAR(64) NULL,
    `metodo_assinatura` ENUM('DIGITAL_TYPED', 'DIGITAL_DRAWN', 'MANUAL') NOT NULL,
    `status_assinatura` ENUM('PENDING', 'SIGNED', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `detalhes_json` JSON NULL,
    `data_assinatura` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Assinaturas_documento_id_idx`(`documento_id`),
    INDEX `Assinaturas_usuario_assinante_id_idx`(`usuario_assinante_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Midia` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `pet_id` VARCHAR(191) NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `usuario_upload_id` VARCHAR(191) NULL,
    `tipo_midia` ENUM('IMAGE', 'VIDEO', 'PDF', 'OTHER') NOT NULL,
    `chave_storage` VARCHAR(255) NOT NULL,
    `nome_arquivo_original` VARCHAR(255) NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `tamanho_bytes` BIGINT NOT NULL,
    `nivel_acesso` ENUM('PRIVATE', 'PROTECTED', 'PUBLIC') NOT NULL DEFAULT 'PROTECTED',
    `descricao` TEXT NULL,
    `metadados_json` JSON NULL,
    `data_upload` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Midia_unidade_id_idx`(`unidade_id`),
    INDEX `Midia_cliente_id_idx`(`cliente_id`),
    INDEX `Midia_pet_id_idx`(`pet_id`),
    INDEX `Midia_agendamento_id_idx`(`agendamento_id`),
    INDEX `Midia_usuario_upload_id_idx`(`usuario_upload_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Depositos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `transacao_financeira_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'APPLIED', 'FORFEITED', 'REFUNDED', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `referencia_externa` VARCHAR(191) NULL,
    `data_expiracao` DATETIME(3) NULL,
    `data_recebimento` DATETIME(3) NULL,
    `data_aplicacao` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Depositos_transacao_financeira_id_key`(`transacao_financeira_id`),
    INDEX `Depositos_unidade_id_status_idx`(`unidade_id`, `status`),
    INDEX `Depositos_cliente_id_idx`(`cliente_id`),
    INDEX `Depositos_agendamento_id_idx`(`agendamento_id`),
    INDEX `Depositos_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reembolsos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `transacao_financeira_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `motivo` TEXT NOT NULL,
    `referencia_externa` VARCHAR(191) NULL,
    `data_processamento` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Reembolsos_transacao_financeira_id_key`(`transacao_financeira_id`),
    INDEX `Reembolsos_unidade_id_status_idx`(`unidade_id`, `status`),
    INDEX `Reembolsos_cliente_id_idx`(`cliente_id`),
    INDEX `Reembolsos_agendamento_id_idx`(`agendamento_id`),
    INDEX `Reembolsos_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditosCliente` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `reembolso_origem_id` VARCHAR(191) NULL,
    `deposito_origem_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `tipo_origem` ENUM('REFUND', 'DEPOSIT_CONVERSION', 'MANUAL_ADJUSTMENT', 'PROMOTION', 'OTHER') NOT NULL,
    `valor_total` DECIMAL(10, 2) NOT NULL,
    `valor_disponivel` DECIMAL(10, 2) NOT NULL,
    `data_expiracao` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `CreditosCliente_unidade_id_idx`(`unidade_id`),
    INDEX `CreditosCliente_cliente_id_idx`(`cliente_id`),
    INDEX `CreditosCliente_reembolso_origem_id_idx`(`reembolso_origem_id`),
    INDEX `CreditosCliente_deposito_origem_id_idx`(`deposito_origem_id`),
    INDEX `CreditosCliente_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsoCredito` (
    `id` VARCHAR(191) NOT NULL,
    `credito_id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `transacao_financeira_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `valor_utilizado` DECIMAL(10, 2) NOT NULL,
    `data_uso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UsoCredito_credito_id_idx`(`credito_id`),
    INDEX `UsoCredito_agendamento_id_idx`(`agendamento_id`),
    INDEX `UsoCredito_transacao_financeira_id_idx`(`transacao_financeira_id`),
    INDEX `UsoCredito_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventosIntegracao` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `usuario_execucao_id` VARCHAR(191) NULL,
    `provedor` ENUM('STRIPE', 'MERCADO_PAGO', 'FISCAL', 'OTHER') NOT NULL,
    `direcao` ENUM('INBOUND', 'OUTBOUND') NOT NULL DEFAULT 'INBOUND',
    `tipo_evento` VARCHAR(191) NOT NULL,
    `evento_externo_id` VARCHAR(191) NULL,
    `tipo_recurso` VARCHAR(120) NULL,
    `recurso_id` VARCHAR(191) NULL,
    `endpoint` VARCHAR(255) NULL,
    `status_processamento` ENUM('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'RECEIVED',
    `tentativas_processamento` INTEGER NOT NULL DEFAULT 0,
    `payload_json` JSON NULL,
    `headers_json` JSON NULL,
    `data_recebimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_processamento` DATETIME(3) NULL,
    `data_falha` DATETIME(3) NULL,
    `ultimo_erro` TEXT NULL,
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `EventosIntegracao_unidade_id_idx`(`unidade_id`),
    INDEX `EventosIntegracao_usuario_execucao_id_idx`(`usuario_execucao_id`),
    INDEX `EventosIntegracao_status_processamento_data_recebimento_idx`(`status_processamento`, `data_recebimento`),
    UNIQUE INDEX `EventosIntegracao_provedor_evento_externo_id_key`(`provedor`, `evento_externo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Documentos` ADD CONSTRAINT `Documentos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentos` ADD CONSTRAINT `Documentos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentos` ADD CONSTRAINT `Documentos_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `Pets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentos` ADD CONSTRAINT `Documentos_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentos` ADD CONSTRAINT `Documentos_usuario_upload_id_fkey` FOREIGN KEY (`usuario_upload_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assinaturas` ADD CONSTRAINT `Assinaturas_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `Documentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assinaturas` ADD CONSTRAINT `Assinaturas_usuario_assinante_id_fkey` FOREIGN KEY (`usuario_assinante_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `Pets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_usuario_upload_id_fkey` FOREIGN KEY (`usuario_upload_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depositos` ADD CONSTRAINT `Depositos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depositos` ADD CONSTRAINT `Depositos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depositos` ADD CONSTRAINT `Depositos_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depositos` ADD CONSTRAINT `Depositos_transacao_financeira_id_fkey` FOREIGN KEY (`transacao_financeira_id`) REFERENCES `TransacoesFinanceiras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depositos` ADD CONSTRAINT `Depositos_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_transacao_financeira_id_fkey` FOREIGN KEY (`transacao_financeira_id`) REFERENCES `TransacoesFinanceiras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditosCliente` ADD CONSTRAINT `CreditosCliente_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditosCliente` ADD CONSTRAINT `CreditosCliente_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditosCliente` ADD CONSTRAINT `CreditosCliente_reembolso_origem_id_fkey` FOREIGN KEY (`reembolso_origem_id`) REFERENCES `Reembolsos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditosCliente` ADD CONSTRAINT `CreditosCliente_deposito_origem_id_fkey` FOREIGN KEY (`deposito_origem_id`) REFERENCES `Depositos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditosCliente` ADD CONSTRAINT `CreditosCliente_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsoCredito` ADD CONSTRAINT `UsoCredito_credito_id_fkey` FOREIGN KEY (`credito_id`) REFERENCES `CreditosCliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsoCredito` ADD CONSTRAINT `UsoCredito_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsoCredito` ADD CONSTRAINT `UsoCredito_transacao_financeira_id_fkey` FOREIGN KEY (`transacao_financeira_id`) REFERENCES `TransacoesFinanceiras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsoCredito` ADD CONSTRAINT `UsoCredito_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventosIntegracao` ADD CONSTRAINT `EventosIntegracao_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventosIntegracao` ADD CONSTRAINT `EventosIntegracao_usuario_execucao_id_fkey` FOREIGN KEY (`usuario_execucao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
