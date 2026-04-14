import { loadEnvFile } from 'node:process'
import { prisma } from '../server/db/prisma'

export type AnchorColumnsPreflightStatus = 'GO' | 'GO_COM_RESSALVAS' | 'NO_GO'

interface RevenueAnchorDuplicate {
  revenuePosSaleId: string | null
  _count: {
    _all: number
  }
}

interface SaleOutAnchorDuplicate {
  saleOutPosSaleItemId: string | null
  _count: {
    _all: number
  }
}

export interface AnchorColumnsPreflightReport {
  financialTransaction: {
    duplicatesByRevenueAnchor: RevenueAnchorDuplicate[]
    revenueAnchorMismatch: Array<{
      id: string
      posSaleId: string | null
      revenuePosSaleId: string | null
    }>
    revenueAnchorOnWrongType: Array<{
      id: string
      revenuePosSaleId: string | null
      transactionType: string
    }>
    revenueAnchorWithoutPosSale: Array<{
      id: string
      revenuePosSaleId: string | null
    }>
    revenueMissingAnchor: Array<{
      id: string
      posSaleId: string | null
    }>
  }
  inventoryMovement: {
    duplicatesBySaleOutAnchor: SaleOutAnchorDuplicate[]
    saleOutAnchorMismatch: Array<{
      id: string
      posSaleItemId: string | null
      saleOutPosSaleItemId: string | null
    }>
    saleOutAnchorOnWrongType: Array<{
      id: string
      movementType: string
      saleOutPosSaleItemId: string | null
    }>
    saleOutAnchorWithoutSaleItem: Array<{
      id: string
      saleOutPosSaleItemId: string | null
    }>
    saleOutMissingAnchor: Array<{
      id: string
      posSaleId: string | null
      posSaleItemId: string | null
    }>
  }
}

export interface AnchorColumnsPreflightResult {
  report: AnchorColumnsPreflightReport
  readyForBackfill: boolean
  readyForUnique: boolean
  status: AnchorColumnsPreflightStatus
}

function tryLoadEnvFile(path: string) {
  try {
    loadEnvFile(path)
    return true
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error
    }

    return false
  }
}

export function loadEnvironment(envFile?: string) {
  const candidates = envFile ? [envFile] : ['.env.local', '.env']

  for (const candidate of candidates) {
    if (tryLoadEnvFile(candidate)) {
      return candidate
    }
  }

  if (envFile) {
    throw new Error(`Environment file not found: ${envFile}`)
  }

  return null
}

export function isAnchorColumnsStage1MissingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('TransacoesFinanceiras.ancora_receita_venda_pdv_id') ||
    message.includes('MovimentacoesEstoque.ancora_saida_item_venda_pdv_id')
  )
}

export function formatAnchorColumnsStage1MissingMessage(loadedEnvironment: string | null) {
  const environmentSuffix = loadedEnvironment ? ` (${loadedEnvironment})` : ''

  return [
    `Anchor-column checks are NO-GO${environmentSuffix} because Stage 1 is not applied in this database.`,
    'Apply migration 20260414123000_add_pos_effect_anchor_columns_stage1 before running Etapa 2 preflight, backfill or UNIQUE promotion.',
  ].join(' ')
}

function printSection(title: string, lines: string[]) {
  console.log(`\n[${title}]`)

  for (const line of lines) {
    console.log(line)
  }
}

export function printAnchorColumnsPreflightSummary(
  loadedEnvironment: string | null,
  result: AnchorColumnsPreflightResult,
) {
  console.log(
    loadedEnvironment
      ? `[ok] Loaded environment from ${loadedEnvironment}.`
      : '[warn] No environment file was loaded. Falling back to process environment only.',
  )

  if (result.status === 'GO') {
    console.log('[ok] Anchor-column preflight status: GO. Environment is ready for UNIQUE promotion.')
  } else if (result.status === 'GO_COM_RESSALVAS') {
    console.log(
      '[warn] Anchor-column preflight status: GO_COM_RESSALVAS. Environment is eligible for deterministic backfill but not yet ready for UNIQUE promotion.',
    )
  } else {
    console.log(
      '[warn] Anchor-column preflight status: NO_GO. Structural inconsistencies block deterministic backfill or UNIQUE promotion.',
    )
  }

  printSection('financial_transaction', [
    `revenue_missing_anchor=${result.report.financialTransaction.revenueMissingAnchor.length}`,
    `duplicates_by_revenue_anchor=${result.report.financialTransaction.duplicatesByRevenueAnchor.length}`,
    `anchor_on_wrong_type=${result.report.financialTransaction.revenueAnchorOnWrongType.length}`,
    `anchor_without_pos_sale=${result.report.financialTransaction.revenueAnchorWithoutPosSale.length}`,
    `anchor_mismatch=${result.report.financialTransaction.revenueAnchorMismatch.length}`,
  ])

  printSection('inventory_movement', [
    `sale_out_missing_anchor=${result.report.inventoryMovement.saleOutMissingAnchor.length}`,
    `duplicates_by_sale_out_anchor=${result.report.inventoryMovement.duplicatesBySaleOutAnchor.length}`,
    `anchor_on_wrong_type=${result.report.inventoryMovement.saleOutAnchorOnWrongType.length}`,
    `anchor_without_sale_item=${result.report.inventoryMovement.saleOutAnchorWithoutSaleItem.length}`,
    `anchor_mismatch=${result.report.inventoryMovement.saleOutAnchorMismatch.length}`,
  ])
}

export async function buildAnchorColumnsPreflightReport(): Promise<AnchorColumnsPreflightResult> {
  const [
    revenueMissingAnchor,
    revenueAnchorDuplicates,
    revenueAnchorOnWrongType,
    revenueAnchorWithoutPosSale,
    revenueAnchoredRows,
    saleOutMissingAnchor,
    saleOutAnchorDuplicates,
    saleOutAnchorOnWrongType,
    saleOutAnchorWithoutSaleItem,
    saleOutAnchoredRows,
  ] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        transactionType: 'REVENUE',
        posSaleId: {
          not: null,
        },
        revenuePosSaleId: null,
      },
      select: {
        id: true,
        posSaleId: true,
      },
      take: 25,
    }),
    prisma.financialTransaction.groupBy({
      by: ['revenuePosSaleId'],
      where: {
        revenuePosSaleId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        revenuePosSaleId: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      where: {
        revenuePosSaleId: {
          not: null,
        },
        NOT: {
          transactionType: 'REVENUE',
        },
      },
      select: {
        id: true,
        revenuePosSaleId: true,
        transactionType: true,
      },
      take: 25,
    }),
    prisma.financialTransaction.findMany({
      where: {
        revenuePosSaleId: {
          not: null,
        },
        posSaleId: null,
      },
      select: {
        id: true,
        revenuePosSaleId: true,
      },
      take: 25,
    }),
    prisma.financialTransaction.findMany({
      where: {
        revenuePosSaleId: {
          not: null,
        },
      },
      select: {
        id: true,
        posSaleId: true,
        revenuePosSaleId: true,
      },
      take: 100,
    }),
    prisma.inventoryMovement.findMany({
      where: {
        movementType: 'SALE_OUT',
        posSaleItemId: {
          not: null,
        },
        saleOutPosSaleItemId: null,
      },
      select: {
        id: true,
        posSaleId: true,
        posSaleItemId: true,
      },
      take: 25,
    }),
    prisma.inventoryMovement.groupBy({
      by: ['saleOutPosSaleItemId'],
      where: {
        saleOutPosSaleItemId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        saleOutPosSaleItemId: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        saleOutPosSaleItemId: {
          not: null,
        },
        NOT: {
          movementType: 'SALE_OUT',
        },
      },
      select: {
        id: true,
        movementType: true,
        saleOutPosSaleItemId: true,
      },
      take: 25,
    }),
    prisma.inventoryMovement.findMany({
      where: {
        saleOutPosSaleItemId: {
          not: null,
        },
        posSaleItemId: null,
      },
      select: {
        id: true,
        saleOutPosSaleItemId: true,
      },
      take: 25,
    }),
    prisma.inventoryMovement.findMany({
      where: {
        saleOutPosSaleItemId: {
          not: null,
        },
      },
      select: {
        id: true,
        posSaleItemId: true,
        saleOutPosSaleItemId: true,
      },
      take: 100,
    }),
  ])

  const revenueAnchorMismatch = revenueAnchoredRows.filter(
    (row) => row.posSaleId !== null && row.posSaleId !== row.revenuePosSaleId,
  )
  const saleOutAnchorMismatch = saleOutAnchoredRows.filter(
    (row) => row.posSaleItemId !== null && row.posSaleItemId !== row.saleOutPosSaleItemId,
  )

  const report: AnchorColumnsPreflightReport = {
    financialTransaction: {
      duplicatesByRevenueAnchor: revenueAnchorDuplicates,
      revenueAnchorMismatch,
      revenueAnchorOnWrongType,
      revenueAnchorWithoutPosSale,
      revenueMissingAnchor,
    },
    inventoryMovement: {
      duplicatesBySaleOutAnchor: saleOutAnchorDuplicates,
      saleOutAnchorMismatch,
      saleOutAnchorOnWrongType,
      saleOutAnchorWithoutSaleItem,
      saleOutMissingAnchor,
    },
  }

  const readyForBackfill =
    revenueAnchorDuplicates.length === 0 &&
    revenueAnchorOnWrongType.length === 0 &&
    revenueAnchorWithoutPosSale.length === 0 &&
    revenueAnchorMismatch.length === 0 &&
    saleOutAnchorDuplicates.length === 0 &&
    saleOutAnchorOnWrongType.length === 0 &&
    saleOutAnchorWithoutSaleItem.length === 0 &&
    saleOutAnchorMismatch.length === 0

  const readyForUnique =
    readyForBackfill &&
    revenueMissingAnchor.length === 0 &&
    saleOutMissingAnchor.length === 0

  const status: AnchorColumnsPreflightStatus = readyForUnique
    ? 'GO'
    : readyForBackfill
      ? 'GO_COM_RESSALVAS'
      : 'NO_GO'

  return {
    report,
    readyForBackfill,
    readyForUnique,
    status,
  }
}

export async function disconnectPrisma() {
  await prisma.$disconnect()
}
