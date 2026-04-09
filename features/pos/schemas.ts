import {
  IntegrationProvider,
  PaymentMethod,
  PaymentStatus,
  PosSaleStatus,
} from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value === 'true' || value === 'on') {
      return true
    }

    if (value === 'false') {
      return false
    }
  }

  return value
}, z.boolean().optional())

const posSaleItemInputSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().default(0),
})

export const listPosSalesQuerySchema = z.object({
  clientId: optionalString,
  status: z.nativeEnum(PosSaleStatus).optional(),
  unitId: optionalString,
})

export const createPosSaleInputSchema = z
  .object({
    unitId: optionalString,
    clientId: optionalString,
    notes: optionalString,
    items: z.array(posSaleItemInputSchema).min(1),
    completeNow: optionalBoolean.default(false),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).default('PAID'),
    integrationProvider: z.nativeEnum(IntegrationProvider).optional(),
    externalReference: optionalString,
    issueFiscalDocument: optionalBoolean,
  })
  .superRefine((value, context) => {
    if (value.completeNow && !value.paymentMethod) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment method is required when completing the POS sale immediately.',
        path: ['paymentMethod'],
      })
    }
  })

export const completePosSaleInputSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentStatus: z.nativeEnum(PaymentStatus).default('PAID'),
  integrationProvider: z.nativeEnum(IntegrationProvider).optional(),
  externalReference: optionalString,
  issueFiscalDocument: optionalBoolean,
})

export const cancelPosSaleInputSchema = z.object({
  cancellationReason: optionalString,
})

export type CancelPosSaleInput = z.infer<typeof cancelPosSaleInputSchema>
export type CompletePosSaleInput = z.infer<typeof completePosSaleInputSchema>
export type CreatePosSaleInput = z.infer<typeof createPosSaleInputSchema>
export type ListPosSalesQuery = z.infer<typeof listPosSalesQuerySchema>
export type PosSaleItemInput = z.infer<typeof posSaleItemInputSchema>
