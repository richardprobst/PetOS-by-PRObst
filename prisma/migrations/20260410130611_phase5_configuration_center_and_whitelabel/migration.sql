-- CreateTable
CREATE TABLE `BrandingTenant` (
    `chave_branding` VARCHAR(64) NOT NULL DEFAULT 'default',
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `nome_publico` VARCHAR(191) NOT NULL,
    `nome_curto` VARCHAR(64) NULL,
    `nome_juridico` VARCHAR(191) NULL,
    `slug_publico` VARCHAR(120) NOT NULL,
    `dominio_principal` VARCHAR(191) NULL,
    `email_suporte` VARCHAR(191) NULL,
    `telefone_suporte` VARCHAR(32) NULL,
    `tagline_publica` TEXT NULL,
    `titulo_login` VARCHAR(191) NULL,
    `descricao_login` TEXT NULL,
    `titulo_tutor` VARCHAR(191) NULL,
    `descricao_tutor` TEXT NULL,
    `assinatura_email_nome` VARCHAR(191) NULL,
    `rodape_email` TEXT NULL,
    `cabecalho_report_card` TEXT NULL,
    `rodape_report_card` TEXT NULL,
    `tema_json` JSON NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BrandingTenant_slug_key`(`slug_publico`),
    INDEX `BrandingTenant_atualizado_por_usuario_id_idx`(`atualizado_por_usuario_id`),
    PRIMARY KEY (`chave_branding`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrandingUnidade` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `branding_tenant_id` VARCHAR(64) NULL,
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `nome_publico_override` VARCHAR(191) NULL,
    `nome_curto_override` VARCHAR(64) NULL,
    `email_suporte_override` VARCHAR(191) NULL,
    `telefone_suporte_override` VARCHAR(32) NULL,
    `tagline_publica_override` TEXT NULL,
    `titulo_login_override` VARCHAR(191) NULL,
    `descricao_login_override` TEXT NULL,
    `titulo_tutor_override` VARCHAR(191) NULL,
    `descricao_tutor_override` TEXT NULL,
    `assinatura_email_nome_override` VARCHAR(191) NULL,
    `rodape_email_override` TEXT NULL,
    `cabecalho_report_card_override` TEXT NULL,
    `rodape_report_card_override` TEXT NULL,
    `tema_override_json` JSON NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BrandingUnidade_unidade_id_key`(`unidade_id`),
    INDEX `BrandingUnidade_branding_tenant_id_idx`(`branding_tenant_id`),
    INDEX `BrandingUnidade_atualizado_por_usuario_id_idx`(`atualizado_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrandAssets` (
    `id` VARCHAR(191) NOT NULL,
    `branding_tenant_id` VARCHAR(64) NULL,
    `branding_unidade_id` VARCHAR(191) NULL,
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `papel_asset` ENUM('LOGO_PRIMARY', 'LOGO_MONO', 'FAVICON', 'PWA_ICON_192', 'PWA_ICON_512', 'LOGIN_IMAGE', 'OG_IMAGE', 'EMAIL_HEADER', 'DOCUMENT_HEADER', 'DOCUMENT_FOOTER') NOT NULL,
    `rotulo` VARCHAR(191) NULL,
    `asset_url` VARCHAR(512) NOT NULL,
    `texto_alternativo` VARCHAR(255) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `BrandAssets_branding_tenant_id_papel_asset_idx`(`branding_tenant_id`, `papel_asset`),
    INDEX `BrandAssets_branding_unidade_id_papel_asset_idx`(`branding_unidade_id`, `papel_asset`),
    INDEX `BrandAssets_atualizado_por_usuario_id_idx`(`atualizado_por_usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DominiosVinculados` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `hostname` VARCHAR(191) NOT NULL,
    `superficie` ENUM('PUBLIC_SITE', 'AUTH', 'TUTOR', 'ADMIN') NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `principal` BOOLEAN NOT NULL DEFAULT false,
    `verificado_em` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DominiosVinculados_hostname_key`(`hostname`),
    INDEX `DominiosVinculados_unidade_id_superficie_idx`(`unidade_id`, `superficie`),
    INDEX `DominiosVinculados_atualizado_por_usuario_id_idx`(`atualizado_por_usuario_id`),
    INDEX `DominiosVinculados_status_superficie_idx`(`status`, `superficie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConexoesIntegracao` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NULL,
    `atualizado_por_usuario_id` VARCHAR(191) NULL,
    `provedor_chave` VARCHAR(120) NOT NULL,
    `nome_exibicao` VARCHAR(191) NOT NULL,
    `escopo` ENUM('SYSTEM_GLOBAL', 'TENANT_GLOBAL', 'UNIT', 'PUBLIC_BRAND', 'INTEGRATION_SECRET') NOT NULL,
    `status` ENUM('DISABLED', 'CONFIGURED', 'READY', 'ERROR') NOT NULL DEFAULT 'DISABLED',
    `status_health` ENUM('NOT_CONFIGURED', 'PENDING_VALIDATION', 'READY', 'WARNING', 'ERROR') NOT NULL DEFAULT 'NOT_CONFIGURED',
    `config_json` JSON NULL,
    `ambiente_json` JSON NULL,
    `testado_em` DATETIME(3) NULL,
    `ultimo_erro` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `ConexoesIntegracao_atualizado_por_usuario_id_idx`(`atualizado_por_usuario_id`),
    INDEX `ConexoesIntegracao_status_health_status_idx`(`status_health`, `status`),
    INDEX `ConexoesIntegracao_unidade_id_idx`(`unidade_id`),
    UNIQUE INDEX `ConexoesIntegracao_escopo_unidade_id_provedor_chave_key`(`escopo`, `unidade_id`, `provedor_chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SegredosIntegracao` (
    `id` VARCHAR(191) NOT NULL,
    `conexao_integracao_id` VARCHAR(191) NOT NULL,
    `rotacionado_por_usuario_id` VARCHAR(191) NULL,
    `segredo_chave` VARCHAR(120) NOT NULL,
    `valor_cifrado` TEXT NOT NULL,
    `valor_mascarado` VARCHAR(64) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `rotacionado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `SegredosIntegracao_rotacionado_por_usuario_id_idx`(`rotacionado_por_usuario_id`),
    INDEX `SegredosIntegracao_conexao_integracao_id_idx`(`conexao_integracao_id`),
    UNIQUE INDEX `SegredosIntegracao_conexao_integracao_id_segredo_chave_key`(`conexao_integracao_id`, `segredo_chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AprovacoesConfiguracao` (
    `id` VARCHAR(191) NOT NULL,
    `solicitado_por_usuario_id` VARCHAR(191) NULL,
    `decidido_por_usuario_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `nivel_impacto` ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    `resumo` TEXT NULL,
    `motivo` TEXT NULL,
    `snapshot_json` JSON NOT NULL,
    `diff_json` JSON NULL,
    `solicitado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidido_em` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `AprovacoesConfiguracao_solicitado_por_usuario_id_idx`(`solicitado_por_usuario_id`),
    INDEX `AprovacoesConfiguracao_decidido_por_usuario_id_idx`(`decidido_por_usuario_id`),
    INDEX `AprovacoesConfiguracao_status_solicitado_em_idx`(`status`, `solicitado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublicacoesConfiguracao` (
    `id` VARCHAR(191) NOT NULL,
    `publicado_por_usuario_id` VARCHAR(191) NULL,
    `aprovacao_configuracao_id` VARCHAR(191) NULL,
    `rollback_da_publicacao_id` VARCHAR(191) NULL,
    `versao` INTEGER NOT NULL,
    `snapshot_hash` VARCHAR(191) NOT NULL,
    `resumo` TEXT NULL,
    `snapshot_json` JSON NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `PublicacoesConfiguracao_publicado_por_usuario_id_idx`(`publicado_por_usuario_id`),
    INDEX `PublicacoesConfiguracao_aprovacao_configuracao_id_idx`(`aprovacao_configuracao_id`),
    INDEX `PublicacoesConfiguracao_rollback_da_publicacao_id_idx`(`rollback_da_publicacao_id`),
    INDEX `PublicacoesConfiguracao_data_criacao_idx`(`data_criacao`),
    UNIQUE INDEX `PublicacoesConfiguracao_versao_key`(`versao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BrandingTenant` ADD CONSTRAINT `BrandingTenant_atualizado_por_usuario_id_fkey` FOREIGN KEY (`atualizado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandingUnidade` ADD CONSTRAINT `BrandingUnidade_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandingUnidade` ADD CONSTRAINT `BrandingUnidade_branding_tenant_id_fkey` FOREIGN KEY (`branding_tenant_id`) REFERENCES `BrandingTenant`(`chave_branding`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandingUnidade` ADD CONSTRAINT `BrandingUnidade_atualizado_por_usuario_id_fkey` FOREIGN KEY (`atualizado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandAssets` ADD CONSTRAINT `BrandAssets_branding_tenant_id_fkey` FOREIGN KEY (`branding_tenant_id`) REFERENCES `BrandingTenant`(`chave_branding`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandAssets` ADD CONSTRAINT `BrandAssets_branding_unidade_id_fkey` FOREIGN KEY (`branding_unidade_id`) REFERENCES `BrandingUnidade`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandAssets` ADD CONSTRAINT `BrandAssets_atualizado_por_usuario_id_fkey` FOREIGN KEY (`atualizado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DominiosVinculados` ADD CONSTRAINT `DominiosVinculados_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DominiosVinculados` ADD CONSTRAINT `DominiosVinculados_atualizado_por_usuario_id_fkey` FOREIGN KEY (`atualizado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConexoesIntegracao` ADD CONSTRAINT `ConexoesIntegracao_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConexoesIntegracao` ADD CONSTRAINT `ConexoesIntegracao_atualizado_por_usuario_id_fkey` FOREIGN KEY (`atualizado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegredosIntegracao` ADD CONSTRAINT `SegredosIntegracao_conexao_integracao_id_fkey` FOREIGN KEY (`conexao_integracao_id`) REFERENCES `ConexoesIntegracao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegredosIntegracao` ADD CONSTRAINT `SegredosIntegracao_rotacionado_por_usuario_id_fkey` FOREIGN KEY (`rotacionado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AprovacoesConfiguracao` ADD CONSTRAINT `AprovacoesConfiguracao_solicitado_por_usuario_id_fkey` FOREIGN KEY (`solicitado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AprovacoesConfiguracao` ADD CONSTRAINT `AprovacoesConfiguracao_decidido_por_usuario_id_fkey` FOREIGN KEY (`decidido_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublicacoesConfiguracao` ADD CONSTRAINT `PublicacoesConfiguracao_publicado_por_usuario_id_fkey` FOREIGN KEY (`publicado_por_usuario_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublicacoesConfiguracao` ADD CONSTRAINT `PublicacoesConfiguracao_aprovacao_configuracao_id_fkey` FOREIGN KEY (`aprovacao_configuracao_id`) REFERENCES `AprovacoesConfiguracao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublicacoesConfiguracao` ADD CONSTRAINT `PublicacoesConfiguracao_rollback_da_publicacao_id_fkey` FOREIGN KEY (`rollback_da_publicacao_id`) REFERENCES `PublicacoesConfiguracao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
