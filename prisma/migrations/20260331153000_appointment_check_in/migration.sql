-- CreateTable
CREATE TABLE `CheckInAgendamento` (
  `id` VARCHAR(191) NOT NULL,
  `agendamento_id` VARCHAR(191) NOT NULL,
  `usuario_execucao_id` VARCHAR(191) NULL,
  `data_hora_execucao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `checklist_snapshot` JSON NOT NULL,
  `observacoes` TEXT NULL,

  UNIQUE INDEX `CheckInAgendamento_agendamento_id_key`(`agendamento_id`),
  INDEX `CheckInAgendamento_usuario_execucao_id_idx`(`usuario_execucao_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CheckInAgendamento` ADD CONSTRAINT `CheckInAgendamento_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckInAgendamento` ADD CONSTRAINT `CheckInAgendamento_usuario_execucao_id_fkey` FOREIGN KEY (`usuario_execucao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
