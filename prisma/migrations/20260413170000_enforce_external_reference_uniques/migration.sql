-- DropIndex
DROP INDEX `DocumentosFiscais_provedor_nome_referencia_externa_idx` ON `DocumentosFiscais`;

-- DropIndex
DROP INDEX `TransacoesFinanceiras_provedor_integracao_referencia_externa_idx` ON `TransacoesFinanceiras`;

-- CreateIndex
CREATE UNIQUE INDEX `Depositos_referencia_externa_key` ON `Depositos`(`referencia_externa`);

-- CreateIndex
CREATE UNIQUE INDEX `DocumentosFiscais_provedor_nome_referencia_externa_key` ON `DocumentosFiscais`(`provedor_nome`, `referencia_externa`);

-- CreateIndex
CREATE UNIQUE INDEX `Reembolsos_referencia_externa_key` ON `Reembolsos`(`referencia_externa`);

-- CreateIndex
CREATE UNIQUE INDEX `TransacoesFinanceiras_provedor_integracao_referencia_externa_key` ON `TransacoesFinanceiras`(`provedor_integracao`, `referencia_externa`);
