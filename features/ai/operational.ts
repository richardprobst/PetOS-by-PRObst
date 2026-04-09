import {
  type AiConsentEvaluation,
  aiCostMetadataSchema,
  aiExecutionObservabilitySnapshotSchema,
  aiModelDescriptorSchema,
  aiOperationalMetadataSchema,
  aiProviderDescriptorSchema,
  type AiExecutionObservabilitySnapshot,
  type AiInferenceOutcome,
  type AiInferenceRequest,
  type AiOperationalMetadata,
  type AiPolicyResult,
  type AiRetentionPolicySnapshot,
} from './schemas'
import {
  createAiFallbackMetadata,
  evaluateAiFallbackMetadata,
  type AiFallbackMetadataInput,
} from './fallback'

export interface AiOperationalMetadataInput {
  fallback?: AiFallbackMetadataInput
  provider?: {
    contractVersion?: string | null
    providerId?: string | null
    providerStatus?: 'NOT_CONFIGURED' | 'PLANNED' | 'DECLARED'
  }
  model?: {
    modelId?: string | null
    modelStatus?: 'NOT_CONFIGURED' | 'DECLARED'
  }
  cost?: {
    costClass?: 'NOT_CLASSIFIED' | 'LOW' | 'MEDIUM' | 'HIGH'
    estimateLabel?: string | null
    metadataOrigin?: 'NOT_EVALUATED' | 'DECLARED' | 'ESTIMATED' | 'CONFIGURED'
    status?: 'NOT_EVALUATED' | 'ESTIMATED' | 'UNAVAILABLE' | 'NOT_CONFIGURED'
  }
}

export function createAiOperationalMetadata(
  request: AiInferenceRequest,
  policy: AiPolicyResult | null,
  input: AiOperationalMetadataInput = {},
): AiOperationalMetadata {
  void request

  const providerStatus = input.provider?.providerStatus ?? 'NOT_CONFIGURED'
  const modelStatus =
    input.model?.modelStatus ??
    (providerStatus === 'DECLARED' ? 'DECLARED' : 'NOT_CONFIGURED')
  const providerMetadataOrigin =
    input.provider?.providerStatus === undefined &&
    input.provider?.providerId === undefined &&
    input.provider?.contractVersion === undefined
      ? 'NOT_EVALUATED'
      : 'DECLARED'
  const modelMetadataOrigin =
    input.model?.modelStatus === undefined && input.model?.modelId === undefined
      ? 'NOT_EVALUATED'
      : 'DECLARED'
  const operationalState = resolveOperationalState(policy, providerStatus)
  const costStatus = resolveCostStatus(policy, providerStatus, input.cost?.status)
  const costMetadataOrigin =
    input.cost?.metadataOrigin ??
    (costStatus === 'ESTIMATED'
      ? 'ESTIMATED'
      : costStatus === 'NOT_EVALUATED' || costStatus === 'NOT_CONFIGURED'
        ? 'NOT_EVALUATED'
        : 'CONFIGURED')
  const provider = aiProviderDescriptorSchema.parse({
    contractVersion: input.provider?.contractVersion ?? null,
    metadataOrigin: providerMetadataOrigin,
    providerId: input.provider?.providerId ?? null,
    providerStatus,
  })
  const model = aiModelDescriptorSchema.parse({
    metadataOrigin: modelMetadataOrigin,
    modelId: input.model?.modelId ?? null,
    modelStatus,
  })
  const cost = aiCostMetadataSchema.parse({
    costClass:
      input.cost?.costClass ??
      (costStatus === 'ESTIMATED' ? 'MEDIUM' : 'NOT_CLASSIFIED'),
    estimateLabel: input.cost?.estimateLabel ?? null,
    measurementUnit: 'INFERENCE_REQUEST',
    metadataOrigin: costMetadataOrigin,
    status: costStatus,
  })
  const fallback = createAiFallbackMetadata({
    fallback: input.fallback,
    primaryModel: model,
    primaryProvider: provider,
  })

  return aiOperationalMetadataSchema.parse({
    cost,
    fallback,
    fallbackStatus: fallback.status,
    metadataVersion: 'PHASE3_B1_T06',
    model,
    operationalReasonCode: operationalState.reasonCode,
    operationalStatus: operationalState.status,
    provider,
  })
}

export function applyAiOutcomeToOperationalMetadata(
  operational: AiOperationalMetadata,
  outcome: AiInferenceOutcome,
): AiOperationalMetadata {
  const fallback = evaluateAiFallbackMetadata(operational.fallback, outcome)
  const operationalState = resolveOutcomeOperationalState(operational, outcome)
  const costStatus = resolveOutcomeCostStatus(operational, outcome)

  return aiOperationalMetadataSchema.parse({
    ...operational,
    cost: {
      ...operational.cost,
      status: costStatus,
    },
    fallback,
    fallbackStatus: fallback.status,
    operationalReasonCode: operationalState.reasonCode,
    operationalStatus: operationalState.status,
  })
}

export function createAiExecutionObservabilitySnapshot(input: {
  consent: AiConsentEvaluation
  operational: AiOperationalMetadata
  policy: AiPolicyResult | null
  request: AiInferenceRequest
  retention: AiRetentionPolicySnapshot
  status: 'ACCEPTED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED'
}): AiExecutionObservabilitySnapshot {
  return aiExecutionObservabilitySnapshotSchema.parse({
    consentDecisionStatus: input.consent.decisionStatus,
    consentReasonCode: input.consent.reasonCode,
    costStatus: input.operational.cost.status,
    decisionClass: resolveExecutionDecisionClass(
      input.status,
      input.policy?.decision.reasonCode ?? null,
    ),
    evaluatedFlags: input.policy?.gating.evaluations ?? [],
    eventName: resolveEventName(input.status),
    executionStatus: input.status,
    fallbackNextStep: input.operational.fallback.nextStep,
    fallbackReasonCode: input.operational.fallback.reasonCode,
    fallbackStatus: input.operational.fallbackStatus,
    fallbackStrategy: input.operational.fallback.strategy,
    inferenceKey: input.request.inferenceKey,
    module: input.request.module,
    operationalStatus: input.operational.operationalStatus,
    policyReasonCode: input.policy?.decision.reasonCode ?? null,
    providerStatus: input.operational.provider.providerStatus,
    retentionPolicyVersion: input.retention.policyVersion,
    unitId: input.request.unitId ?? null,
  })
}

function resolveOperationalState(
  policy: AiPolicyResult | null,
  providerStatus: 'NOT_CONFIGURED' | 'PLANNED' | 'DECLARED',
) {
  if (policy?.decision.reasonCode === 'TEMPORARILY_UNAVAILABLE') {
    return {
      reasonCode: 'POLICY_TEMPORARILY_UNAVAILABLE',
      status: 'TEMPORARILY_UNAVAILABLE',
    } as const
  }

  if (policy === null || !policy.decision.allowed) {
    return {
      reasonCode: 'NOT_EVALUATED',
      status: 'NOT_EVALUATED',
    } as const
  }

  if (providerStatus === 'NOT_CONFIGURED') {
    return {
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      status: 'NOT_CONFIGURED',
    } as const
  }

  return {
    reasonCode: 'DECLARED_FOR_FUTURE_EXECUTION',
    status: 'DECLARED',
  } as const
}

function resolveCostStatus(
  policy: AiPolicyResult | null,
  providerStatus: 'NOT_CONFIGURED' | 'PLANNED' | 'DECLARED',
  requestedStatus:
    | 'NOT_EVALUATED'
    | 'ESTIMATED'
    | 'UNAVAILABLE'
    | 'NOT_CONFIGURED'
    | undefined,
) {
  if (requestedStatus !== undefined) {
    return requestedStatus
  }

  if (policy?.decision.reasonCode === 'TEMPORARILY_UNAVAILABLE') {
    return 'UNAVAILABLE'
  }

  if (providerStatus === 'NOT_CONFIGURED') {
    return 'NOT_CONFIGURED'
  }

  return 'NOT_EVALUATED'
}

function resolveOutcomeOperationalState(
  operational: AiOperationalMetadata,
  outcome: AiInferenceOutcome,
) {
  if (outcome.status === 'FAILED') {
    return {
      reasonCode: 'OPERATIONAL_FAILURE',
      status: 'TEMPORARILY_UNAVAILABLE',
    } as const
  }

  if (
    outcome.status === 'BLOCKED' &&
    outcome.error.code === 'TEMPORARILY_UNAVAILABLE'
  ) {
    return {
      reasonCode: 'POLICY_TEMPORARILY_UNAVAILABLE',
      status: 'TEMPORARILY_UNAVAILABLE',
    } as const
  }

  return {
    reasonCode: operational.operationalReasonCode,
    status: operational.operationalStatus,
  } as const
}

function resolveOutcomeCostStatus(
  operational: AiOperationalMetadata,
  outcome: AiInferenceOutcome,
) {
  if (outcome.status === 'FAILED') {
    return 'UNAVAILABLE' as const
  }

  if (
    outcome.status === 'BLOCKED' &&
    outcome.error.code === 'TEMPORARILY_UNAVAILABLE'
  ) {
    return 'UNAVAILABLE' as const
  }

  return operational.cost.status
}

function resolveEventName(
  status: 'ACCEPTED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED',
) {
  switch (status) {
    case 'ACCEPTED':
      return 'AI_EXECUTION_ACCEPTED'
    case 'QUEUED':
      return 'AI_EXECUTION_QUEUED'
    case 'RUNNING':
      return 'AI_EXECUTION_RUNNING'
    case 'COMPLETED':
      return 'AI_EXECUTION_COMPLETED'
    case 'BLOCKED':
      return 'AI_EXECUTION_BLOCKED'
    case 'FAILED':
      return 'AI_EXECUTION_FAILED'
  }
}

function resolveExecutionDecisionClass(
  status: 'ACCEPTED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED',
  reasonCode: AiPolicyResult['decision']['reasonCode'] | null,
) {
  if (status === 'ACCEPTED') {
    return 'ACCEPTED_FOR_FUTURE_EXECUTION'
  }

  if (status === 'QUEUED') {
    return 'QUEUED_FOR_ASYNC_EXECUTION'
  }

  if (status === 'RUNNING') {
    return 'RUNNING_INTERNAL_EXECUTION'
  }

  if (status === 'COMPLETED') {
    return 'COMPLETED_ASSISTIVE_RESULT'
  }

  if (status === 'FAILED') {
    return 'OPERATIONAL_FAILURE'
  }

  return reasonCode === 'TEMPORARILY_UNAVAILABLE'
    ? 'OPERATIONAL_BLOCK'
    : 'FUNCTIONAL_BLOCK'
}
