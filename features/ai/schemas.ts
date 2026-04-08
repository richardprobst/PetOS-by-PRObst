import { z } from 'zod'

export const AI_GLOBAL_FLAG_KEY = 'ai.enabled'
export const AI_IMAGE_ANALYSIS_FLAG_KEY = 'ai.imageAnalysis.enabled'
export const AI_PREDICTIVE_INSIGHTS_FLAG_KEY = 'ai.predictiveInsights.enabled'
export const AI_UNIT_FLAG_KEY = 'ai.enabledByUnit'
export const AI_GLOBAL_ENV_KEY = 'AI_ENABLED'
export const AI_IMAGE_ANALYSIS_ENV_KEY = 'AI_IMAGE_ANALYSIS_ENABLED'
export const AI_PREDICTIVE_INSIGHTS_ENV_KEY = 'AI_PREDICTIVE_INSIGHTS_ENABLED'
export const AI_IMAGE_ANALYSIS_BASE_QUOTA_KEY = 'ai.imageAnalysis.baseQuota'
export const AI_PREDICTIVE_INSIGHTS_BASE_QUOTA_KEY = 'ai.predictiveInsights.baseQuota'
export const AI_IMAGE_ANALYSIS_UNIT_QUOTA_KEY = 'ai.imageAnalysis.unitQuota'
export const AI_PREDICTIVE_INSIGHTS_UNIT_QUOTA_KEY =
  'ai.predictiveInsights.unitQuota'
export const AI_IMAGE_ANALYSIS_BASE_QUOTA_ENV_KEY = 'AI_IMAGE_ANALYSIS_BASE_QUOTA'
export const AI_PREDICTIVE_INSIGHTS_BASE_QUOTA_ENV_KEY =
  'AI_PREDICTIVE_INSIGHTS_BASE_QUOTA'

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

export const aiModuleEnvFlagKeyMap = {
  IMAGE_ANALYSIS: AI_IMAGE_ANALYSIS_ENV_KEY,
  PREDICTIVE_INSIGHTS: AI_PREDICTIVE_INSIGHTS_ENV_KEY,
} as const satisfies Record<AiInferenceModule, string>

export const aiModuleQuotaKeyMap = {
  IMAGE_ANALYSIS: AI_IMAGE_ANALYSIS_BASE_QUOTA_KEY,
  PREDICTIVE_INSIGHTS: AI_PREDICTIVE_INSIGHTS_BASE_QUOTA_KEY,
} as const satisfies Record<AiInferenceModule, string>

export const aiModuleQuotaEnvKeyMap = {
  IMAGE_ANALYSIS: AI_IMAGE_ANALYSIS_BASE_QUOTA_ENV_KEY,
  PREDICTIVE_INSIGHTS: AI_PREDICTIVE_INSIGHTS_BASE_QUOTA_ENV_KEY,
} as const satisfies Record<AiInferenceModule, string>

export const aiUnitQuotaKeyMap = {
  IMAGE_ANALYSIS: AI_IMAGE_ANALYSIS_UNIT_QUOTA_KEY,
  PREDICTIVE_INSIGHTS: AI_PREDICTIVE_INSIGHTS_UNIT_QUOTA_KEY,
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

export const aiPolicyReasonCodeSchema = z.enum([
  'ENABLED',
  'DISABLED_BY_POLICY',
  'MISSING_CONFIGURATION',
  'NOT_SUPPORTED',
  'QUOTA_EXCEEDED',
  'QUOTA_NOT_CONFIGURED',
  'TEMPORARILY_UNAVAILABLE',
])

export type AiPolicyReasonCode = z.infer<typeof aiPolicyReasonCodeSchema>

export const aiGateEvaluationStatusSchema = z.enum([
  'ENABLED',
  'DISABLED',
  'MISSING',
  'INVALID',
  'NOT_EVALUATED',
])

export type AiGateEvaluationStatus = z.infer<typeof aiGateEvaluationStatusSchema>

export const aiGateEvaluationSourceSchema = z.enum([
  'ENVIRONMENT',
  'UNIT_SCOPE',
])

export type AiGateEvaluationSource = z.infer<typeof aiGateEvaluationSourceSchema>

export const aiGateEvaluationSchema = z.object({
  key: z.string().trim().min(1),
  source: aiGateEvaluationSourceSchema,
  environmentKey: z.string().trim().min(1).nullable().default(null),
  status: aiGateEvaluationStatusSchema,
  normalizedValue: z.boolean().nullable().default(null),
  rawValue: z.string().trim().min(1).nullable().default(null),
})

export type AiGateEvaluation = z.infer<typeof aiGateEvaluationSchema>

export const aiGateDecisionSchema = z.object({
  failClosed: z.literal(true),
  allowed: z.boolean(),
  state: aiGateStateSchema,
  reasonCode: aiGateReasonCodeSchema,
  flagKeys: aiInferenceFlagKeysSchema,
})

export type AiGateDecision = z.infer<typeof aiGateDecisionSchema>

export const aiGatingResultSchema = z.object({
  request: aiInferenceRequestSchema,
  decision: aiGateDecisionSchema,
  evaluations: z.array(aiGateEvaluationSchema).min(1),
})

export type AiGatingResult = z.infer<typeof aiGatingResultSchema>

export const aiQuotaEvaluationScopeSchema = z.enum([
  'MODULE',
  'UNIT',
])

export type AiQuotaEvaluationScope = z.infer<typeof aiQuotaEvaluationScopeSchema>

export const aiQuotaEvaluationStatusSchema = z.enum([
  'AVAILABLE',
  'EXCEEDED',
  'NOT_CONFIGURED',
  'INVALID_CONFIGURATION',
  'NOT_EVALUATED',
])

export type AiQuotaEvaluationStatus = z.infer<
  typeof aiQuotaEvaluationStatusSchema
>

export const aiQuotaEvaluationSchema = z.object({
  key: z.string().trim().min(1),
  scope: aiQuotaEvaluationScopeSchema,
  environmentKey: z.string().trim().min(1).nullable().default(null),
  status: aiQuotaEvaluationStatusSchema,
  rawValue: z.string().trim().min(1).nullable().default(null),
  limit: z.number().int().nonnegative().nullable().default(null),
  used: z.number().int().nonnegative().nullable().default(null),
  requested: z.number().int().nonnegative().nullable().default(null),
  remaining: z.number().int().nonnegative().nullable().default(null),
})

export type AiQuotaEvaluation = z.infer<typeof aiQuotaEvaluationSchema>

export const aiPolicyStateSchema = z.enum([
  'ENABLED',
  'DISABLED',
  'NOT_SUPPORTED',
  'UNAVAILABLE',
])

export type AiPolicyState = z.infer<typeof aiPolicyStateSchema>

export const aiPolicyDecisionSchema = z.object({
  failClosed: z.literal(true),
  allowed: z.boolean(),
  state: aiPolicyStateSchema,
  reasonCode: aiPolicyReasonCodeSchema,
})

export type AiPolicyDecision = z.infer<typeof aiPolicyDecisionSchema>

export const aiPolicyResultSchema = z.object({
  request: aiInferenceRequestSchema,
  gating: aiGatingResultSchema,
  decision: aiPolicyDecisionSchema,
  moduleQuota: aiQuotaEvaluationSchema,
  unitQuota: aiQuotaEvaluationSchema,
})

export type AiPolicyResult = z.infer<typeof aiPolicyResultSchema>

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

export const AI_TECHNICAL_RETENTION_DAYS = 180

export const aiRetentionArtifactCategorySchema = z.enum([
  'INTERPRETED_RESULT',
  'TECHNICAL_METADATA',
  'RAW_PROVIDER_PAYLOAD',
  'INPUT_REFERENCE',
])

export type AiRetentionArtifactCategory = z.infer<
  typeof aiRetentionArtifactCategorySchema
>

export const aiRetentionStatusSchema = z.enum([
  'RETAINABLE',
  'DISCARD_BY_DEFAULT',
  'CONDITIONAL',
  'TRANSIENT_ONLY',
])

export type AiRetentionStatus = z.infer<typeof aiRetentionStatusSchema>

export const aiRetentionPersistenceEligibilitySchema = z.enum([
  'ALLOWED',
  'CONDITIONAL',
  'PROHIBITED',
])

export type AiRetentionPersistenceEligibility = z.infer<
  typeof aiRetentionPersistenceEligibilitySchema
>

export const aiRetentionExceptionReasonSchema = z.enum([
  'FORMAL_AUDIT',
  'OPERATIONAL_INCIDENT',
  'DOCUMENTED_DISPUTE',
  'REGULATORY_OR_CONTRACTUAL_REQUIREMENT',
])

export type AiRetentionExceptionReason = z.infer<
  typeof aiRetentionExceptionReasonSchema
>

export const aiRetentionExtendedAuthorizerRoleSchema = z.enum(['GLOBAL_ADMIN'])

export type AiRetentionExtendedAuthorizerRole = z.infer<
  typeof aiRetentionExtendedAuthorizerRoleSchema
>

export const aiRetentionExceptionRequestSchema = z.object({
  reason: aiRetentionExceptionReasonSchema,
  justificationSummary: z.string().trim().min(1),
  requestedByUserId: z.string().trim().min(1).nullable().default(null),
  requiredAuthorizerRole: aiRetentionExtendedAuthorizerRoleSchema,
  auditTrailRequired: z.literal(true),
})

export type AiRetentionExceptionRequest = z.infer<
  typeof aiRetentionExceptionRequestSchema
>

export const aiArtifactRetentionPolicySchema = z.object({
  artifactCategory: aiRetentionArtifactCategorySchema,
  status: aiRetentionStatusSchema,
  persistenceEligibility: aiRetentionPersistenceEligibilitySchema,
  presentInCurrentEnvelope: z.boolean().default(false),
  discardByDefault: z.boolean().default(false),
  automaticExpiry: z.boolean().default(false),
  baseRetentionDays: z.number().int().positive().nullable().default(null),
  requiresOperationalNecessity: z.boolean().default(false),
  extendedRetentionAllowed: z.boolean().default(false),
  extendedRetentionRequiresAuditTrail: z.boolean().default(false),
  requiredExtendedRetentionAuthorizerRole:
    aiRetentionExtendedAuthorizerRoleSchema.nullable().default(null),
  allowedExceptionReasons: z.array(aiRetentionExceptionReasonSchema).default([]),
})

export type AiArtifactRetentionPolicy = z.infer<
  typeof aiArtifactRetentionPolicySchema
>

export const aiRetentionPolicySnapshotSchema = z.object({
  policyVersion: z.literal('PHASE3_B2_BASELINE'),
  technicalRetentionDays: z.literal(AI_TECHNICAL_RETENTION_DAYS),
  artifacts: z.array(aiArtifactRetentionPolicySchema).min(4),
})

export type AiRetentionPolicySnapshot = z.infer<
  typeof aiRetentionPolicySnapshotSchema
>

export const aiProviderLogicalStatusSchema = z.enum([
  'NOT_CONFIGURED',
  'PLANNED',
  'DECLARED',
])

export type AiProviderLogicalStatus = z.infer<
  typeof aiProviderLogicalStatusSchema
>

export const aiModelLogicalStatusSchema = z.enum([
  'NOT_CONFIGURED',
  'DECLARED',
])

export type AiModelLogicalStatus = z.infer<typeof aiModelLogicalStatusSchema>

export const aiOperationalMetadataOriginSchema = z.enum([
  'NOT_EVALUATED',
  'DECLARED',
  'ESTIMATED',
  'CONFIGURED',
])

export type AiOperationalMetadataOrigin = z.infer<
  typeof aiOperationalMetadataOriginSchema
>

export const aiOperationalStatusSchema = z.enum([
  'NOT_EVALUATED',
  'NOT_CONFIGURED',
  'DECLARED',
  'TEMPORARILY_UNAVAILABLE',
])

export type AiOperationalStatus = z.infer<typeof aiOperationalStatusSchema>

export const aiOperationalReasonCodeSchema = z.enum([
  'NOT_EVALUATED',
  'PROVIDER_NOT_CONFIGURED',
  'DECLARED_FOR_FUTURE_EXECUTION',
  'POLICY_TEMPORARILY_UNAVAILABLE',
  'OPERATIONAL_FAILURE',
])

export type AiOperationalReasonCode = z.infer<
  typeof aiOperationalReasonCodeSchema
>

export const aiFallbackStatusSchema = z.enum(['NOT_EVALUATED'])

export type AiFallbackStatus = z.infer<typeof aiFallbackStatusSchema>

export const aiCostStatusSchema = z.enum([
  'NOT_EVALUATED',
  'ESTIMATED',
  'UNAVAILABLE',
  'NOT_CONFIGURED',
])

export type AiCostStatus = z.infer<typeof aiCostStatusSchema>

export const aiCostClassSchema = z.enum([
  'NOT_CLASSIFIED',
  'LOW',
  'MEDIUM',
  'HIGH',
])

export type AiCostClass = z.infer<typeof aiCostClassSchema>

export const aiCostMeasurementUnitSchema = z.enum(['INFERENCE_REQUEST'])

export type AiCostMeasurementUnit = z.infer<
  typeof aiCostMeasurementUnitSchema
>

export const aiProviderDescriptorSchema = z.object({
  providerId: z.string().trim().min(1).nullable().default(null),
  providerStatus: aiProviderLogicalStatusSchema,
  contractVersion: z.string().trim().min(1).nullable().default(null),
  metadataOrigin: aiOperationalMetadataOriginSchema,
})

export type AiProviderDescriptor = z.infer<typeof aiProviderDescriptorSchema>

export const aiModelDescriptorSchema = z.object({
  modelId: z.string().trim().min(1).nullable().default(null),
  modelStatus: aiModelLogicalStatusSchema,
  metadataOrigin: aiOperationalMetadataOriginSchema,
})

export type AiModelDescriptor = z.infer<typeof aiModelDescriptorSchema>

export const aiCostMetadataSchema = z.object({
  status: aiCostStatusSchema,
  costClass: aiCostClassSchema,
  measurementUnit: aiCostMeasurementUnitSchema,
  metadataOrigin: aiOperationalMetadataOriginSchema,
  estimateLabel: z.string().trim().min(1).nullable().default(null),
})

export type AiCostMetadata = z.infer<typeof aiCostMetadataSchema>

export const aiOperationalMetadataSchema = z.object({
  metadataVersion: z.literal('PHASE3_B1_T06'),
  provider: aiProviderDescriptorSchema,
  model: aiModelDescriptorSchema,
  cost: aiCostMetadataSchema,
  operationalStatus: aiOperationalStatusSchema,
  operationalReasonCode: aiOperationalReasonCodeSchema,
  fallbackStatus: aiFallbackStatusSchema,
})

export type AiOperationalMetadata = z.infer<typeof aiOperationalMetadataSchema>

export const aiExecutionEventNameSchema = z.enum([
  'AI_EXECUTION_PENDING',
  'AI_EXECUTION_BLOCKED',
  'AI_EXECUTION_FAILED',
])

export type AiExecutionEventName = z.infer<typeof aiExecutionEventNameSchema>

export const aiExecutionDecisionClassSchema = z.enum([
  'ACCEPTED_FOR_FUTURE_EXECUTION',
  'FUNCTIONAL_BLOCK',
  'OPERATIONAL_BLOCK',
  'OPERATIONAL_FAILURE',
])

export type AiExecutionDecisionClass = z.infer<
  typeof aiExecutionDecisionClassSchema
>

export const aiExecutionObservabilitySnapshotSchema = z.object({
  eventName: aiExecutionEventNameSchema,
  decisionClass: aiExecutionDecisionClassSchema,
  executionStatus: z.enum(['PENDING', 'BLOCKED', 'FAILED']),
  module: aiInferenceModuleSchema,
  inferenceKey: z.string().trim().min(1),
  unitId: z.string().trim().min(1).nullable().default(null),
  providerStatus: aiProviderLogicalStatusSchema,
  operationalStatus: aiOperationalStatusSchema,
  costStatus: aiCostStatusSchema,
  fallbackStatus: aiFallbackStatusSchema,
  evaluatedFlags: z.array(aiGateEvaluationSchema).default([]),
  policyReasonCode: aiPolicyReasonCodeSchema.nullable().default(null),
  retentionPolicyVersion: aiRetentionPolicySnapshotSchema.shape.policyVersion,
})

export type AiExecutionObservabilitySnapshot = z.infer<
  typeof aiExecutionObservabilitySnapshotSchema
>

export const aiLayerErrorCodeSchema = z.enum([
  'DISABLED',
  'NOT_SUPPORTED',
  'QUOTA_EXCEEDED',
  'QUOTA_NOT_CONFIGURED',
  'TEMPORARILY_UNAVAILABLE',
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
  gateDecision: aiGateDecisionSchema,
  error: aiLayerErrorSchema.extend({
    code: z.enum([
      'DISABLED',
      'NOT_SUPPORTED',
      'QUOTA_EXCEEDED',
      'QUOTA_NOT_CONFIGURED',
      'TEMPORARILY_UNAVAILABLE',
    ]),
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

export const aiExecutionStateSchema = z.enum([
  'BLOCKED',
  'PENDING',
  'COMPLETED',
  'FAILED',
  'DISCARDED',
])

export type AiExecutionState = z.infer<typeof aiExecutionStateSchema>

export const aiExecutionModeSchema = z.enum(['DEFERRED'])

export type AiExecutionMode = z.infer<typeof aiExecutionModeSchema>

export const aiExecutionProviderStatusSchema = z.enum(['NOT_STARTED'])

export type AiExecutionProviderStatus = z.infer<
  typeof aiExecutionProviderStatusSchema
>

export const aiExecutionJobStatusSchema = z.enum(['NOT_SCHEDULED'])

export type AiExecutionJobStatus = z.infer<typeof aiExecutionJobStatusSchema>

export const aiExecutionNextStepSchema = z.enum([
  'NONE',
  'AWAIT_PROVIDER_ADAPTER',
])

export type AiExecutionNextStep = z.infer<typeof aiExecutionNextStepSchema>

export const aiExecutionRecordSchema = z.object({
  executionId: z.string().trim().min(1).nullable().default(null),
  state: aiExecutionStateSchema,
  executionMode: aiExecutionModeSchema,
  providerStatus: aiExecutionProviderStatusSchema,
  jobStatus: aiExecutionJobStatusSchema,
  nextStep: aiExecutionNextStepSchema,
  module: aiInferenceModuleSchema,
  inferenceKey: z.string().trim().min(1),
  origin: aiInferenceOriginSchema,
  requestId: z.string().trim().min(1).nullable().default(null),
  unitId: z.string().trim().min(1).nullable().default(null),
  requestedByUserId: z.string().trim().min(1).nullable().default(null),
  requestedAt: z.coerce.date(),
  handledAt: z.coerce.date(),
  policyReasonCode: aiPolicyReasonCodeSchema.nullable().default(null),
  errorCode: aiLayerErrorCodeSchema.nullable().default(null),
})

export type AiExecutionRecord = z.infer<typeof aiExecutionRecordSchema>

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

const aiExecutionEnvelopeBaseSchema = z.object({
  request: aiInferenceRequestSchema,
  execution: aiExecutionRecordSchema,
  observability: aiExecutionObservabilitySnapshotSchema,
  operational: aiOperationalMetadataSchema,
  retention: aiRetentionPolicySnapshotSchema,
  technicalMetadata: aiTechnicalMetadataSchema,
})

export const aiPendingExecutionEnvelopeSchema = aiExecutionEnvelopeBaseSchema.extend(
  {
    status: z.literal('PENDING'),
    policy: aiPolicyResultSchema,
    outcome: z.null(),
  },
)

export type AiPendingExecutionEnvelope = z.infer<
  typeof aiPendingExecutionEnvelopeSchema
>

export const aiBlockedExecutionEnvelopeSchema = aiExecutionEnvelopeBaseSchema.extend(
  {
    status: z.literal('BLOCKED'),
    policy: aiPolicyResultSchema,
    outcome: aiBlockedOutcomeSchema,
  },
)

export type AiBlockedExecutionEnvelope = z.infer<
  typeof aiBlockedExecutionEnvelopeSchema
>

export const aiFailedExecutionEnvelopeSchema = aiExecutionEnvelopeBaseSchema.extend(
  {
    status: z.literal('FAILED'),
    policy: aiPolicyResultSchema.nullable().default(null),
    outcome: aiFailedOutcomeSchema,
  },
)

export type AiFailedExecutionEnvelope = z.infer<
  typeof aiFailedExecutionEnvelopeSchema
>

export const aiExecutionEnvelopeSchema = z.discriminatedUnion('status', [
  aiPendingExecutionEnvelopeSchema,
  aiBlockedExecutionEnvelopeSchema,
  aiFailedExecutionEnvelopeSchema,
])

export type AiExecutionEnvelope = z.infer<typeof aiExecutionEnvelopeSchema>
