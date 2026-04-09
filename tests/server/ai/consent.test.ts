import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiAuditEntries } from '../../../features/ai/audit'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { startAiInferenceExecution } from '../../../features/ai/execution'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-08T18:00:00.000Z'),
    requestedByUserId: 'user_consent',
    requestId: 'req_consent_image',
    subject: {
      entityId: 'pet_consent',
      entityName: 'Pet',
    },
    unitId: 'unit_consent',
    ...overrides,
  })
}

function createPredictiveRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'predictive.insight.health-risk',
    module: 'PREDICTIVE_INSIGHTS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-08T18:00:00.000Z'),
    requestedByUserId: 'user_consent_predictive',
    requestId: 'req_consent_predictive',
    subject: {
      entityId: 'pet_predictive',
      entityName: 'Pet',
    },
    unitId: 'unit_consent',
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

test('image inference is accepted when consent matches the declared purpose', () => {
  const envelope = startAiInferenceExecution(createImageRequest(), {
    consent: {
      grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
      origin: 'TUTOR_FLOW_OPT_IN',
    },
    environment: enabledEnvironment,
  })

  assert.equal(envelope.status, 'ACCEPTED')
  assert.equal(envelope.consent.allowed, true)
  assert.equal(envelope.consent.decisionStatus, 'ALLOWED')
  assert.equal(envelope.consent.reasonCode, 'CONSENT_GRANTED')
  assert.equal(envelope.consent.humanReviewRequired, true)
  assert.equal(envelope.retention.policyVersion, envelope.consent.retention.policyVersion)
  assert.equal(
    envelope.consent.retention.rawProviderPayloadStatus,
    'DISCARD_BY_DEFAULT',
  )
})

test('image inference is blocked when consent is missing for a required purpose', () => {
  const envelope = startAiInferenceExecution(createImageRequest(), {
    environment: enabledEnvironment,
  })

  assert.equal(envelope.status, 'BLOCKED')
  assert.equal(envelope.outcome.error.code, 'CONSENT_REQUIRED')
  assert.equal(envelope.consent.allowed, false)
  assert.equal(envelope.consent.decisionStatus, 'BLOCKED')
  assert.equal(envelope.consent.reasonCode, 'CONSENT_MISSING')
  assert.equal(envelope.observability.consentReasonCode, 'CONSENT_MISSING')
})

test('image inference is blocked when the granted consent purpose is incompatible', () => {
  const envelope = startAiInferenceExecution(createImageRequest(), {
    consent: {
      grantedPurposes: ['IMAGE_GALLERY_METADATA'],
      origin: 'TUTOR_FLOW_OPT_IN',
    },
    environment: enabledEnvironment,
  })

  assert.equal(envelope.status, 'BLOCKED')
  assert.equal(envelope.outcome.error.code, 'CONSENT_INCOMPATIBLE')
  assert.equal(envelope.consent.allowed, false)
  assert.equal(envelope.consent.reasonCode, 'PURPOSE_NOT_ALLOWED')
})

test('predictive inference keeps consent as not applicable in this block baseline', () => {
  const envelope = startAiInferenceExecution(createPredictiveRequest(), {
    environment: enabledEnvironment,
  })

  assert.equal(envelope.status, 'ACCEPTED')
  assert.equal(envelope.consent.decisionStatus, 'NOT_APPLICABLE')
  assert.equal(envelope.consent.consentStatus, 'NOT_APPLICABLE')
  assert.equal(envelope.consent.requirement, 'NOT_APPLICABLE')
  assert.equal(envelope.consent.humanReviewRequired, false)
})

test('audit details carry consent and retention when consent blocks the request', () => {
  const envelope = startAiInferenceExecution(createImageRequest(), {
    environment: enabledEnvironment,
  })
  const entries = createAiAuditEntries(envelope)

  assert.equal(entries.length, 1)
  assert.equal(entries[0]?.action, 'ai.execution.blocked')
  assert.equal(entries[0]?.details.consent.reasonCode, 'CONSENT_MISSING')
  assert.equal(
    entries[0]?.details.retention.artifacts.find(
      (artifact) => artifact.artifactCategory === 'RAW_PROVIDER_PAYLOAD',
    )?.status,
    'DISCARD_BY_DEFAULT',
  )
})
