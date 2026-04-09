import type { z } from 'zod'
import {
  AI_GLOBAL_FLAG_KEY,
  AI_UNIT_FLAG_KEY,
  aiAuditSnapshotSchema,
  aiBlockedOutcomeSchema,
  aiCompletedOutcomeSchema,
  aiFailedOutcomeSchema,
  aiGateDecisionSchema,
  aiInferenceRequestSchema,
  aiInterpretedResultSchema,
  aiLayerErrorSchema,
  aiModuleFlagKeyMap,
  aiTechnicalMetadataSchema,
  type AiAuditSnapshot,
  type AiBlockedOutcome,
  type AiConsentEvaluation,
  type AiCompletedOutcome,
  type AiFailedOutcome,
  type AiGateDecision,
  type AiGatingResult,
  type AiInferenceFlagKeys,
  type AiInferenceModule,
  type AiInferenceRequest,
  type AiLayerError,
  type AiLayerErrorCode,
  type AiPolicyReasonCode,
  type AiPolicyResult,
  type AiTechnicalMetadata,
} from './schemas'

type CreateAiInferenceRequestInput = Omit<
  z.input<typeof aiInferenceRequestSchema>,
  'flagKeys'
> & {
  flagKeys?: Partial<AiInferenceFlagKeys>
}

type CreateAiTechnicalMetadataInput = Partial<AiTechnicalMetadata> & {
  handledAt?: Date
}

type CreateAiLayerErrorInput = z.input<typeof aiLayerErrorSchema>

type CreateBlockedOutcomeInput = {
  message: string
  reasonCode: Exclude<AiPolicyReasonCode, 'ENABLED'>
  gateDecision?: AiGateDecision
  technicalMetadata?: CreateAiTechnicalMetadataInput
  details?: AiLayerError['details']
}

type CreateFailedOutcomeInput = {
  message: string
  retryable?: boolean
  technicalMetadata?: CreateAiTechnicalMetadataInput
  details?: AiLayerError['details']
}

type CreateCompletedOutcomeInput = {
  interpretedResult: z.input<typeof aiInterpretedResultSchema>
  technicalMetadata?: CreateAiTechnicalMetadataInput
}

export function getAiModuleFlagKey(module: AiInferenceModule) {
  return aiModuleFlagKeyMap[module]
}

export function createAiFlagKeys(
  module: AiInferenceModule,
  overrides?: Partial<AiInferenceFlagKeys>,
): AiInferenceFlagKeys {
  return {
    global: overrides?.global ?? AI_GLOBAL_FLAG_KEY,
    module: overrides?.module ?? getAiModuleFlagKey(module),
    unit: overrides?.unit ?? AI_UNIT_FLAG_KEY,
  }
}

export function createAiInferenceRequest(
  input: CreateAiInferenceRequestInput,
): AiInferenceRequest {
  return aiInferenceRequestSchema.parse({
    ...input,
    flagKeys: createAiFlagKeys(input.module, input.flagKeys),
  })
}

export function createAiAllowedGateDecision(
  request: Pick<AiInferenceRequest, 'flagKeys'>,
): AiGateDecision {
  return aiGateDecisionSchema.parse({
    failClosed: true,
    allowed: true,
    state: 'ENABLED',
    reasonCode: 'ENABLED',
    flagKeys: request.flagKeys,
  })
}

export function createAiBlockedGateDecision(
  request: Pick<AiInferenceRequest, 'flagKeys'>,
  reasonCode: CreateBlockedOutcomeInput['reasonCode'],
): AiGateDecision {
  return aiGateDecisionSchema.parse({
    failClosed: true,
    allowed: false,
    state: reasonCode === 'NOT_SUPPORTED' ? 'NOT_SUPPORTED' : 'DISABLED',
    reasonCode,
    flagKeys: request.flagKeys,
  })
}

export function createAiTechnicalMetadata(
  input: CreateAiTechnicalMetadataInput = {},
): AiTechnicalMetadata {
  return aiTechnicalMetadataSchema.parse({
    providerId: input.providerId ?? null,
    modelId: input.modelId ?? null,
    providerRequestId: input.providerRequestId ?? null,
    handledAt: input.handledAt ?? new Date(),
    latencyMs: input.latencyMs ?? null,
  })
}

export function createAiLayerError(input: CreateAiLayerErrorInput): AiLayerError {
  return aiLayerErrorSchema.parse(input)
}

export function createAiCompletedOutcome(
  request: AiInferenceRequest,
  input: CreateCompletedOutcomeInput,
): AiCompletedOutcome {
  return aiCompletedOutcomeSchema.parse({
    status: 'COMPLETED',
    request,
    gateDecision: createAiAllowedGateDecision(request),
    interpretedResult: aiInterpretedResultSchema.parse(input.interpretedResult),
    technicalMetadata: createAiTechnicalMetadata(input.technicalMetadata),
  })
}

export function createAiBlockedOutcome(
  request: AiInferenceRequest,
  input: CreateBlockedOutcomeInput,
): AiBlockedOutcome {
  const gateDecision =
    input.gateDecision ??
    (input.reasonCode === 'DISABLED_BY_POLICY' ||
    input.reasonCode === 'MISSING_CONFIGURATION' ||
    input.reasonCode === 'NOT_SUPPORTED'
      ? createAiBlockedGateDecision(request, input.reasonCode)
      : createAiAllowedGateDecision(request))

  return aiBlockedOutcomeSchema.parse({
    status: 'BLOCKED',
    request,
    gateDecision,
    error: createAiLayerError({
      code: mapAiBlockedReasonCodeToErrorCode(input.reasonCode),
      details: input.details,
      message: input.message,
      retryable: false,
    }),
    technicalMetadata: createAiTechnicalMetadata(input.technicalMetadata),
  })
}

export function createAiConsentBlockedOutcome(
  request: AiInferenceRequest,
  consent: Pick<AiConsentEvaluation, 'reasonCode'>,
) {
  const message =
    consent.reasonCode === 'CONSENT_MISSING'
      ? 'AI inference is blocked because the required consent for this purpose is missing.'
      : 'AI inference is blocked because the available consent does not cover the requested purpose.'

  return aiBlockedOutcomeSchema.parse({
    status: 'BLOCKED',
    request,
    gateDecision: createAiAllowedGateDecision(request),
    error: createAiLayerError({
      code:
        consent.reasonCode === 'CONSENT_MISSING'
          ? 'CONSENT_REQUIRED'
          : 'CONSENT_INCOMPATIBLE',
      details: {
        consentReasonCode: consent.reasonCode,
      },
      message,
      retryable: false,
    }),
    technicalMetadata: createAiTechnicalMetadata(),
  })
}

export function createAiFailedOutcome(
  request: AiInferenceRequest,
  input: CreateFailedOutcomeInput,
): AiFailedOutcome {
  return aiFailedOutcomeSchema.parse({
    status: 'FAILED',
    request,
    gateDecision: createAiAllowedGateDecision(request),
    error: createAiLayerError({
      code: 'OPERATIONAL_FAILURE',
      details: input.details,
      message: input.message,
      retryable: input.retryable ?? false,
    }),
    technicalMetadata: createAiTechnicalMetadata(input.technicalMetadata),
  })
}

export function createAiAuditSnapshot(
  outcome: AiCompletedOutcome | AiBlockedOutcome | AiFailedOutcome,
): AiAuditSnapshot {
  return aiAuditSnapshotSchema.parse({
    module: outcome.request.module,
    inferenceKey: outcome.request.inferenceKey,
    origin: outcome.request.origin,
    requestId: outcome.request.requestId ?? null,
    unitId: outcome.request.unitId ?? null,
    requestedByUserId: outcome.request.requestedByUserId ?? null,
    subject: outcome.request.subject,
    requestedAt: outcome.request.requestedAt,
    handledAt: outcome.technicalMetadata.handledAt,
    permitted: outcome.gateDecision.allowed,
    status: outcome.status,
    providerId: outcome.technicalMetadata.providerId,
    modelId: outcome.technicalMetadata.modelId,
    resultSummary:
      outcome.status === 'COMPLETED' ? outcome.interpretedResult.summary : null,
    errorCode: outcome.status === 'COMPLETED' ? null : outcome.error.code,
    errorMessage: outcome.status === 'COMPLETED' ? null : outcome.error.message,
  })
}

export function createAiNotSupportedOutcome(
  request: AiInferenceRequest,
  message = 'AI inference is not supported by the selected adapter.',
) {
  return createAiBlockedOutcome(request, {
    message,
    reasonCode: 'NOT_SUPPORTED',
  })
}

export function createAiMissingConfigurationOutcome(
  request: AiInferenceRequest,
  message = 'AI inference is disabled because the required configuration is missing.',
) {
  return createAiBlockedOutcome(request, {
    message,
    reasonCode: 'MISSING_CONFIGURATION',
  })
}

export function createAiBlockedOutcomeFromGatingResult(
  gatingResult: AiGatingResult,
): AiBlockedOutcome {
  if (gatingResult.decision.allowed) {
    throw new Error(
      'Cannot create a blocked AI outcome from a gating result that is enabled.',
    )
  }

  const blockedReasonCode = gatingResult.decision.reasonCode

  if (blockedReasonCode === 'ENABLED') {
    throw new Error(
      'Blocked AI gating results cannot carry the ENABLED reason code.',
    )
  }

  return createAiBlockedOutcome(gatingResult.request, {
    details: {
      evaluations: gatingResult.evaluations,
    },
    message: getAiBlockedReasonMessage(blockedReasonCode),
    reasonCode: blockedReasonCode,
  })
}

export function createAiBlockedOutcomeFromPolicyResult(
  policyResult: AiPolicyResult,
): AiBlockedOutcome {
  if (policyResult.decision.allowed) {
    throw new Error(
      'Cannot create a blocked AI outcome from a policy result that is enabled.',
    )
  }

  const blockedReasonCode = policyResult.decision.reasonCode

  if (blockedReasonCode === 'ENABLED') {
    throw new Error(
      'Blocked AI policy results cannot carry the ENABLED reason code.',
    )
  }

  return createAiBlockedOutcome(policyResult.request, {
    details: {
      gating: policyResult.gating,
      moduleQuota: policyResult.moduleQuota,
      unitQuota: policyResult.unitQuota,
    },
    gateDecision: policyResult.gating.decision,
    message: getAiBlockedReasonMessage(blockedReasonCode),
    reasonCode: blockedReasonCode,
  })
}

function mapAiBlockedReasonCodeToErrorCode(
  reasonCode: Exclude<AiPolicyReasonCode, 'ENABLED'>,
): Exclude<AiLayerErrorCode, 'OPERATIONAL_FAILURE'> {
  switch (reasonCode) {
    case 'DISABLED_BY_POLICY':
    case 'MISSING_CONFIGURATION':
      return 'DISABLED'
    case 'NOT_SUPPORTED':
      return 'NOT_SUPPORTED'
    case 'QUOTA_EXCEEDED':
      return 'QUOTA_EXCEEDED'
    case 'QUOTA_NOT_CONFIGURED':
      return 'QUOTA_NOT_CONFIGURED'
    case 'TEMPORARILY_UNAVAILABLE':
      return 'TEMPORARILY_UNAVAILABLE'
  }
}

function getAiBlockedReasonMessage(
  reasonCode: Exclude<AiPolicyReasonCode, 'ENABLED'>,
) {
  const messageByReasonCode: Record<
    Exclude<AiPolicyReasonCode, 'ENABLED'>,
    string
  > = {
    DISABLED_BY_POLICY:
      'AI inference is disabled by the current system policy.',
    MISSING_CONFIGURATION:
      'AI inference is disabled because the required AI flag configuration is missing or invalid.',
    NOT_SUPPORTED:
      'AI inference is not supported by the current internal AI contract.',
    QUOTA_EXCEEDED:
      'AI inference is blocked because the configured module quota has been exhausted.',
    QUOTA_NOT_CONFIGURED:
      'AI inference is blocked because the module quota policy is missing or invalid.',
    TEMPORARILY_UNAVAILABLE:
      'AI inference is temporarily unavailable by operational policy.',
  }

  return messageByReasonCode[reasonCode]
}
