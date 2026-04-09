import { z } from 'zod'

export const aiInsightsProviderContractSchema = z.object({
  contractKey: z.literal('AI_INSIGHTS_PROVIDER'),
  consentRequired: z.literal(false),
  module: z.literal('PREDICTIVE_INSIGHTS'),
  requiresHumanReview: z.literal(false),
  supportedConsentPurposes: z.tuple([
    z.literal('PREDICTIVE_INSIGHT'),
    z.literal('INTERNAL_ADMIN_AUDIT'),
  ]),
  supportedInferenceKeyPrefixes: z.tuple([z.literal('predictive.')]),
})

export type AiInsightsProviderContract = z.infer<
  typeof aiInsightsProviderContractSchema
>

export const aiInsightsProviderContract = aiInsightsProviderContractSchema.parse(
  {
    contractKey: 'AI_INSIGHTS_PROVIDER',
    consentRequired: false,
    module: 'PREDICTIVE_INSIGHTS',
    requiresHumanReview: false,
    supportedConsentPurposes: ['PREDICTIVE_INSIGHT', 'INTERNAL_ADMIN_AUDIT'],
    supportedInferenceKeyPrefixes: ['predictive.'],
  },
)
