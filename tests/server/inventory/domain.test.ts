import assert from 'node:assert/strict'
import test from 'node:test'
import { AppError } from '../../../server/http/errors'
import {
  applyInventoryMovement,
  isLowStock,
} from '../../../features/inventory/domain'

test('applyInventoryMovement increases stock for inbound movements', () => {
  const movement = applyInventoryMovement({
    allowNegativeStock: false,
    currentQuantity: 2,
    movementType: 'STOCK_IN',
    quantity: 3,
  })

  assert.deepEqual(movement, {
    delta: 3,
    nextQuantity: 5,
    previousQuantity: 2,
  })
})

test('applyInventoryMovement blocks negative stock when unit policy forbids it', () => {
  assert.throws(
    () =>
      applyInventoryMovement({
        allowNegativeStock: false,
        currentQuantity: 1,
        movementType: 'ADJUSTMENT_OUT',
        quantity: 2,
      }),
    (error) =>
      error instanceof AppError &&
      error.code === 'CONFLICT' &&
      error.message === 'This stock movement would leave the product with a negative balance.',
  )
})

test('isLowStock returns true when quantity is equal to or below minimum', () => {
  assert.equal(isLowStock(1, 2), true)
  assert.equal(isLowStock(2, 2), true)
  assert.equal(isLowStock(3, 2), false)
})

