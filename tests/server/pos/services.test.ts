import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { Prisma } from '@prisma/client'
import {
  cancelPosSale,
  completePosSale,
  createPosSale,
  listPosSales,
} from '../../../features/pos/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const posActor: AuthenticatedUserData = {
  active: true,
  email: 'pos@petos.app',
  id: 'user_pos_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'PDV Local',
  permissions: [],
  profiles: ['Gerente'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

function whereMatchesSaleReference(where: {
  OR?: Array<{ posSaleId?: string; revenuePosSaleId?: string }>
  posSaleId?: string
  revenuePosSaleId?: string
}) {
  return (
    where.posSaleId === 'sale_1' ||
    where.revenuePosSaleId === 'sale_1' ||
    where.OR?.some(
      (clause) => clause.posSaleId === 'sale_1' || clause.revenuePosSaleId === 'sale_1',
    ) === true
  )
}

function whereMatchesSaleItemReference(where: {
  OR?: Array<{ posSaleItemId?: string; saleOutPosSaleItemId?: string }>
  posSaleItemId?: string
  saleOutPosSaleItemId?: string
}) {
  return (
    where.posSaleItemId === 'item_1' ||
    where.saleOutPosSaleItemId === 'item_1' ||
    where.OR?.some(
      (clause) =>
        clause.posSaleItemId === 'item_1' || clause.saleOutPosSaleItemId === 'item_1',
    ) === true
  )
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('completePosSale rejects stale completion when the sale changes first', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        financialTransaction: {
          findFirst: async () => null,
        },
        inventoryMovement: {
          findFirst: async () => null,
        },
        posSale: {
          findUnique: async () => ({
            id: 'sale_1',
            status: 'OPEN',
            totalAmount: new Prisma.Decimal(50),
            unitId: 'unit_local',
          }),
          updateMany: async () => ({
            count: 0,
          }),
        },
        posSaleItem: {
          findMany: async () => [],
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await assert.rejects(
    () =>
      completePosSale(posActor, 'sale_1', {
        paymentMethod: 'PIX',
        paymentStatus: 'PAID',
      }),
    /changed before it could be completed/,
  )
})

test('completePosSale rejects an open sale that already has registered economic effects', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        financialTransaction: {
          findFirst: async ({
            where,
          }: {
            where: {
              OR?: Array<{ posSaleId?: string; revenuePosSaleId?: string }>
              posSaleId?: string
              revenuePosSaleId?: string
            }
          }) =>
            whereMatchesSaleReference(where)
              ? {
                  id: 'tx_existing',
                }
              : null,
        },
        inventoryMovement: {
          findFirst: async () => null,
        },
        posSale: {
          findUnique: async () => ({
            id: 'sale_1',
            status: 'OPEN',
            totalAmount: new Prisma.Decimal(50),
            unitId: 'unit_local',
          }),
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await assert.rejects(
    () =>
      completePosSale(posActor, 'sale_1', {
        paymentMethod: 'CARD',
        paymentStatus: 'PAID',
      }),
    /already has registered inventory or financial effects/,
  )
})

test('completePosSale rejects duplicate SALE_OUT effects found at the inventory write boundary', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        financialTransaction: {
          findFirst: async () => null,
        },
        inventoryMovement: {
          findFirst: async ({
            where,
          }: {
            where: {
              OR?: Array<{ posSaleItemId?: string; saleOutPosSaleItemId?: string }>
              movementType?: string
              posSaleId?: string
              posSaleItemId?: string
              saleOutPosSaleItemId?: string
            }
          }) =>
            where.movementType === 'SALE_OUT' && whereMatchesSaleItemReference(where)
              ? {
                  id: 'movement_existing',
                }
              : null,
        },
        posSale: {
          findUnique: async () => ({
            id: 'sale_1',
            status: 'OPEN',
            totalAmount: new Prisma.Decimal(50),
            unitId: 'unit_local',
          }),
          updateMany: async () => ({
            count: 1,
          }),
        },
        posSaleItem: {
          findMany: async () => [
            {
              id: 'item_1',
              product: {
                active: true,
                id: 'product_1',
                name: 'Shampoo',
                salePrice: new Prisma.Decimal(50),
                sku: 'SKU-1',
                trackInventory: true,
                unitId: 'unit_local',
              },
              productId: 'product_1',
              quantity: new Prisma.Decimal(1),
            },
          ],
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await assert.rejects(
    () =>
      completePosSale(posActor, 'sale_1', {
        paymentMethod: 'CARD',
        paymentStatus: 'PAID',
      }),
    /already has a recorded SALE_OUT inventory movement/,
  )
})

test('completePosSale rejects duplicate revenue effects found at the financial write boundary', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        financialTransaction: {
          findFirst: async ({
            where,
          }: {
            where: {
              OR?: Array<{ posSaleId?: string; revenuePosSaleId?: string }>
              posSaleId?: string
              revenuePosSaleId?: string
              transactionType?: string
            }
          }) =>
            where.transactionType === 'REVENUE' && whereMatchesSaleReference(where)
              ? {
                  id: 'tx_existing',
                }
              : null,
        },
        inventoryMovement: {
          findFirst: async () => null,
        },
        posSale: {
          findUnique: async () => ({
            id: 'sale_1',
            status: 'OPEN',
            totalAmount: new Prisma.Decimal(50),
            unitId: 'unit_local',
          }),
          updateMany: async () => ({
            count: 1,
          }),
        },
        posSaleItem: {
          findMany: async () => [],
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await assert.rejects(
    () =>
      completePosSale(posActor, 'sale_1', {
        paymentMethod: 'CARD',
        paymentStatus: 'PAID',
      }),
    /already has a registered revenue effect/,
  )
})

test('createPosSale rejects duplicate integration references before completing the sale', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        client: {
          findUnique: async () => null,
        },
        financialTransaction: {
          findFirst: async ({
            where,
          }: {
            where: {
              OR?: Array<{ posSaleId?: string; revenuePosSaleId?: string }>
              externalReference?: string
              integrationProvider?: string
              posSaleId?: string
              revenuePosSaleId?: string
            }
          }) => {
            if (whereMatchesSaleReference(where)) {
              return null
            }

            if (
              where.externalReference === 'gateway_ref_1' &&
              where.integrationProvider === 'STRIPE'
            ) {
              return {
                id: 'tx_existing',
                posSaleId: 'sale_other',
              }
            }

            return null
          },
        },
        inventoryMovement: {
          findFirst: async () => null,
        },
        posSale: {
          create: async () => ({
            id: 'sale_1',
          }),
          findUnique: async () => ({
            id: 'sale_1',
            status: 'OPEN',
            totalAmount: new Prisma.Decimal(30),
            unitId: 'unit_local',
          }),
        },
        posSaleItem: {
          create: async () => null,
        },
        product: {
          findMany: async () => [
            {
              active: true,
              id: 'product_1',
              name: 'Shampoo',
              salePrice: new Prisma.Decimal(30),
              sku: 'SKU-1',
              trackInventory: false,
              unitId: 'unit_local',
            },
          ],
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await assert.rejects(
    () =>
      createPosSale(posActor, {
        completeNow: true,
        externalReference: 'gateway_ref_1',
        integrationProvider: 'STRIPE',
        issueFiscalDocument: false,
        items: [
          {
            discountAmount: 0,
            productId: 'product_1',
            quantity: 1,
          },
        ],
        paymentMethod: 'CARD',
        paymentStatus: 'PAID',
      }),
    /already uses this integration reference/,
  )
})

test('cancelPosSale rejects stale cancellation when the sale changes first', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        financialTransaction: {
          findFirst: async () => null,
        },
        inventoryMovement: {
          findFirst: async () => null,
        },
        posSale: {
          findUnique: async () => ({
            id: 'sale_1',
            status: 'OPEN',
            unitId: 'unit_local',
          }),
          updateMany: async () => ({
            count: 0,
          }),
        },
      }),
  )

  await assert.rejects(
    () =>
      cancelPosSale(posActor, 'sale_1', {
        cancellationReason: 'Cliente desistiu',
      }),
    /changed before it could be canceled/,
  )
})

test('listPosSales requests a sanitized projection for nested users and ledger data', async () => {
  let receivedArgs: Record<string, unknown> | undefined

  replaceMethod(prisma as object, 'posSale', {
    findMany: async (args: Record<string, unknown>) => {
      receivedArgs = args
      return []
    },
  })

  await listPosSales(posActor, {})

  const include = receivedArgs?.include as {
    client: { include: { user: { select: Record<string, boolean> } } }
    createdBy: { select: Record<string, boolean> }
    financialTransactions: { select: Record<string, boolean> }
  }

  assert.equal(include.createdBy.select.passwordHash, undefined)
  assert.equal(include.client.include.user.select.passwordHash, undefined)
  assert.equal(include.financialTransactions.select.metadata, undefined)
  assert.equal(include.createdBy.select.name, true)
  assert.equal(include.client.include.user.select.email, true)
})

test('completePosSale audit includes the linked financial and inventory effects', async () => {
  const auditEntries: Array<Record<string, unknown>> = []
  const createdFinancialTransactions: Array<Record<string, unknown>> = []
  const createdInventoryMovements: Array<Record<string, unknown>> = []

  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        auditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            auditEntries.push(data)
            return null
          },
        },
        financialTransaction: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdFinancialTransactions.push(data)

            return {
            id: 'tx_1',
            }
          },
          findFirst: async () => null,
        },
        inventoryMovement: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdInventoryMovements.push(data)

            return {
            id: 'movement_1',
            quantity: new Prisma.Decimal(1),
            quantityAfter: new Prisma.Decimal(4),
            quantityBefore: new Prisma.Decimal(5),
            }
          },
          findFirst: async () => null,
        },
        inventoryStock: {
          updateMany: async () => ({
            count: 1,
          }),
          upsert: async () => ({
            id: 'stock_1',
            quantityOnHand: new Prisma.Decimal(5),
          }),
        },
        posSale: {
          findUnique: async ({ include, select }: { include?: unknown; select?: unknown }) => {
            if (select) {
              return {
                id: 'sale_1',
                status: 'OPEN',
                totalAmount: new Prisma.Decimal(50),
                unitId: 'unit_local',
              }
            }

            if (include) {
              return {
                canceledAt: null,
                completedAt: null,
                createdAt: new Date('2026-04-13T12:00:00.000Z'),
                financialTransactions: [],
                id: 'sale_1',
                inventoryMovements: [],
                items: [],
                status: 'OPEN',
                totalAmount: new Prisma.Decimal(50),
                unitId: 'unit_local',
              }
            }

            return null
          },
          findUniqueOrThrow: async () => ({
            client: null,
            createdBy: null,
            financialTransactions: [
              {
                amount: new Prisma.Decimal(50),
                externalReference: 'gateway_ref_1',
                id: 'tx_1',
                integrationProvider: 'STRIPE',
                occurredAt: new Date('2026-04-13T12:00:00.000Z'),
                paymentMethod: 'CARD',
                paymentStatus: 'PAID',
                transactionType: 'REVENUE',
              },
            ],
            id: 'sale_1',
            inventoryMovements: [
              {
                createdBy: null,
                id: 'movement_1',
                movementType: 'SALE_OUT',
                occurredAt: new Date('2026-04-13T12:00:00.000Z'),
                posSaleId: 'sale_1',
                posSaleItemId: 'item_1',
                product: {
                  active: true,
                  barcode: null,
                  id: 'product_1',
                  minimumStockQuantity: new Prisma.Decimal(1),
                  name: 'Shampoo',
                  salePrice: new Prisma.Decimal(50),
                  sku: 'SKU-1',
                  trackInventory: true,
                  unitId: 'unit_local',
                  unitOfMeasure: 'UN',
                },
                productId: 'product_1',
                quantity: new Prisma.Decimal(1),
                quantityAfter: new Prisma.Decimal(4),
                quantityBefore: new Prisma.Decimal(5),
                unit: {
                  active: true,
                  id: 'unit_local',
                  name: 'Unidade Local',
                },
                unitId: 'unit_local',
              },
            ],
            items: [
              {
                discountAmount: new Prisma.Decimal(0),
                id: 'item_1',
                product: {
                  active: true,
                  barcode: null,
                  id: 'product_1',
                  minimumStockQuantity: new Prisma.Decimal(1),
                  name: 'Shampoo',
                  salePrice: new Prisma.Decimal(50),
                  sku: 'SKU-1',
                  trackInventory: true,
                  unitId: 'unit_local',
                  unitOfMeasure: 'UN',
                },
                productId: 'product_1',
                productNameSnapshot: 'Shampoo',
                quantity: new Prisma.Decimal(1),
                saleId: 'sale_1',
                skuSnapshot: 'SKU-1',
                totalAmount: new Prisma.Decimal(50),
                unitPrice: new Prisma.Decimal(50),
              },
            ],
            totalAmount: new Prisma.Decimal(50),
            unit: {
              active: true,
              id: 'unit_local',
              name: 'Unidade Local',
            },
            unitId: 'unit_local',
          }),
          updateMany: async () => ({
            count: 1,
          }),
        },
        posSaleItem: {
          findMany: async () => [
            {
              id: 'item_1',
              product: {
                active: true,
                id: 'product_1',
                name: 'Shampoo',
                salePrice: new Prisma.Decimal(50),
                sku: 'SKU-1',
                trackInventory: true,
                unitId: 'unit_local',
              },
              productId: 'product_1',
              quantity: new Prisma.Decimal(1),
            },
          ],
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await completePosSale(posActor, 'sale_1', {
    externalReference: 'gateway_ref_1',
    integrationProvider: 'STRIPE',
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
  })

  assert.equal(auditEntries.length, 1)
  assert.equal(createdFinancialTransactions[0]?.revenuePosSaleId, 'sale_1')
  assert.equal(createdFinancialTransactions[0]?.posSaleId, 'sale_1')
  assert.equal(createdInventoryMovements[0]?.saleOutPosSaleItemId, 'item_1')
  assert.equal(createdInventoryMovements[0]?.posSaleItemId, 'item_1')
  const details = auditEntries[0]?.details as {
    financialTransactionIds: string[]
    inventoryMovementCount: number
    inventoryMovementIds: string[]
  }

  assert.deepEqual(details.financialTransactionIds, ['tx_1'])
  assert.equal(details.inventoryMovementCount, 1)
  assert.deepEqual(details.inventoryMovementIds, ['movement_1'])
})
