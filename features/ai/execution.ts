import { createAiFailedOutcome, createAiTechnicalMetadata } from './domain'
import {
  applyAiQuotaPolicy,
  type AiQuotaEnvironment,
  type AiQuotaSnapshotInput,
} from './policy'
import {
  createAiExecutionObservabilitySnapshot,
  createAiOperationalMetadata,
  type AiOperationalMetadataInput,
} from './operational'
import { createAiRetentionPolicySnapshot } from './retention'
import {
  aiBlockedExecutionEnvelopeSchema,
  aiExecutionRecordSchema,
  aiFailedExecutionEnvelopeSchema,
  aiPendingExecutionEnvelopeSchema,
  type AiBlockedExecutionEnvelope,
  type AiBlockedOutcome,
  type AiExecutionEnvelope,
  type AiFailedExecutionEnvelope,
  type AiInferenceRequest,
  type AiLayerErrorCode,
  type AiPendingExecutionEnvelope,
  type AiPolicyReasonCode,
} from './schemas'

export interface StartAiInferenceExecutionOptions {
  environment?: AiQuotaEnvironment
  operationalMetadata?: AiOperationalMetadataInput
  quotaSnapshot?: AiQuotaSnapshotInput
}

export function startAiInferenceExecution(
  request: AiInferenceRequest,
  options: StartAiInferenceExecutionOptions = {},
): AiExecutionEnvelope {
  try {
    const policyResolution = applyAiQuotaPolicy(
      request,
      options.environment,
      options.quotaSnapshot,
    )

    if (!policyResolution.allowed) {
      return createBlockedExecutionEnvelope(
        request,
        policyResolution.policy,
        policyResolution.outcome,
        options.operationalMetadata,
      )
    }

    return createPendingExecutionEnvelope(
      request,
      policyResolution.policy,
      options.operationalMetadata,
    )
  } catch (error) {
    return createFailedExecutionEnvelope(request, error, options.operationalMetadata)
  }
}

function createPendingExecutionEnvelope(
  request: AiInferenceRequest,
  policy: AiPendingExecutionEnvelope['policy'],
  operationalMetadataInput?: AiOperationalMetadataInput,
): AiPendingExecutionEnvelope {
  const technicalMetadata = createAiTechnicalMetadata()
  const operational = createAiOperationalMetadata(
    request,
    policy,
    operationalMetadataInput,
  )
  const retention = createAiRetentionPolicySnapshot(request)
  const observability = createAiExecutionObservabilitySnapshot({
    operational,
    policy,
    request,
    retention,
    status: 'PENDING',
  })

  return aiPendingExecutionEnvelopeSchema.parse({
    execution: createExecutionRecord({
      handledAt: technicalMetadata.handledAt,
      nextStep: 'AWAIT_PROVIDER_ADAPTER',
      policyReasonCode: policy.decision.reasonCode,
      request,
      state: 'PENDING',
    }),
    observability,
    operational,
    outcome: null,
    policy,
    request,
    retention,
    status: 'PENDING',
    technicalMetadata,
  })
}

function createBlockedExecutionEnvelope(
  request: AiInferenceRequest,
  policy: AiBlockedExecutionEnvelope['policy'],
  outcome: AiBlockedOutcome,
  operationalMetadataInput?: AiOperationalMetadataInput,
): AiBlockedExecutionEnvelope {
  const operational = createAiOperationalMetadata(
    request,
    policy,
    operationalMetadataInput,
  )
  const retention = createAiRetentionPolicySnapshot(request)
  const observability = createAiExecutionObservabilitySnapshot({
    operational,
    policy,
    request,
    retention,
    status: 'BLOCKED',
  })

  return aiBlockedExecutionEnvelopeSchema.parse({
    execution: createExecutionRecord({
      errorCode: outcome.error.code,
      handledAt: outcome.technicalMetadata.handledAt,
      nextStep: 'NONE',
      policyReasonCode: policy.decision.reasonCode,
      request,
      state: 'BLOCKED',
    }),
    observability,
    operational,
    outcome,
    policy,
    request,
    retention,
    status: 'BLOCKED',
    technicalMetadata: outcome.technicalMetadata,
  })
}

function createFailedExecutionEnvelope(
  request: AiInferenceRequest,
  error: unknown,
  operationalMetadataInput?: AiOperationalMetadataInput,
): AiFailedExecutionEnvelope {
  const technicalMetadata = createAiTechnicalMetadata()
  const operational = createAiOperationalMetadata(
    request,
    null,
    operationalMetadataInput,
  )
  const retention = createAiRetentionPolicySnapshot(request)
  const outcome = createAiFailedOutcome(request, {
    details: normalizeExecutionErrorDetails(error),
    message:
      'The AI execution envelope failed before any provider adapter or real job was started.',
    retryable: false,
    technicalMetadata: {
      handledAt: technicalMetadata.handledAt,
    },
  })
  const observability = createAiExecutionObservabilitySnapshot({
    operational,
    policy: null,
    request,
    retention,
    status: 'FAILED',
  })

  return aiFailedExecutionEnvelopeSchema.parse({
    execution: createExecutionRecord({
      errorCode: outcome.error.code,
      handledAt: outcome.technicalMetadata.handledAt,
      nextStep: 'NONE',
      policyReasonCode: null,
      request,
      state: 'FAILED',
    }),
    observability,
    operational,
    outcome,
    policy: null,
    request,
    retention,
    status: 'FAILED',
    technicalMetadata: outcome.technicalMetadata,
  })
}

function createExecutionRecord(input: {
  errorCode?: AiLayerErrorCode | null
  handledAt: Date
  nextStep: 'NONE' | 'AWAIT_PROVIDER_ADAPTER'
  policyReasonCode: AiPolicyReasonCode | null
  request: AiInferenceRequest
  state: 'BLOCKED' | 'FAILED' | 'PENDING'
}) {
  return aiExecutionRecordSchema.parse({
    errorCode: input.errorCode ?? null,
    executionId: null,
    executionMode: 'DEFERRED',
    handledAt: input.handledAt,
    inferenceKey: input.request.inferenceKey,
    jobStatus: 'NOT_SCHEDULED',
    module: input.request.module,
    nextStep: input.nextStep,
    origin: input.request.origin,
    policyReasonCode: input.policyReasonCode,
    providerStatus: 'NOT_STARTED',
    requestId: input.request.requestId ?? null,
    requestedAt: input.request.requestedAt,
    requestedByUserId: input.request.requestedByUserId ?? null,
    state: input.state,
    unitId: input.request.unitId ?? null,
  })
}

function normalizeExecutionErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      message: error.message,
      stage: 'execution-envelope',
    }
  }

  return {
    message: 'Unknown execution envelope failure.',
    stage: 'execution-envelope',
  }
}
