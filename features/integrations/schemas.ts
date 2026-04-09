import {
  DepositStatus,
  FiscalDocumentStatus,
  IntegrationEventDirection,
  IntegrationEventStatus,
  IntegrationProvider,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const listIntegrationEventsQuerySchema = z.object({
  direction: z.nativeEnum(IntegrationEventDirection).optional(),
  eventType: optionalString,
  provider: z.nativeEnum(IntegrationProvider).optional(),
  status: z.nativeEnum(IntegrationEventStatus).optional(),
  unitId: optionalString,
})

const normalizedIntegrationPayloadSchema = z.object({
  accessKey: optionalString,
  depositStatus: z.nativeEnum(DepositStatus).optional(),
  documentNumber: optionalString,
  errorMessage: optionalString,
  externalReference: optionalString,
  fiscalDocumentStatus: z.nativeEnum(FiscalDocumentStatus).optional(),
  issuedAt: optionalDate,
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  refundStatus: z.nativeEnum(RefundStatus).optional(),
  series: optionalString,
})

export const normalizedIntegrationEventInputSchema = z.object({
  data: normalizedIntegrationPayloadSchema,
  eventType: z.string().trim().min(1),
  externalEventId: z.string().trim().min(1),
  resourceId: optionalString,
  resourceType: z.enum(['deposit', 'financial_transaction', 'fiscal_document', 'refund']),
  unitId: optionalString,
}).refine((value) => value.resourceId || value.data.externalReference, {
  message: 'A normalized integration event requires a local resource id or external reference.',
  path: ['resourceId'],
})

export type ListIntegrationEventsQuery = z.infer<typeof listIntegrationEventsQuerySchema>
export type NormalizedIntegrationEventInput = z.infer<typeof normalizedIntegrationEventInputSchema>
