import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { createAiOperationalMetadata } from '../../../features/ai/operational'
import { evaluateAiQuotaPolicy } from '../../../features/ai/policy'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-08T12:00:00.000Z'),
    requestedByUserId: 'user_operational',
    subject: {
      entityId: 'pet_operational',
      entityName: 'Pet',
    },
    unitId: 'unit_operational',
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

test('createAiOperationalMetadata models provider and model as not configured by default', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment)
  const metadata = createAiOperationalMetadata(request, policy)

  assert.equal(metadata.provider.providerStatus, 'NOT_CONFIGURED')
  assert.equal(metadata.provider.providerId, null)
  assert.equal(metadata.model.modelStatus, 'NOT_CONFIGURED')
  assert.equal(metadata.operationalStatus, 'NOT_CONFIGURED')
  assert.equal(metadata.cost.status, 'NOT_CONFIGURED')
  assert.equal(metadata.fallbackStatus, 'NOT_EVALUATED')
  assert.equal(metadata.fallback.reasonCode, 'NOT_YET_EVALUATED')
})

test('createAiOperationalMetadata supports declared provider and model metadata without a real provider adapter', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment)
  const metadata = createAiOperationalMetadata(request, policy, {
    model: {
      modelId: 'assistive-vision-v1',
      modelStatus: 'DECLARED',
    },
    provider: {
      contractVersion: 'internal-adapter-v1',
      providerId: 'provider-assistive',
      providerStatus: 'DECLARED',
    },
  })

  assert.equal(metadata.provider.providerStatus, 'DECLARED')
  assert.equal(metadata.provider.providerId, 'provider-assistive')
  assert.equal(metadata.provider.contractVersion, 'internal-adapter-v1')
  assert.equal(metadata.model.modelStatus, 'DECLARED')
  assert.equal(metadata.model.modelId, 'assistive-vision-v1')
  assert.equal(metadata.operationalStatus, 'DECLARED')
  assert.equal(metadata.fallbackStatus, 'NOT_EVALUATED')
})

test('createAiOperationalMetadata supports estimated cost metadata without billing real', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment)
  const metadata = createAiOperationalMetadata(request, policy, {
    cost: {
      costClass: 'LOW',
      estimateLabel: 'estimated-low-per-request',
      metadataOrigin: 'ESTIMATED',
      status: 'ESTIMATED',
    },
    provider: {
      providerStatus: 'PLANNED',
    },
  })

  assert.equal(metadata.cost.status, 'ESTIMATED')
  assert.equal(metadata.cost.costClass, 'LOW')
  assert.equal(metadata.cost.estimateLabel, 'estimated-low-per-request')
  assert.equal(metadata.cost.measurementUnit, 'INFERENCE_REQUEST')
  assert.equal(metadata.cost.metadataOrigin, 'ESTIMATED')
})

test('createAiOperationalMetadata marks fallback as not configured when only the strategy is declared', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment)
  const metadata = createAiOperationalMetadata(request, policy, {
    fallback: {
      strategy: 'DECLARED_PROVIDER_SWITCH',
    },
  })

  assert.equal(metadata.fallbackStatus, 'NOT_CONFIGURED')
  assert.equal(metadata.fallback.reasonCode, 'FALLBACK_NOT_CONFIGURED')
  assert.equal(metadata.fallback.nextStep, 'CONFIGURE_FALLBACK')
})

test('createAiOperationalMetadata keeps temporary operational unavailability distinct from functional disablement', () => {
  const request = createImageRequest()
  const temporarilyUnavailablePolicy = evaluateAiQuotaPolicy(
    request,
    enabledEnvironment,
    {
      temporarilyUnavailable: true,
    },
  )
  const disabledByFlagPolicy = evaluateAiQuotaPolicy(
    request,
    {
      ...enabledEnvironment,
      AI_ENABLED: 'false',
    },
    {},
  )

  const unavailableMetadata = createAiOperationalMetadata(
    request,
    temporarilyUnavailablePolicy,
  )
  const disabledMetadata = createAiOperationalMetadata(request, disabledByFlagPolicy)

  assert.equal(unavailableMetadata.operationalStatus, 'TEMPORARILY_UNAVAILABLE')
  assert.equal(
    unavailableMetadata.operationalReasonCode,
    'POLICY_TEMPORARILY_UNAVAILABLE',
  )
  assert.equal(unavailableMetadata.cost.status, 'UNAVAILABLE')

  assert.equal(disabledMetadata.operationalStatus, 'NOT_EVALUATED')
  assert.equal(disabledMetadata.operationalReasonCode, 'NOT_EVALUATED')
})
