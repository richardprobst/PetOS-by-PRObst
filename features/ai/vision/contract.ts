import { z } from 'zod'

export const aiVisionProviderContractSchema = z.object({
  contractKey: z.literal('AI_VISION_PROVIDER'),
  module: z.literal('IMAGE_ANALYSIS'),
  consentRequired: z.literal(true),
  requiresHumanReview: z.literal(true),
  supportedConsentPurposes: z.tuple([
    z.literal('IMAGE_OPERATIONAL_ASSISTED'),
    z.literal('IMAGE_GALLERY_METADATA'),
  ]),
  supportedInferenceKeyPrefixes: z.tuple([z.literal('vision.')]),
})

export type AiVisionProviderContract = z.infer<
  typeof aiVisionProviderContractSchema
>

export const aiVisionProviderContract = aiVisionProviderContractSchema.parse({
  contractKey: 'AI_VISION_PROVIDER',
  consentRequired: true,
  module: 'IMAGE_ANALYSIS',
  requiresHumanReview: true,
  supportedConsentPurposes: [
    'IMAGE_OPERATIONAL_ASSISTED',
    'IMAGE_GALLERY_METADATA',
  ],
  supportedInferenceKeyPrefixes: ['vision.'],
})
