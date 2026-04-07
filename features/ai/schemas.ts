import { z } from 'zod'

export const AI_GLOBAL_FLAG_KEY = 'ai.enabled'
export const AI_IMAGE_ANALYSIS_FLAG_KEY = 'ai.imageAnalysis.enabled'
export const AI_PREDICTIVE_INSIGHTS_FLAG_KEY = 'ai.predictiveInsights.enabled'
export const AI_UNIT_FLAG_KEY = 'ai.enabledByUnit'

export const aiInferenceModuleSchema = z.enum([
  'IMAGE_ANALYSIS',
  'PREDICTIVE_INSIGHTS',
])

export type AiInferenceModule = z.infer<typeof aiInferenceModuleSchema>

export const aiInferenceOriginSchema = z.enum([
  'ADMIN_API',
  'SERVER_ACTION',
  'SYSTEM_INTERNAL',
])

export type AiInferenceOrigin = z.infer<typeof aiInferenceOriginSchema>

export const aiModuleFlagKeyMap = {
  IMAGE_ANALYSIS: AI_IMAGE_ANALYSIS_FLAG_KEY,
  PREDICTIVE_INSIGHTS: AI_PREDICTIVE_INSIGHTS_FLAG_KEY,
} as const satisfies Record<AiInferenceModule, string>

export const aiInferenceFlagKeysSchema = z.object({
  global: z.literal(AI_GLOBAL_FLAG_KEY),
  module: z.string().trim().min(1),
  unit: z.string().trim().min(1).nullable().default(AI_UNIT_FLAG_KEY),
})

export type AiInferenceFlagKeys = z.infer<typeof aiInferenceFlagKeysSchema>

export const aiInferenceReferenceSchema = z.object({
  kind: z.string().trim().min(1),
  value: z.string().trim().min(1),
})

export type AiInferenceReference = z.infer<typeof aiInferenceReferenceSchema>

export const aiInferenceSubjectSchema = z.object({
  entityName: z.string().trim().min(1),
  entityId: z.string().trim().min(1).nullable().default(null),
})

export type AiInferenceSubject = z.infer<typeof aiInferenceSubjectSchema>

export const aiInferenceRequestSchema = z.object({
  inferenceKey: z.string().trim().min(1),
  module: aiInferenceModuleSchema,
  origin: aiInferenceOriginSchema,
  requestedAt: z.coerce.date(),
  requestId: z.string().trim().min(1).optional(),
  unitId: z.string().trim().min(1).nullable().default(null),
  requestedByUserId: z.string().trim().min(1).nullable().default(null),
  subject: aiInferenceSubjectSchema,
  references: z.array(aiInferenceReferenceSchema).default([]),
  inputSummary: z.string().trim().min(1).nullable().default(null),
  flagKeys: aiInferenceFlagKeysSchema,
})

export type AiInferenceRequest = z.infer<typeof aiInferenceRequestSchema>

export const aiGateStateSchema = z.enum([
  'ENABLED',
  'DISABLED',
  'NOT_SUPPORTED',
])

export type AiGateState = z.infer<typeof aiGateStateSchema>

export const aiGateReasonCodeSchema = z.enum([
  'ENABLED',
  'DISABLED_BY_POLICY',
  'MISSING_CONFIGURATION',
  'NOT_SUPPORTED',
])

export type AiGateReasonCode = z.infer<typeof aiGateReasonCodeSchema>

export const aiGateDecisionSchema = z.object({
  failClosed: z.literal(true),
  allowed: z.boolean(),
  state: aiGateStateSchema,
  reasonCode: aiGateReasonCodeSchema,
  flagKeys: aiInferenceFlagKeysSchema,
})

export type AiGateDecision = z.infer<typeof aiGateDecisionSchema>

const aiInterpretedSignalValueSchema = z.union([
  z.string().trim().min(1),
  z.number(),
  z.boolean(),
  z.null(),
])

export const aiInterpretedSignalSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  value: aiInterpretedSignalValueSchema,
})

export type AiInterpretedSignal = z.infer<typeof aiInterpretedSignalSchema>

export const aiInterpretedResultSchema = z.object({
  summary: z.string().trim().min(1),
  signals: z.array(aiInterpretedSignalSchema).default([]),
  recommendations: z.array(z.string().trim().min(1)).default([]),
  humanReviewRequired: z.boolean().default(true),
})

export type AiInterpretedResult = z.infer<typeof aiInterpretedResultSchema>

export const aiTechnicalMetadataSchema = z.object({
  providerId: z.string().trim().min(1).nullable().default(null),
  modelId: z.string().trim().min(1).nullable().default(null),
  providerRequestId: z.string().trim().min(1).nullable().default(null),
  handledAt: z.coerce.date(),
  latencyMs: z.number().int().nonnegative().nullable().default(null),
})

export type AiTechnicalMetadata = z.infer<typeof aiTechnicalMetadataSchema>

export const aiLayerErrorCodeSchema = z.enum([
  'DISABLED',
  'NOT_SUPPORTED',
  'OPERATIONAL_FAILURE',
])

export type AiLayerErrorCode = z.infer<typeof aiLayerErrorCodeSchema>

export const aiLayerErrorSchema = z.object({
  code: aiLayerErrorCodeSchema,
  message: z.string().trim().min(1),
  retryable: z.boolean().default(false),
  details: z.record(z.string(), z.unknown()).optional(),
})

export type AiLayerError = z.infer<typeof aiLayerErrorSchema>

const aiAllowedGateDecisionSchema = aiGateDecisionSchema.extend({
  allowed: z.literal(true),
  state: z.literal('ENABLED'),
  reasonCode: z.literal('ENABLED'),
})

const aiBlockedGateDecisionSchema = aiGateDecisionSchema.extend({
  allowed: z.literal(false),
  state: z.enum(['DISABLED', 'NOT_SUPPORTED']),
  reasonCode: z.enum([
    'DISABLED_BY_POLICY',
    'MISSING_CONFIGURATION',
    'NOT_SUPPORTED',
  ]),
})

export const aiCompletedOutcomeSchema = z.object({
  status: z.literal('COMPLETED'),
  request: aiInferenceRequestSchema,
  gateDecision: aiAllowedGateDecisionSchema,
  interpretedResult: aiInterpretedResultSchema,
  technicalMetadata: aiTechnicalMetadataSchema,
})

export type AiCompletedOutcome = z.infer<typeof aiCompletedOutcomeSchema>

export const aiBlockedOutcomeSchema = z.object({
  status: z.literal('BLOCKED'),
  request: aiInferenceRequestSchema,
  gateDecision: aiBlockedGateDecisionSchema,
  error: aiLayerErrorSchema.extend({
    code: z.enum(['DISABLED', 'NOT_SUPPORTED']),
  }),
  technicalMetadata: aiTechnicalMetadataSchema,
})

export type AiBlockedOutcome = z.infer<typeof aiBlockedOutcomeSchema>

export const aiFailedOutcomeSchema = z.object({
  status: z.literal('FAILED'),
  request: aiInferenceRequestSchema,
  gateDecision: aiAllowedGateDecisionSchema,
  error: aiLayerErrorSchema.extend({
    code: z.literal('OPERATIONAL_FAILURE'),
  }),
  technicalMetadata: aiTechnicalMetadataSchema,
})

export type AiFailedOutcome = z.infer<typeof aiFailedOutcomeSchema>

export const aiInferenceOutcomeSchema = z.discriminatedUnion('status', [
  aiCompletedOutcomeSchema,
  aiBlockedOutcomeSchema,
  aiFailedOutcomeSchema,
])

export type AiInferenceOutcome = z.infer<typeof aiInferenceOutcomeSchema>

export const aiAuditSnapshotSchema = z.object({
  module: aiInferenceModuleSchema,
  inferenceKey: z.string().trim().min(1),
  origin: aiInferenceOriginSchema,
  requestId: z.string().trim().min(1).nullable().default(null),
  unitId: z.string().trim().min(1).nullable().default(null),
  requestedByUserId: z.string().trim().min(1).nullable().default(null),
  subject: aiInferenceSubjectSchema,
  requestedAt: z.coerce.date(),
  handledAt: z.coerce.date(),
  permitted: z.boolean(),
  status: z.enum(['COMPLETED', 'BLOCKED', 'FAILED']),
  providerId: z.string().trim().min(1).nullable().default(null),
  modelId: z.string().trim().min(1).nullable().default(null),
  resultSummary: z.string().trim().min(1).nullable().default(null),
  errorCode: aiLayerErrorCodeSchema.nullable().default(null),
  errorMessage: z.string().trim().min(1).nullable().default(null),
})

export type AiAuditSnapshot = z.infer<typeof aiAuditSnapshotSchema>
