import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import {
  createAiRetentionExceptionRequest,
  createAiRetentionPolicySnapshot,
} from '../../../features/ai/retention'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-07T20:00:00.000Z'),
    requestedByUserId: 'user_retention',
    references: [
      {
        kind: 'input-image',
        value: 'midia_123',
      },
    ],
    subject: {
      entityId: 'pet_retention',
      entityName: 'Pet',
    },
    unitId: 'unit_retention',
    ...overrides,
  })
}

function getArtifactPolicy(
  request: ReturnType<typeof createAiInferenceRequest>,
  artifactCategory:
    | 'INTERPRETED_RESULT'
    | 'TECHNICAL_METADATA'
    | 'RAW_PROVIDER_PAYLOAD'
    | 'INPUT_REFERENCE',
) {
  const snapshot = createAiRetentionPolicySnapshot(request)
  const artifact = snapshot.artifacts.find(
    (entry) => entry.artifactCategory === artifactCategory,
  )

  assert.ok(artifact)

  return artifact
}

test('createAiRetentionPolicySnapshot marks interpreted results as retainable', () => {
  const interpretedResult = getArtifactPolicy(
    createImageRequest(),
    'INTERPRETED_RESULT',
  )

  assert.equal(interpretedResult.status, 'RETAINABLE')
  assert.equal(interpretedResult.persistenceEligibility, 'ALLOWED')
  assert.equal(interpretedResult.discardByDefault, false)
})

test('createAiRetentionPolicySnapshot marks raw provider payload as discardable by default', () => {
  const rawPayload = getArtifactPolicy(
    createImageRequest(),
    'RAW_PROVIDER_PAYLOAD',
  )

  assert.equal(rawPayload.status, 'DISCARD_BY_DEFAULT')
  assert.equal(rawPayload.persistenceEligibility, 'PROHIBITED')
  assert.equal(rawPayload.discardByDefault, true)
  assert.equal(rawPayload.presentInCurrentEnvelope, false)
})

test('createAiRetentionPolicySnapshot assigns automatic expiry to technical artifacts', () => {
  const technicalMetadata = getArtifactPolicy(
    createImageRequest(),
    'TECHNICAL_METADATA',
  )

  assert.equal(technicalMetadata.status, 'RETAINABLE')
  assert.equal(technicalMetadata.automaticExpiry, true)
  assert.equal(technicalMetadata.baseRetentionDays, 180)
  assert.equal(technicalMetadata.presentInCurrentEnvelope, true)
})

test('createAiRetentionPolicySnapshot requires operational necessity for input references', () => {
  const inputReference = getArtifactPolicy(createImageRequest(), 'INPUT_REFERENCE')

  assert.equal(inputReference.status, 'CONDITIONAL')
  assert.equal(inputReference.persistenceEligibility, 'CONDITIONAL')
  assert.equal(inputReference.requiresOperationalNecessity, true)
  assert.equal(inputReference.presentInCurrentEnvelope, true)
})

test('createAiRetentionExceptionRequest classifies documented exceptions for audited extended retention', () => {
  const exceptionRequest = createAiRetentionExceptionRequest({
    auditTrailRequired: true,
    justificationSummary: 'Tutor contestou o resultado assistivo apresentado.',
    reason: 'DOCUMENTED_DISPUTE',
    requestedByUserId: 'user_retention',
    requiredAuthorizerRole: 'GLOBAL_ADMIN',
  })

  assert.equal(exceptionRequest.reason, 'DOCUMENTED_DISPUTE')
  assert.equal(exceptionRequest.requiredAuthorizerRole, 'GLOBAL_ADMIN')
  assert.equal(exceptionRequest.auditTrailRequired, true)
})

test('createAiRetentionPolicySnapshot requires global administrative authorization for extended retention', () => {
  const technicalMetadata = getArtifactPolicy(
    createImageRequest(),
    'TECHNICAL_METADATA',
  )

  assert.equal(technicalMetadata.extendedRetentionAllowed, true)
  assert.equal(technicalMetadata.requiredExtendedRetentionAuthorizerRole, 'GLOBAL_ADMIN')
  assert.equal(technicalMetadata.extendedRetentionRequiresAuditTrail, true)
  assert.deepEqual(technicalMetadata.allowedExceptionReasons, [
    'FORMAL_AUDIT',
    'OPERATIONAL_INCIDENT',
    'DOCUMENTED_DISPUTE',
    'REGULATORY_OR_CONTRACTUAL_REQUIREMENT',
  ])
})
