-- CreateTable
CREATE TABLE `PreferenciasComunicacaoCliente` (
    `cliente_id` VARCHAR(191) NOT NULL,
    `opt_in_email` BOOLEAN NOT NULL DEFAULT true,
    `opt_in_whatsapp` BOOLEAN NOT NULL DEFAULT true,
    `opt_in_marketing` BOOLEAN NOT NULL DEFAULT false,
    `opt_in_review` BOOLEAN NOT NULL DEFAULT true,
    `opt_in_pos_servico` BOOLEAN NOT NULL DEFAULT true,
    `fonte_consentimento` VARCHAR(120) NULL,
    `observacoes` TEXT NULL,
    `usuario_atualizacao_id` VARCHAR(191) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `PreferenciasComunicacaoCliente_usuario_atualizacao_id_idx`(`usuario_atualizacao_id`),
    PRIMARY KEY (`cliente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampanhasCRM` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `tipo_campanha` ENUM('REVIEW_BOOSTER', 'SEGMENTED_CAMPAIGN', 'INACTIVE_RECOVERY', 'PROFILE_OFFER', 'POST_SERVICE_TRIGGER') NOT NULL,
    `canal` ENUM('EMAIL', 'WHATSAPP') NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `criterios` JSON NOT NULL,
    `data_ultima_execucao` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `CampanhasCRM_unidade_id_status_idx`(`unidade_id`, `status`),
    INDEX `CampanhasCRM_template_id_idx`(`template_id`),
    INDEX `CampanhasCRM_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExecucoesCampanhaCRM` (
    `id` VARCHAR(191) NOT NULL,
    `campanha_id` VARCHAR(191) NOT NULL,
    `usuario_execucao_id` VARCHAR(191) NULL,
    `status` ENUM('PREPARED', 'COMPLETED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PREPARED',
    `motivo_execucao` VARCHAR(191) NULL,
    `audiencia_snapshot` JSON NULL,
    `qtd_preparados` INTEGER NOT NULL DEFAULT 0,
    `qtd_disparados` INTEGER NOT NULL DEFAULT 0,
    `qtd_descartados` INTEGER NOT NULL DEFAULT 0,
    `qtd_falhas` INTEGER NOT NULL DEFAULT 0,
    `data_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_conclusao` DATETIME(3) NULL,

    INDEX `ExecucoesCampanhaCRM_campanha_id_data_inicio_idx`(`campanha_id`, `data_inicio`),
    INDEX `ExecucoesCampanhaCRM_usuario_execucao_id_idx`(`usuario_execucao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DestinatariosCampanhaCRM` (
    `id` VARCHAR(191) NOT NULL,
    `campanha_id` VARCHAR(191) NOT NULL,
    `execucao_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `message_log_id` VARCHAR(191) NULL,
    `canal` ENUM('EMAIL', 'WHATSAPP') NOT NULL,
    `status` ENUM('PREPARED', 'LAUNCHED', 'SKIPPED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PREPARED',
    `source_key` VARCHAR(191) NOT NULL,
    `mensagem_preparada` TEXT NOT NULL,
    `match_snapshot` JSON NULL,
    `consentimento_snapshot` JSON NULL,
    `motivo_descarte` VARCHAR(191) NULL,
    `data_disparo` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DestinatariosCampanhaCRM_message_log_id_key`(`message_log_id`),
    INDEX `DestinatariosCampanhaCRM_campanha_id_status_idx`(`campanha_id`, `status`),
    INDEX `DestinatariosCampanhaCRM_execucao_id_status_idx`(`execucao_id`, `status`),
    INDEX `DestinatariosCampanhaCRM_cliente_id_idx`(`cliente_id`),
    INDEX `DestinatariosCampanhaCRM_agendamento_id_idx`(`agendamento_id`),
    INDEX `DestinatariosCampanhaCRM_source_key_idx`(`source_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PreferenciasComunicacaoCliente` ADD CONSTRAINT `PreferenciasComunicacaoCliente_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PreferenciasComunicacaoCliente` ADD CONSTRAINT `PreferenciasComunicacaoCliente_usuario_atualizacao_id_fkey` FOREIGN KEY (`usuario_atualizacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanhasCRM` ADD CONSTRAINT `CampanhasCRM_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanhasCRM` ADD CONSTRAINT `CampanhasCRM_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `TemplatesMensagem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampanhasCRM` ADD CONSTRAINT `CampanhasCRM_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExecucoesCampanhaCRM` ADD CONSTRAINT `ExecucoesCampanhaCRM_campanha_id_fkey` FOREIGN KEY (`campanha_id`) REFERENCES `CampanhasCRM`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExecucoesCampanhaCRM` ADD CONSTRAINT `ExecucoesCampanhaCRM_usuario_execucao_id_fkey` FOREIGN KEY (`usuario_execucao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinatariosCampanhaCRM` ADD CONSTRAINT `DestinatariosCampanhaCRM_campanha_id_fkey` FOREIGN KEY (`campanha_id`) REFERENCES `CampanhasCRM`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinatariosCampanhaCRM` ADD CONSTRAINT `DestinatariosCampanhaCRM_execucao_id_fkey` FOREIGN KEY (`execucao_id`) REFERENCES `ExecucoesCampanhaCRM`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinatariosCampanhaCRM` ADD CONSTRAINT `DestinatariosCampanhaCRM_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinatariosCampanhaCRM` ADD CONSTRAINT `DestinatariosCampanhaCRM_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinatariosCampanhaCRM` ADD CONSTRAINT `DestinatariosCampanhaCRM_message_log_id_fkey` FOREIGN KEY (`message_log_id`) REFERENCES `LogsMensagens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
