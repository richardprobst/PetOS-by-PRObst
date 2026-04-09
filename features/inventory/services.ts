import { InventoryMovementType, Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import {
  applyInventoryMovement,
  isLowStock,
} from '@/features/inventory/domain'
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

const productDetailsInclude = Prisma.validator<Prisma.ProductInclude>()({
  inventoryStocks: true,
  unit: true,
})

const inventoryStockDetailsInclude = Prisma.validator<Prisma.InventoryStockInclude>()({
  product: true,
  unit: true,
})

const inventoryMovementDetailsInclude = Prisma.validator<Prisma.InventoryMovementInclude>()({
  createdBy: true,
  posSale: true,
  product: true,
  unit: true,
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

async function getInventoryMovementOrThrow(actor: AuthenticatedUserData, movementId: string) {
  const movement = await prisma.inventoryMovement.findUnique({
    where: {
      id: movementId,
    },
    include: inventoryMovementDetailsInclude,
  })

  if (!movement) {
    throw new AppError('NOT_FOUND', 404, 'Inventory movement not found.')
  }

  assertActorCanReadInventoryRecordInScope(actor, movement.unitId)

  return movement
}

export async function getInventoryDefaultsForUnit(
  client: InventoryMutationClient,
  unitId: string,
): Promise<InventoryDefaults> {
  const settings = await client.unitSetting.findMany({
    where: {
      unitId,
      key: {
        in: [inventorySettingKeys.allowNegativeStock, inventorySettingKeys.minimumStockQuantity],
      },
    },
  })

  const allowNegativeStockValue =
    settings.find((setting) => setting.key === inventorySettingKeys.allowNegativeStock)?.value ?? 'false'
  const defaultMinimumStockQuantityValue =
    settings.find((setting) => setting.key === inventorySettingKeys.minimumStockQuantity)?.value ?? '1'

  return {
    allowNegativeStock: allowNegativeStockValue === 'true',
    defaultMinimumStockQuantity: Number(defaultMinimumStockQuantityValue) || 1,
  }
}

export async function ensureInventoryStockRecord(
  client: InventoryMutationClient,
  unitId: string,
  productId: string,
) {
  const existingStock = await client.inventoryStock.findUnique({
    where: {
      unitId_productId: {
        productId,
        unitId,
      },
    },
  })

  if (existingStock) {
    return existingStock
  }

  return client.inventoryStock.create({
    data: {
      productId,
      unitId,
      quantityOnHand: 0,
    },
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
    requestedUnitId: query.unitId ?? null,
  })

  return movement
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

  const product = await getProductOrThrow(actor, input.productId)
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

  return prisma.$transaction(async (tx) => {
    const [defaults, stock] = await Promise.all([
      getInventoryDefaultsForUnit(tx, unitId),
      ensureInventoryStockRecord(tx, unitId, product.id),
    ])

    const movementSnapshot = applyInventoryMovement({
      allowNegativeStock: defaults.allowNegativeStock,
      currentQuantity: Number(stock.quantityOnHand),
      movementType: input.movementType,
      quantity: input.quantity,
    })

    await tx.inventoryStock.update({
      where: {
        id: stock.id,
      },
      data: {
        lastMovementAt: new Date(),
        quantityOnHand: movementSnapshot.nextQuantity,
      },
    })

    const movement = await tx.inventoryMovement.create({
      data: {
        unitId,
        productId: product.id,
        createdByUserId: actor.id,
        movementType: input.movementType,
        quantity: input.quantity,
        quantityBefore: movementSnapshot.previousQuantity,
        quantityAfter: movementSnapshot.nextQuantity,
        reason: input.reason,
        notes: input.notes,
      },
      include: inventoryMovementDetailsInclude,
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
        quantityAfter: Number(movement.quantityAfter),
      },
    })

    return movement
  })
}
