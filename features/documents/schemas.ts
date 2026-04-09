import { AssetAccessLevel, DocumentType, MediaType, SignatureMethod } from '@prisma/client'
import { z } from 'zod'
import { mediaCaptureStageSchema } from '@/features/ai/vision/schemas'

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const optionalString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional())
const optionalDate = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : new Date(trimmed)
}, z.date().optional())

const formBoolean = z.preprocess((value) => value === 'true' || value === 'on' || value === true, z.boolean())

export const listDocumentsQuerySchema = z.object({
  appointmentId: optionalString,
  clientId: optionalString,
  includeArchived: formBoolean.default(false),
  petId: optionalString,
  type: z.nativeEnum(DocumentType).optional(),
  unitId: optionalString,
})

export const createDocumentInputSchema = z.object({
  accessLevel: z.nativeEnum(AssetAccessLevel).default(AssetAccessLevel.PROTECTED),
  appointmentId: optionalString,
  clientId: optionalString,
  expiresAt: optionalDate,
  formPayload: optionalString,
  metadataJson: optionalString,
  petId: optionalString,
  requiresSignature: formBoolean.default(false),
  title: z.string().trim().min(1),
  type: z.nativeEnum(DocumentType),
})

export const archiveDocumentInputSchema = z.object({
  reason: optionalString,
})

export const signDocumentInputSchema = z.object({
  method: z.nativeEnum(SignatureMethod),
  payloadJson: optionalString,
  signerEmail: optionalString,
  signerName: z.string().trim().min(1),
})

export const listMediaAssetsQuerySchema = z.object({
  appointmentId: optionalString,
  clientId: optionalString,
  includeArchived: formBoolean.default(false),
  petId: optionalString,
  type: z.nativeEnum(MediaType).optional(),
  unitId: optionalString,
})

export const createMediaAssetInputSchema = z.object({
  accessLevel: z.nativeEnum(AssetAccessLevel).default(AssetAccessLevel.PROTECTED),
  appointmentId: optionalString,
  captureStage: mediaCaptureStageSchema.optional(),
  clientId: optionalString,
  description: optionalString,
  galleryLabel: optionalString,
  metadataJson: optionalString,
  petId: optionalString,
  type: z.nativeEnum(MediaType).optional(),
}).superRefine((input, context) => {
  if (
    (input.captureStage === 'PRE_SERVICE' || input.captureStage === 'POST_SERVICE') &&
    !input.appointmentId
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Pre and post service captures must be linked to an appointment.',
      path: ['appointmentId'],
    })
  }
})

export const archiveMediaAssetInputSchema = z.object({
  reason: optionalString,
})

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>
export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>
export type ArchiveDocumentInput = z.infer<typeof archiveDocumentInputSchema>
export type SignDocumentInput = z.infer<typeof signDocumentInputSchema>
export type ListMediaAssetsQuery = z.infer<typeof listMediaAssetsQuerySchema>
export type CreateMediaAssetInput = z.infer<typeof createMediaAssetInputSchema>
export type ArchiveMediaAssetInput = z.infer<typeof archiveMediaAssetInputSchema>
