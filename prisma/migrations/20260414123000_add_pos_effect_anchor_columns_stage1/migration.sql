-- AlterTable
ALTER TABLE `MovimentacoesEstoque`
  ADD COLUMN `ancora_saida_item_venda_pdv_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TransacoesFinanceiras`
  ADD COLUMN `ancora_receita_venda_pdv_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `MovimentacoesEstoque_ancora_saida_item_venda_pdv_id_idx`
  ON `MovimentacoesEstoque`(`ancora_saida_item_venda_pdv_id`);

-- CreateIndex
CREATE INDEX `TransacoesFinanceiras_ancora_receita_venda_pdv_id_idx`
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
