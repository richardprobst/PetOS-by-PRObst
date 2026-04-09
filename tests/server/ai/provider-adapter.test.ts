import assert from 'node:assert/strict'
import test from 'node:test'
import type { AiConsentEvaluationInput } from '../../../features/ai/consent'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { executeAiProviderAdapter } from '../../../server/integrations/ai/adapter'
import type { AiProviderAdapter } from '../../../server/integrations/ai/contract'

function createImageRequest() {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-08T10:00:00.000Z'),
    requestedByUserId: 'user_adapter',
    requestId: 'req_adapter',
    subject: {
      entityId: 'pet_adapter',
      entityName: 'Pet',
    },
    unitId: 'unit_adapter',
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

test('executeAiProviderAdapter returns a normalized completed outcome for a valid adapter response', async () => {
  const request = createImageRequest()
  const adapter: AiProviderAdapter = {
    adapterId: 'internal-vision-adapter',
    contractVersion: 'phase3-b1-t10',
    modelId: 'assistive-vision-v1',
    providerId: 'declared-cloud-provider',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      return {
        status: 'COMPLETED',
        interpretedResult: {
          humanReviewRequired: true,
          recommendations: ['Require operator review before any action.'],
          signals: [
            {
              key: 'coatCondition',
              label: 'Coat condition',
              value: 'stable',
            },
          ],
          summary: 'Assistive provider-neutral summary for review.',
        },
        technicalMetadata: {
          handledAt: new Date('2026-04-08T10:00:05.000Z'),
          latencyMs: 250,
          modelId: null,
          providerId: null,
          providerRequestId: 'provider_req_123',
        },
      }
    },
  }

  const result = await executeAiProviderAdapter(request, adapter, {
    consent: imageConsent,
    environment: enabledEnvironment,
    quotaSnapshot: {
      moduleRequestedUnits: 1,
      moduleUsedUnits: 2,
    },
  })

  assert.equal(result.envelope.status, 'COMPLETED')
  assert.equal(result.envelope.execution.executionMode, 'IMMEDIATE')
  assert.equal(result.envelope.execution.state, 'COMPLETED')
  assert.equal(result.envelope.execution.jobStatus, 'COMPLETED')
  assert.equal(result.envelope.execution.providerStatus, 'COMPLETED')
  assert.notEqual(result.envelope.execution.acceptedAt, null)
  assert.notEqual(result.envelope.execution.startedAt, null)
  assert.notEqual(result.envelope.execution.finishedAt, null)
  assert.equal(result.outcome.status, 'COMPLETED')
  assert.equal(result.adapter?.adapterId, 'internal-vision-adapter')
  assert.equal(result.adapterRequest?.request.inferenceKey, request.inferenceKey)
  assert.equal(result.adapterResponse?.status, 'COMPLETED')
  assert.equal(result.outcome.technicalMetadata.providerId, 'declared-cloud-provider')
  assert.equal(result.outcome.technicalMetadata.modelId, 'assistive-vision-v1')
  assert.equal(result.audit.providerId, 'declared-cloud-provider')
  assert.equal(result.audit.status, 'COMPLETED')
})

test('executeAiProviderAdapter normalizes technical adapter failures without leaking provider formats upward', async () => {
  const request = createImageRequest()
  const adapter: AiProviderAdapter = {
    adapterId: 'failing-vision-adapter',
    contractVersion: 'phase3-b1-t10',
    providerId: 'declared-cloud-provider',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      throw new Error('Simulated provider timeout')
    },
  }

  const result = await executeAiProviderAdapter(request, adapter, {
    consent: imageConsent,
    environment: enabledEnvironment,
    operationalMetadata: {
      fallback: {
        provider: {
          contractVersion: 'phase3-b1-t12-fallback',
          providerId: 'declared-fallback-provider',
          providerStatus: 'DECLARED',
        },
        strategy: 'DECLARED_PROVIDER_SWITCH',
      },
    },
  })

  assert.equal(result.envelope.status, 'FAILED')
  assert.equal(result.envelope.execution.executionMode, 'IMMEDIATE')
  assert.equal(result.envelope.execution.state, 'FAILED')
  assert.equal(result.envelope.execution.jobStatus, 'FAILED')
  assert.equal(result.envelope.execution.providerStatus, 'FAILED')
  assert.equal(result.outcome.status, 'FAILED')
  assert.equal(result.outcome.error.code, 'OPERATIONAL_FAILURE')
  assert.equal(result.outcome.error.retryable, false)
  assert.equal(result.adapterResponse, null)
  assert.equal(result.audit.errorCode, 'OPERATIONAL_FAILURE')
  assert.equal(result.outcome.error.details?.adapterId, 'failing-vision-adapter')
  assert.equal(result.envelope.operational.fallbackStatus, 'ELIGIBLE')
  assert.equal(
    result.envelope.operational.fallback.reasonCode,
    'PRIMARY_OPERATIONAL_FAILURE',
  )
  assert.equal(
    result.envelope.operational.fallback.nextStep,
    'REVIEW_FUTURE_FALLBACK',
  )
})

test('executeAiProviderAdapter blocks by flag before calling the adapter', async () => {
  const request = createImageRequest()
  let executeCalls = 0
  const adapter: AiProviderAdapter = {
    adapterId: 'blocked-vision-adapter',
    contractVersion: 'phase3-b1-t10',
    providerId: 'declared-cloud-provider',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      executeCalls += 1

      return {
        status: 'COMPLETED',
        interpretedResult: {
          humanReviewRequired: true,
          recommendations: ['This path should not run.'],
          signals: [],
          summary: 'Unexpected execution.',
        },
        technicalMetadata: {
          handledAt: new Date('2026-04-08T10:00:05.000Z'),
          latencyMs: null,
          modelId: null,
          providerId: null,
          providerRequestId: null,
        },
      }
    },
  }

  const result = await executeAiProviderAdapter(request, adapter, {
    environment: {
      ...enabledEnvironment,
      AI_ENABLED: 'false',
    },
  })

  assert.equal(result.envelope.status, 'BLOCKED')
  assert.equal(result.envelope.execution.jobStatus, 'BLOCKED')
  assert.equal(result.envelope.execution.nextStep, 'NONE')
  assert.equal(result.outcome.status, 'BLOCKED')
  assert.equal(result.outcome.error.code, 'DISABLED')
  assert.equal(result.adapter, null)
  assert.equal(executeCalls, 0)
})

test('executeAiProviderAdapter exposes a not-supported lifecycle state when the adapter does not support the module', async () => {
  const request = createImageRequest()
  const adapter: AiProviderAdapter = {
    adapterId: 'predictive-only-adapter',
    contractVersion: 'phase3-b1-t11',
    supportedModules: ['PREDICTIVE_INSIGHTS'],
    async execute() {
      throw new Error('This adapter should not run for image analysis.')
    },
  }

  const result = await executeAiProviderAdapter(request, adapter, {
    consent: imageConsent,
    environment: enabledEnvironment,
    operationalMetadata: {
      fallback: {
        provider: {
          providerId: 'declared-fallback-provider',
          providerStatus: 'DECLARED',
        },
        strategy: 'DECLARED_PROVIDER_SWITCH',
      },
    },
  })

  assert.equal(result.envelope.status, 'BLOCKED')
  assert.equal(result.envelope.execution.state, 'BLOCKED')
  assert.equal(result.envelope.execution.jobStatus, 'NOT_SUPPORTED')
  assert.equal(result.envelope.execution.providerStatus, 'NOT_SUPPORTED')
  assert.equal(result.outcome.status, 'BLOCKED')
  assert.equal(result.outcome.error.code, 'NOT_SUPPORTED')
  assert.equal(result.envelope.operational.fallbackStatus, 'ELIGIBLE')
  assert.equal(
    result.envelope.operational.fallback.reasonCode,
    'PRIMARY_NOT_SUPPORTED',
  )
})
