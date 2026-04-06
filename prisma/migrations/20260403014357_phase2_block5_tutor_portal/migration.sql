-- CreateTable
CREATE TABLE `PreCheckInTutor` (
    `id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NOT NULL,
    `usuario_envio_id` VARCHAR(191) NULL,
    `telefone_contato` VARCHAR(32) NULL,
    `consentimento_confirmado` BOOLEAN NOT NULL DEFAULT false,
    `observacoes` TEXT NULL,
    `payload_snapshot` JSON NOT NULL,
    `data_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PreCheckInTutor_agendamento_id_key`(`agendamento_id`),
    INDEX `PreCheckInTutor_usuario_envio_id_idx`(`usuario_envio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PreCheckInTutor` ADD CONSTRAINT `PreCheckInTutor_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PreCheckInTutor` ADD CONSTRAINT `PreCheckInTutor_usuario_envio_id_fkey` FOREIGN KEY (`usuario_envio_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
