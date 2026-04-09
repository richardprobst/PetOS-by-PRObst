import {
  FiscalDocumentStatus,
  FiscalDocumentType,
} from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const listFiscalDocumentsQuerySchema = z.object({
  appointmentId: optionalString,
  financialTransactionId: optionalString,
  status: z.nativeEnum(FiscalDocumentStatus).optional(),
  unitId: optionalString,
})

export const createFiscalDocumentInputSchema = z
  .object({
    unitId: optionalString,
    appointmentId: optionalString,
    financialTransactionId: optionalString,
    documentType: z.nativeEnum(FiscalDocumentType),
    externalReference: optionalString,
  })
  .refine((value) => value.appointmentId || value.financialTransactionId, {
    message: 'A fiscal document requires an appointment or financial transaction reference.',
    path: ['appointmentId'],
  })

export const updateFiscalDocumentStatusInputSchema = z.object({
  status: z.nativeEnum(FiscalDocumentStatus),
  externalReference: optionalString,
  documentNumber: optionalString,
  series: optionalString,
  accessKey: optionalString,
  issuedAt: optionalDate,
  lastError: optionalString,
})

export type CreateFiscalDocumentInput = z.infer<typeof createFiscalDocumentInputSchema>
export type ListFiscalDocumentsQuery = z.infer<typeof listFiscalDocumentsQuerySchema>
export type UpdateFiscalDocumentStatusInput = z.infer<typeof updateFiscalDocumentStatusInputSchema>
