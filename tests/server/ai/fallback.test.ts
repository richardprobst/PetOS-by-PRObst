import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAiFailedOutcome,
  createAiInferenceRequest,
} from '../../../features/ai/domain'
import { createAiOperationalMetadata, applyAiOutcomeToOperationalMetadata } from '../../../features/ai/operational'
import { evaluateAiQuotaPolicy } from '../../../features/ai/policy'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-08T14:00:00.000Z'),
    requestedByUserId: 'user_fallback',
    subject: {
      entityId: 'pet_fallback',
      entityName: 'Pet',
    },
    unitId: 'unit_fallback',
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

test('createAiOperationalMetadata keeps fallback as not evaluated when no fallback declaration exists', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment)
  const metadata = createAiOperationalMetadata(request, policy)

  assert.equal(metadata.fallbackStatus, 'NOT_EVALUATED')
  assert.equal(metadata.fallback.reasonCode, 'NOT_YET_EVALUATED')
  assert.equal(metadata.fallback.nextStep, 'NONE')
})

test('applyAiOutcomeToOperationalMetadata marks planned fallback targets as unavailable after an operational failure', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment)
  const metadata = createAiOperationalMetadata(request, policy, {
    fallback: {
      provider: {
        providerId: 'planned-fallback-provider',
        providerStatus: 'PLANNED',
      },
      strategy: 'DECLARED_PROVIDER_SWITCH',
    },
    provider: {
      providerId: 'primary-provider',
      providerStatus: 'DECLARED',
    },
  })
  const failedOutcome = createAiFailedOutcome(request, {
    message: 'Primary provider became unavailable during execution.',
  })

  const finalized = applyAiOutcomeToOperationalMetadata(metadata, failedOutcome)

  assert.equal(finalized.fallbackStatus, 'UNAVAILABLE')
  assert.equal(finalized.fallback.reasonCode, 'FALLBACK_TARGET_UNAVAILABLE')
  assert.equal(finalized.fallback.nextStep, 'MANUAL_RETRY_REVIEW')
  assert.equal(finalized.operationalStatus, 'TEMPORARILY_UNAVAILABLE')
})
