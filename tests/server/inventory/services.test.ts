import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { Prisma } from '@prisma/client'
import {
  listInventoryMovements,
  recordInventoryMovement,
} from '../../../features/inventory/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const inventoryActor: AuthenticatedUserData = {
  active: true,
  email: 'inventory@petos.app',
  id: 'user_inventory_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Estoque Local',
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

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('recordInventoryMovement rejects stale stock writes when the balance changes first', async () => {
  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        inventoryMovement: {
          create: async () => {
            throw new Error('inventoryMovement.create should not be reached')
          },
        },
        inventoryStock: {
          updateMany: async () => ({
            count: 0,
          }),
          upsert: async () => ({
            id: 'stock_1',
            quantityOnHand: new Prisma.Decimal(2),
          }),
        },
        product: {
          findUnique: async () => ({
            active: true,
            id: 'product_1',
            inventoryStocks: [],
            name: 'Colonia',
            trackInventory: true,
            unit: null,
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
      recordInventoryMovement(inventoryActor, {
        movementType: 'ADJUSTMENT_OUT',
        productId: 'product_1',
        quantity: 1,
        reason: 'Ajuste manual',
      }),
    /balance changed before this manual movement could be recorded/,
  )
})

test('recordInventoryMovement keeps sale-out anchors empty for manual stock movements', async () => {
  const createdMovements: Array<Record<string, unknown>> = []

  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        auditLog: {
          create: async () => null,
        },
        inventoryMovement: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdMovements.push(data)

            return {
              id: 'movement_1',
              movementType: 'ADJUSTMENT_OUT',
              productId: 'product_1',
              quantity: new Prisma.Decimal(1),
              quantityAfter: new Prisma.Decimal(1),
              quantityBefore: new Prisma.Decimal(2),
              reason: 'Ajuste manual',
            }
          },
        },
        inventoryStock: {
          updateMany: async () => ({
            count: 1,
          }),
          upsert: async () => ({
            id: 'stock_1',
            quantityOnHand: new Prisma.Decimal(2),
          }),
        },
        product: {
          findUnique: async () => ({
            active: true,
            id: 'product_1',
            inventoryStocks: [],
            name: 'Colonia',
            trackInventory: true,
            unit: null,
            unitId: 'unit_local',
          }),
        },
        unitSetting: {
          findMany: async () => [],
        },
      }),
  )

  await recordInventoryMovement(inventoryActor, {
    movementType: 'ADJUSTMENT_OUT',
    productId: 'product_1',
    quantity: 1,
    reason: 'Ajuste manual',
  })

  assert.equal(createdMovements.length, 1)
  assert.equal(createdMovements[0]?.saleOutPosSaleItemId, null)
  assert.equal(createdMovements[0]?.posSaleItemId, null)
})

test('listInventoryMovements requests a sanitized projection for nested users', async () => {
  let receivedArgs: Record<string, unknown> | undefined

  replaceMethod(prisma as object, 'inventoryMovement', {
    findMany: async (args: Record<string, unknown>) => {
      receivedArgs = args
      return []
    },
  })

  await listInventoryMovements(inventoryActor, {})

  const include = receivedArgs?.include as {
    createdBy: { select: Record<string, boolean> }
    posSale: { select: Record<string, boolean> }
  }

  assert.equal(include.createdBy.select.passwordHash, undefined)
  assert.equal(include.posSale.select.notes, undefined)
  assert.equal(include.createdBy.select.email, true)
  assert.equal(include.posSale.select.totalAmount, true)
})
