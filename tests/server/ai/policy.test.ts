import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import {
  applyAiQuotaPolicy,
  evaluateAiQuotaPolicy,
} from '../../../features/ai/policy'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-07T16:00:00.000Z'),
    requestedByUserId: 'user_policy',
    subject: {
      entityId: 'pet_policy',
      entityName: 'Pet',
    },
    unitId: 'unit_policy',
    ...overrides,
  })
}

function createPredictiveRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'predictive.demand.snapshot',
    module: 'PREDICTIVE_INSIGHTS',
    origin: 'SYSTEM_INTERNAL',
    requestedAt: new Date('2026-04-07T16:00:00.000Z'),
    subject: {
      entityId: 'unit_policy',
      entityName: 'Unit',
    },
    unitId: 'unit_policy',
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

test('evaluateAiQuotaPolicy blocks IMAGE_ANALYSIS when the module quota is exhausted', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 1,
    moduleUsedUnits: 10,
  })

  assert.equal(policy.decision.allowed, false)
  assert.equal(policy.decision.reasonCode, 'QUOTA_EXCEEDED')
  assert.equal(policy.moduleQuota.status, 'EXCEEDED')
  assert.equal(policy.moduleQuota.key, 'ai.imageAnalysis.baseQuota')
  assert.equal(policy.unitQuota.status, 'NOT_EVALUATED')
})

test('evaluateAiQuotaPolicy blocks PREDICTIVE_INSIGHTS when the module quota is exhausted', () => {
  const request = createPredictiveRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 2,
    moduleUsedUnits: 4,
  })

  assert.equal(policy.decision.allowed, false)
  assert.equal(policy.decision.reasonCode, 'QUOTA_EXCEEDED')
  assert.equal(policy.moduleQuota.status, 'EXCEEDED')
  assert.equal(policy.moduleQuota.key, 'ai.predictiveInsights.baseQuota')
})

test('evaluateAiQuotaPolicy fails closed when the module quota is missing', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(
    request,
    {
      ...enabledEnvironment,
      AI_IMAGE_ANALYSIS_BASE_QUOTA: undefined,
    },
    {
      moduleRequestedUnits: 1,
    },
  )

  assert.equal(policy.decision.allowed, false)
  assert.equal(policy.decision.reasonCode, 'QUOTA_NOT_CONFIGURED')
  assert.equal(policy.moduleQuota.status, 'NOT_CONFIGURED')
})

test('evaluateAiQuotaPolicy fails closed when the module quota is invalid', () => {
  const request = createPredictiveRequest()
  const policy = evaluateAiQuotaPolicy(
    request,
    {
      ...enabledEnvironment,
      AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: 'many',
    },
    {
      moduleRequestedUnits: 1,
    },
  )

  assert.equal(policy.decision.allowed, false)
  assert.equal(policy.decision.reasonCode, 'QUOTA_NOT_CONFIGURED')
  assert.equal(policy.moduleQuota.status, 'INVALID_CONFIGURATION')
})

test('evaluateAiQuotaPolicy allows the request when flags and quota both permit execution', () => {
  const request = createImageRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 1,
    moduleUsedUnits: 3,
  })

  assert.equal(policy.decision.allowed, true)
  assert.equal(policy.decision.reasonCode, 'ENABLED')
  assert.equal(policy.gating.decision.reasonCode, 'ENABLED')
  assert.equal(policy.moduleQuota.status, 'AVAILABLE')
  assert.equal(policy.unitQuota.status, 'NOT_EVALUATED')
})

test('evaluateAiQuotaPolicy preserves the distinction between flag blocking and quota blocking', () => {
  const request = createImageRequest()
  const blockedByFlag = evaluateAiQuotaPolicy(
    request,
    {
      ...enabledEnvironment,
      AI_ENABLED: 'false',
    },
    {
      moduleRequestedUnits: 1,
      moduleUsedUnits: 100,
    },
  )
  const blockedByQuota = evaluateAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 1,
    moduleUsedUnits: 100,
  })

  assert.equal(blockedByFlag.decision.reasonCode, 'DISABLED_BY_POLICY')
  assert.equal(blockedByFlag.moduleQuota.status, 'NOT_EVALUATED')
  assert.equal(blockedByQuota.decision.reasonCode, 'QUOTA_EXCEEDED')
  assert.equal(blockedByQuota.moduleQuota.status, 'EXCEEDED')
})

test('evaluateAiQuotaPolicy can mark the module as temporarily unavailable by operational policy', () => {
  const request = createPredictiveRequest()
  const policy = evaluateAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 1,
    temporarilyUnavailable: true,
  })

  assert.equal(policy.decision.allowed, false)
  assert.equal(policy.decision.reasonCode, 'TEMPORARILY_UNAVAILABLE')
  assert.equal(policy.decision.state, 'UNAVAILABLE')
})

test('applyAiQuotaPolicy returns a provider-neutral blocked outcome for quota failures', () => {
  const request = createPredictiveRequest()
  const resolution = applyAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 2,
    moduleUsedUnits: 4,
  })

  assert.equal(resolution.allowed, false)
  assert.equal(resolution.outcome.error.code, 'QUOTA_EXCEEDED')
  assert.equal(resolution.policy.unitQuota.status, 'NOT_EVALUATED')
  assert.equal(resolution.outcome.technicalMetadata.providerId, null)
})
