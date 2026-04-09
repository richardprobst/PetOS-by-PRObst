import assert from 'node:assert/strict'
import test from 'node:test'
import type { AiConsentEvaluationInput } from '../../../features/ai/consent'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { startAiInferenceExecution } from '../../../features/ai/execution'
import { scheduleAiExecutionJob } from '../../../server/jobs/ai'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-07T18:00:00.000Z'),
    requestedByUserId: 'user_execution',
    requestId: 'req_execution',
    subject: {
      entityId: 'pet_execution',
      entityName: 'Pet',
    },
    unitId: 'unit_execution',
    ...overrides,
  })
}

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const

const imageConsent: AiConsentEvaluationInput = {
  grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
  origin: 'TUTOR_FLOW_OPT_IN',
}

test('startAiInferenceExecution blocks the request when gating denies execution', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    environment: {
      ...enabledEnvironment,
      AI_ENABLED: 'false',
    },
    quotaSnapshot: {
      moduleRequestedUnits: 1,
    },
  })

  assert.equal(envelope.status, 'BLOCKED')
  assert.equal(envelope.policy.decision.reasonCode, 'DISABLED_BY_POLICY')
  assert.equal(envelope.outcome.error.code, 'DISABLED')
  assert.equal(envelope.execution.state, 'BLOCKED')
  assert.equal(envelope.execution.nextStep, 'NONE')
  assert.equal(envelope.execution.jobStatus, 'BLOCKED')
  assert.equal(envelope.execution.executionId, null)
  assert.equal(envelope.policy.moduleQuota.status, 'NOT_EVALUATED')
  assert.equal(envelope.operational.fallbackStatus, 'NOT_ELIGIBLE')
  assert.equal(envelope.operational.fallback.reasonCode, 'BLOCKED_BY_POLICY')
  assert.equal(envelope.operational.fallback.nextStep, 'TERMINAL_FAILURE')
  assert.equal(envelope.retention.policyVersion, 'PHASE3_B2_BASELINE')
})

test('startAiInferenceExecution blocks the request when quota policy denies execution', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    environment: enabledEnvironment,
    quotaSnapshot: {
      moduleRequestedUnits: 1,
      moduleUsedUnits: 10,
    },
  })

  assert.equal(envelope.status, 'BLOCKED')
  assert.equal(envelope.policy.decision.reasonCode, 'QUOTA_EXCEEDED')
  assert.equal(envelope.outcome.error.code, 'QUOTA_EXCEEDED')
  assert.equal(envelope.execution.errorCode, 'QUOTA_EXCEEDED')
  assert.equal(envelope.execution.jobStatus, 'BLOCKED')
  assert.equal(envelope.execution.nextStep, 'NONE')
  assert.equal(envelope.operational.fallbackStatus, 'NOT_ELIGIBLE')
  assert.equal(envelope.operational.fallback.reasonCode, 'BLOCKED_BY_QUOTA')
})

test('startAiInferenceExecution accepts the request for asynchronous scheduling when policy allows execution', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    consent: imageConsent,
    environment: enabledEnvironment,
    operationalMetadata: {
      cost: {
        costClass: 'LOW',
        estimateLabel: 'estimated-low-per-request',
        metadataOrigin: 'ESTIMATED',
        status: 'ESTIMATED',
      },
      model: {
        modelId: 'assistive-vision-v1',
        modelStatus: 'DECLARED',
      },
      provider: {
        contractVersion: 'internal-adapter-v1',
        providerId: 'provider-assistive',
        providerStatus: 'DECLARED',
      },
    },
    quotaSnapshot: {
      moduleRequestedUnits: 1,
      moduleUsedUnits: 3,
    },
  })

  assert.equal(envelope.status, 'ACCEPTED')
  assert.equal(envelope.outcome, null)
  assert.equal(envelope.policy.decision.reasonCode, 'ENABLED')
  assert.equal(envelope.execution.state, 'ACCEPTED')
  assert.equal(envelope.execution.executionMode, 'DEFERRED')
  assert.equal(envelope.execution.nextStep, 'SCHEDULE_INTERNAL_JOB')
  assert.equal(envelope.execution.providerStatus, 'NOT_STARTED')
  assert.equal(envelope.execution.jobStatus, 'NOT_SCHEDULED')
  assert.match(envelope.execution.executionId ?? '', /^ai_exec_/)
  assert.notEqual(envelope.execution.acceptedAt, null)
  assert.equal(envelope.execution.queuedAt, null)
  assert.equal(envelope.execution.startedAt, null)
  assert.equal(envelope.execution.finishedAt, null)
  assert.equal(envelope.technicalMetadata.providerId, null)
  assert.equal(envelope.operational.provider.providerStatus, 'DECLARED')
  assert.equal(envelope.operational.model.modelStatus, 'DECLARED')
  assert.equal(envelope.operational.cost.status, 'ESTIMATED')
  assert.equal(envelope.operational.fallbackStatus, 'NOT_EVALUATED')
  assert.equal(envelope.operational.fallback.reasonCode, 'NOT_YET_EVALUATED')
  assert.equal(envelope.consent.decisionStatus, 'ALLOWED')
  assert.equal(envelope.consent.reasonCode, 'CONSENT_GRANTED')
  assert.equal(envelope.observability.consentDecisionStatus, 'ALLOWED')
  assert.equal(envelope.observability.consentReasonCode, 'CONSENT_GRANTED')
  assert.equal(
    envelope.observability.decisionClass,
    'ACCEPTED_FOR_FUTURE_EXECUTION',
  )
  assert.equal(envelope.observability.eventName, 'AI_EXECUTION_ACCEPTED')
  assert.equal(envelope.observability.providerStatus, 'DECLARED')
  assert.equal(envelope.observability.costStatus, 'ESTIMATED')
  assert.equal(
    envelope.retention.artifacts.find(
      (artifact) => artifact.artifactCategory === 'RAW_PROVIDER_PAYLOAD',
    )?.status,
    'DISCARD_BY_DEFAULT',
  )
  assert.equal(
    envelope.retention.artifacts.find(
      (artifact) => artifact.artifactCategory === 'TECHNICAL_METADATA',
    )?.baseRetentionDays,
    180,
  )
})

test('scheduleAiExecutionJob transitions an accepted request into a logical queued state', () => {
  const request = createImageRequest()
  const acceptedEnvelope = startAiInferenceExecution(request, {
    consent: imageConsent,
    environment: enabledEnvironment,
  })

  assert.equal(acceptedEnvelope.status, 'ACCEPTED')

  const queuedEnvelope = scheduleAiExecutionJob(acceptedEnvelope)

  assert.equal(queuedEnvelope.status, 'QUEUED')
  assert.equal(queuedEnvelope.execution.state, 'QUEUED')
  assert.equal(queuedEnvelope.execution.jobStatus, 'QUEUED')
  assert.equal(queuedEnvelope.execution.nextStep, 'AWAIT_INTERNAL_RUNNER')
  assert.equal(
    queuedEnvelope.observability.decisionClass,
    'QUEUED_FOR_ASYNC_EXECUTION',
  )
  assert.equal(queuedEnvelope.observability.eventName, 'AI_EXECUTION_QUEUED')
  assert.equal(queuedEnvelope.execution.executionId, acceptedEnvelope.execution.executionId)
  assert.notEqual(queuedEnvelope.execution.queuedAt, null)
})

test('startAiInferenceExecution keeps the minimum request, unit and actor references in the execution envelope', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    consent: imageConsent,
    environment: enabledEnvironment,
  })

  assert.equal(envelope.execution.requestId, 'req_execution')
  assert.equal(envelope.execution.requestedByUserId, 'user_execution')
  assert.equal(envelope.execution.unitId, 'unit_execution')
  assert.equal(envelope.execution.module, 'IMAGE_ANALYSIS')
  assert.equal(envelope.execution.inferenceKey, 'vision.precheck.assistive')
})

test('startAiInferenceExecution returns a controlled operational failure when the envelope cannot evaluate quota safely', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    environment: enabledEnvironment,
    quotaSnapshot: {
      moduleRequestedUnits: -1,
    },
  })

  assert.equal(envelope.status, 'FAILED')
  assert.equal(envelope.policy, null)
  assert.equal(envelope.outcome.error.code, 'OPERATIONAL_FAILURE')
  assert.equal(envelope.execution.errorCode, 'OPERATIONAL_FAILURE')
  assert.equal(envelope.execution.policyReasonCode, null)
  assert.equal(envelope.execution.jobStatus, 'FAILED')
  assert.equal(envelope.execution.providerStatus, 'FAILED')
  assert.equal(envelope.technicalMetadata.providerId, null)
  assert.equal(envelope.observability.decisionClass, 'OPERATIONAL_FAILURE')
  assert.equal(envelope.operational.provider.providerStatus, 'NOT_CONFIGURED')
  assert.equal(envelope.operational.fallbackStatus, 'NOT_CONFIGURED')
  assert.equal(envelope.operational.fallback.reasonCode, 'FALLBACK_NOT_CONFIGURED')
  assert.equal(envelope.retention.policyVersion, 'PHASE3_B2_BASELINE')
})

test('startAiInferenceExecution keeps temporary operational unavailability distinct from functional blocking', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    environment: enabledEnvironment,
    quotaSnapshot: {
      temporarilyUnavailable: true,
    },
  })

  assert.equal(envelope.status, 'BLOCKED')
  assert.equal(envelope.policy.decision.reasonCode, 'TEMPORARILY_UNAVAILABLE')
  assert.equal(envelope.observability.decisionClass, 'OPERATIONAL_BLOCK')
  assert.equal(envelope.operational.operationalStatus, 'TEMPORARILY_UNAVAILABLE')
  assert.equal(
    envelope.operational.operationalReasonCode,
    'POLICY_TEMPORARILY_UNAVAILABLE',
  )
  assert.equal(envelope.operational.cost.status, 'UNAVAILABLE')
  assert.equal(envelope.operational.fallbackStatus, 'NOT_CONFIGURED')
  assert.equal(envelope.operational.fallback.reasonCode, 'FALLBACK_NOT_CONFIGURED')
})
