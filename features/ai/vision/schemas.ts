import { z } from 'zod'

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
)

export const imageAnalysisKindSchema = z.enum([
  'GALLERY_METADATA',
  'PRE_POST_ASSISTED',
])

export type ImageAnalysisKind = z.infer<typeof imageAnalysisKindSchema>

export const imageAnalysisReviewStatusSchema = z.enum([
  'NOT_REQUIRED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
])

export type ImageAnalysisReviewStatus = z.infer<
  typeof imageAnalysisReviewStatusSchema
>

export const mediaCaptureStageSchema = z.enum([
  'GALLERY',
  'PRE_SERVICE',
  'POST_SERVICE',
])

export type MediaCaptureStage = z.infer<typeof mediaCaptureStageSchema>

export const imageAnalysisConsentOriginSchema = z.enum([
  'TUTOR_FLOW_OPT_IN',
  'ADMIN_CAPTURE',
])

export type ImageAnalysisConsentOrigin = z.infer<
  typeof imageAnalysisConsentOriginSchema
>

export const listImageAnalysesQuerySchema = z.object({
  appointmentId: optionalString,
  kind: imageAnalysisKindSchema.optional(),
  mediaAssetId: optionalString,
  petId: optionalString,
  reviewStatus: imageAnalysisReviewStatusSchema.optional(),
  unitId: optionalString,
})

const imageAnalysisTriggerBaseSchema = z.object({
  consentGranted: z.boolean(),
  consentOrigin: imageAnalysisConsentOriginSchema,
  mediaAssetId: z.string().trim().min(1),
})

export const createGalleryImageAnalysisInputSchema =
  imageAnalysisTriggerBaseSchema.extend({
    kind: z.literal('GALLERY_METADATA'),
  })

export const createPrePostImageAnalysisInputSchema =
  imageAnalysisTriggerBaseSchema.extend({
    comparisonMediaAssetId: z.string().trim().min(1),
    kind: z.literal('PRE_POST_ASSISTED'),
    reportCardId: optionalString,
  })

export const createImageAnalysisInputSchema = z.discriminatedUnion('kind', [
  createGalleryImageAnalysisInputSchema,
  createPrePostImageAnalysisInputSchema,
])

export const reviewImageAnalysisInputSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    reviewNotes: optionalString,
  })
  .superRefine((input, context) => {
    if (input.decision === 'REJECTED' && !input.reviewNotes) {
      context.addIssue({
        code: 'custom',
        message: 'Review notes are required when rejecting an image analysis.',
        path: ['reviewNotes'],
      })
    }
  })

export type ListImageAnalysesQuery = z.infer<
  typeof listImageAnalysesQuerySchema
>
export type CreateGalleryImageAnalysisInput = z.infer<
  typeof createGalleryImageAnalysisInputSchema
>
export type CreatePrePostImageAnalysisInput = z.infer<
  typeof createPrePostImageAnalysisInputSchema
>
export type CreateImageAnalysisInput = z.infer<
  typeof createImageAnalysisInputSchema
>
export type ReviewImageAnalysisInput = z.infer<
  typeof reviewImageAnalysisInputSchema
>
