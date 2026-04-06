-- AlterTable
ALTER TABLE `Depositos` ADD COLUMN `finalidade` ENUM('SECURITY', 'PREPAYMENT') NOT NULL DEFAULT 'SECURITY';

-- AlterTable
ALTER TABLE `EventosIntegracao` MODIFY `status_processamento` ENUM('PENDING', 'RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE `Reembolsos` ADD COLUMN `deposito_origem_id` VARCHAR(191) NULL,
    ADD COLUMN `transacao_financeira_origem_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TransacoesFinanceiras` ADD COLUMN `metadados_json` JSON NULL,
    ADD COLUMN `provedor_integracao` ENUM('STRIPE', 'MERCADO_PAGO', 'FISCAL', 'OTHER') NULL,
    MODIFY `tipo_transacao` ENUM('REVENUE', 'EXPENSE', 'ADJUSTMENT', 'DEPOSIT', 'REFUND') NOT NULL,
    MODIFY `metodo_pagamento` ENUM('CASH', 'PIX', 'CARD', 'BOLETO', 'TRANSFER', 'CLIENT_CREDIT', 'OTHER') NULL;

-- CreateTable
CREATE TABLE `DocumentosFiscais` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NULL,
    `transacao_financeira_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `provedor_nome` VARCHAR(191) NULL,
    `tipo_documento` ENUM('SERVICE_INVOICE', 'CONSUMER_RECEIPT') NOT NULL,
    `status` ENUM('PENDING', 'ISSUED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `referencia_externa` VARCHAR(191) NULL,
    `numero_documento` VARCHAR(64) NULL,
    `serie` VARCHAR(64) NULL,
    `chave_acesso` VARCHAR(128) NULL,
    `data_emissao` DATETIME(3) NULL,
    `data_cancelamento` DATETIME(3) NULL,
    `ultimo_erro` TEXT NULL,
    `metadados_json` JSON NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `DocumentosFiscais_unidade_id_status_idx`(`unidade_id`, `status`),
    INDEX `DocumentosFiscais_agendamento_id_idx`(`agendamento_id`),
    INDEX `DocumentosFiscais_transacao_financeira_id_idx`(`transacao_financeira_id`),
    INDEX `DocumentosFiscais_usuario_criacao_id_idx`(`usuario_criacao_id`),
    INDEX `DocumentosFiscais_provedor_nome_referencia_externa_idx`(`provedor_nome`, `referencia_externa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Reembolsos_transacao_financeira_origem_id_idx` ON `Reembolsos`(`transacao_financeira_origem_id`);

-- CreateIndex
CREATE INDEX `Reembolsos_deposito_origem_id_idx` ON `Reembolsos`(`deposito_origem_id`);

-- CreateIndex
CREATE INDEX `TransacoesFinanceiras_provedor_integracao_referencia_externa_idx` ON `TransacoesFinanceiras`(`provedor_integracao`, `referencia_externa`);

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_transacao_financeira_origem_id_fkey` FOREIGN KEY (`transacao_financeira_origem_id`) REFERENCES `TransacoesFinanceiras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reembolsos` ADD CONSTRAINT `Reembolsos_deposito_origem_id_fkey` FOREIGN KEY (`deposito_origem_id`) REFERENCES `Depositos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentosFiscais` ADD CONSTRAINT `DocumentosFiscais_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentosFiscais` ADD CONSTRAINT `DocumentosFiscais_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentosFiscais` ADD CONSTRAINT `DocumentosFiscais_transacao_financeira_id_fkey` FOREIGN KEY (`transacao_financeira_id`) REFERENCES `TransacoesFinanceiras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentosFiscais` ADD CONSTRAINT `DocumentosFiscais_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
