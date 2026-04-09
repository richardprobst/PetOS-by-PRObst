import {
  aiFallbackMetadataSchema,
  aiModelDescriptorSchema,
  aiProviderDescriptorSchema,
  type AiFallbackMetadata,
  type AiFallbackReasonCode,
  type AiFallbackStrategy,
  type AiInferenceOutcome,
  type AiModelDescriptor,
  type AiProviderDescriptor,
} from './schemas'

export interface AiFallbackMetadataInput {
  strategy?: AiFallbackStrategy
  model?: {
    modelId?: string | null
    modelStatus?: 'NOT_CONFIGURED' | 'DECLARED'
  }
  provider?: {
    contractVersion?: string | null
    providerId?: string | null
    providerStatus?: 'NOT_CONFIGURED' | 'PLANNED' | 'DECLARED'
  }
}

export function createAiFallbackMetadata(input: {
  fallback?: AiFallbackMetadataInput
  primaryModel: AiModelDescriptor
  primaryProvider: AiProviderDescriptor
}): AiFallbackMetadata {
  const fallbackProvider = createFallbackProviderDescriptor(input.fallback)
  const fallbackModel = createFallbackModelDescriptor(input.fallback)
  const strategy = resolveFallbackStrategy(input.fallback)

  if (!hasAnyFallbackDeclaration(input.fallback)) {
    return aiFallbackMetadataSchema.parse({
      currentAttempt: 1,
      eligible: null,
      fallbackModel,
      fallbackProvider,
      metadataVersion: 'PHASE3_B1_T12',
      nextStep: 'NONE',
      primaryModel: input.primaryModel,
      primaryProvider: input.primaryProvider,
      reasonCode: 'NOT_YET_EVALUATED',
      status: 'NOT_EVALUATED',
      strategy,
    })
  }

  if (!hasConfiguredFallbackTarget(fallbackProvider, fallbackModel)) {
    return aiFallbackMetadataSchema.parse({
      currentAttempt: 1,
      eligible: false,
      fallbackModel,
      fallbackProvider,
      metadataVersion: 'PHASE3_B1_T12',
      nextStep: 'CONFIGURE_FALLBACK',
      primaryModel: input.primaryModel,
      primaryProvider: input.primaryProvider,
      reasonCode: 'FALLBACK_NOT_CONFIGURED',
      status: 'NOT_CONFIGURED',
      strategy,
    })
  }

  return aiFallbackMetadataSchema.parse({
    currentAttempt: 1,
    eligible: null,
    fallbackModel,
    fallbackProvider,
    metadataVersion: 'PHASE3_B1_T12',
    nextStep: 'NONE',
    primaryModel: input.primaryModel,
    primaryProvider: input.primaryProvider,
    reasonCode: 'DECLARED_FOR_FUTURE_USE',
    status: 'DECLARED',
    strategy,
  })
}

export function evaluateAiFallbackMetadata(
  current: AiFallbackMetadata,
  outcome: AiInferenceOutcome,
): AiFallbackMetadata {
  if (outcome.status === 'COMPLETED') {
    return current
  }

  if (outcome.status === 'FAILED') {
    return resolveFallbackAfterFailure(
      current,
      'PRIMARY_OPERATIONAL_FAILURE',
    )
  }

  switch (outcome.error.code) {
    case 'DISABLED':
      return overrideFallbackMetadata(current, {
        eligible: false,
        nextStep: 'TERMINAL_FAILURE',
        reasonCode: 'BLOCKED_BY_POLICY',
        status: 'NOT_ELIGIBLE',
      })
    case 'QUOTA_EXCEEDED':
    case 'QUOTA_NOT_CONFIGURED':
      return overrideFallbackMetadata(current, {
        eligible: false,
        nextStep: 'TERMINAL_FAILURE',
        reasonCode: 'BLOCKED_BY_QUOTA',
        status: 'NOT_ELIGIBLE',
      })
    case 'TEMPORARILY_UNAVAILABLE':
      return resolveFallbackAfterFailure(
        current,
        'PRIMARY_TEMPORARILY_UNAVAILABLE',
      )
    case 'NOT_SUPPORTED':
      return resolveFallbackAfterFailure(current, 'PRIMARY_NOT_SUPPORTED')
  }

  return current
}

function resolveFallbackAfterFailure(
  current: AiFallbackMetadata,
  reasonCode:
    | 'PRIMARY_OPERATIONAL_FAILURE'
    | 'PRIMARY_TEMPORARILY_UNAVAILABLE'
    | 'PRIMARY_NOT_SUPPORTED',
) {
  if (!hasConfiguredFallbackTarget(current.fallbackProvider, current.fallbackModel)) {
    return overrideFallbackMetadata(current, {
      eligible: false,
      nextStep: 'CONFIGURE_FALLBACK',
      reasonCode: 'FALLBACK_NOT_CONFIGURED',
      status: 'NOT_CONFIGURED',
    })
  }

  if (!isFallbackTargetAvailable(current.fallbackProvider)) {
    return overrideFallbackMetadata(current, {
      eligible: false,
      nextStep: 'MANUAL_RETRY_REVIEW',
      reasonCode: 'FALLBACK_TARGET_UNAVAILABLE',
      status: 'UNAVAILABLE',
    })
  }

  return overrideFallbackMetadata(current, {
    eligible: true,
    nextStep: 'REVIEW_FUTURE_FALLBACK',
    reasonCode,
    status: 'ELIGIBLE',
  })
}

function overrideFallbackMetadata(
  current: AiFallbackMetadata,
  input: {
    eligible: boolean
    nextStep:
      | 'CONFIGURE_FALLBACK'
      | 'MANUAL_RETRY_REVIEW'
      | 'REVIEW_FUTURE_FALLBACK'
      | 'TERMINAL_FAILURE'
    reasonCode: AiFallbackReasonCode
    status: 'NOT_CONFIGURED' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNAVAILABLE'
  },
) {
  return aiFallbackMetadataSchema.parse({
    ...current,
    eligible: input.eligible,
    nextStep: input.nextStep,
    reasonCode: input.reasonCode,
    status: input.status,
  })
}

function createFallbackProviderDescriptor(
  fallback: AiFallbackMetadataInput | undefined,
) {
  const hasProviderDeclaration =
    fallback?.provider?.providerStatus !== undefined ||
    fallback?.provider?.providerId !== undefined ||
    fallback?.provider?.contractVersion !== undefined

  return aiProviderDescriptorSchema.parse({
    contractVersion: fallback?.provider?.contractVersion ?? null,
    metadataOrigin: hasProviderDeclaration ? 'DECLARED' : 'NOT_EVALUATED',
    providerId: fallback?.provider?.providerId ?? null,
    providerStatus: fallback?.provider?.providerStatus ?? 'NOT_CONFIGURED',
  })
}

function createFallbackModelDescriptor(
  fallback: AiFallbackMetadataInput | undefined,
) {
  const hasModelDeclaration =
    fallback?.model?.modelStatus !== undefined ||
    fallback?.model?.modelId !== undefined

  return aiModelDescriptorSchema.parse({
    metadataOrigin: hasModelDeclaration ? 'DECLARED' : 'NOT_EVALUATED',
    modelId: fallback?.model?.modelId ?? null,
    modelStatus: fallback?.model?.modelStatus ?? 'NOT_CONFIGURED',
  })
}

function resolveFallbackStrategy(fallback: AiFallbackMetadataInput | undefined) {
  if (fallback?.strategy !== undefined) {
    return fallback.strategy
  }

  if (
    fallback?.provider?.providerStatus !== undefined ||
    fallback?.provider?.providerId !== undefined ||
    fallback?.provider?.contractVersion !== undefined
  ) {
    return 'DECLARED_PROVIDER_SWITCH'
  }

  if (
    fallback?.model?.modelStatus !== undefined ||
    fallback?.model?.modelId !== undefined
  ) {
    return 'DECLARED_MODEL_SWITCH'
  }

  return 'NONE'
}

function hasAnyFallbackDeclaration(fallback: AiFallbackMetadataInput | undefined) {
  return resolveFallbackStrategy(fallback) !== 'NONE'
}

function hasConfiguredFallbackTarget(
  provider: AiProviderDescriptor,
  model: AiModelDescriptor,
) {
  return (
    provider.providerStatus !== 'NOT_CONFIGURED' ||
    provider.providerId !== null ||
    model.modelStatus === 'DECLARED' ||
    model.modelId !== null
  )
}

function isFallbackTargetAvailable(provider: AiProviderDescriptor) {
  return provider.providerStatus === 'DECLARED'
}
