-- CreateTable
CREATE TABLE `CapacidadeAgendamento` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `funcionario_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `porte_pet` ENUM('SMALL', 'MEDIUM', 'LARGE', 'GIANT', 'UNKNOWN') NULL,
    `raca_pet` VARCHAR(120) NULL,
    `capacidade_maxima_concorrente` INTEGER NOT NULL DEFAULT 1,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `CapacidadeAgendamento_unidade_id_ativo_idx`(`unidade_id`, `ativo`),
    INDEX `CapacidadeAgendamento_funcionario_id_ativo_idx`(`funcionario_id`, `ativo`),
    INDEX `CapacidadeAgendamento_porte_pet_raca_pet_idx`(`porte_pet`, `raca_pet`),
    INDEX `CapacidadeAgendamento_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloqueiosAgenda` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `funcionario_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `tipo_bloqueio` ENUM('UNAVAILABLE', 'BREAK', 'HOLIDAY', 'TRANSPORT', 'OTHER') NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `data_hora_inicio` DATETIME(3) NOT NULL,
    `data_hora_fim` DATETIME(3) NOT NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `BloqueiosAgenda_unidade_id_ativo_data_hora_inicio_idx`(`unidade_id`, `ativo`, `data_hora_inicio`),
    INDEX `BloqueiosAgenda_funcionario_id_ativo_data_hora_inicio_idx`(`funcionario_id`, `ativo`, `data_hora_inicio`),
    INDEX `BloqueiosAgenda_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListaEspera` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `pet_id` VARCHAR(191) NOT NULL,
    `servico_desejado_id` VARCHAR(191) NOT NULL,
    `funcionario_preferido_id` VARCHAR(191) NULL,
    `agendamento_promovido_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `usuario_cancelamento_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROMOTED', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `data_hora_inicio_preferida` DATETIME(3) NOT NULL,
    `data_hora_fim_preferida` DATETIME(3) NOT NULL,
    `solicita_transporte` BOOLEAN NOT NULL DEFAULT false,
    `observacoes` TEXT NULL,
    `motivo_cancelamento` TEXT NULL,
    `data_solicitacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao_status` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ListaEspera_agendamento_promovido_id_key`(`agendamento_promovido_id`),
    INDEX `ListaEspera_unidade_id_status_data_hora_inicio_preferida_idx`(`unidade_id`, `status`, `data_hora_inicio_preferida`),
    INDEX `ListaEspera_cliente_id_idx`(`cliente_id`),
    INDEX `ListaEspera_pet_id_idx`(`pet_id`),
    INDEX `ListaEspera_servico_desejado_id_idx`(`servico_desejado_id`),
    INDEX `ListaEspera_funcionario_preferido_id_idx`(`funcionario_preferido_id`),
    INDEX `ListaEspera_usuario_criacao_id_idx`(`usuario_criacao_id`),
    INDEX `ListaEspera_usuario_cancelamento_id_idx`(`usuario_cancelamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxiDog` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `agendamento_id` VARCHAR(191) NOT NULL,
    `motorista_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `status` ENUM('REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'REQUESTED',
    `endereco_coleta` VARCHAR(255) NULL,
    `endereco_entrega` VARCHAR(255) NULL,
    `janela_coleta_inicio` DATETIME(3) NULL,
    `janela_coleta_fim` DATETIME(3) NULL,
    `janela_entrega_inicio` DATETIME(3) NULL,
    `janela_entrega_fim` DATETIME(3) NULL,
    `valor_transporte` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TaxiDog_agendamento_id_key`(`agendamento_id`),
    INDEX `TaxiDog_unidade_id_status_idx`(`unidade_id`, `status`),
    INDEX `TaxiDog_motorista_id_idx`(`motorista_id`),
    INDEX `TaxiDog_janela_coleta_inicio_idx`(`janela_coleta_inicio`),
    INDEX `TaxiDog_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CapacidadeAgendamento` ADD CONSTRAINT `CapacidadeAgendamento_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapacidadeAgendamento` ADD CONSTRAINT `CapacidadeAgendamento_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `Funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapacidadeAgendamento` ADD CONSTRAINT `CapacidadeAgendamento_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloqueiosAgenda` ADD CONSTRAINT `BloqueiosAgenda_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloqueiosAgenda` ADD CONSTRAINT `BloqueiosAgenda_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `Funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloqueiosAgenda` ADD CONSTRAINT `BloqueiosAgenda_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `Pets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_servico_desejado_id_fkey` FOREIGN KEY (`servico_desejado_id`) REFERENCES `Servicos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_funcionario_preferido_id_fkey` FOREIGN KEY (`funcionario_preferido_id`) REFERENCES `Funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_agendamento_promovido_id_fkey` FOREIGN KEY (`agendamento_promovido_id`) REFERENCES `Agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListaEspera` ADD CONSTRAINT `ListaEspera_usuario_cancelamento_id_fkey` FOREIGN KEY (`usuario_cancelamento_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiDog` ADD CONSTRAINT `TaxiDog_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiDog` ADD CONSTRAINT `TaxiDog_agendamento_id_fkey` FOREIGN KEY (`agendamento_id`) REFERENCES `Agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiDog` ADD CONSTRAINT `TaxiDog_motorista_id_fkey` FOREIGN KEY (`motorista_id`) REFERENCES `Funcionarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiDog` ADD CONSTRAINT `TaxiDog_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
