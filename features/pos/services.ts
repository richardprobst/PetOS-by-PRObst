import {
  FiscalDocumentType,
  Prisma,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import {
  assertActorCanAccessLocalUnitRecord,
  assertActorCanAccessOwnershipBinding,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { runSerializableTransaction } from '@/server/db/transactions'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import {
  applyInventoryMovementInMutation,
  getInventoryDefaultsForUnit,
} from '@/features/inventory/services'
import {
  ensurePosSaleHasNoRegisteredEffects,
  ensurePosSaleRevenueEffectIsUnique,
} from '@/features/pos/effect-guards'
import {
  assertPosSaleCanBeCanceled,
  assertPosSaleCanBeCompleted,
  assertSupportedPosCompletionPaymentStatus,
  calculatePosSaleLineTotal,
  calculatePosSaleTotals,
  shouldIssueFiscalDocumentForPosSale,
} from '@/features/pos/domain'
import { ensureFinancialTransactionExternalReferenceIsUnique } from '@/features/finance/transaction-reference'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'
import {
  loadUnitSettings,
  readBooleanUnitSetting,
} from '@/server/settings/unit-settings'
import type {
  CancelPosSaleInput,
  CompletePosSaleInput,
  CreatePosSaleInput,
  ListPosSalesQuery,
  PosSaleItemInput,
} from '@/features/pos/schemas'

const posSettingKeys = {
  autoFiscalDocument: 'pdv.emitir_documento_fiscal_automatico',
} as const

const posUserSelect = {
  active: true,
  email: true,
  id: true,
  name: true,
  unitId: true,
  userType: true,
} as const

const posUnitSelect = {
  active: true,
  id: true,
  name: true,
} as const

const posProductSelect = {
  active: true,
  barcode: true,
  id: true,
  minimumStockQuantity: true,
  name: true,
  salePrice: true,
  sku: true,
  trackInventory: true,
  unitId: true,
  unitOfMeasure: true,
} as const

const posSaleDetailsInclude = Prisma.validator<Prisma.PosSaleInclude>()({
  client: {
    include: {
      user: {
        select: posUserSelect,
      },
    },
  },
  createdBy: {
    select: posUserSelect,
  },
  financialTransactions: {
    orderBy: {
      occurredAt: 'desc',
    },
    select: {
      amount: true,
      externalReference: true,
      id: true,
      integrationProvider: true,
      occurredAt: true,
      paymentMethod: true,
      paymentStatus: true,
      transactionType: true,
    },
  },
  items: {
    include: {
      product: {
        select: posProductSelect,
      },
    },
  },
  inventoryMovements: {
    orderBy: {
      occurredAt: 'desc',
    },
    include: {
      createdBy: {
        select: posUserSelect,
      },
      product: {
        select: posProductSelect,
      },
    },
  },
  unit: {
    select: posUnitSelect,
  },
})

type PosSaleDetails = Prisma.PosSaleGetPayload<{
  include: typeof posSaleDetailsInclude
}>

type PosMutationClient = Prisma.TransactionClient | typeof prisma

type ClientReference = {
  id: string
  unitId: string | null
}

type PreparedPosSaleItem = {
  discountAmount: number
  product: {
    active: boolean
    id: string
    name: string
    salePrice: number
    sku: string | null
    trackInventory: boolean
    unitId: string
  }
  quantity: number
  totalAmount: number
  unitPrice: number
}

type PosDefaults = {
  autoFiscalDocument: boolean
}

type PosScopeQuery = {
  unitId?: string | null
}

async function getOptionalClientReference(
  db: PosMutationClient,
  actor: AuthenticatedUserData,
  clientId: string | undefined,
) {
  if (!clientId) {
    return null
  }

  const client = await db.client.findUnique({
    where: {
      userId: clientId,
    },
    include: {
      user: {
        select: {
          unitId: true,
        },
      },
    },
  })

  if (!client) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for POS sale.')
  }

  if (client.user.unitId) {
    assertActorCanAccessOwnershipBinding(
      actor,
      buildClientOwnershipBinding(client.user.unitId),
      {
        requestedUnitId: client.user.unitId,
      },
    )
  }

  return {
    id: client.userId,
    unitId: client.user.unitId,
  } satisfies ClientReference
}

export function resolvePosReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId)
}

export function assertActorCanReadPosSaleInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: PosScopeQuery,
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, {
    requestedUnitId: options?.unitId,
  })
}

async function getPosDefaults(client: PosMutationClient, unitId: string): Promise<PosDefaults> {
  const settings = await loadUnitSettings(client, unitId, [posSettingKeys.autoFiscalDocument])

  return {
    autoFiscalDocument: readBooleanUnitSetting(settings, posSettingKeys.autoFiscalDocument, false),
  }
}

async function preparePosSaleItems(
  client: PosMutationClient,
  unitId: string,
  items: PosSaleItemInput[],
) {
  const seenProductIds = new Set<string>()

  for (const item of items) {
    if (seenProductIds.has(item.productId)) {
      throw new AppError(
        'CONFLICT',
        409,
        'A product can only appear once in the same POS sale. Adjust the quantity instead.',
      )
    }

    seenProductIds.add(item.productId)
  }

  const products = await client.product.findMany({
    where: {
      id: {
        in: items.map((item) => item.productId),
      },
      unitId,
    },
    select: {
      active: true,
      id: true,
      name: true,
      salePrice: true,
      sku: true,
      trackInventory: true,
      unitId: true,
    },
  })

  if (products.length !== items.length) {
    throw new AppError('NOT_FOUND', 404, 'One or more POS sale products were not found.')
  }

  const productMap = new Map(products.map((product) => [product.id, product]))

  return items.map((item) => {
    const product = productMap.get(item.productId)

    if (!product) {
      throw new AppError('NOT_FOUND', 404, 'One or more POS sale products were not found.')
    }

    if (!product.active) {
      throw new AppError('CONFLICT', 409, `Product ${product.name} is inactive and cannot be sold.`)
    }

    const unitPrice = item.unitPrice ?? Number(product.salePrice)
    const lineTotals = calculatePosSaleLineTotal({
      discountAmount: item.discountAmount,
      quantity: item.quantity,
      unitPrice,
    })

    return {
      discountAmount: item.discountAmount,
      product: {
        ...product,
        salePrice: Number(product.salePrice),
      },
      quantity: item.quantity,
      totalAmount: lineTotals.totalAmount,
      unitPrice,
    } satisfies PreparedPosSaleItem
  })
}

async function getPosSaleInScopeOrThrow(
  client: PosMutationClient,
  actor: AuthenticatedUserData,
  saleId: string,
  query: PosScopeQuery = {},
) {
  const sale = await client.posSale.findUnique({
    where: {
      id: saleId,
    },
    include: posSaleDetailsInclude,
  })

  if (!sale) {
    throw new AppError('NOT_FOUND', 404, 'POS sale not found.')
  }

  assertActorCanReadPosSaleInScope(actor, sale.unitId, {
    unitId: query.unitId,
  })

  return sale
}

function buildPosSaleAuditDetails(
  sale: PosSaleDetails,
  details: Record<string, unknown> = {},
) {
  return {
    ...details,
    financialTransactionIds: sale.financialTransactions.map((transaction) => transaction.id),
    inventoryMovementCount: sale.inventoryMovements.length,
    inventoryMovementIds: sale.inventoryMovements.map((movement) => movement.id),
    itemCount: sale.items.length,
    totalAmount: Number(sale.totalAmount),
  }
}

async function maybeQueuePosFiscalDocument(args: {
  actorId: string
  financialTransactionId: string
  saleId: string
  tx: Prisma.TransactionClient
  unitId: string
}) {
  const environment = getEnv()

  if (!environment.FISCAL_PROVIDER || !environment.FISCAL_API_BASE_URL || !environment.FISCAL_API_TOKEN) {
    throw new AppError(
      'CONFLICT',
      409,
      'Fiscal integration is not configured for this environment.',
    )
  }

  await args.tx.fiscalDocument.create({
    data: {
      unitId: args.unitId,
      financialTransactionId: args.financialTransactionId,
      createdByUserId: args.actorId,
      providerName: environment.FISCAL_PROVIDER,
      documentType: FiscalDocumentType.CONSUMER_RECEIPT,
      status: 'PENDING',
      externalReference: `pos-sale:${args.saleId}`,
      metadata: {
        requestMode: 'queued',
        source: 'POS_SALE',
      },
    },
  })

  await args.tx.integrationEvent.create({
    data: {
      unitId: args.unitId,
      executedByUserId: args.actorId,
      provider: 'FISCAL',
      direction: 'OUTBOUND',
      eventType: 'fiscal_document.consumer_receipt.requested',
      externalEventId: `pos-sale:${args.saleId}:consumer-receipt`,
      resourceType: 'pos_sale',
      resourceId: args.saleId,
      endpoint: environment.FISCAL_API_BASE_URL,
      status: 'PENDING',
      payload: {
        fiscalDocumentType: 'CONSUMER_RECEIPT',
        saleId: args.saleId,
      },
    },
  })
}

async function finalizePosSaleWithinTransaction(args: {
  actor: AuthenticatedUserData
  completeInput: CompletePosSaleInput
  posDefaults: PosDefaults
  preparedItems?: PreparedPosSaleItem[]
  saleId: string
  tx: Prisma.TransactionClient
}) {
  const sale = await args.tx.posSale.findUnique({
    where: {
      id: args.saleId,
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      unitId: true,
    },
  })

  if (!sale) {
    throw new AppError('NOT_FOUND', 404, 'POS sale not found.')
  }

  assertActorCanReadPosSaleInScope(args.actor, sale.unitId)
  assertPosSaleCanBeCompleted(sale.status)
  assertSupportedPosCompletionPaymentStatus(args.completeInput.paymentStatus)

  if (Number(sale.totalAmount) <= 0) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'A POS sale must have a positive total amount before completion.',
    )
  }

  await ensurePosSaleHasNoRegisteredEffects(args.tx, sale.id)
  await ensureFinancialTransactionExternalReferenceIsUnique(args.tx, {
    ...args.completeInput,
    conflictMessage: 'Another financial transaction already uses this integration reference.',
  })

  const issueFiscalDocument =
    args.completeInput.issueFiscalDocument ?? args.posDefaults.autoFiscalDocument
  const inventoryDefaults = await getInventoryDefaultsForUnit(args.tx, sale.unitId)
  const completionTimestamp = new Date()

  const saleItems =
    args.preparedItems ??
    (await args.tx.posSaleItem.findMany({
      where: {
        saleId: sale.id,
      },
      include: {
        product: true,
      },
    })).map((item) => ({
      discountAmount: Number(item.discountAmount),
      product: {
        active: item.product.active,
        id: item.product.id,
        name: item.product.name,
        salePrice: Number(item.product.salePrice),
        sku: item.product.sku,
        trackInventory: item.product.trackInventory,
        unitId: item.product.unitId,
      },
      quantity: Number(item.quantity),
      totalAmount: Number(item.totalAmount),
      unitPrice: Number(item.unitPrice),
    }))

  const createdItems = await args.tx.posSaleItem.findMany({
    where: {
      saleId: sale.id,
    },
    include: {
      product: true,
    },
  })

  const claimedSale = await args.tx.posSale.updateMany({
    where: {
      id: sale.id,
      status: 'OPEN',
      canceledAt: null,
      completedAt: null,
    },
    data: {
      completedAt: completionTimestamp,
      status: 'COMPLETED',
      canceledAt: null,
      cancellationReason: null,
    },
  })

  if (claimedSale.count !== 1) {
    throw new AppError(
      'CONFLICT',
      409,
      'The POS sale changed before it could be completed.',
    )
  }

  for (const item of createdItems) {
    if (!item.product.trackInventory) {
      continue
    }

    await applyInventoryMovementInMutation({
      allowNegativeStock: inventoryDefaults.allowNegativeStock,
      conflictMessage:
        'The stock balance changed before this POS sale could be completed.',
      createdByUserId: args.actor.id,
      movementType: 'SALE_OUT',
      occurredAt: completionTimestamp,
      posSaleId: sale.id,
      posSaleItemId: item.id,
      productId: item.productId,
      quantity: Number(item.quantity),
      reason: 'pos_sale_completion',
      tx: args.tx,
      unitId: sale.unitId,
    })
  }

  await ensurePosSaleRevenueEffectIsUnique(args.tx, sale.id)

  const financialTransaction = await args.tx.financialTransaction.create({
    data: {
      unitId: sale.unitId,
      posSaleId: sale.id,
      revenuePosSaleId: sale.id,
      createdByUserId: args.actor.id,
      transactionType: 'REVENUE',
      description: `POS sale ${sale.id}`,
      amount: sale.totalAmount,
      paymentMethod: args.completeInput.paymentMethod,
      paymentStatus: args.completeInput.paymentStatus,
      integrationProvider: args.completeInput.integrationProvider ?? null,
      externalReference: args.completeInput.externalReference,
      occurredAt: completionTimestamp,
      metadata: {
        category: 'POS_SALE',
        itemCount: saleItems.length,
      },
    },
  })

  if (
    shouldIssueFiscalDocumentForPosSale(
      issueFiscalDocument,
      args.completeInput.paymentStatus,
    )
  ) {
    await maybeQueuePosFiscalDocument({
      actorId: args.actor.id,
      financialTransactionId: financialTransaction.id,
      saleId: sale.id,
      tx: args.tx,
      unitId: sale.unitId,
    })
  }

  return args.tx.posSale.findUniqueOrThrow({
    where: {
      id: sale.id,
    },
    include: posSaleDetailsInclude,
  })
}

export async function listPosSales(actor: AuthenticatedUserData, query: ListPosSalesQuery) {
  const unitId = resolvePosReadUnitId(actor, query.unitId ?? null)

  return prisma.posSale.findMany({
    where: {
      unitId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: posSaleDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getPosSaleDetails(
  actor: AuthenticatedUserData,
  saleId: string,
  query: PosScopeQuery = {},
) {
  return getPosSaleInScopeOrThrow(prisma, actor, saleId, query)
}

export async function createPosSale(actor: AuthenticatedUserData, input: CreatePosSaleInput) {
  return runSerializableTransaction(async (tx) => {
    const clientReference = await getOptionalClientReference(tx, actor, input.clientId)
    const unitId = resolveScopedUnitId(actor, input.unitId ?? clientReference?.unitId ?? null)

    if (clientReference?.unitId && clientReference.unitId !== unitId) {
      throw new AppError('CONFLICT', 409, 'The selected client does not belong to this unit.')
    }

    const preparedItems = await preparePosSaleItems(tx, unitId, input.items)
    const totals = calculatePosSaleTotals(
      preparedItems.map((item) => ({
        discountAmount: item.discountAmount,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    )

    const posDefaults = await getPosDefaults(tx, unitId)
    const sale = await tx.posSale.create({
      data: {
        unitId,
        clientId: clientReference?.id ?? null,
        createdByUserId: actor.id,
        status: 'OPEN',
        notes: input.notes,
        subtotalAmount: totals.subtotalAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
      },
    })

    for (const item of preparedItems) {
      await tx.posSaleItem.create({
        data: {
          saleId: sale.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          totalAmount: item.totalAmount,
          productNameSnapshot: item.product.name,
          skuSnapshot: item.product.sku,
        },
      })
    }

    const completedSale = input.completeNow
      ? await finalizePosSaleWithinTransaction({
          actor,
          completeInput: {
            externalReference: input.externalReference,
            integrationProvider: input.integrationProvider,
            issueFiscalDocument: input.issueFiscalDocument,
            paymentMethod: input.paymentMethod!,
            paymentStatus: input.paymentStatus,
          },
          posDefaults,
          preparedItems,
          saleId: sale.id,
          tx,
        })
      : await tx.posSale.findUniqueOrThrow({
          where: {
            id: sale.id,
          },
          include: posSaleDetailsInclude,
        })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: input.completeNow ? 'pos_sale.create_and_complete' : 'pos_sale.create',
      entityName: 'PosSale',
      entityId: sale.id,
      details: buildPosSaleAuditDetails(completedSale, {
        clientId: clientReference?.id ?? null,
        externalReference: input.externalReference ?? null,
        paymentMethod: input.paymentMethod ?? null,
        paymentStatus: input.completeNow ? input.paymentStatus : null,
      }),
    })

    return completedSale
  }, 'The POS operation changed before the sale could be created.')
}

export async function completePosSale(
  actor: AuthenticatedUserData,
  saleId: string,
  input: CompletePosSaleInput,
) {
  return runSerializableTransaction(async (tx) => {
    const existingSale = await getPosSaleInScopeOrThrow(tx, actor, saleId)
    const posDefaults = await getPosDefaults(tx, existingSale.unitId)
    const sale = await finalizePosSaleWithinTransaction({
      actor,
      completeInput: input,
      posDefaults,
      saleId: existingSale.id,
      tx,
    })

    await writeAuditLog(tx, {
      unitId: sale.unitId,
      userId: actor.id,
      action: 'pos_sale.complete',
      entityName: 'PosSale',
      entityId: sale.id,
      details: buildPosSaleAuditDetails(sale, {
        externalReference: input.externalReference ?? null,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
      }),
    })

    return sale
  }, 'The POS sale changed before it could be completed.')
}

export async function cancelPosSale(
  actor: AuthenticatedUserData,
  saleId: string,
  input: CancelPosSaleInput,
) {
  return runSerializableTransaction(async (tx) => {
    const existingSale = await tx.posSale.findUnique({
      where: {
        id: saleId,
      },
      select: {
        id: true,
        status: true,
        unitId: true,
      },
    })

    if (!existingSale) {
      throw new AppError('NOT_FOUND', 404, 'POS sale not found.')
    }

    assertActorCanReadPosSaleInScope(actor, existingSale.unitId)
    assertPosSaleCanBeCanceled(existingSale.status)
    await ensurePosSaleHasNoRegisteredEffects(tx, existingSale.id)

    const canceledAt = new Date()
    const canceledSale = await tx.posSale.updateMany({
      where: {
        id: saleId,
        status: 'OPEN',
        canceledAt: null,
        completedAt: null,
      },
      data: {
        status: 'CANCELED',
        canceledAt,
        cancellationReason: input.cancellationReason,
      },
    })

    if (canceledSale.count !== 1) {
      throw new AppError(
        'CONFLICT',
        409,
        'The POS sale changed before it could be canceled.',
      )
    }

    const sale = await tx.posSale.findUniqueOrThrow({
      where: {
        id: saleId,
      },
      include: posSaleDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: sale.unitId,
      userId: actor.id,
      action: 'pos_sale.cancel',
      entityName: 'PosSale',
      entityId: sale.id,
      details: {
        cancellationReason: input.cancellationReason ?? null,
      },
    })

    return sale
  }, 'The POS sale changed before it could be canceled.')
}
