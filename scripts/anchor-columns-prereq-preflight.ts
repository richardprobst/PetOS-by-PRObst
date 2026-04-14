import { prisma } from '../server/db/prisma'
import { disconnectPrisma, loadEnvironment } from './anchor-columns-ops'

interface CommandOptions {
  envFile?: string
  json: boolean
}

function parseOptions(argv: string[]): CommandOptions {
  const options: CommandOptions = {
    json: false,
  }

  for (const argument of argv) {
    if (argument === '--json') {
      options.json = true
      continue
    }

    if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length)
      continue
    }

    throw new Error(`Unsupported argument: ${argument}`)
  }

  return options
}

async function buildReport() {
  const schemaMetadataPromise = loadAnchorSchemaMetadata()

  const [
    duplicateFinancialExternalReferences,
    duplicateDepositExternalReferences,
    duplicateRefundExternalReferences,
    duplicateFiscalExternalReferences,
    duplicateClientCreditOriginRefundIds,
    duplicateClientCreditOriginDepositIds,
    schemaMetadata,
  ] = await Promise.all([
    prisma.financialTransaction.groupBy({
      by: ['integrationProvider', 'externalReference'],
      where: {
        integrationProvider: {
          not: null,
        },
        externalReference: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        externalReference: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.deposit.groupBy({
      by: ['externalReference'],
      where: {
        externalReference: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        externalReference: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.refund.groupBy({
      by: ['externalReference'],
      where: {
        externalReference: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        externalReference: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.fiscalDocument.groupBy({
      by: ['providerName', 'externalReference'],
      where: {
        externalReference: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        externalReference: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.clientCredit.groupBy({
      by: ['originRefundId'],
      where: {
        originRefundId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        originRefundId: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.clientCredit.groupBy({
      by: ['originDepositId'],
      where: {
        originDepositId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        originDepositId: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    schemaMetadataPromise,
  ])

  const { anchorColumns, anchorIndexes } = schemaMetadata

  const stage1ColumnsPresent = {
    revenuePosSaleId: anchorColumns.some(
      (column) =>
        column.TABLE_NAME === 'TransacoesFinanceiras' &&
        column.COLUMN_NAME === 'ancora_receita_venda_pdv_id',
    ),
    saleOutPosSaleItemId: anchorColumns.some(
      (column) =>
        column.TABLE_NAME === 'MovimentacoesEstoque' &&
        column.COLUMN_NAME === 'ancora_saida_item_venda_pdv_id',
    ),
  }

  const stage2UniqueIndexesPresent = {
    revenuePosSaleId: anchorIndexes.some(
      (index) =>
        index.TABLE_NAME === 'TransacoesFinanceiras' &&
        index.COLUMN_NAME === 'ancora_receita_venda_pdv_id' &&
        Number(index.NON_UNIQUE) === 0,
    ),
    saleOutPosSaleItemId: anchorIndexes.some(
      (index) =>
        index.TABLE_NAME === 'MovimentacoesEstoque' &&
        index.COLUMN_NAME === 'ancora_saida_item_venda_pdv_id' &&
        Number(index.NON_UNIQUE) === 0,
    ),
  }

  const readyForStage1Migrations =
    duplicateFinancialExternalReferences.length === 0 &&
    duplicateDepositExternalReferences.length === 0 &&
    duplicateRefundExternalReferences.length === 0 &&
    duplicateFiscalExternalReferences.length === 0 &&
    duplicateClientCreditOriginRefundIds.length === 0 &&
    duplicateClientCreditOriginDepositIds.length === 0

  return {
    readyForStage1Migrations,
    report: {
      duplicateClientCreditOriginDepositIds,
      duplicateClientCreditOriginRefundIds,
      duplicateDepositExternalReferences,
      duplicateFinancialExternalReferences,
      duplicateFiscalExternalReferences,
      duplicateRefundExternalReferences,
      stage1ColumnsPresent,
      stage2UniqueIndexesPresent,
    },
  }
}

async function loadAnchorSchemaMetadata() {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to inspect anchor-column schema metadata.')
  }

  const connectionUrl = databaseUrl.replace(/^mysql:/, 'mariadb:')

  const mariadb = await import('mariadb')
  const connection = await mariadb.createConnection(connectionUrl)

  try {
    const [anchorColumns, anchorIndexes] = await Promise.all([
      connection.query<Array<{ TABLE_NAME: string; COLUMN_NAME: string }>>(
        `
          SELECT TABLE_NAME, COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND (
              (TABLE_NAME = 'TransacoesFinanceiras' AND COLUMN_NAME = 'ancora_receita_venda_pdv_id')
              OR
              (TABLE_NAME = 'MovimentacoesEstoque' AND COLUMN_NAME = 'ancora_saida_item_venda_pdv_id')
            )
        `,
      ),
      connection.query<
        Array<{ TABLE_NAME: string; COLUMN_NAME: string; INDEX_NAME: string; NON_UNIQUE: number }>
      >(
        `
          SELECT TABLE_NAME, COLUMN_NAME, INDEX_NAME, NON_UNIQUE
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND (
              (TABLE_NAME = 'TransacoesFinanceiras' AND COLUMN_NAME = 'ancora_receita_venda_pdv_id')
              OR
              (TABLE_NAME = 'MovimentacoesEstoque' AND COLUMN_NAME = 'ancora_saida_item_venda_pdv_id')
            )
        `,
      ),
    ])

    return {
      anchorColumns,
      anchorIndexes,
    }
  } finally {
    await connection.end()
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const loadedEnvironment = loadEnvironment(options.envFile)
  const result = await buildReport()

  if (options.json) {
    console.log(JSON.stringify({
      loadedEnvironment,
      ...result,
    }, null, 2))
    return
  }

  console.log(
    loadedEnvironment
      ? `[ok] Loaded environment from ${loadedEnvironment}.`
      : '[warn] No environment file was loaded. Falling back to process environment only.',
  )
  console.log(
    result.readyForStage1Migrations
      ? '[ok] Stage 1 prerequisite migrations are not blocked by duplicate data.'
      : '[warn] Stage 1 prerequisite migrations are blocked by duplicate data.',
  )
  console.log(
    `[info] stage1_columns_present=${result.report.stage1ColumnsPresent.revenuePosSaleId && result.report.stage1ColumnsPresent.saleOutPosSaleItemId}`,
  )
  console.log(
    `[info] stage2_unique_indexes_present=${result.report.stage2UniqueIndexesPresent.revenuePosSaleId && result.report.stage2UniqueIndexesPresent.saleOutPosSaleItemId}`,
  )
  console.log(
    `[info] duplicate_financial_external_references=${result.report.duplicateFinancialExternalReferences.length}`,
  )
  console.log(
    `[info] duplicate_deposit_external_references=${result.report.duplicateDepositExternalReferences.length}`,
  )
  console.log(
    `[info] duplicate_refund_external_references=${result.report.duplicateRefundExternalReferences.length}`,
  )
  console.log(
    `[info] duplicate_fiscal_external_references=${result.report.duplicateFiscalExternalReferences.length}`,
  )
  console.log(
    `[info] duplicate_client_credit_origin_refund_ids=${result.report.duplicateClientCreditOriginRefundIds.length}`,
  )
  console.log(
    `[info] duplicate_client_credit_origin_deposit_ids=${result.report.duplicateClientCreditOriginDepositIds.length}`,
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
