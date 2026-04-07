import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAiInferenceRequest,
  createAiNotSupportedOutcome,
} from '../../../features/ai/domain'
import {
  normalizeAiProviderExecutionRequest,
  normalizeAiProviderExecutionResponse,
} from '../../../server/integrations/ai/contract'

function createPredictiveRequest() {
  return createAiInferenceRequest({
    inferenceKey: 'predictive.demand.snapshot',
    module: 'PREDICTIVE_INSIGHTS',
    origin: 'SYSTEM_INTERNAL',
    references: [
      {
        kind: 'unitId',
        value: 'unit_789',
      },
    ],
    requestedAt: new Date('2026-04-07T14:00:00.000Z'),
    subject: {
      entityId: 'unit_789',
      entityName: 'Unit',
    },
    unitId: 'unit_789',
  })
}

test('normalizeAiProviderExecutionRequest accepts the internal orchestration envelope', () => {
  const request = createPredictiveRequest()
  const normalizedRequest = normalizeAiProviderExecutionRequest({
    request,
  })

  assert.equal(normalizedRequest.request.flagKeys.global, 'ai.enabled')
  assert.equal(
    normalizedRequest.request.flagKeys.module,
    'ai.predictiveInsights.enabled',
  )
})

test('normalizeAiProviderExecutionResponse accepts a normalized provider-neutral failure shape', () => {
  const normalizedResponse = normalizeAiProviderExecutionResponse({
    status: 'FAILED',
    error: {
      code: 'OPERATIONAL_FAILURE',
      message: 'The adapter could not execute the normalized request.',
      retryable: true,
    },
    technicalMetadata: {
      handledAt: new Date('2026-04-07T14:00:05.000Z'),
      modelId: null,
      providerId: null,
      providerRequestId: null,
      latencyMs: null,
    },
  })

  assert.equal(normalizedResponse.status, 'FAILED')
  assert.equal(normalizedResponse.error.code, 'OPERATIONAL_FAILURE')
})

test('provider boundary rejects raw provider-shaped payloads that bypass the internal contract', () => {
  assert.throws(
    () =>
      normalizeAiProviderExecutionResponse({
        status: 'COMPLETED',
        rawPayload: {
          provider: 'example',
        },
      } as never),
    /Invalid input/,
  )
})

test('provider-facing normalized not-supported responses stay provider-neutral', () => {
  const request = createPredictiveRequest()
  const outcome = createAiNotSupportedOutcome(request)
  assert.equal(outcome.error.code, 'NOT_SUPPORTED')
  const normalizedResponse = normalizeAiProviderExecutionResponse({
    status: 'NOT_SUPPORTED',
    error: {
      ...outcome.error,
      code: 'NOT_SUPPORTED',
    },
    technicalMetadata: outcome.technicalMetadata,
  })

  assert.equal(normalizedResponse.status, 'NOT_SUPPORTED')
  assert.equal(normalizedResponse.error.code, 'NOT_SUPPORTED')
})
