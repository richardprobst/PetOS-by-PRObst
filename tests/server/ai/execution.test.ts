import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { startAiInferenceExecution } from '../../../features/ai/execution'

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
  assert.equal(envelope.policy.moduleQuota.status, 'NOT_EVALUATED')
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
  assert.equal(envelope.execution.jobStatus, 'NOT_SCHEDULED')
})

test('startAiInferenceExecution returns a pending execution envelope when policy allows execution', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    environment: enabledEnvironment,
    quotaSnapshot: {
      moduleRequestedUnits: 1,
      moduleUsedUnits: 3,
    },
  })

  assert.equal(envelope.status, 'PENDING')
  assert.equal(envelope.outcome, null)
  assert.equal(envelope.policy.decision.reasonCode, 'ENABLED')
  assert.equal(envelope.execution.state, 'PENDING')
  assert.equal(envelope.execution.nextStep, 'AWAIT_PROVIDER_ADAPTER')
  assert.equal(envelope.execution.providerStatus, 'NOT_STARTED')
  assert.equal(envelope.execution.jobStatus, 'NOT_SCHEDULED')
  assert.equal(envelope.technicalMetadata.providerId, null)
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

test('startAiInferenceExecution keeps the minimum request, unit and actor references in the execution envelope', () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
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
  assert.equal(envelope.technicalMetadata.providerId, null)
  assert.equal(envelope.retention.policyVersion, 'PHASE3_B2_BASELINE')
})
