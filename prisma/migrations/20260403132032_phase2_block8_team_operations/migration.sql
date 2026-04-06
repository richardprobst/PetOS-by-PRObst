-- AlterTable
ALTER TABLE `Funcionarios` ADD COLUMN `jornada_padrao_minutos` INTEGER NOT NULL DEFAULT 480,
    ADD COLUMN `modo_folha` ENUM('MONTHLY', 'HOURLY', 'COMMISSION_ONLY') NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN `valor_base_folha` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `EscalasEquipe` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `funcionario_id` VARCHAR(191) NOT NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `tipo_escala` ENUM('WORK', 'ON_CALL', 'TRAINING', 'DAY_OFF') NOT NULL DEFAULT 'WORK',
    `status` ENUM('PLANNED', 'CONFIRMED', 'CANCELED') NOT NULL DEFAULT 'PLANNED',
    `data_hora_inicio` DATETIME(3) NOT NULL,
    `data_hora_fim` DATETIME(3) NOT NULL,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `EscalasEquipe_unidade_id_status_data_hora_inicio_idx`(`unidade_id`, `status`, `data_hora_inicio`),
    INDEX `EscalasEquipe_funcionario_id_status_data_hora_inicio_idx`(`funcionario_id`, `status`, `data_hora_inicio`),
    INDEX `EscalasEquipe_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegistrosPonto` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `funcionario_id` VARCHAR(191) NOT NULL,
    `escala_id` VARCHAR(191) NULL,
    `usuario_abertura_id` VARCHAR(191) NULL,
    `usuario_fechamento_id` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'CLOSED', 'ADJUSTED', 'VOIDED') NOT NULL DEFAULT 'OPEN',
    `data_hora_entrada` DATETIME(3) NOT NULL,
    `data_hora_saida` DATETIME(3) NULL,
    `minutos_intervalo` INTEGER NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `RegistrosPonto_unidade_id_status_data_hora_entrada_idx`(`unidade_id`, `status`, `data_hora_entrada`),
    INDEX `RegistrosPonto_funcionario_id_status_data_hora_entrada_idx`(`funcionario_id`, `status`, `data_hora_entrada`),
    INDEX `RegistrosPonto_escala_id_idx`(`escala_id`),
    INDEX `RegistrosPonto_usuario_abertura_id_idx`(`usuario_abertura_id`),
    INDEX `RegistrosPonto_usuario_fechamento_id_idx`(`usuario_fechamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FolhasPagamento` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `usuario_fechamento_id` VARCHAR(191) NULL,
    `periodo_inicio` DATETIME(3) NOT NULL,
    `periodo_fim` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'FINALIZED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `observacoes` TEXT NULL,
    `data_fechamento` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `FolhasPagamento_unidade_id_status_periodo_inicio_idx`(`unidade_id`, `status`, `periodo_inicio`),
    INDEX `FolhasPagamento_usuario_criacao_id_idx`(`usuario_criacao_id`),
    INDEX `FolhasPagamento_usuario_fechamento_id_idx`(`usuario_fechamento_id`),
    UNIQUE INDEX `FolhasPagamento_unidade_id_periodo_inicio_periodo_fim_key`(`unidade_id`, `periodo_inicio`, `periodo_fim`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItensFolhaPagamento` (
    `id` VARCHAR(191) NOT NULL,
    `folha_pagamento_id` VARCHAR(191) NOT NULL,
    `funcionario_id` VARCHAR(191) NOT NULL,
    `modo_folha_snapshot` ENUM('MONTHLY', 'HOURLY', 'COMMISSION_ONLY') NOT NULL,
    `valor_base` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `minutos_previstos` INTEGER NOT NULL DEFAULT 0,
    `minutos_trabalhados` INTEGER NOT NULL DEFAULT 0,
    `minutos_extras` INTEGER NOT NULL DEFAULT 0,
    `minutos_faltantes` INTEGER NOT NULL DEFAULT 0,
    `valor_comissao` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valor_ajuste_manual` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valor_desconto_manual` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valor_bruto` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valor_liquido` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `ItensFolhaPagamento_funcionario_id_idx`(`funcionario_id`),
    UNIQUE INDEX `ItensFolhaPagamento_folha_pagamento_id_funcionario_id_key`(`folha_pagamento_id`, `funcionario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EscalasEquipe` ADD CONSTRAINT `EscalasEquipe_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalasEquipe` ADD CONSTRAINT `EscalasEquipe_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `Funcionarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalasEquipe` ADD CONSTRAINT `EscalasEquipe_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistrosPonto` ADD CONSTRAINT `RegistrosPonto_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistrosPonto` ADD CONSTRAINT `RegistrosPonto_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `Funcionarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistrosPonto` ADD CONSTRAINT `RegistrosPonto_escala_id_fkey` FOREIGN KEY (`escala_id`) REFERENCES `EscalasEquipe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistrosPonto` ADD CONSTRAINT `RegistrosPonto_usuario_abertura_id_fkey` FOREIGN KEY (`usuario_abertura_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistrosPonto` ADD CONSTRAINT `RegistrosPonto_usuario_fechamento_id_fkey` FOREIGN KEY (`usuario_fechamento_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FolhasPagamento` ADD CONSTRAINT `FolhasPagamento_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FolhasPagamento` ADD CONSTRAINT `FolhasPagamento_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FolhasPagamento` ADD CONSTRAINT `FolhasPagamento_usuario_fechamento_id_fkey` FOREIGN KEY (`usuario_fechamento_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItensFolhaPagamento` ADD CONSTRAINT `ItensFolhaPagamento_folha_pagamento_id_fkey` FOREIGN KEY (`folha_pagamento_id`) REFERENCES `FolhasPagamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItensFolhaPagamento` ADD CONSTRAINT `ItensFolhaPagamento_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `Funcionarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
