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
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import {
  ensureInventoryStockRecord,
  getInventoryDefaultsForUnit,
} from '@/features/inventory/services'
import { applyInventoryMovement } from '@/features/inventory/domain'
import {
  assertPosSaleCanBeCanceled,
  assertPosSaleCanBeCompleted,
  assertSupportedPosCompletionPaymentStatus,
  calculatePosSaleLineTotal,
  calculatePosSaleTotals,
  shouldIssueFiscalDocumentForPosSale,
} from '@/features/pos/domain'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'
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

const posSaleDetailsInclude = Prisma.validator<Prisma.PosSaleInclude>()({
  client: {
    include: {
      user: true,
    },
  },
  createdBy: true,
  financialTransactions: true,
  items: {
    include: {
      product: true,
    },
  },
  inventoryMovements: {
    include: {
      product: true,
    },
  },
  unit: true,
})

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
  actor: AuthenticatedUserData,
  clientId: string | undefined,
) {
  if (!clientId) {
    return null
  }

  const client = await prisma.client.findUnique({
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

async function getPosSaleOrThrow(actor: AuthenticatedUserData, saleId: string) {
  const sale = await prisma.posSale.findUnique({
    where: {
      id: saleId,
    },
    include: posSaleDetailsInclude,
  })

  if (!sale) {
    throw new AppError('NOT_FOUND', 404, 'POS sale not found.')
  }

  assertActorCanReadPosSaleInScope(actor, sale.unitId)

  return sale
}

async function getPosDefaults(client: PosMutationClient, unitId: string): Promise<PosDefaults> {
  const settings = await client.unitSetting.findMany({
    where: {
      unitId,
      key: {
        in: [posSettingKeys.autoFiscalDocument],
      },
    },
  })

  const autoFiscalDocumentValue =
    settings.find((setting) => setting.key === posSettingKeys.autoFiscalDocument)?.value ?? 'false'

  return {
    autoFiscalDocument: autoFiscalDocumentValue === 'true',
  }
}

async function preparePosSaleItems(unitId: string, items: PosSaleItemInput[]) {
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

  const products = await prisma.product.findMany({
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
  sale: {
    id: string
    status: 'OPEN' | 'COMPLETED' | 'CANCELED'
    totalAmount: number
    unitId: string
  }
  tx: Prisma.TransactionClient
}) {
  assertPosSaleCanBeCompleted(args.sale.status)
  assertSupportedPosCompletionPaymentStatus(args.completeInput.paymentStatus)

  if (args.sale.totalAmount <= 0) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'A POS sale must have a positive total amount before completion.',
    )
  }

  const issueFiscalDocument =
    args.completeInput.issueFiscalDocument ?? args.posDefaults.autoFiscalDocument
  const inventoryDefaults = await getInventoryDefaultsForUnit(args.tx, args.sale.unitId)

  const saleItems =
    args.preparedItems ??
    (await args.tx.posSaleItem.findMany({
      where: {
        saleId: args.sale.id,
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
      saleId: args.sale.id,
    },
    include: {
      product: true,
    },
  })

  for (const item of createdItems) {
    if (!item.product.trackInventory) {
      continue
    }

    const stock = await ensureInventoryStockRecord(args.tx, args.sale.unitId, item.productId)
    const movementSnapshot = applyInventoryMovement({
      allowNegativeStock: inventoryDefaults.allowNegativeStock,
      currentQuantity: Number(stock.quantityOnHand),
      movementType: 'SALE_OUT',
      quantity: Number(item.quantity),
    })

    await args.tx.inventoryStock.update({
      where: {
        id: stock.id,
      },
      data: {
        lastMovementAt: new Date(),
        quantityOnHand: movementSnapshot.nextQuantity,
      },
    })

    await args.tx.inventoryMovement.create({
      data: {
        unitId: args.sale.unitId,
        productId: item.productId,
        posSaleId: args.sale.id,
        posSaleItemId: item.id,
        createdByUserId: args.actor.id,
        movementType: 'SALE_OUT',
        quantity: item.quantity,
        quantityBefore: movementSnapshot.previousQuantity,
        quantityAfter: movementSnapshot.nextQuantity,
        reason: 'pos_sale_completion',
      },
    })
  }

  const financialTransaction = await args.tx.financialTransaction.create({
    data: {
      unitId: args.sale.unitId,
      posSaleId: args.sale.id,
      createdByUserId: args.actor.id,
      transactionType: 'REVENUE',
      description: `POS sale ${args.sale.id}`,
      amount: args.sale.totalAmount,
      paymentMethod: args.completeInput.paymentMethod,
      paymentStatus: args.completeInput.paymentStatus,
      integrationProvider: args.completeInput.integrationProvider ?? null,
      externalReference: args.completeInput.externalReference,
      occurredAt: new Date(),
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
      saleId: args.sale.id,
      tx: args.tx,
      unitId: args.sale.unitId,
    })
  }

  return args.tx.posSale.update({
    where: {
      id: args.sale.id,
    },
    data: {
      completedAt: new Date(),
      status: 'COMPLETED',
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
  const sale = await prisma.posSale.findUnique({
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

export async function createPosSale(actor: AuthenticatedUserData, input: CreatePosSaleInput) {
  const clientReference = await getOptionalClientReference(actor, input.clientId)
  const unitId = resolveScopedUnitId(actor, input.unitId ?? clientReference?.unitId ?? null)

  if (clientReference?.unitId && clientReference.unitId !== unitId) {
    throw new AppError('CONFLICT', 409, 'The selected client does not belong to this unit.')
  }

  const preparedItems = await preparePosSaleItems(unitId, input.items)
  const totals = calculatePosSaleTotals(
    preparedItems.map((item) => ({
      discountAmount: item.discountAmount,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  )

  return prisma.$transaction(async (tx) => {
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
          sale: {
            id: sale.id,
            status: 'OPEN',
            totalAmount: totals.totalAmount,
            unitId,
          },
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
      details: {
        clientId: clientReference?.id ?? null,
        itemCount: preparedItems.length,
        totalAmount: totals.totalAmount,
      },
    })

    return completedSale
  })
}

export async function completePosSale(
  actor: AuthenticatedUserData,
  saleId: string,
  input: CompletePosSaleInput,
) {
  const existingSale = await getPosSaleOrThrow(actor, saleId)

  return prisma.$transaction(async (tx) => {
    const posDefaults = await getPosDefaults(tx, existingSale.unitId)
    const sale = await finalizePosSaleWithinTransaction({
      actor,
      completeInput: input,
      posDefaults,
      sale: {
        id: existingSale.id,
        status: existingSale.status,
        totalAmount: Number(existingSale.totalAmount),
        unitId: existingSale.unitId,
      },
      tx,
    })

    await writeAuditLog(tx, {
      unitId: sale.unitId,
      userId: actor.id,
      action: 'pos_sale.complete',
      entityName: 'PosSale',
      entityId: sale.id,
      details: {
        paymentStatus: input.paymentStatus,
        totalAmount: Number(sale.totalAmount),
      },
    })

    return sale
  })
}

export async function cancelPosSale(
  actor: AuthenticatedUserData,
  saleId: string,
  input: CancelPosSaleInput,
) {
  const existingSale = await getPosSaleOrThrow(actor, saleId)
  assertPosSaleCanBeCanceled(existingSale.status)

  return prisma.$transaction(async (tx) => {
    const sale = await tx.posSale.update({
      where: {
        id: saleId,
      },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancellationReason: input.cancellationReason,
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
  })
}
