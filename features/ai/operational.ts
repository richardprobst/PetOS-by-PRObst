import {
  aiExecutionObservabilitySnapshotSchema,
  aiOperationalMetadataSchema,
  type AiExecutionObservabilitySnapshot,
  type AiInferenceRequest,
  type AiOperationalMetadata,
  type AiPolicyResult,
  type AiRetentionPolicySnapshot,
} from './schemas'

export interface AiOperationalMetadataInput {
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

  return aiOperationalMetadataSchema.parse({
    cost: {
      costClass:
        input.cost?.costClass ??
        (costStatus === 'ESTIMATED' ? 'MEDIUM' : 'NOT_CLASSIFIED'),
      estimateLabel: input.cost?.estimateLabel ?? null,
      measurementUnit: 'INFERENCE_REQUEST',
      metadataOrigin: costMetadataOrigin,
      status: costStatus,
    },
    fallbackStatus: 'NOT_EVALUATED',
    metadataVersion: 'PHASE3_B1_T06',
    model: {
      metadataOrigin: modelMetadataOrigin,
      modelId: input.model?.modelId ?? null,
      modelStatus,
    },
    operationalReasonCode: operationalState.reasonCode,
    operationalStatus: operationalState.status,
    provider: {
      contractVersion: input.provider?.contractVersion ?? null,
      metadataOrigin: providerMetadataOrigin,
      providerId: input.provider?.providerId ?? null,
      providerStatus,
    },
  })
}

export function createAiExecutionObservabilitySnapshot(input: {
  operational: AiOperationalMetadata
  policy: AiPolicyResult | null
  request: AiInferenceRequest
  retention: AiRetentionPolicySnapshot
  status: 'PENDING' | 'BLOCKED' | 'FAILED'
}): AiExecutionObservabilitySnapshot {
  return aiExecutionObservabilitySnapshotSchema.parse({
    costStatus: input.operational.cost.status,
    decisionClass: resolveExecutionDecisionClass(
      input.status,
      input.policy?.decision.reasonCode ?? null,
    ),
    evaluatedFlags: input.policy?.gating.evaluations ?? [],
    eventName: resolveEventName(input.status),
    executionStatus: input.status,
    fallbackStatus: input.operational.fallbackStatus,
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

function resolveEventName(status: 'PENDING' | 'BLOCKED' | 'FAILED') {
  switch (status) {
    case 'PENDING':
      return 'AI_EXECUTION_PENDING'
    case 'BLOCKED':
      return 'AI_EXECUTION_BLOCKED'
    case 'FAILED':
      return 'AI_EXECUTION_FAILED'
  }
}

function resolveExecutionDecisionClass(
  status: 'PENDING' | 'BLOCKED' | 'FAILED',
  reasonCode: AiPolicyResult['decision']['reasonCode'] | null,
) {
  if (status === 'PENDING') {
    return 'ACCEPTED_FOR_FUTURE_EXECUTION'
  }

  if (status === 'FAILED') {
    return 'OPERATIONAL_FAILURE'
  }

  return reasonCode === 'TEMPORARILY_UNAVAILABLE'
    ? 'OPERATIONAL_BLOCK'
    : 'FUNCTIONAL_BLOCK'
}
