import { createAiFailedOutcome, createAiTechnicalMetadata } from './domain'
import {
  applyAiQuotaPolicy,
  type AiQuotaEnvironment,
  type AiQuotaSnapshotInput,
} from './policy'
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
      )
    }

    return createPendingExecutionEnvelope(request, policyResolution.policy)
  } catch (error) {
    return createFailedExecutionEnvelope(request, error)
  }
}

function createPendingExecutionEnvelope(
  request: AiInferenceRequest,
  policy: AiPendingExecutionEnvelope['policy'],
): AiPendingExecutionEnvelope {
  const technicalMetadata = createAiTechnicalMetadata()
  const retention = createAiRetentionPolicySnapshot(request)

  return aiPendingExecutionEnvelopeSchema.parse({
    execution: createExecutionRecord({
      handledAt: technicalMetadata.handledAt,
      nextStep: 'AWAIT_PROVIDER_ADAPTER',
      policyReasonCode: policy.decision.reasonCode,
      request,
      state: 'PENDING',
    }),
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
): AiBlockedExecutionEnvelope {
  const retention = createAiRetentionPolicySnapshot(request)

  return aiBlockedExecutionEnvelopeSchema.parse({
    execution: createExecutionRecord({
      errorCode: outcome.error.code,
      handledAt: outcome.technicalMetadata.handledAt,
      nextStep: 'NONE',
      policyReasonCode: policy.decision.reasonCode,
      request,
      state: 'BLOCKED',
    }),
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
): AiFailedExecutionEnvelope {
  const technicalMetadata = createAiTechnicalMetadata()
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

  return aiFailedExecutionEnvelopeSchema.parse({
    execution: createExecutionRecord({
      errorCode: outcome.error.code,
      handledAt: outcome.technicalMetadata.handledAt,
      nextStep: 'NONE',
      policyReasonCode: null,
      request,
      state: 'FAILED',
    }),
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
