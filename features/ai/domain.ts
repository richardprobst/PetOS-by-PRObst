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
  type AiCompletedOutcome,
  type AiFailedOutcome,
  type AiGateDecision,
  type AiGateReasonCode,
  type AiGatingResult,
  type AiInferenceFlagKeys,
  type AiInferenceModule,
  type AiInferenceRequest,
  type AiLayerError,
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
  reasonCode: Extract<
    AiGateReasonCode,
    'DISABLED_BY_POLICY' | 'MISSING_CONFIGURATION' | 'NOT_SUPPORTED'
  >
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
  return aiBlockedOutcomeSchema.parse({
    status: 'BLOCKED',
    request,
    gateDecision: createAiBlockedGateDecision(request, input.reasonCode),
    error: createAiLayerError({
      code: input.reasonCode === 'NOT_SUPPORTED' ? 'NOT_SUPPORTED' : 'DISABLED',
      details: input.details,
      message: input.message,
      retryable: false,
    }),
    technicalMetadata: createAiTechnicalMetadata(input.technicalMetadata),
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

  const messageByReasonCode: Record<
    Exclude<AiGateReasonCode, 'ENABLED'>,
    string
  > = {
    DISABLED_BY_POLICY:
      'AI inference is disabled by the current system policy.',
    MISSING_CONFIGURATION:
      'AI inference is disabled because the required AI flag configuration is missing or invalid.',
    NOT_SUPPORTED:
      'AI inference is not supported by the current internal AI contract.',
  }

  return createAiBlockedOutcome(gatingResult.request, {
    details: {
      evaluations: gatingResult.evaluations,
    },
    message: messageByReasonCode[blockedReasonCode],
    reasonCode: blockedReasonCode,
  })
}
