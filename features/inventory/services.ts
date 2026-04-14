import { InventoryMovementType, Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { runSerializableTransaction } from '@/server/db/transactions'
import { AppError } from '@/server/http/errors'
import {
  applyInventoryMovement,
  isLowStock,
} from '@/features/inventory/domain'
import { ensurePosSaleItemSaleOutEffectIsUnique } from '@/features/pos/effect-guards'
import {
  loadUnitSettings,
  readBooleanUnitSetting,
  readNumericUnitSetting,
} from '@/server/settings/unit-settings'
import type {
  CreateProductInput,
  ListInventoryMovementsQuery,
  ListInventoryStocksQuery,
  ListProductsQuery,
  RecordInventoryMovementInput,
  UpdateProductInput,
} from '@/features/inventory/schemas'

const inventorySettingKeys = {
  allowNegativeStock: 'estoque.permitir_saldo_negativo',
  minimumStockQuantity: 'estoque.produto_estoque_minimo_padrao',
} as const

const inventoryUserSelect = {
  active: true,
  email: true,
  id: true,
  name: true,
  unitId: true,
  userType: true,
} as const

const inventoryUnitSelect = {
  active: true,
  id: true,
  name: true,
} as const

const inventoryProductSelect = {
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

const productDetailsInclude = Prisma.validator<Prisma.ProductInclude>()({
  inventoryStocks: true,
  unit: {
    select: inventoryUnitSelect,
  },
})

const inventoryStockDetailsInclude = Prisma.validator<Prisma.InventoryStockInclude>()({
  product: {
    select: inventoryProductSelect,
  },
  unit: {
    select: inventoryUnitSelect,
  },
})

const inventoryMovementDetailsInclude = Prisma.validator<Prisma.InventoryMovementInclude>()({
  createdBy: {
    select: inventoryUserSelect,
  },
  posSale: {
    select: {
      canceledAt: true,
      completedAt: true,
      createdAt: true,
      id: true,
      status: true,
      totalAmount: true,
    },
  },
  product: {
    select: inventoryProductSelect,
  },
  unit: {
    select: inventoryUnitSelect,
  },
})

type InventoryMutationClient = Prisma.TransactionClient | typeof prisma

type InventoryDefaults = {
  allowNegativeStock: boolean
  defaultMinimumStockQuantity: number
}

const manualInventoryMovementTypes = new Set<InventoryMovementType>([
  'STOCK_IN',
  'RETURN_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
])

type InventoryScopeQuery = {
  unitId?: string
}

export function resolveInventoryReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId ?? null)
}

export function assertActorCanReadInventoryRecordInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, options)
}

async function getProductOrThrow(actor: AuthenticatedUserData, productId: string) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    include: productDetailsInclude,
  })

  if (!product) {
    throw new AppError('NOT_FOUND', 404, 'Product not found.')
  }

  assertActorCanReadInventoryRecordInScope(actor, product.unitId)

  return product
}

async function getInventoryMovementOrThrow(
  actor: AuthenticatedUserData,
  movementId: string,
  options?: {
    requestedUnitId?: string | null
  },
) {
  const movement = await prisma.inventoryMovement.findUnique({
    where: {
      id: movementId,
    },
    include: inventoryMovementDetailsInclude,
  })

  if (!movement) {
    throw new AppError('NOT_FOUND', 404, 'Inventory movement not found.')
  }

  assertActorCanReadInventoryRecordInScope(actor, movement.unitId, {
    requestedUnitId: options?.requestedUnitId ?? null,
  })

  return movement
}

export async function getInventoryDefaultsForUnit(
  client: InventoryMutationClient,
  unitId: string,
): Promise<InventoryDefaults> {
  const settings = await loadUnitSettings(client, unitId, [
    inventorySettingKeys.allowNegativeStock,
    inventorySettingKeys.minimumStockQuantity,
  ])

  return {
    allowNegativeStock: readBooleanUnitSetting(
      settings,
      inventorySettingKeys.allowNegativeStock,
      false,
    ),
    defaultMinimumStockQuantity: readNumericUnitSetting(
      settings,
      inventorySettingKeys.minimumStockQuantity,
      1,
    ),
  }
}

export async function ensureInventoryStockRecord(
  client: InventoryMutationClient,
  unitId: string,
  productId: string,
) {
  return client.inventoryStock.upsert({
    where: {
      unitId_productId: {
        productId,
        unitId,
      },
    },
    create: {
      productId,
      unitId,
      quantityOnHand: 0,
    },
    update: {},
  })
}

export async function applyInventoryMovementInMutation(args: {
  allowNegativeStock: boolean
  conflictMessage?: string
  createdByUserId?: string | null
  movementType: InventoryMovementType
  notes?: string | null
  occurredAt?: Date
  posSaleId?: string | null
  posSaleItemId?: string | null
  productId: string
  quantity: number
  reason?: string | null
  tx: Prisma.TransactionClient
  unitId: string
}) {
  if (args.movementType === 'SALE_OUT') {
    if (!args.posSaleId || !args.posSaleItemId) {
      throw new AppError(
        'UNPROCESSABLE_ENTITY',
        422,
        'SALE_OUT inventory movements require both posSaleId and posSaleItemId.',
      )
    }

    await ensurePosSaleItemSaleOutEffectIsUnique(args.tx, args.posSaleItemId)
  }

  const stock = await ensureInventoryStockRecord(args.tx, args.unitId, args.productId)
  const movementSnapshot = applyInventoryMovement({
    allowNegativeStock: args.allowNegativeStock,
    currentQuantity: Number(stock.quantityOnHand),
    movementType: args.movementType,
    quantity: args.quantity,
  })

  const updatedStock = await args.tx.inventoryStock.updateMany({
    where: {
      id: stock.id,
      quantityOnHand: stock.quantityOnHand,
    },
    data: {
      lastMovementAt: args.occurredAt ?? new Date(),
      quantityOnHand: movementSnapshot.nextQuantity,
    },
  })

  if (updatedStock.count !== 1) {
    throw new AppError(
      'CONFLICT',
      409,
      args.conflictMessage ?? 'The stock balance changed before this movement could be recorded.',
    )
  }

  return args.tx.inventoryMovement.create({
    data: {
      unitId: args.unitId,
      productId: args.productId,
      posSaleId: args.posSaleId ?? null,
      posSaleItemId: args.posSaleItemId ?? null,
      saleOutPosSaleItemId:
        args.movementType === 'SALE_OUT' ? args.posSaleItemId ?? null : null,
      createdByUserId: args.createdByUserId ?? null,
      movementType: args.movementType,
      quantity: args.quantity,
      quantityBefore: movementSnapshot.previousQuantity,
      quantityAfter: movementSnapshot.nextQuantity,
      reason: args.reason,
      notes: args.notes,
      occurredAt: args.occurredAt ?? new Date(),
    },
    include: inventoryMovementDetailsInclude,
  })
}

export async function listProducts(actor: AuthenticatedUserData, query: ListProductsQuery) {
  const scopedUnitId = resolveInventoryReadUnitId(actor, query.unitId ?? null)
  const products = await prisma.product.findMany({
    where: {
      unitId: scopedUnitId,
      ...(query.productId ? { id: query.productId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.trackInventory !== undefined ? { trackInventory: query.trackInventory } : {}),
    },
    include: productDetailsInclude,
    orderBy: [
      {
        active: 'desc',
      },
      {
        name: 'asc',
      },
    ],
  })

  if (!query.lowStockOnly) {
    return products
  }

  return products.filter((product) => {
    if (!product.trackInventory) {
      return false
    }

    const quantityOnHand = Number(product.inventoryStocks[0]?.quantityOnHand ?? 0)
    return isLowStock(quantityOnHand, Number(product.minimumStockQuantity))
  })
}

export async function getProductDetails(
  actor: AuthenticatedUserData,
  productId: string,
  query: InventoryScopeQuery = {},
) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    include: productDetailsInclude,
  })

  if (!product) {
    throw new AppError('NOT_FOUND', 404, 'Product not found.')
  }

  assertActorCanReadInventoryRecordInScope(actor, product.unitId, {
    requestedUnitId: query.unitId ?? null,
  })

  return product
}

export async function createProduct(actor: AuthenticatedUserData, input: CreateProductInput) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)

  return prisma.$transaction(async (tx) => {
    const defaults = await getInventoryDefaultsForUnit(tx, unitId)
    const minimumStockQuantity =
      input.minimumStockQuantity ?? defaults.defaultMinimumStockQuantity

    const product = await tx.product.create({
      data: {
        unitId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        description: input.description,
        unitOfMeasure: input.unitOfMeasure,
        salePrice: input.salePrice,
        costPrice: input.costPrice ?? null,
        minimumStockQuantity,
        trackInventory: input.trackInventory,
        active: input.active,
      },
      include: productDetailsInclude,
    })

    await tx.inventoryStock.create({
      data: {
        productId: product.id,
        unitId,
        quantityOnHand: 0,
      },
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'product.create',
      entityName: 'Product',
      entityId: product.id,
      details: {
        sku: product.sku,
        trackInventory: product.trackInventory,
      },
    })

    return tx.product.findUniqueOrThrow({
      where: {
        id: product.id,
      },
      include: productDetailsInclude,
    })
  })
}

export async function updateProduct(
  actor: AuthenticatedUserData,
  productId: string,
  input: UpdateProductInput,
) {
  const existingProduct = await getProductOrThrow(actor, productId)

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.unitOfMeasure !== undefined ? { unitOfMeasure: input.unitOfMeasure } : {}),
        ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
        ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
        ...(input.minimumStockQuantity !== undefined
          ? { minimumStockQuantity: input.minimumStockQuantity }
          : {}),
        ...(input.trackInventory !== undefined ? { trackInventory: input.trackInventory } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: productDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: product.unitId,
      userId: actor.id,
      action: 'product.update',
      entityName: 'Product',
      entityId: product.id,
      details: {
        changedFields: Object.keys(input),
        previousActive: existingProduct.active,
        nextActive: product.active,
      },
    })

    return product
  })
}

export async function listInventoryStocks(
  actor: AuthenticatedUserData,
  query: ListInventoryStocksQuery,
) {
  const scopedUnitId = resolveInventoryReadUnitId(actor, query.unitId ?? null)
  const inventoryStocks = await prisma.inventoryStock.findMany({
    where: {
      unitId: scopedUnitId,
      ...(query.productId ? { productId: query.productId } : {}),
    },
    include: inventoryStockDetailsInclude,
    orderBy: [
      {
        product: {
          name: 'asc',
        },
      },
    ],
  })

  if (!query.lowStockOnly) {
    return inventoryStocks
  }

  return inventoryStocks.filter((stock) =>
    isLowStock(Number(stock.quantityOnHand), Number(stock.product.minimumStockQuantity)),
  )
}

export async function listInventoryMovements(
  actor: AuthenticatedUserData,
  query: ListInventoryMovementsQuery,
) {
  const scopedUnitId = resolveInventoryReadUnitId(actor, query.unitId ?? null)

  return prisma.inventoryMovement.findMany({
    where: {
      unitId: scopedUnitId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.movementType ? { movementType: query.movementType } : {}),
    },
    include: inventoryMovementDetailsInclude,
    orderBy: {
      occurredAt: 'desc',
    },
  })
}

export async function getInventoryMovementDetails(
  actor: AuthenticatedUserData,
  movementId: string,
  query: InventoryScopeQuery = {},
) {
  return getInventoryMovementOrThrow(actor, movementId, {
    requestedUnitId: query.unitId ?? null,
  })
}

export async function recordInventoryMovement(
  actor: AuthenticatedUserData,
  input: RecordInventoryMovementInput,
) {
  if (!manualInventoryMovementTypes.has(input.movementType)) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'This inventory movement type is reserved for server-side POS processing.',
    )
  }

  return runSerializableTransaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: input.productId,
      },
      include: productDetailsInclude,
    })

    if (!product) {
      throw new AppError('NOT_FOUND', 404, 'Product not found.')
    }

    assertActorCanReadInventoryRecordInScope(actor, product.unitId, {
      requestedUnitId: input.unitId ?? null,
    })

    const unitId = resolveScopedUnitId(actor, input.unitId ?? product.unitId)

    if (unitId !== product.unitId) {
      throw new AppError('CONFLICT', 409, 'The selected product does not belong to this unit.')
    }

    if (!product.trackInventory) {
      throw new AppError(
        'CONFLICT',
        409,
        'This product does not control inventory and cannot receive stock movements.',
      )
    }

    const defaults = await getInventoryDefaultsForUnit(tx, unitId)
    const movement = await applyInventoryMovementInMutation({
      allowNegativeStock: defaults.allowNegativeStock,
      conflictMessage:
        'The stock balance changed before this manual movement could be recorded.',
      createdByUserId: actor.id,
      movementType: input.movementType,
      notes: input.notes,
      productId: product.id,
      quantity: input.quantity,
      reason: input.reason,
      tx,
      unitId,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'inventory_movement.create',
      entityName: 'InventoryMovement',
      entityId: movement.id,
      details: {
        movementType: movement.movementType,
        productId: movement.productId,
        quantity: Number(movement.quantity),
        quantityBefore: Number(movement.quantityBefore),
        quantityAfter: Number(movement.quantityAfter),
        reason: movement.reason,
      },
    })

    return movement
  }, 'The stock balance changed before this manual movement could be recorded.')
}
