import { Prisma } from '@prisma/client'
import { prisma } from '../server/db/prisma'
import {
  buildAnchorColumnsPreflightReport,
  disconnectPrisma,
  formatAnchorColumnsStage1MissingMessage,
  isAnchorColumnsStage1MissingError,
  loadEnvironment,
  printAnchorColumnsPreflightSummary,
} from './anchor-columns-ops'

interface CommandOptions {
  apply: boolean
  envFile?: string
  json: boolean
}

function parseOptions(argv: string[]): CommandOptions {
  const options: CommandOptions = {
    apply: false,
    json: false,
  }

  for (const argument of argv) {
    if (argument === '--apply') {
      options.apply = true
      continue
    }

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

async function executeBackfill() {
  return prisma.$transaction(async (transaction) => {
    const updatedRevenueRows = await transaction.$executeRaw(Prisma.sql`
      UPDATE \`TransacoesFinanceiras\`
      SET \`ancora_receita_venda_pdv_id\` = \`venda_pdv_id\`
      WHERE \`tipo_transacao\` = 'REVENUE'
        AND \`venda_pdv_id\` IS NOT NULL
        AND \`ancora_receita_venda_pdv_id\` IS NULL
    `)

    const updatedSaleOutRows = await transaction.$executeRaw(Prisma.sql`
      UPDATE \`MovimentacoesEstoque\`
      SET \`ancora_saida_item_venda_pdv_id\` = \`item_venda_pdv_id\`
      WHERE \`tipo_movimento\` = 'SALE_OUT'
        AND \`item_venda_pdv_id\` IS NOT NULL
        AND \`ancora_saida_item_venda_pdv_id\` IS NULL
    `)

    return {
      updatedRevenueRows: Number(updatedRevenueRows),
      updatedSaleOutRows: Number(updatedSaleOutRows),
    }
  })
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const loadedEnvironment = loadEnvironment(options.envFile)
  let preflight

  try {
    preflight = await buildAnchorColumnsPreflightReport()
  } catch (error) {
    if (isAnchorColumnsStage1MissingError(error)) {
      const message = formatAnchorColumnsStage1MissingMessage(loadedEnvironment)

      if (options.json) {
        console.log(JSON.stringify({
          loadedEnvironment,
          status: 'NO_GO',
          message,
          reason: 'STAGE1_SCHEMA_MISSING',
        }, null, 2))
      } else {
        console.error(`[no-go] ${message}`)
      }

      process.exitCode = 1
      return
    }

    throw error
  }

  const plannedUpdates = {
    revenueMissingAnchor: preflight.report.financialTransaction.revenueMissingAnchor.length,
    saleOutMissingAnchor: preflight.report.inventoryMovement.saleOutMissingAnchor.length,
  }

  if (!options.json) {
    printAnchorColumnsPreflightSummary(loadedEnvironment, preflight)
  }

  if (!preflight.readyForBackfill) {
    const message =
      'Backfill is blocked because this environment has structural inconsistencies beyond deterministic missing anchors.'

    if (options.json) {
      console.log(JSON.stringify({
        loadedEnvironment,
        message,
        phase: 'preflight',
        plannedUpdates,
        preflight,
      }, null, 2))
    } else {
      console.error(`[no-go] ${message}`)
    }

    process.exitCode = 1
    return
  }

  if (!options.apply) {
    if (options.json) {
      console.log(JSON.stringify({
        loadedEnvironment,
        apply: false,
        plannedUpdates,
        preflight,
      }, null, 2))
    } else {
      console.log('\n[dry-run] Backfill is eligible in this environment.')
      console.log(
        `[dry-run] planned_revenue_anchor_updates=${plannedUpdates.revenueMissingAnchor}`,
      )
      console.log(
        `[dry-run] planned_sale_out_anchor_updates=${plannedUpdates.saleOutMissingAnchor}`,
      )
      console.log('[dry-run] Re-run this command with --apply to execute the idempotent backfill.')
    }

    return
  }

  const applied = await executeBackfill()
  const postCheck = await buildAnchorColumnsPreflightReport()

  if (options.json) {
    console.log(JSON.stringify({
      apply: true,
      applied,
      loadedEnvironment,
      plannedUpdates,
      postCheck,
      preflight,
    }, null, 2))
  } else {
    console.log('\n[apply] Anchor-column backfill executed.')
    console.log(`[apply] updated_revenue_rows=${applied.updatedRevenueRows}`)
    console.log(`[apply] updated_sale_out_rows=${applied.updatedSaleOutRows}`)
    printAnchorColumnsPreflightSummary(loadedEnvironment, postCheck)
  }

  if (!postCheck.readyForUnique) {
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
