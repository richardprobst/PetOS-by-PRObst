import { InventoryMovementType } from '@prisma/client'
import { AppError } from '@/server/http/errors'

export function calculateInventoryDelta(
  movementType: InventoryMovementType,
  quantity: number,
) {
  if (quantity <= 0) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Inventory quantity must be greater than zero.')
  }

  switch (movementType) {
    case 'STOCK_IN':
    case 'RETURN_IN':
    case 'ADJUSTMENT_IN':
      return quantity
    case 'SALE_OUT':
    case 'ADJUSTMENT_OUT':
      return -quantity
    default:
      return 0
  }
}

export function applyInventoryMovement(args: {
  allowNegativeStock: boolean
  currentQuantity: number
  movementType: InventoryMovementType
  quantity: number
}) {
  const delta = calculateInventoryDelta(args.movementType, args.quantity)
  const nextQuantity = Number((args.currentQuantity + delta).toFixed(3))

  if (!args.allowNegativeStock && nextQuantity < 0) {
    throw new AppError(
      'CONFLICT',
      409,
      'This stock movement would leave the product with a negative balance.',
    )
  }

  return {
    delta,
    nextQuantity,
    previousQuantity: Number(args.currentQuantity.toFixed(3)),
  }
}

export function isLowStock(quantityOnHand: number, minimumStockQuantity: number) {
  return quantityOnHand <= minimumStockQuantity
}

