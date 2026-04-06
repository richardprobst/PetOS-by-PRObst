-- AlterTable
ALTER TABLE `Documentos` ADD COLUMN `data_arquivamento` DATETIME(3) NULL,
    ADD COLUMN `motivo_arquivamento` TEXT NULL,
    ADD COLUMN `usuario_arquivamento_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Midia` ADD COLUMN `data_arquivamento` DATETIME(3) NULL,
    ADD COLUMN `motivo_arquivamento` TEXT NULL,
    ADD COLUMN `usuario_arquivamento_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Documentos_usuario_arquivamento_id_idx` ON `Documentos`(`usuario_arquivamento_id`);

-- CreateIndex
CREATE INDEX `Documentos_data_arquivamento_idx` ON `Documentos`(`data_arquivamento`);

-- CreateIndex
CREATE INDEX `Midia_usuario_arquivamento_id_idx` ON `Midia`(`usuario_arquivamento_id`);

-- CreateIndex
CREATE INDEX `Midia_data_arquivamento_idx` ON `Midia`(`data_arquivamento`);

-- AddForeignKey
ALTER TABLE `Documentos` ADD CONSTRAINT `Documentos_usuario_arquivamento_id_fkey` FOREIGN KEY (`usuario_arquivamento_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_usuario_arquivamento_id_fkey` FOREIGN KEY (`usuario_arquivamento_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
