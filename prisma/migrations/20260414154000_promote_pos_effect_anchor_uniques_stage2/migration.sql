-- DropForeignKey
ALTER TABLE `MovimentacoesEstoque`
  DROP FOREIGN KEY `MovimentacoesEstoque_ancora_saida_item_venda_pdv_id_fkey`;

-- DropForeignKey
ALTER TABLE `TransacoesFinanceiras`
  DROP FOREIGN KEY `TransacoesFinanceiras_ancora_receita_venda_pdv_id_fkey`;

-- DropIndex
DROP INDEX `MovimentacoesEstoque_ancora_saida_item_venda_pdv_id_idx` ON `MovimentacoesEstoque`;

-- DropIndex
DROP INDEX `TransacoesFinanceiras_ancora_receita_venda_pdv_id_idx` ON `TransacoesFinanceiras`;

-- CreateIndex
CREATE UNIQUE INDEX `MovimentacoesEstoque_ancora_saida_item_venda_pdv_id_key`
  ON `MovimentacoesEstoque`(`ancora_saida_item_venda_pdv_id`);

-- CreateIndex
CREATE UNIQUE INDEX `TransacoesFinanceiras_ancora_receita_venda_pdv_id_key`
  ON `TransacoesFinanceiras`(`ancora_receita_venda_pdv_id`);

-- AddForeignKey
ALTER TABLE `MovimentacoesEstoque`
  ADD CONSTRAINT `MovimentacoesEstoque_ancora_saida_item_venda_pdv_id_fkey`
  FOREIGN KEY (`ancora_saida_item_venda_pdv_id`) REFERENCES `ItensVendaPDV`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransacoesFinanceiras`
  ADD CONSTRAINT `TransacoesFinanceiras_ancora_receita_venda_pdv_id_fkey`
  FOREIGN KEY (`ancora_receita_venda_pdv_id`) REFERENCES `VendasPDV`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
