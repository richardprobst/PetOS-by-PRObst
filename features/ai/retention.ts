import {
  AI_TECHNICAL_RETENTION_DAYS,
  aiRetentionExceptionRequestSchema,
  aiRetentionPolicySnapshotSchema,
  type AiArtifactRetentionPolicy,
  type AiInferenceRequest,
  type AiRetentionArtifactCategory,
  type AiRetentionExceptionRequest,
  type AiRetentionPolicySnapshot,
} from './schemas'

const AI_RETENTION_POLICY_VERSION = 'PHASE3_B2_BASELINE' as const

const AI_ALLOWED_EXTENDED_RETENTION_REASONS = [
  'FORMAL_AUDIT',
  'OPERATIONAL_INCIDENT',
  'DOCUMENTED_DISPUTE',
  'REGULATORY_OR_CONTRACTUAL_REQUIREMENT',
] as const

export function createAiRetentionExceptionRequest(
  input: AiRetentionExceptionRequest,
) {
  return aiRetentionExceptionRequestSchema.parse(input)
}

export function createAiRetentionPolicySnapshot(
  request: Pick<AiInferenceRequest, 'references'>,
): AiRetentionPolicySnapshot {
  const hasInputReferences = request.references.length > 0

  return aiRetentionPolicySnapshotSchema.parse({
    artifacts: [
      createArtifactPolicy('INTERPRETED_RESULT', {
        extendedRetentionAllowed: true,
        extendedRetentionRequiresAuditTrail: true,
        persistenceEligibility: 'ALLOWED',
        presentInCurrentEnvelope: false,
        requiredExtendedRetentionAuthorizerRole: 'GLOBAL_ADMIN',
        status: 'RETAINABLE',
      }),
      createArtifactPolicy('TECHNICAL_METADATA', {
        automaticExpiry: true,
        baseRetentionDays: AI_TECHNICAL_RETENTION_DAYS,
        extendedRetentionAllowed: true,
        extendedRetentionRequiresAuditTrail: true,
        persistenceEligibility: 'ALLOWED',
        presentInCurrentEnvelope: true,
        requiredExtendedRetentionAuthorizerRole: 'GLOBAL_ADMIN',
        status: 'RETAINABLE',
      }),
      createArtifactPolicy('RAW_PROVIDER_PAYLOAD', {
        discardByDefault: true,
        persistenceEligibility: 'PROHIBITED',
        presentInCurrentEnvelope: false,
        status: 'DISCARD_BY_DEFAULT',
      }),
      createArtifactPolicy('INPUT_REFERENCE', {
        extendedRetentionAllowed: true,
        extendedRetentionRequiresAuditTrail: true,
        persistenceEligibility: 'CONDITIONAL',
        presentInCurrentEnvelope: hasInputReferences,
        requiredExtendedRetentionAuthorizerRole: 'GLOBAL_ADMIN',
        requiresOperationalNecessity: true,
        status: 'CONDITIONAL',
      }),
    ],
    policyVersion: AI_RETENTION_POLICY_VERSION,
    technicalRetentionDays: AI_TECHNICAL_RETENTION_DAYS,
  })
}

function createArtifactPolicy(
  artifactCategory: AiRetentionArtifactCategory,
  overrides: Partial<AiArtifactRetentionPolicy>,
): AiArtifactRetentionPolicy {
  const canExtendRetention =
    overrides.extendedRetentionAllowed ?? false

  return {
    allowedExceptionReasons: canExtendRetention
      ? [...AI_ALLOWED_EXTENDED_RETENTION_REASONS]
      : [],
    artifactCategory,
    automaticExpiry: overrides.automaticExpiry ?? false,
    baseRetentionDays: overrides.baseRetentionDays ?? null,
    discardByDefault: overrides.discardByDefault ?? false,
    extendedRetentionAllowed: canExtendRetention,
    extendedRetentionRequiresAuditTrail:
      overrides.extendedRetentionRequiresAuditTrail ?? canExtendRetention,
    persistenceEligibility: overrides.persistenceEligibility ?? 'PROHIBITED',
    presentInCurrentEnvelope: overrides.presentInCurrentEnvelope ?? false,
    requiredExtendedRetentionAuthorizerRole:
      overrides.requiredExtendedRetentionAuthorizerRole ??
      (canExtendRetention ? 'GLOBAL_ADMIN' : null),
    requiresOperationalNecessity:
      overrides.requiresOperationalNecessity ?? false,
    status: overrides.status ?? 'TRANSIENT_ONLY',
  }
}
