import { getAiModuleProviderContract } from './provider-routing'
import { getAiRetentionArtifactPolicy } from './retention'
import {
  aiConsentEvaluationSchema,
  type AiConsentEvaluation,
  type AiConsentOrigin,
  type AiConsentPurpose,
  type AiConsentScope,
  type AiInferenceRequest,
  type AiRetentionPolicySnapshot,
} from './schemas'

export interface AiConsentEvaluationInput {
  grantedPurposes?: AiConsentPurpose[]
  origin?: AiConsentOrigin
  purpose?: AiConsentPurpose
  scope?: AiConsentScope
}

export function createAiConsentNotEvaluated(
  request: AiInferenceRequest,
  retention: AiRetentionPolicySnapshot,
  input: AiConsentEvaluationInput = {},
): AiConsentEvaluation {
  return aiConsentEvaluationSchema.parse({
    allowed: true,
    consentStatus: 'NOT_EVALUATED',
    decisionStatus: 'NOT_EVALUATED',
    humanReviewRequired: resolveHumanReviewRequirement(request),
    metadataVersion: 'PHASE3_B1_T14',
    origin: input.origin ?? 'NOT_PROVIDED',
    purpose: resolveConsentPurpose(request, input.purpose),
    reasonCode: 'NOT_EVALUATED',
    requirement: resolveConsentRequirement(request, input.purpose),
    retention: buildConsentRetentionBinding(retention),
    scope: input.scope ?? resolveConsentScope(request),
  })
}

export function evaluateAiConsent(
  request: AiInferenceRequest,
  retention: AiRetentionPolicySnapshot,
  input: AiConsentEvaluationInput = {},
): AiConsentEvaluation {
  const purpose = resolveConsentPurpose(request, input.purpose)
  const contract = getAiModuleProviderContract(request.module)
  const requirement = resolveConsentRequirement(request, purpose)
  const humanReviewRequired = contract.requiresHumanReview
  const scope = input.scope ?? resolveConsentScope(request)
  const origin = input.origin ?? 'NOT_PROVIDED'
  const grantedPurposes = input.grantedPurposes ?? []

  if (!contract.supportedConsentPurposes.includes(purpose)) {
    return aiConsentEvaluationSchema.parse({
      allowed: false,
      consentStatus: 'INCOMPATIBLE',
      decisionStatus: 'BLOCKED',
      humanReviewRequired,
      metadataVersion: 'PHASE3_B1_T14',
      origin,
      purpose,
      reasonCode: 'PURPOSE_NOT_ALLOWED',
      requirement,
      retention: buildConsentRetentionBinding(retention),
      scope,
    })
  }

  if (requirement === 'NOT_APPLICABLE') {
    return aiConsentEvaluationSchema.parse({
      allowed: true,
      consentStatus: 'NOT_APPLICABLE',
      decisionStatus: 'NOT_APPLICABLE',
      humanReviewRequired,
      metadataVersion: 'PHASE3_B1_T14',
      origin,
      purpose,
      reasonCode: 'NOT_APPLICABLE',
      requirement,
      retention: buildConsentRetentionBinding(retention),
      scope,
    })
  }

  if (grantedPurposes.length === 0) {
    return aiConsentEvaluationSchema.parse({
      allowed: false,
      consentStatus: 'MISSING',
      decisionStatus: 'BLOCKED',
      humanReviewRequired,
      metadataVersion: 'PHASE3_B1_T14',
      origin,
      purpose,
      reasonCode: 'CONSENT_MISSING',
      requirement,
      retention: buildConsentRetentionBinding(retention),
      scope,
    })
  }

  if (!grantedPurposes.includes(purpose)) {
    return aiConsentEvaluationSchema.parse({
      allowed: false,
      consentStatus: 'INCOMPATIBLE',
      decisionStatus: 'BLOCKED',
      humanReviewRequired,
      metadataVersion: 'PHASE3_B1_T14',
      origin,
      purpose,
      reasonCode: 'PURPOSE_NOT_ALLOWED',
      requirement,
      retention: buildConsentRetentionBinding(retention),
      scope,
    })
  }

  return aiConsentEvaluationSchema.parse({
    allowed: true,
    consentStatus: 'GRANTED',
    decisionStatus: 'ALLOWED',
    humanReviewRequired,
    metadataVersion: 'PHASE3_B1_T14',
    origin,
    purpose,
    reasonCode: 'CONSENT_GRANTED',
    requirement,
    retention: buildConsentRetentionBinding(retention),
    scope,
  })
}

function buildConsentRetentionBinding(retention: AiRetentionPolicySnapshot) {
  const interpretedResult = getAiRetentionArtifactPolicy(
    retention,
    'INTERPRETED_RESULT',
  )
  const rawPayload = getAiRetentionArtifactPolicy(retention, 'RAW_PROVIDER_PAYLOAD')
  const technicalMetadata = getAiRetentionArtifactPolicy(
    retention,
    'TECHNICAL_METADATA',
  )

  return {
    extendedRetentionRequiresGlobalAdmin:
      technicalMetadata.requiredExtendedRetentionAuthorizerRole === 'GLOBAL_ADMIN',
    interpretedResultPersistenceEligibility:
      interpretedResult.persistenceEligibility,
    policyVersion: retention.policyVersion,
    rawProviderPayloadStatus: rawPayload.status,
    technicalMetadataRetentionDays:
      technicalMetadata.baseRetentionDays ?? retention.technicalRetentionDays,
  }
}

function resolveConsentPurpose(
  request: AiInferenceRequest,
  explicitPurpose?: AiConsentPurpose,
) {
  if (explicitPurpose !== undefined) {
    return explicitPurpose
  }

  if (request.module === 'PREDICTIVE_INSIGHTS') {
    return 'PREDICTIVE_INSIGHT'
  }

  if (request.module === 'VIRTUAL_ASSISTANT') {
    return 'VOICE_ASSISTANT_TUTOR'
  }

  return request.inferenceKey.startsWith('vision.gallery.')
    ? 'IMAGE_GALLERY_METADATA'
    : 'IMAGE_OPERATIONAL_ASSISTED'
}

function resolveConsentRequirement(
  request: AiInferenceRequest,
  purpose?: AiConsentPurpose,
) {
  const resolvedPurpose = resolveConsentPurpose(request, purpose)

  if (request.module === 'IMAGE_ANALYSIS') {
    return resolvedPurpose === 'IMAGE_OPERATIONAL_ASSISTED' ||
      resolvedPurpose === 'IMAGE_GALLERY_METADATA'
      ? 'REQUIRED'
      : 'NOT_REQUIRED'
  }

  if (request.module === 'VIRTUAL_ASSISTANT') {
    return 'NOT_APPLICABLE'
  }

  return 'NOT_APPLICABLE'
}

function resolveHumanReviewRequirement(request: AiInferenceRequest) {
  return getAiModuleProviderContract(request.module).requiresHumanReview
}

function resolveConsentScope(request: AiInferenceRequest): AiConsentScope {
  if (request.module === 'PREDICTIVE_INSIGHTS') {
    return 'UNIT'
  }

  if (request.module === 'VIRTUAL_ASSISTANT') {
    return 'CLIENT'
  }

  return 'PET'
}
