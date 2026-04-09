-- CreateTable
CREATE TABLE `InsightsPreditivos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `usuario_solicitacao_id` VARCHAR(191) NULL,
    `usuario_feedback_id` VARCHAR(191) NULL,
    `tipo_insight` ENUM('APPOINTMENT_DEMAND_FORECAST') NOT NULL,
    `status_execucao` ENUM('COMPLETED', 'BLOCKED', 'FAILED') NOT NULL,
    `visibilidade` ENUM('INTERNAL_OPERATOR_AND_AUDIT') NOT NULL DEFAULT 'INTERNAL_OPERATOR_AND_AUDIT',
    `status_feedback` ENUM('PENDING', 'ACKNOWLEDGED', 'ACTION_PLANNED', 'NOT_USEFUL') NOT NULL DEFAULT 'PENDING',
    `chave_inferencia` VARCHAR(191) NOT NULL,
    `request_id` VARCHAR(191) NULL,
    `execution_id` VARCHAR(191) NULL,
    `data_snapshot` DATETIME(3) NOT NULL,
    `janela_historica_inicio` DATETIME(3) NOT NULL,
    `janela_historica_fim` DATETIME(3) NOT NULL,
    `janela_previsao_inicio` DATETIME(3) NOT NULL,
    `janela_previsao_fim` DATETIME(3) NOT NULL,
    `resumo_resultado` TEXT NULL,
    `explicacao_json` JSON NOT NULL,
    `sinais_json` JSON NULL,
    `recomendacoes_json` JSON NULL,
    `snapshot_envelope_json` JSON NOT NULL,
    `observacoes_feedback` TEXT NULL,
    `data_feedback` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `InsightsPreditivos_unidade_id_tipo_data_criacao_idx`(`unidade_id`, `tipo_insight`, `data_criacao`),
    INDEX `InsightsPreditivos_status_feedback_data_criacao_idx`(`status_feedback`, `data_criacao`),
    INDEX `InsightsPreditivos_usuario_solicitacao_id_idx`(`usuario_solicitacao_id`),
    INDEX `InsightsPreditivos_usuario_feedback_id_idx`(`usuario_feedback_id`),
    UNIQUE INDEX `InsightsPreditivos_unidade_id_tipo_data_snapshot_key`(`unidade_id`, `tipo_insight`, `data_snapshot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InsightsPreditivos` ADD CONSTRAINT `InsightsPreditivos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsightsPreditivos` ADD CONSTRAINT `InsightsPreditivos_usuario_solicitacao_id_fkey` FOREIGN KEY (`usuario_solicitacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsightsPreditivos` ADD CONSTRAINT `InsightsPreditivos_usuario_feedback_id_fkey` FOREIGN KEY (`usuario_feedback_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
