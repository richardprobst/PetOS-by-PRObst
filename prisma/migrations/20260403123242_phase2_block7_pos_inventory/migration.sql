-- AlterTable
ALTER TABLE `TransacoesFinanceiras` ADD COLUMN `venda_pdv_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Produtos` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(64) NULL,
    `codigo_barras` VARCHAR(64) NULL,
    `descricao` TEXT NULL,
    `unidade_medida` VARCHAR(32) NOT NULL DEFAULT 'UN',
    `preco_venda` DECIMAL(10, 2) NOT NULL,
    `preco_custo` DECIMAL(10, 2) NULL,
    `estoque_minimo` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `controla_estoque` BOOLEAN NOT NULL DEFAULT true,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `Produtos_unidade_id_ativo_idx`(`unidade_id`, `ativo`),
    UNIQUE INDEX `Produtos_unidade_id_sku_key`(`unidade_id`, `sku`),
    UNIQUE INDEX `Produtos_unidade_id_codigo_barras_key`(`unidade_id`, `codigo_barras`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstoquesProduto` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `produto_id` VARCHAR(191) NOT NULL,
    `quantidade_atual` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `data_ultimo_movimento` DATETIME(3) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `EstoquesProduto_produto_id_idx`(`produto_id`),
    INDEX `EstoquesProduto_unidade_id_quantidade_atual_idx`(`unidade_id`, `quantidade_atual`),
    UNIQUE INDEX `EstoquesProduto_unidade_id_produto_id_key`(`unidade_id`, `produto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimentacoesEstoque` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `produto_id` VARCHAR(191) NOT NULL,
    `venda_pdv_id` VARCHAR(191) NULL,
    `item_venda_pdv_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `tipo_movimento` ENUM('STOCK_IN', 'SALE_OUT', 'RETURN_IN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT') NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `quantidade_anterior` DECIMAL(10, 3) NOT NULL,
    `quantidade_posterior` DECIMAL(10, 3) NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `data_movimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentacoesEstoque_unidade_id_data_movimento_idx`(`unidade_id`, `data_movimento`),
    INDEX `MovimentacoesEstoque_produto_id_data_movimento_idx`(`produto_id`, `data_movimento`),
    INDEX `MovimentacoesEstoque_venda_pdv_id_idx`(`venda_pdv_id`),
    INDEX `MovimentacoesEstoque_item_venda_pdv_id_idx`(`item_venda_pdv_id`),
    INDEX `MovimentacoesEstoque_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendasPDV` (
    `id` VARCHAR(191) NOT NULL,
    `unidade_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `usuario_criacao_id` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `observacoes` TEXT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `desconto_total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `data_conclusao` DATETIME(3) NULL,
    `data_cancelamento` DATETIME(3) NULL,
    `motivo_cancelamento` TEXT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `VendasPDV_unidade_id_status_data_criacao_idx`(`unidade_id`, `status`, `data_criacao`),
    INDEX `VendasPDV_cliente_id_idx`(`cliente_id`),
    INDEX `VendasPDV_usuario_criacao_id_idx`(`usuario_criacao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItensVendaPDV` (
    `id` VARCHAR(191) NOT NULL,
    `venda_pdv_id` VARCHAR(191) NOT NULL,
    `produto_id` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `preco_unitario` DECIMAL(10, 2) NOT NULL,
    `desconto` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `nome_produto_snapshot` VARCHAR(191) NOT NULL,
    `sku_snapshot` VARCHAR(64) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    INDEX `ItensVendaPDV_venda_pdv_id_idx`(`venda_pdv_id`),
    INDEX `ItensVendaPDV_produto_id_idx`(`produto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TransacoesFinanceiras_venda_pdv_id_idx` ON `TransacoesFinanceiras`(`venda_pdv_id`);

-- AddForeignKey
ALTER TABLE `Produtos` ADD CONSTRAINT `Produtos_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstoquesProduto` ADD CONSTRAINT `EstoquesProduto_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstoquesProduto` ADD CONSTRAINT `EstoquesProduto_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `Produtos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacoesEstoque` ADD CONSTRAINT `MovimentacoesEstoque_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacoesEstoque` ADD CONSTRAINT `MovimentacoesEstoque_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `Produtos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacoesEstoque` ADD CONSTRAINT `MovimentacoesEstoque_venda_pdv_id_fkey` FOREIGN KEY (`venda_pdv_id`) REFERENCES `VendasPDV`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacoesEstoque` ADD CONSTRAINT `MovimentacoesEstoque_item_venda_pdv_id_fkey` FOREIGN KEY (`item_venda_pdv_id`) REFERENCES `ItensVendaPDV`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacoesEstoque` ADD CONSTRAINT `MovimentacoesEstoque_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendasPDV` ADD CONSTRAINT `VendasPDV_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `Unidades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendasPDV` ADD CONSTRAINT `VendasPDV_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `Clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendasPDV` ADD CONSTRAINT `VendasPDV_usuario_criacao_id_fkey` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItensVendaPDV` ADD CONSTRAINT `ItensVendaPDV_venda_pdv_id_fkey` FOREIGN KEY (`venda_pdv_id`) REFERENCES `VendasPDV`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItensVendaPDV` ADD CONSTRAINT `ItensVendaPDV_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `Produtos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransacoesFinanceiras` ADD CONSTRAINT `TransacoesFinanceiras_venda_pdv_id_fkey` FOREIGN KEY (`venda_pdv_id`) REFERENCES `VendasPDV`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
