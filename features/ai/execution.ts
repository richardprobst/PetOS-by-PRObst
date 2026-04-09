import { randomUUID } from 'node:crypto'
import {
  createAiConsentBlockedOutcome,
  createAiFailedOutcome,
  createAiTechnicalMetadata,
} from './domain'
import {
  createAiConsentNotEvaluated,
  evaluateAiConsent,
  type AiConsentEvaluationInput,
} from './consent'
import {
  applyAiQuotaPolicy,
  type AiQuotaEnvironment,
  type AiQuotaSnapshotInput,
} from './policy'
import {
  applyAiOutcomeToOperationalMetadata,
  createAiExecutionObservabilitySnapshot,
  createAiOperationalMetadata,
  type AiOperationalMetadataInput,
} from './operational'
import { createAiOperationalEvents } from './events'
import { createAiRetentionPolicySnapshot } from './retention'
import {
  aiAcceptedExecutionEnvelopeSchema,
  aiBlockedExecutionEnvelopeSchema,
  aiCompletedExecutionEnvelopeSchema,
  aiExecutionRecordSchema,
  aiFailedExecutionEnvelopeSchema,
  aiQueuedExecutionEnvelopeSchema,
  aiRunningExecutionEnvelopeSchema,
  type AiAcceptedExecutionEnvelope,
  type AiBlockedExecutionEnvelope,
  type AiCompletedExecutionEnvelope,
  type AiConsentEvaluation,
  type AiExecutionMode,
  type AiExecutionNextStep,
  type AiExecutionProviderStatus,
  type AiExecutionRecord,
  type AiExecutionState,
  type AiFailedExecutionEnvelope,
  type AiInferenceOutcome,
  type AiInferenceRequest,
  type AiLayerErrorCode,
  type AiPolicyReasonCode,
  type AiQueuedExecutionEnvelope,
  type AiRunningExecutionEnvelope,
} from './schemas'

export interface StartAiInferenceExecutionOptions {
  consent?: AiConsentEvaluationInput
  environment?: AiQuotaEnvironment
  executionMode?: AiExecutionMode
  operationalMetadata?: AiOperationalMetadataInput
  quotaSnapshot?: AiQuotaSnapshotInput
}

type AiActiveExecutionEnvelope =
  | AiAcceptedExecutionEnvelope
  | AiQueuedExecutionEnvelope
  | AiRunningExecutionEnvelope

export function startAiInferenceExecution(
  request: AiInferenceRequest,
  options: StartAiInferenceExecutionOptions = {},
): AiAcceptedExecutionEnvelope | AiBlockedExecutionEnvelope | AiFailedExecutionEnvelope {
  try {
    const executionMode = options.executionMode ?? 'DEFERRED'
    const retention = createAiRetentionPolicySnapshot(request)
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
        executionMode,
        retention,
        createAiConsentNotEvaluated(request, retention, options.consent),
      )
    }

    const consent = evaluateAiConsent(request, retention, options.consent)

    if (!consent.allowed) {
      return createConsentBlockedExecutionEnvelope(
        request,
        policyResolution.policy,
        consent,
        options.operationalMetadata,
        executionMode,
        retention,
      )
    }

    return createAcceptedExecutionEnvelope(
      request,
      policyResolution.policy,
      options.operationalMetadata,
      executionMode,
      retention,
      consent,
    )
  } catch (error) {
    return createFailedExecutionEnvelope(
      request,
      error,
      options.operationalMetadata,
      options.executionMode ?? 'DEFERRED',
      options.consent,
    )
  }
}

export function queueAiInferenceExecution(
  envelope: AiAcceptedExecutionEnvelope,
): AiQueuedExecutionEnvelope {
  if (envelope.execution.executionMode !== 'DEFERRED') {
    throw new Error('Only deferred AI executions can be queued.')
  }

  const handledAt = new Date()
  const technicalMetadata = createAiTechnicalMetadata({
    handledAt,
  })
  const execution = createExecutionRecord({
    acceptedAt: envelope.execution.acceptedAt,
    errorCode: null,
    executionId: envelope.execution.executionId,
    executionMode: envelope.execution.executionMode,
    finishedAt: null,
    handledAt,
    jobStatus: 'QUEUED',
    nextStep: 'AWAIT_INTERNAL_RUNNER',
    policyReasonCode: envelope.policy.decision.reasonCode,
    providerStatus: 'NOT_STARTED',
    queuedAt: handledAt,
    request: envelope.request,
    startedAt: null,
    state: 'QUEUED',
    statusMessage: 'AI request accepted and queued for internal execution.',
  })
  const observability = createAiExecutionObservabilitySnapshot({
    consent: envelope.consent,
    operational: envelope.operational,
    policy: envelope.policy,
    request: envelope.request,
    retention: envelope.retention,
    status: 'QUEUED',
  })
  const events = createAiOperationalEvents({
    execution,
    operational: envelope.operational,
    outcome: null,
    policy: envelope.policy,
    request: envelope.request,
    status: 'QUEUED',
  })

  return aiQueuedExecutionEnvelopeSchema.parse({
    consent: envelope.consent,
    events,
    execution,
    observability,
    operational: envelope.operational,
    outcome: null,
    policy: envelope.policy,
    request: envelope.request,
    retention: envelope.retention,
    status: 'QUEUED',
    technicalMetadata,
  })
}

export function runAiInferenceExecution(
  envelope: AiAcceptedExecutionEnvelope | AiQueuedExecutionEnvelope,
): AiRunningExecutionEnvelope {
  const handledAt = new Date()
  const technicalMetadata = createAiTechnicalMetadata({
    handledAt,
  })
  const execution = createExecutionRecord({
    acceptedAt: envelope.execution.acceptedAt,
    errorCode: null,
    executionId: envelope.execution.executionId,
    executionMode: envelope.execution.executionMode,
    finishedAt: null,
    handledAt,
    jobStatus: 'RUNNING',
    nextStep: 'AWAIT_PROVIDER_ADAPTER',
    policyReasonCode: envelope.policy.decision.reasonCode,
    providerStatus: 'RUNNING',
    queuedAt: envelope.execution.queuedAt,
    request: envelope.request,
    startedAt: handledAt,
    state: 'RUNNING',
    statusMessage:
      'AI request is running inside the provider-neutral execution lifecycle.',
  })
  const observability = createAiExecutionObservabilitySnapshot({
    consent: envelope.consent,
    operational: envelope.operational,
    policy: envelope.policy,
    request: envelope.request,
    retention: envelope.retention,
    status: 'RUNNING',
  })
  const events = createAiOperationalEvents({
    execution,
    operational: envelope.operational,
    outcome: null,
    policy: envelope.policy,
    request: envelope.request,
    status: 'RUNNING',
  })

  return aiRunningExecutionEnvelopeSchema.parse({
    consent: envelope.consent,
    events,
    execution,
    observability,
    operational: envelope.operational,
    outcome: null,
    policy: envelope.policy,
    request: envelope.request,
    retention: envelope.retention,
    status: 'RUNNING',
    technicalMetadata,
  })
}

export function completeAiInferenceExecution(
  envelope: AiActiveExecutionEnvelope,
  outcome: AiInferenceOutcome,
): AiCompletedExecutionEnvelope | AiBlockedExecutionEnvelope | AiFailedExecutionEnvelope {
  const operational = applyAiOutcomeToOperationalMetadata(
    envelope.operational,
    outcome,
  )
  const execution = createExecutionRecord({
    acceptedAt: envelope.execution.acceptedAt,
    errorCode: outcome.status === 'COMPLETED' ? null : outcome.error.code,
    executionId: envelope.execution.executionId,
    executionMode: envelope.execution.executionMode,
    finishedAt: outcome.technicalMetadata.handledAt,
    handledAt: outcome.technicalMetadata.handledAt,
    jobStatus: resolveTerminalJobStatus(outcome),
    nextStep: 'NONE',
    policyReasonCode: envelope.policy.decision.reasonCode,
    providerStatus: resolveTerminalProviderStatus(outcome),
    queuedAt: envelope.execution.queuedAt,
    request: envelope.request,
    startedAt: envelope.execution.startedAt,
    state: resolveTerminalExecutionState(outcome),
    statusMessage: resolveTerminalStatusMessage(outcome),
  })
  const observability = createAiExecutionObservabilitySnapshot({
    consent: envelope.consent,
    operational,
    policy: envelope.policy,
    request: envelope.request,
    retention: envelope.retention,
    status: resolveTerminalEnvelopeStatus(outcome),
  })
  const resolvedStatus = resolveTerminalEnvelopeStatus(outcome)
  const events = createAiOperationalEvents({
    execution,
    operational,
    outcome,
    policy: envelope.policy,
    request: envelope.request,
    status: resolvedStatus,
  })

  if (outcome.status === 'COMPLETED') {
    return aiCompletedExecutionEnvelopeSchema.parse({
      consent: envelope.consent,
      events,
      execution,
      observability,
      operational,
      outcome,
      policy: envelope.policy,
      request: envelope.request,
      retention: envelope.retention,
      status: resolvedStatus,
      technicalMetadata: outcome.technicalMetadata,
    })
  }

  if (outcome.status === 'BLOCKED') {
    return aiBlockedExecutionEnvelopeSchema.parse({
      consent: envelope.consent,
      events,
      execution,
      observability,
      operational,
      outcome,
      policy: envelope.policy,
      request: envelope.request,
      retention: envelope.retention,
      status: resolvedStatus,
      technicalMetadata: outcome.technicalMetadata,
    })
  }

  return aiFailedExecutionEnvelopeSchema.parse({
    consent: envelope.consent,
    events,
    execution,
    observability,
    operational,
    outcome,
    policy: envelope.policy,
    request: envelope.request,
    retention: envelope.retention,
    status: resolvedStatus,
    technicalMetadata: outcome.technicalMetadata,
  })
}

function createAcceptedExecutionEnvelope(
  request: AiInferenceRequest,
  policy: AiAcceptedExecutionEnvelope['policy'],
  operationalMetadataInput: AiOperationalMetadataInput | undefined,
  executionMode: AiExecutionMode,
  retention: AiAcceptedExecutionEnvelope['retention'],
  consent: AiAcceptedExecutionEnvelope['consent'],
): AiAcceptedExecutionEnvelope {
  const handledAt = new Date()
  const technicalMetadata = createAiTechnicalMetadata({
    handledAt,
  })
  const operational = createAiOperationalMetadata(
    request,
    policy,
    operationalMetadataInput,
  )
  const observability = createAiExecutionObservabilitySnapshot({
    consent,
    operational,
    policy,
    request,
    retention,
    status: 'ACCEPTED',
  })
  const execution = createExecutionRecord({
    acceptedAt: handledAt,
    errorCode: null,
    executionId: createExecutionId(request),
    executionMode,
    finishedAt: null,
    handledAt,
    jobStatus: 'NOT_SCHEDULED',
    nextStep:
      executionMode === 'IMMEDIATE'
        ? 'AWAIT_PROVIDER_ADAPTER'
        : 'SCHEDULE_INTERNAL_JOB',
    policyReasonCode: policy.decision.reasonCode,
    providerStatus: 'NOT_STARTED',
    queuedAt: null,
    request,
    startedAt: null,
    state: 'ACCEPTED',
    statusMessage:
      executionMode === 'IMMEDIATE'
        ? 'AI request accepted for immediate execution.'
        : 'AI request accepted for asynchronous scheduling.',
  })
  const events = createAiOperationalEvents({
    execution,
    operational,
    outcome: null,
    policy,
    request,
    status: 'ACCEPTED',
  })

  return aiAcceptedExecutionEnvelopeSchema.parse({
    consent,
    events,
    execution,
    observability,
    operational,
    outcome: null,
    policy,
    request,
    retention,
    status: 'ACCEPTED',
    technicalMetadata,
  })
}

function createBlockedExecutionEnvelope(
  request: AiInferenceRequest,
  policy: AiBlockedExecutionEnvelope['policy'],
  outcome: AiBlockedExecutionEnvelope['outcome'],
  operationalMetadataInput: AiOperationalMetadataInput | undefined,
  executionMode: AiExecutionMode,
  retention: AiBlockedExecutionEnvelope['retention'],
  consent: AiBlockedExecutionEnvelope['consent'],
): AiBlockedExecutionEnvelope {
  const baseOperational = createAiOperationalMetadata(
    request,
    policy,
    operationalMetadataInput,
  )
  const operational = applyAiOutcomeToOperationalMetadata(
    baseOperational,
    outcome,
  )
  const observability = createAiExecutionObservabilitySnapshot({
    consent,
    operational,
    policy,
    request,
    retention,
    status: 'BLOCKED',
  })
  const execution = createExecutionRecord({
    acceptedAt: null,
    errorCode: outcome.error.code,
    executionId: null,
    executionMode,
    finishedAt: outcome.technicalMetadata.handledAt,
    handledAt: outcome.technicalMetadata.handledAt,
    jobStatus:
      outcome.gateDecision.reasonCode === 'NOT_SUPPORTED'
        ? 'NOT_SUPPORTED'
        : 'BLOCKED',
    nextStep: 'NONE',
    policyReasonCode: policy.decision.reasonCode,
    providerStatus:
      outcome.gateDecision.reasonCode === 'NOT_SUPPORTED'
        ? 'NOT_SUPPORTED'
        : 'NOT_STARTED',
    queuedAt: null,
    request,
    startedAt: null,
    state: 'BLOCKED',
    statusMessage: outcome.error.message,
  })
  const events = createAiOperationalEvents({
    execution,
    operational,
    outcome,
    policy,
    request,
    status: 'BLOCKED',
  })

  return aiBlockedExecutionEnvelopeSchema.parse({
    consent,
    events,
    execution,
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

function createConsentBlockedExecutionEnvelope(
  request: AiInferenceRequest,
  policy: AiBlockedExecutionEnvelope['policy'],
  consent: AiConsentEvaluation,
  operationalMetadataInput: AiOperationalMetadataInput | undefined,
  executionMode: AiExecutionMode,
  retention: AiBlockedExecutionEnvelope['retention'],
): AiBlockedExecutionEnvelope {
  const outcome = createAiConsentBlockedOutcome(request, {
    reasonCode: consent.reasonCode,
  })
  const baseOperational = createAiOperationalMetadata(
    request,
    policy,
    operationalMetadataInput,
  )
  const operational = applyAiOutcomeToOperationalMetadata(
    baseOperational,
    outcome,
  )
  const observability = createAiExecutionObservabilitySnapshot({
    consent,
    operational,
    policy,
    request,
    retention,
    status: 'BLOCKED',
  })
  const execution = createExecutionRecord({
    acceptedAt: null,
    errorCode: outcome.error.code,
    executionId: null,
    executionMode,
    finishedAt: outcome.technicalMetadata.handledAt,
    handledAt: outcome.technicalMetadata.handledAt,
    jobStatus: 'BLOCKED',
    nextStep: 'NONE',
    policyReasonCode: policy.decision.reasonCode,
    providerStatus: 'NOT_STARTED',
    queuedAt: null,
    request,
    startedAt: null,
    state: 'BLOCKED',
    statusMessage: outcome.error.message,
  })
  const events = createAiOperationalEvents({
    execution,
    operational,
    outcome,
    policy,
    request,
    status: 'BLOCKED',
  })

  return aiBlockedExecutionEnvelopeSchema.parse({
    consent,
    events,
    execution,
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
  operationalMetadataInput: AiOperationalMetadataInput | undefined,
  executionMode: AiExecutionMode,
  consentInput: AiConsentEvaluationInput | undefined,
): AiFailedExecutionEnvelope {
  const technicalMetadata = createAiTechnicalMetadata()
  const baseOperational = createAiOperationalMetadata(
    request,
    null,
    operationalMetadataInput,
  )
  const retention = createAiRetentionPolicySnapshot(request)
  const consent = createAiConsentNotEvaluated(request, retention, consentInput)
  const outcome = createAiFailedOutcome(request, {
    details: normalizeExecutionErrorDetails(error),
    message:
      'The AI execution envelope failed before any provider adapter or real job was started.',
    retryable: false,
    technicalMetadata: {
      handledAt: technicalMetadata.handledAt,
    },
  })
  const operational = applyAiOutcomeToOperationalMetadata(
    baseOperational,
    outcome,
  )
  const observability = createAiExecutionObservabilitySnapshot({
    consent,
    operational,
    policy: null,
    request,
    retention,
    status: 'FAILED',
  })
  const execution = createExecutionRecord({
    acceptedAt: null,
    errorCode: outcome.error.code,
    executionId: null,
    executionMode,
    finishedAt: outcome.technicalMetadata.handledAt,
    handledAt: outcome.technicalMetadata.handledAt,
    jobStatus: 'FAILED',
    nextStep: 'NONE',
    policyReasonCode: null,
    providerStatus: 'FAILED',
    queuedAt: null,
    request,
    startedAt: null,
    state: 'FAILED',
    statusMessage: outcome.error.message,
  })
  const events = createAiOperationalEvents({
    execution,
    operational,
    outcome,
    policy: null,
    request,
    status: 'FAILED',
  })

  return aiFailedExecutionEnvelopeSchema.parse({
    consent,
    events,
    execution,
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
  acceptedAt: Date | null
  errorCode?: AiLayerErrorCode | null
  executionId: string | null
  executionMode: AiExecutionMode
  finishedAt: Date | null
  handledAt: Date
  jobStatus:
    | 'NOT_SCHEDULED'
    | 'QUEUED'
    | 'RUNNING'
    | 'COMPLETED'
    | 'BLOCKED'
    | 'FAILED'
    | 'NOT_SUPPORTED'
  nextStep: AiExecutionNextStep
  policyReasonCode: AiPolicyReasonCode | null
  providerStatus:
    | 'NOT_STARTED'
    | 'RUNNING'
    | 'COMPLETED'
    | 'FAILED'
    | 'NOT_SUPPORTED'
  queuedAt: Date | null
  request: AiInferenceRequest
  startedAt: Date | null
  state: AiExecutionState
  statusMessage: string | null
}): AiExecutionRecord {
  return aiExecutionRecordSchema.parse({
    acceptedAt: input.acceptedAt,
    errorCode: input.errorCode ?? null,
    executionId: input.executionId,
    executionMode: input.executionMode,
    finishedAt: input.finishedAt,
    handledAt: input.handledAt,
    inferenceKey: input.request.inferenceKey,
    jobStatus: input.jobStatus,
    module: input.request.module,
    nextStep: input.nextStep,
    origin: input.request.origin,
    policyReasonCode: input.policyReasonCode,
    providerStatus: input.providerStatus,
    queuedAt: input.queuedAt,
    requestId: input.request.requestId ?? null,
    requestedAt: input.request.requestedAt,
    requestedByUserId: input.request.requestedByUserId ?? null,
    startedAt: input.startedAt,
    state: input.state,
    statusMessage: input.statusMessage,
    unitId: input.request.unitId ?? null,
  })
}

function createExecutionId(request: AiInferenceRequest) {
  return `ai_exec_${request.requestId ?? randomUUID()}`
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

function resolveTerminalEnvelopeStatus(
  outcome: AiInferenceOutcome,
): 'COMPLETED' | 'BLOCKED' | 'FAILED' {
  return outcome.status
}

function resolveTerminalExecutionState(
  outcome: AiInferenceOutcome,
): Extract<AiExecutionState, 'BLOCKED' | 'COMPLETED' | 'FAILED'> {
  return outcome.status
}

function resolveTerminalProviderStatus(
  outcome: AiInferenceOutcome,
): Extract<
  AiExecutionProviderStatus,
  'NOT_STARTED' | 'COMPLETED' | 'FAILED' | 'NOT_SUPPORTED'
> {
  if (outcome.status === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (outcome.status === 'FAILED') {
    return 'FAILED'
  }

  return outcome.gateDecision.reasonCode === 'NOT_SUPPORTED'
    ? 'NOT_SUPPORTED'
    : 'NOT_STARTED'
}

function resolveTerminalJobStatus(
  outcome: AiInferenceOutcome,
): AiExecutionRecord['jobStatus'] {
  if (outcome.status === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (outcome.status === 'FAILED') {
    return 'FAILED'
  }

  return outcome.gateDecision.reasonCode === 'NOT_SUPPORTED'
    ? 'NOT_SUPPORTED'
    : 'BLOCKED'
}

function resolveTerminalStatusMessage(outcome: AiInferenceOutcome) {
  if (outcome.status === 'COMPLETED') {
    return outcome.interpretedResult.summary
  }

  return outcome.error.message
}
