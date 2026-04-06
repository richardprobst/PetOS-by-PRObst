import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()

export const createReportCardInputSchema = z.object({
  appointmentId: z.string().trim().min(1),
  generalNotes: optionalString,
  petBehavior: optionalString,
  productsUsed: optionalString,
  nextReturnRecommendation: optionalString,
})

export const updateReportCardInputSchema = z
  .object({
    generalNotes: optionalString,
    petBehavior: optionalString,
    productsUsed: optionalString,
    nextReturnRecommendation: optionalString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listReportCardsQuerySchema = z.object({
  appointmentId: optionalString,
  clientId: optionalString,
})

export type CreateReportCardInput = z.infer<typeof createReportCardInputSchema>
export type UpdateReportCardInput = z.infer<typeof updateReportCardInputSchema>
export type ListReportCardsQuery = z.infer<typeof listReportCardsQuerySchema>
