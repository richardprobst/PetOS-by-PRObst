import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { evaluateAiGating, gateAiInferenceRequest } from '../../../features/ai/gating'

function createImageRequest(overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {}) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-07T15:00:00.000Z'),
    requestedByUserId: 'user_321',
    subject: {
      entityId: 'pet_321',
      entityName: 'Pet',
    },
    unitId: 'unit_321',
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
    requestedAt: new Date('2026-04-07T15:00:00.000Z'),
    subject: {
      entityId: 'unit_321',
      entityName: 'Unit',
    },
    unitId: 'unit_321',
    ...overrides,
  })
}

test('evaluateAiGating blocks all AI usage when ai.enabled is false', () => {
  const request = createImageRequest()
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'false',
    AI_IMAGE_ANALYSIS_ENABLED: 'true',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  })

  assert.equal(gating.decision.allowed, false)
  assert.equal(gating.decision.reasonCode, 'DISABLED_BY_POLICY')
  assert.equal(gating.evaluations[0]?.key, 'ai.enabled')
  assert.equal(gating.evaluations[0]?.status, 'DISABLED')
})

test('evaluateAiGating blocks the requested module when the module flag is false', () => {
  const request = createPredictiveRequest()
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'true',
    AI_IMAGE_ANALYSIS_ENABLED: 'true',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'false',
  })

  assert.equal(gating.decision.allowed, false)
  assert.equal(gating.decision.reasonCode, 'DISABLED_BY_POLICY')
  assert.equal(
    gating.evaluations.some(
      (evaluation) =>
        evaluation.key === 'ai.predictiveInsights.enabled' &&
        evaluation.status === 'DISABLED',
    ),
    true,
  )
})

test('evaluateAiGating fails closed when a required flag is absent', () => {
  const request = createImageRequest()
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'true',
    AI_IMAGE_ANALYSIS_ENABLED: undefined,
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  })

  assert.equal(gating.decision.allowed, false)
  assert.equal(gating.decision.reasonCode, 'MISSING_CONFIGURATION')
  assert.equal(
    gating.evaluations.some(
      (evaluation) =>
        evaluation.key === 'ai.imageAnalysis.enabled' &&
        evaluation.status === 'MISSING',
    ),
    true,
  )
})

test('evaluateAiGating fails closed when a flag value is invalid', () => {
  const request = createPredictiveRequest()
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'true',
    AI_IMAGE_ANALYSIS_ENABLED: 'true',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'yes',
  })

  assert.equal(gating.decision.allowed, false)
  assert.equal(gating.decision.reasonCode, 'MISSING_CONFIGURATION')
  assert.equal(
    gating.evaluations.some(
      (evaluation) =>
        evaluation.key === 'ai.predictiveInsights.enabled' &&
        evaluation.status === 'INVALID',
    ),
    true,
  )
})

test('evaluateAiGating fails closed when the inference key is not supported by the module contract', () => {
  const request = createImageRequest({
    inferenceKey: 'predictive.demand.snapshot',
  })
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'true',
    AI_IMAGE_ANALYSIS_ENABLED: 'true',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  })

  assert.equal(gating.decision.allowed, false)
  assert.equal(gating.decision.reasonCode, 'NOT_SUPPORTED')
  assert.equal(gating.evaluations.length, 1)
  assert.equal(gating.evaluations[0]?.status, 'NOT_EVALUATED')
})

test('evaluateAiGating enables a supported inference when the required flags are true', () => {
  const request = createImageRequest()
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'true',
    AI_IMAGE_ANALYSIS_ENABLED: 'true',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'false',
  })

  assert.equal(gating.decision.allowed, true)
  assert.equal(gating.decision.state, 'ENABLED')
  assert.equal(gating.decision.reasonCode, 'ENABLED')
  assert.equal(
    gating.evaluations.some(
      (evaluation) =>
        evaluation.key === 'ai.enabled' && evaluation.status === 'ENABLED',
    ),
    true,
  )
  assert.equal(
    gating.evaluations.some(
      (evaluation) =>
        evaluation.key === 'ai.imageAnalysis.enabled' &&
        evaluation.status === 'ENABLED',
    ),
    true,
  )
})

test('gateAiInferenceRequest returns a provider-neutral blocked outcome when gating denies the request', () => {
  const request = createImageRequest()
  const resolution = gateAiInferenceRequest(request, {
    AI_ENABLED: undefined,
    AI_IMAGE_ANALYSIS_ENABLED: 'true',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  })

  assert.equal(resolution.allowed, false)
  assert.equal(resolution.gating.decision.reasonCode, 'MISSING_CONFIGURATION')
  assert.equal(resolution.outcome.error.code, 'DISABLED')
  assert.equal(resolution.outcome.technicalMetadata.providerId, null)
  assert.deepEqual(
    Array.isArray(resolution.outcome.error.details?.evaluations),
    true,
  )
})

test('evaluateAiGating always records the future unit scope as not yet evaluated', () => {
  const request = createPredictiveRequest()
  const gating = evaluateAiGating(request, {
    AI_ENABLED: 'true',
    AI_IMAGE_ANALYSIS_ENABLED: 'false',
    AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  })

  assert.equal(
    gating.evaluations.some(
      (evaluation) =>
        evaluation.key === 'ai.enabledByUnit' &&
        evaluation.source === 'UNIT_SCOPE' &&
        evaluation.status === 'NOT_EVALUATED',
    ),
    true,
  )
})
