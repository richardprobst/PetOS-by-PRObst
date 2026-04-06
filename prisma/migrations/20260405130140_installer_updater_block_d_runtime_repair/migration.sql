-- CreateTable
CREATE TABLE `IncidentesRecovery` (
    `id` VARCHAR(191) NOT NULL,
    `aberto_por_usuario_id` VARCHAR(191) NULL,
    `resolvido_por_usuario_id` VARCHAR(191) NULL,
    `estado_ciclo_vida` ENUM('NOT_INSTALLED', 'INSTALLING', 'INSTALLED', 'INSTALL_FAILED', 'MAINTENANCE', 'UPDATING', 'UPDATE_FAILED', 'REPAIR') NOT NULL,
    `status_incidente` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `titulo` VARCHAR(191) NOT NULL,
    `resumo` TEXT NOT NULL,
    `detalhes_json` JSON NULL,
    `aberto_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvido_em` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `IncidentesRecovery_status_aberto_em_idx`(`status_incidente`, `aberto_em`),
    INDEX `IncidentesRecovery_aberto_por_usuario_id_idx`(`aberto_por_usuario_id`),
    INDEX `IncidentesRecovery_resolvido_por_usuario_id_idx`(`resolvido_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IncidentesRecovery` ADD CONSTRAINT `IncidentesRecovery_aberto_por_usuario_id_fkey` FOREIGN KEY (`aberto_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentesRecovery` ADD CONSTRAINT `IncidentesRecovery_resolvido_por_usuario_id_fkey` FOREIGN KEY (`resolvido_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
