import {
  CreditOriginType,
  DepositPurpose,
  DepositStatus,
  FinancialTransactionType,
  IntegrationProvider,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()
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

export const createFinancialTransactionInputSchema = z.object({
  unitId: optionalString,
  appointmentId: optionalString,
  transactionType: z.nativeEnum(FinancialTransactionType),
  description: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  integrationProvider: z.nativeEnum(IntegrationProvider).optional(),
  externalReference: optionalString,
  occurredAt: optionalDate,
})

export const updateFinancialTransactionInputSchema = z
  .object({
    unitId: optionalString,
    appointmentId: optionalString,
    transactionType: z.nativeEnum(FinancialTransactionType).optional(),
    description: optionalString,
    amount: z.coerce.number().positive().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    integrationProvider: z.nativeEnum(IntegrationProvider).nullable().optional(),
    externalReference: optionalString,
    occurredAt: optionalDate,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listFinancialTransactionsQuerySchema = z.object({
  unitId: optionalString,
  appointmentId: optionalString,
  transactionType: z.nativeEnum(FinancialTransactionType).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
})

export const listDepositsQuerySchema = z.object({
  unitId: optionalString,
  appointmentId: optionalString,
  clientId: optionalString,
  purpose: z.nativeEnum(DepositPurpose).optional(),
  status: z.nativeEnum(DepositStatus).optional(),
})

export const createDepositInputSchema = z
  .object({
    unitId: optionalString,
    appointmentId: optionalString,
    clientId: optionalString,
    amount: z.coerce.number().positive(),
    purpose: z.nativeEnum(DepositPurpose).default(DepositPurpose.SECURITY),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    status: z.nativeEnum(DepositStatus).optional(),
    integrationProvider: z.nativeEnum(IntegrationProvider).optional(),
    externalReference: optionalString,
    notes: optionalString,
    expiresAt: optionalDate,
  })
  .refine((value) => value.clientId || value.appointmentId, {
    message: 'A deposit requires a client or appointment reference.',
    path: ['clientId'],
  })

export const updateDepositStatusInputSchema = z.object({
  status: z.nativeEnum(DepositStatus),
  notes: optionalString,
})

export const listRefundsQuerySchema = z.object({
  unitId: optionalString,
  appointmentId: optionalString,
  clientId: optionalString,
  status: z.nativeEnum(RefundStatus).optional(),
})

export const createRefundInputSchema = z
  .object({
    unitId: optionalString,
    appointmentId: optionalString,
    clientId: optionalString,
    sourceFinancialTransactionId: optionalString,
    originDepositId: optionalString,
    amount: z.coerce.number().positive(),
    reason: z.string().trim().min(1),
    externalReference: optionalString,
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    integrationProvider: z.nativeEnum(IntegrationProvider).optional(),
    createClientCredit: optionalBoolean.default(false),
  })
  .refine(
    (value) =>
      value.sourceFinancialTransactionId || value.originDepositId || value.appointmentId || value.clientId,
    {
      message: 'A refund requires a source transaction, deposit, appointment, or client reference.',
      path: ['sourceFinancialTransactionId'],
    },
  )

export const listClientCreditsQuerySchema = z.object({
  unitId: optionalString,
  clientId: optionalString,
  includeExpired: optionalBoolean.default(false),
})

export const createClientCreditInputSchema = z
  .object({
    unitId: optionalString,
    clientId: z.string().trim().min(1),
    originType: z.nativeEnum(CreditOriginType),
    totalAmount: z.coerce.number().positive(),
    notes: optionalString,
    expiresAt: optionalDate,
    originRefundId: optionalString,
    originDepositId: optionalString,
  })
  .superRefine((value, context) => {
    const hasRefundOrigin = Boolean(value.originRefundId)
    const hasDepositOrigin = Boolean(value.originDepositId)

    if (hasRefundOrigin && hasDepositOrigin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Client credit can reference either a refund or a deposit conversion origin, not both.',
        path: ['originRefundId'],
      })
      return
    }

    if (value.originType === CreditOriginType.REFUND) {
      if (!hasRefundOrigin) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Refund-origin credits require originRefundId.',
          path: ['originRefundId'],
        })
      }

      return
    }

    if (value.originType === CreditOriginType.DEPOSIT_CONVERSION) {
      if (!hasDepositOrigin) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Deposit-conversion credits require originDepositId.',
          path: ['originDepositId'],
        })
      }

      return
    }

    if (hasRefundOrigin || hasDepositOrigin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Only refund and deposit-conversion credits can reference a financial origin.',
        path: [hasRefundOrigin ? 'originRefundId' : 'originDepositId'],
      })
    }
  })

export const useClientCreditInputSchema = z.object({
  appointmentId: z.string().trim().min(1),
  creditId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  description: optionalString,
})

export const useClientCreditRouteBodySchema = useClientCreditInputSchema.omit({
  creditId: true,
})

export const recordNoShowChargeInputSchema = z.object({
  amount: z.coerce.number().positive(),
  description: optionalString,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  integrationProvider: z.nativeEnum(IntegrationProvider).optional(),
  externalReference: optionalString,
})

export type CreateClientCreditInput = z.infer<typeof createClientCreditInputSchema>
export type CreateDepositInput = z.infer<typeof createDepositInputSchema>
export type CreateFinancialTransactionInput = z.infer<typeof createFinancialTransactionInputSchema>
export type CreateRefundInput = z.infer<typeof createRefundInputSchema>
export type ListClientCreditsQuery = z.infer<typeof listClientCreditsQuerySchema>
export type ListDepositsQuery = z.infer<typeof listDepositsQuerySchema>
export type ListFinancialTransactionsQuery = z.infer<typeof listFinancialTransactionsQuerySchema>
export type ListRefundsQuery = z.infer<typeof listRefundsQuerySchema>
export type RecordNoShowChargeInput = z.infer<typeof recordNoShowChargeInputSchema>
export type UpdateDepositStatusInput = z.infer<typeof updateDepositStatusInputSchema>
export type UpdateFinancialTransactionInput = z.infer<typeof updateFinancialTransactionInputSchema>
export type UseClientCreditInput = z.infer<typeof useClientCreditInputSchema>
export type UseClientCreditRouteBodyInput = z.infer<typeof useClientCreditRouteBodySchema>
