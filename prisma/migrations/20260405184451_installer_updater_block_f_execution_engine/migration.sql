-- CreateTable
CREATE TABLE `ExecucoesUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `iniciado_por_usuario_id` VARCHAR(191) NULL,
    `concluido_por_usuario_id` VARCHAR(191) NULL,
    `retentativa_da_execucao_id` VARCHAR(191) NULL,
    `modo_execucao` ENUM('MANUAL', 'RETRY') NOT NULL DEFAULT 'MANUAL',
    `status_execucao` ENUM('PREPARING', 'RUNNING', 'FAILED', 'COMPLETED') NOT NULL DEFAULT 'PREPARING',
    `estado_recovery` ENUM('NONE', 'RETRY_AVAILABLE', 'MANUAL_INTERVENTION_REQUIRED') NOT NULL DEFAULT 'NONE',
    `versao_origem` VARCHAR(64) NOT NULL,
    `versao_alvo` VARCHAR(64) NOT NULL,
    `manifest_hash` VARCHAR(191) NOT NULL,
    `seed_policy` VARCHAR(64) NOT NULL,
    `exige_manutencao` BOOLEAN NOT NULL DEFAULT false,
    `exige_backup` BOOLEAN NOT NULL DEFAULT false,
    `ultimo_passo_sucesso` VARCHAR(64) NULL,
    `ultimo_passo_falha` VARCHAR(64) NULL,
    `resumo_falha` TEXT NULL,
    `preflight_json` JSON NULL,
    `lock_expira_em` DATETIME(3) NOT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluido_em` DATETIME(3) NULL,
    `falhou_em` DATETIME(3) NULL,
    `manutencao_ativada_em` DATETIME(3) NULL,
    `manutencao_desativada_em` DATETIME(3) NULL,
    `quantidade_retentativas` INTEGER NOT NULL DEFAULT 0,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `ExecucoesUpdate_status_execucao_lock_expira_em_idx`(`status_execucao`, `lock_expira_em`),
    INDEX `ExecucoesUpdate_iniciado_por_usuario_id_idx`(`iniciado_por_usuario_id`),
    INDEX `ExecucoesUpdate_concluido_por_usuario_id_idx`(`concluido_por_usuario_id`),
    INDEX `ExecucoesUpdate_retentativa_da_execucao_id_idx`(`retentativa_da_execucao_id`),
    INDEX `ExecucoesUpdate_iniciado_em_idx`(`iniciado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PassosExecucaoUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `execucao_update_id` VARCHAR(191) NOT NULL,
    `codigo_passo` VARCHAR(64) NOT NULL,
    `titulo_passo` VARCHAR(191) NOT NULL,
    `ordem_passo` INTEGER NOT NULL,
    `status_passo` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `payload_json` JSON NULL,
    `resumo_erro` TEXT NULL,
    `iniciado_em` DATETIME(3) NULL,
    `concluido_em` DATETIME(3) NULL,
    `falhou_em` DATETIME(3) NULL,
    `duracao_ms` INTEGER NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `PassosExecucaoUpdate_execucao_update_id_ordem_passo_idx`(`execucao_update_id`, `ordem_passo`),
    INDEX `PassosExecucaoUpdate_status_passo_idx`(`status_passo`),
    UNIQUE INDEX `PassosExecucaoUpdate_execucao_update_id_codigo_passo_key`(`execucao_update_id`, `codigo_passo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExecucoesUpdate` ADD CONSTRAINT `ExecucoesUpdate_iniciado_por_usuario_id_fkey` FOREIGN KEY (`iniciado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExecucoesUpdate` ADD CONSTRAINT `ExecucoesUpdate_concluido_por_usuario_id_fkey` FOREIGN KEY (`concluido_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExecucoesUpdate` ADD CONSTRAINT `ExecucoesUpdate_retentativa_da_execucao_id_fkey` FOREIGN KEY (`retentativa_da_execucao_id`) REFERENCES `ExecucoesUpdate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PassosExecucaoUpdate` ADD CONSTRAINT `PassosExecucaoUpdate_execucao_update_id_fkey` FOREIGN KEY (`execucao_update_id`) REFERENCES `ExecucoesUpdate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
