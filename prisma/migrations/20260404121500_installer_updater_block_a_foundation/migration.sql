-- CreateTable
CREATE TABLE `EstadoRuntimeSistema` (
    `chave_runtime` VARCHAR(64) NOT NULL DEFAULT 'default',
    `estado_ciclo_vida` ENUM('NOT_INSTALLED', 'INSTALLING', 'INSTALLED', 'INSTALL_FAILED', 'MAINTENANCE', 'UPDATING', 'UPDATE_FAILED', 'REPAIR') NOT NULL DEFAULT 'NOT_INSTALLED',
    `instalador_bloqueado_em` DATETIME(3) NULL,
    `instalacao_concluida_em` DATETIME(3) NULL,
    `motivo_manutencao` VARCHAR(255) NULL,
    `manutencao_ativada_em` DATETIME(3) NULL,
    `versao_atual` VARCHAR(64) NULL,
    `versao_anterior` VARCHAR(64) NULL,
    `manifest_hash` VARCHAR(191) NULL,
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `data_ultima_transicao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    PRIMARY KEY (`chave_runtime`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
