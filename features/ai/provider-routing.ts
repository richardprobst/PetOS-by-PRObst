import { aiVirtualAssistantProviderContract } from '@/features/assistant/contract'
import { aiInsightsProviderContract } from '@/features/insights/contract'
import type { AiConsentPurpose, AiInferenceModule } from './schemas'
import { aiVisionProviderContract } from './vision/contract'

export interface AiModuleProviderContract {
  consentRequired: boolean
  requiresHumanReview: boolean
  supportedConsentPurposes: readonly AiConsentPurpose[]
  supportedInferenceKeyPrefixes: readonly string[]
}

const aiModuleProviderContractMap = {
  IMAGE_ANALYSIS: aiVisionProviderContract,
  PREDICTIVE_INSIGHTS: aiInsightsProviderContract,
  VIRTUAL_ASSISTANT: aiVirtualAssistantProviderContract,
} as const satisfies Record<AiInferenceModule, AiModuleProviderContract>

export function getAiModuleProviderContract(
  module: AiInferenceModule,
): AiModuleProviderContract {
  return aiModuleProviderContractMap[module]
}

export function isAiInferenceKeySupportedByModule(
  module: AiInferenceModule,
  inferenceKey: string,
) {
  return getAiModuleProviderContract(module).supportedInferenceKeyPrefixes.some(
    (prefix) => inferenceKey.startsWith(prefix),
  )
}
