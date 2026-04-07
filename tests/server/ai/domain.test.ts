import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAiAuditSnapshot,
  createAiBlockedOutcome,
  createAiCompletedOutcome,
  createAiFailedOutcome,
  createAiInferenceRequest,
  createAiMissingConfigurationOutcome,
} from '../../../features/ai/domain'

function createBaseRequest() {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    inputSummary: 'pre-service visual triage request',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    references: [
      {
        kind: 'mediaAssetId',
        value: 'media_123',
      },
    ],
    requestedAt: new Date('2026-04-07T12:00:00.000Z'),
    requestedByUserId: 'user_123',
    requestId: 'req_123',
    subject: {
      entityId: 'pet_123',
      entityName: 'Pet',
    },
    unitId: 'unit_123',
  })
}

test('createAiInferenceRequest auto-populates the expected flag keys', () => {
  const request = createBaseRequest()

  assert.equal(request.flagKeys.global, 'ai.enabled')
  assert.equal(request.flagKeys.module, 'ai.imageAnalysis.enabled')
  assert.equal(request.flagKeys.unit, 'ai.enabledByUnit')
})

test('createAiBlockedOutcome represents a fail-closed disabled path safely', () => {
  const request = createBaseRequest()
  const outcome = createAiMissingConfigurationOutcome(request)

  assert.equal(outcome.status, 'BLOCKED')
  assert.equal(outcome.gateDecision.allowed, false)
  assert.equal(outcome.gateDecision.failClosed, true)
  assert.equal(outcome.gateDecision.reasonCode, 'MISSING_CONFIGURATION')
  assert.equal(outcome.error.code, 'DISABLED')
})

test('createAiFailedOutcome normalizes operational failures without a provider', () => {
  const request = createBaseRequest()
  const outcome = createAiFailedOutcome(request, {
    details: {
      stage: 'orchestration',
    },
    message: 'The AI orchestration layer failed before any provider call.',
    retryable: false,
  })

  assert.equal(outcome.status, 'FAILED')
  assert.equal(outcome.gateDecision.allowed, true)
  assert.equal(outcome.error.code, 'OPERATIONAL_FAILURE')
  assert.equal(outcome.technicalMetadata.providerId, null)
})

test('createAiCompletedOutcome produces an assistive interpreted result', () => {
  const request = createBaseRequest()
  const outcome = createAiCompletedOutcome(request, {
    interpretedResult: {
      humanReviewRequired: true,
      recommendations: ['Confirm the observation with a trained operator.'],
      signals: [
        {
          key: 'coatCondition',
          label: 'Coat condition',
          value: 'stable',
        },
      ],
      summary: 'Assistive visual summary generated for operator review.',
    },
  })

  assert.equal(outcome.status, 'COMPLETED')
  assert.equal(outcome.gateDecision.allowed, true)
  assert.equal(outcome.interpretedResult.humanReviewRequired, true)
})

test('createAiAuditSnapshot preserves the minimum governance and traceability fields', () => {
  const request = createBaseRequest()
  const outcome = createAiBlockedOutcome(request, {
    message: 'AI usage is disabled by system policy.',
    reasonCode: 'DISABLED_BY_POLICY',
    technicalMetadata: {
      handledAt: new Date('2026-04-07T12:00:05.000Z'),
    },
  })
  const auditSnapshot = createAiAuditSnapshot(outcome)

  assert.equal(auditSnapshot.permitted, false)
  assert.equal(auditSnapshot.status, 'BLOCKED')
  assert.equal(auditSnapshot.errorCode, 'DISABLED')
  assert.equal(auditSnapshot.unitId, 'unit_123')
  assert.equal(auditSnapshot.requestedByUserId, 'user_123')
})
