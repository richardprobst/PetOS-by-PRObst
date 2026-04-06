import { InventoryMovementType } from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value === 'true') {
      return true
    }

    if (value === 'false') {
      return false
    }
  }

  return value
}, z.boolean().optional())

export const listProductsQuerySchema = z.object({
  active: optionalBoolean,
  lowStockOnly: optionalBoolean.default(false),
  productId: optionalString,
  trackInventory: optionalBoolean,
})

export const createProductInputSchema = z.object({
  unitId: optionalString,
  name: z.string().trim().min(1),
  sku: optionalString,
  barcode: optionalString,
  description: optionalString,
  unitOfMeasure: optionalString.default('UN'),
  salePrice: z.coerce.number().nonnegative(),
  costPrice: z.coerce.number().nonnegative().optional(),
  minimumStockQuantity: z.coerce.number().nonnegative().optional(),
  trackInventory: optionalBoolean.default(true),
  active: optionalBoolean.default(true),
})

export const updateProductInputSchema = z
  .object({
    name: optionalString,
    sku: optionalString,
    barcode: optionalString,
    description: optionalString,
    unitOfMeasure: optionalString,
    salePrice: z.coerce.number().nonnegative().optional(),
    costPrice: z.coerce.number().nonnegative().nullable().optional(),
    minimumStockQuantity: z.coerce.number().nonnegative().optional(),
    trackInventory: optionalBoolean,
    active: optionalBoolean,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one product field must be provided.',
  })

export const listInventoryStocksQuerySchema = z.object({
  lowStockOnly: optionalBoolean.default(false),
  productId: optionalString,
})

export const listInventoryMovementsQuerySchema = z.object({
  movementType: z.nativeEnum(InventoryMovementType).optional(),
  productId: optionalString,
})

export const recordInventoryMovementInputSchema = z.object({
  unitId: optionalString,
  productId: z.string().trim().min(1),
  movementType: z.nativeEnum(InventoryMovementType),
  quantity: z.coerce.number().positive(),
  reason: optionalString,
  notes: optionalString,
})

export type CreateProductInput = z.infer<typeof createProductInputSchema>
export type ListInventoryMovementsQuery = z.infer<typeof listInventoryMovementsQuerySchema>
export type ListInventoryStocksQuery = z.infer<typeof listInventoryStocksQuerySchema>
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
export type RecordInventoryMovementInput = z.infer<typeof recordInventoryMovementInputSchema>
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>

