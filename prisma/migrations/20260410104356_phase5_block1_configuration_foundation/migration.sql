-- CreateTable
CREATE TABLE `ConfiguracoesSistema` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `chave` VARCHAR(191) NOT NULL,
    `escopo` ENUM('SYSTEM_GLOBAL', 'TENANT_GLOBAL', 'UNIT', 'PUBLIC_BRAND', 'INTEGRATION_SECRET') NOT NULL,
    `categoria` ENUM('GENERAL', 'OPERATION', 'COMMUNICATION', 'FINANCE_FISCAL', 'INTEGRATIONS', 'AI', 'PORTAL', 'SECURITY_ACCESS', 'WHITE_LABEL', 'DOMAINS') NOT NULL,
    `tipo_valor` ENUM('STRING', 'BOOLEAN', 'INTEGER', 'DECIMAL', 'JSON') NOT NULL,
    `valor_texto` TEXT NULL,
    `valor_json` JSON NULL,
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `ConfiguracoesSistema_categoria_escopo_idx`(`categoria`, `escopo`),
    INDEX `ConfiguracoesSistema_unidade_id_idx`(`unidade_id`),
    INDEX `ConfiguracoesSistema_atualizado_por_usuario_id_idx`(`atualizado_por_usuario_id`),
    UNIQUE INDEX `ConfiguracoesSistema_escopo_unidade_id_chave_key`(`escopo`, `unidade_id`, `chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MudancasConfiguracao` (
    `id` VARCHAR(191) NOT NULL,
    `configuracao_sistema_id` VARCHAR(191) NULL,
    `unidade_id` VARCHAR(191) NULL,
    `usuario_autor_id` VARCHAR(191) NULL,
    `tipo_mudanca` ENUM('CREATED', 'UPDATED', 'DELETED', 'PUBLISHED', 'ROLLED_BACK', 'SYSTEM_SYNC') NOT NULL,
    `escopo` ENUM('SYSTEM_GLOBAL', 'TENANT_GLOBAL', 'UNIT', 'PUBLIC_BRAND', 'INTEGRATION_SECRET') NOT NULL,
    `categoria` ENUM('GENERAL', 'OPERATION', 'COMMUNICATION', 'FINANCE_FISCAL', 'INTEGRATIONS', 'AI', 'PORTAL', 'SECURITY_ACCESS', 'WHITE_LABEL', 'DOMAINS') NOT NULL,
    `chave` VARCHAR(191) NOT NULL,
    `nivel_impacto` ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    `request_id` VARCHAR(191) NULL,
    `resumo` TEXT NULL,
    `antes_json` JSON NULL,
    `depois_json` JSON NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MudancasConfiguracao_configuracao_sistema_id_idx`(`configuracao_sistema_id`),
    INDEX `MudancasConfiguracao_unidade_id_data_criacao_idx`(`unidade_id`, `data_criacao`),
    INDEX `MudancasConfiguracao_usuario_autor_id_idx`(`usuario_autor_id`),
    INDEX `MudancasConfiguracao_escopo_categoria_data_criacao_idx`(`escopo`, `categoria`, `data_criacao`),
    INDEX `MudancasConfiguracao_chave_data_criacao_idx`(`chave`, `data_criacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfiguracoesSistema` ADD CONSTRAINT `ConfiguracoesSistema_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfiguracoesSistema` ADD CONSTRAINT `ConfiguracoesSistema_atualizado_por_usuario_id_fkey` FOREIGN KEY (`atualizado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MudancasConfiguracao` ADD CONSTRAINT `MudancasConfiguracao_configuracao_sistema_id_fkey` FOREIGN KEY (`configuracao_sistema_id`) REFERENCES `ConfiguracoesSistema`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MudancasConfiguracao` ADD CONSTRAINT `MudancasConfiguracao_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MudancasConfiguracao` ADD CONSTRAINT `MudancasConfiguracao_usuario_autor_id_fkey` FOREIGN KEY (`usuario_autor_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
