-- CreateTable
CREATE TABLE `AnalisesImagem` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `pet_id` VARCHAR(191) NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `midia_principal_id` VARCHAR(191) NOT NULL,
    `midia_comparacao_id` VARCHAR(191) NULL,
    `usuario_solicitacao_id` VARCHAR(191) NULL,
    `usuario_revisao_id` VARCHAR(191) NULL,
    `tipo_analise` ENUM('GALLERY_METADATA', 'PRE_POST_ASSISTED') NOT NULL,
    `status_execucao` ENUM('COMPLETED', 'BLOCKED', 'FAILED') NOT NULL,
    `status_revisao` ENUM('NOT_REQUIRED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
    `visibilidade` ENUM('INTERNAL_OPERATOR_AND_AUDIT') NOT NULL DEFAULT 'INTERNAL_OPERATOR_AND_AUDIT',
    `chave_inferencia` VARCHAR(191) NOT NULL,
    `request_id` VARCHAR(191) NULL,
    `execution_id` VARCHAR(191) NULL,
    `resumo_resultado` TEXT NULL,
    `sinais_json` JSON NULL,
    `recomendacoes_json` JSON NULL,
    `snapshot_envelope_json` JSON NOT NULL,
    `observacoes_revisao` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_revisao` DATETIME(3) NULL,
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `AnalisesImagem_unidade_id_tipo_analise_data_criacao_idx`(`unidade_id`, `tipo_analise`, `data_criacao`),
    INDEX `AnalisesImagem_cliente_id_idx`(`cliente_id`),
    INDEX `AnalisesImagem_pet_id_idx`(`pet_id`),
    INDEX `AnalisesImagem_agendamento_id_idx`(`agendamento_id`),
    INDEX `AnalisesImagem_midia_principal_id_idx`(`midia_principal_id`),
    INDEX `AnalisesImagem_midia_comparacao_id_idx`(`midia_comparacao_id`),
    INDEX `AnalisesImagem_usuario_solicitacao_id_idx`(`usuario_solicitacao_id`),
    INDEX `AnalisesImagem_usuario_revisao_id_idx`(`usuario_revisao_id`),
    INDEX `AnalisesImagem_status_execucao_status_revisao_idx`(`status_execucao`, `status_revisao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `Pets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_midia_principal_id_fkey` FOREIGN KEY (`midia_principal_id`) REFERENCES `Midia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_midia_comparacao_id_fkey` FOREIGN KEY (`midia_comparacao_id`) REFERENCES `Midia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_usuario_solicitacao_id_fkey` FOREIGN KEY (`usuario_solicitacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalisesImagem` ADD CONSTRAINT `AnalisesImagem_usuario_revisao_id_fkey` FOREIGN KEY (`usuario_revisao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
