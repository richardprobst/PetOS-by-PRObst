import { z } from 'zod'

export const aiVirtualAssistantProviderContractSchema = z.object({
  consentRequired: z.literal(false),
  contractKey: z.literal('AI_VIRTUAL_ASSISTANT_PROVIDER'),
  module: z.literal('VIRTUAL_ASSISTANT'),
  requiresHumanReview: z.literal(false),
  supportedConsentPurposes: z.tuple([
    z.literal('VOICE_ASSISTANT_TUTOR'),
    z.literal('INTERNAL_ADMIN_AUDIT'),
  ]),
  supportedInferenceKeyPrefixes: z.tuple([z.literal('voice.')]),
})

export type AiVirtualAssistantProviderContract = z.infer<
  typeof aiVirtualAssistantProviderContractSchema
>

export const aiVirtualAssistantProviderContract =
  aiVirtualAssistantProviderContractSchema.parse({
    consentRequired: false,
    contractKey: 'AI_VIRTUAL_ASSISTANT_PROVIDER',
    module: 'VIRTUAL_ASSISTANT',
    requiresHumanReview: false,
    supportedConsentPurposes: [
      'VOICE_ASSISTANT_TUTOR',
      'INTERNAL_ADMIN_AUDIT',
    ],
    supportedInferenceKeyPrefixes: ['voice.'],
  })
