import type { AuthenticatedUserData } from '@/server/auth/types'
import { hasAnyPermission } from '@/server/authorization/access-control'
import { AppError } from '@/server/http/errors'
import { resolveMultiUnitSessionContext } from '@/features/multiunit/context'
import {
  getAiConsentDecisionLabel,
  getAiConsentReasonLabel,
  getAiCostStatusLabel,
  getAiExecutionModeLabel,
  getAiExecutionProviderStatusLabel,
  getAiExecutionStatusLabel,
  getAiFallbackReasonLabel,
  getAiFallbackStatusLabel,
  getAiFlagStatusLabel,
  getAiGateReasonLabel,
  getAiJobStatusLabel,
  getAiModuleLabel,
  getAiOperationalEventLabel,
  getAiOperationalReasonLabel,
  getAiOperationalStatusLabel,
  getAiPolicyReasonLabel,
  getAiQuotaStatusLabel,
} from './admin-taxonomy'
import { createAiCompletedOutcome, createAiInferenceRequest } from './domain'
import {
  completeAiInferenceExecution,
  queueAiInferenceExecution,
  runAiInferenceExecution,
  startAiInferenceExecution,
} from './execution'
import type { AiOperationalMetadataInput } from './operational'
import { getAiModuleProviderContract } from './provider-routing'
import type { AiQuotaEnvironment } from './policy'
import type {
  AiExecutionEnvelope,
  AiInferenceModule,
  AiOperationalEvent,
  AiPolicyResult,
} from './schemas'

const AI_FOUNDATION_DIAGNOSTIC_PERMISSIONS = [
  'sistema.manutencao.operar',
  'sistema.reparo.operar',
  'sistema.update.operar',
] as const

const REFERENCE_ENABLED_ENVIRONMENT = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const satisfies AiQuotaEnvironment

export interface AiFoundationFlagDiagnostic {
  environmentKey: string | null
  flagKey: string
  label: string
  normalizedValue: boolean | null
  rawValue: string | null
  source: 'ENVIRONMENT' | 'UNIT_SCOPE'
  status: string
  statusLabel: string
}

export interface AiFoundationQuotaDiagnostic {
  environmentKey: string | null
  key: string
  label: string
  limit: number | null
  rawValue: string | null
  remaining: number | null
  requested: number | null
  scope: 'MODULE' | 'UNIT'
  status: string
  statusLabel: string
  used: number | null
}

export interface AiFoundationEventDiagnostic {
  actionRequired: boolean
  eventClass: 'FUNCTIONAL_GUARD' | 'OPERATIONAL_SIGNAL'
  eventCode: string
  eventLabel: string
  eventType: 'COST' | 'ERROR' | 'RAPID_SHUTDOWN'
  nextStep: string
  reasonSummary: string
  resolutionStatus: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  shutdownScope: 'GLOBAL' | 'MODULE' | null
}

export interface AiFoundationEnvelopeDiagnostic {
  consentDecisionStatus: string
  consentDecisionStatusLabel: string
  consentReasonCode: string
  consentReasonLabel: string
  consentRequirement: string
  costClass: string
  costStatus: string
  costStatusLabel: string
  events: AiFoundationEventDiagnostic[]
  executionMode: string
  executionModeLabel: string
  executionState: string
  executionStateLabel: string
  failClosed: boolean
  fallbackNextStep: string
  fallbackReasonCode: string
  fallbackReasonLabel: string
  fallbackStatus: string
  fallbackStatusLabel: string
  gateReasonCode: string | null
  gateReasonLabel: string
  gateState: string | null
  gatingEvaluations: AiFoundationFlagDiagnostic[]
  jobStatus: string
  jobStatusLabel: string
  moduleQuota: AiFoundationQuotaDiagnostic | null
  nextStep: string
  operationalReasonCode: string
  operationalReasonLabel: string
  operationalStatus: string
  operationalStatusLabel: string
  policyReasonCode: string | null
  policyReasonLabel: string
  policyState: string | null
  providerStatus: string
  providerStatusLabel: string
  retentionPolicyVersion: string
  status: 'ACCEPTED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED'
  statusLabel: string
  statusMessage: string | null
  unitQuota: AiFoundationQuotaDiagnostic | null
}

export interface AiFoundationModuleDiagnostic {
  contract: {
    consentRequired: boolean
    requiresHumanReview: boolean
    supportedConsentPurposes: readonly string[]
    supportedInferenceKeyPrefixes: readonly string[]
  }
  current: AiFoundationEnvelopeDiagnostic
  module: AiInferenceModule
  moduleLabel: string
}

export interface AiFoundationScenarioDiagnostic {
  envelope: AiFoundationEnvelopeDiagnostic
  key:
    | 'FLAG_BLOCK'
    | 'QUOTA_BLOCK'
    | 'CONSENT_BLOCK'
    | 'TEMPORARY_UNAVAILABLE'
    | 'NOT_SUPPORTED'
    | 'CONTROLLED_FAILURE'
  label: string
}

export interface AiFoundationLifecycleReferenceDiagnostic {
  accepted: AiFoundationEnvelopeDiagnostic
  blocked: AiFoundationEnvelopeDiagnostic
  completed: AiFoundationEnvelopeDiagnostic
  failed: AiFoundationEnvelopeDiagnostic
  queued: AiFoundationEnvelopeDiagnostic
  running: AiFoundationEnvelopeDiagnostic
}

export interface AiFoundationDiagnosticsSnapshot {
  flags: AiFoundationFlagDiagnostic[]
  generatedAt: Date
  lifecycleReference: AiFoundationLifecycleReferenceDiagnostic
  modules: AiFoundationModuleDiagnostic[]
  multiUnit: {
    activeUnitId: string | null
    contextOrigin: string | null
    contextType: string | null
    crossUnitAccess: boolean
    crossUnitRequested: boolean
    diagnosticUnitId: string | null
    globalReadAccess: boolean
    globalWriteAccess: boolean
    homeUnitId: string | null
    requestedUnitId: string | null
    status: string
  }
  permissionGate: {
    requiredPermissions: readonly string[]
  }
  scenarios: AiFoundationScenarioDiagnostic[]
}

interface GetAiFoundationDiagnosticsOptions {
  environment?: AiQuotaEnvironment
}

export function canReadAiFoundationDiagnostics(actor: AuthenticatedUserData) {
  return hasAnyPermission(actor, [...AI_FOUNDATION_DIAGNOSTIC_PERMISSIONS])
}

export function getAiFoundationDiagnosticPermissions() {
  return [...AI_FOUNDATION_DIAGNOSTIC_PERMISSIONS]
}

export function getAiFoundationDiagnostics(
  actor: AuthenticatedUserData,
  options: GetAiFoundationDiagnosticsOptions = {},
): AiFoundationDiagnosticsSnapshot {
  assertCanReadAiFoundationDiagnostics(actor)

  const environment = options.environment ?? REFERENCE_ENABLED_ENVIRONMENT
  const context = resolveMultiUnitSessionContext(actor)
  const diagnosticUnitId =
    context.status === 'RESOLVED'
      ? context.activeUnitId ?? actor.unitId
      : actor.unitId

  const currentImageEnvelope = startAiInferenceExecution(
    createReferenceRequest('IMAGE_ANALYSIS', diagnosticUnitId),
    {
      consent: {
        grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
        origin: 'ADMIN_CAPTURE',
      },
      environment,
      operationalMetadata: createDeclaredOperationalMetadata('IMAGE_ANALYSIS'),
    },
  )
  const currentPredictiveEnvelope = startAiInferenceExecution(
    createReferenceRequest('PREDICTIVE_INSIGHTS', diagnosticUnitId),
    {
      environment,
      operationalMetadata: createDeclaredOperationalMetadata('PREDICTIVE_INSIGHTS'),
    },
  )
  const lifecycleReference = createLifecycleReference(diagnosticUnitId)
  const scenarios = createScenarioDiagnostics(diagnosticUnitId, environment)

  return {
    flags: createFlagDiagnostics(
      currentImageEnvelope.policy,
      currentPredictiveEnvelope.policy,
    ),
    generatedAt: new Date(),
    lifecycleReference,
    modules: [
      createModuleDiagnostic('IMAGE_ANALYSIS', currentImageEnvelope),
      createModuleDiagnostic('PREDICTIVE_INSIGHTS', currentPredictiveEnvelope),
    ],
    multiUnit: {
      activeUnitId: context.activeUnitId,
      contextOrigin: context.contextOrigin,
      contextType: context.contextType,
      crossUnitAccess: context.crossUnitAccess,
      crossUnitRequested: context.crossUnitRequested,
      diagnosticUnitId,
      globalReadAccess: context.globalReadAccess,
      globalWriteAccess: context.globalWriteAccess,
      homeUnitId: context.homeUnitId,
      requestedUnitId: context.requestedUnitId,
      status: context.status,
    },
    permissionGate: {
      requiredPermissions: AI_FOUNDATION_DIAGNOSTIC_PERMISSIONS,
    },
    scenarios,
  }
}

function assertCanReadAiFoundationDiagnostics(actor: AuthenticatedUserData) {
  if (canReadAiFoundationDiagnostics(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    `Missing high permission for phase 3 foundation diagnostics. Expected one of: ${AI_FOUNDATION_DIAGNOSTIC_PERMISSIONS.join(', ')}.`,
  )
}

function createReferenceRequest(
  module: AiInferenceModule,
  unitId: string | null,
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey:
      module === 'IMAGE_ANALYSIS'
        ? 'vision.precheck.assistive'
        : 'predictive.insight.health-risk',
    module,
    origin: 'SYSTEM_INTERNAL',
    requestedAt: new Date('2026-04-08T22:00:00.000Z'),
    requestedByUserId: 'system_phase3_diagnostics',
    requestId: `diag_${module.toLowerCase()}`,
    subject: {
      entityId: unitId,
      entityName: module === 'IMAGE_ANALYSIS' ? 'Pet' : 'Unit',
    },
    unitId,
    ...overrides,
  })
}

function createDeclaredOperationalMetadata(
  module: AiInferenceModule,
): AiOperationalMetadataInput {
  return {
    cost: {
      costClass: module === 'IMAGE_ANALYSIS' ? 'LOW' : 'MEDIUM',
      estimateLabel:
        module === 'IMAGE_ANALYSIS'
          ? 'estimated-low-per-request'
          : 'estimated-medium-per-request',
      metadataOrigin: 'ESTIMATED' as const,
      status: 'ESTIMATED' as const,
    },
    model: {
      modelId:
        module === 'IMAGE_ANALYSIS'
          ? 'vision-baseline-v1'
          : 'predictive-baseline-v1',
      modelStatus: 'DECLARED' as const,
    },
    provider: {
      contractVersion: 'phase3-b1-foundation',
      providerId: 'internal-provider-neutral',
      providerStatus: 'DECLARED' as const,
    },
  }
}

function createLifecycleReference(
  unitId: string | null,
): AiFoundationLifecycleReferenceDiagnostic {
  const request = createReferenceRequest('IMAGE_ANALYSIS', unitId, {
    requestId: 'diag_lifecycle_reference',
  })
  const acceptedEnvelope = startAiInferenceExecution(request, {
    consent: {
      grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
      origin: 'ADMIN_CAPTURE',
    },
    environment: REFERENCE_ENABLED_ENVIRONMENT,
    operationalMetadata: createDeclaredOperationalMetadata('IMAGE_ANALYSIS'),
  })

  if (acceptedEnvelope.status !== 'ACCEPTED') {
    throw new Error(
      'Lifecycle reference must start from an accepted IMAGE_ANALYSIS envelope.',
    )
  }

  const queuedEnvelope = queueAiInferenceExecution(acceptedEnvelope)
  const runningEnvelope = runAiInferenceExecution(queuedEnvelope)
  const completedEnvelope = completeAiInferenceExecution(
    runningEnvelope,
    createAiCompletedOutcome(request, {
      interpretedResult: {
        humanReviewRequired: true,
        recommendations: ['Review result before any real action.'],
        signals: [],
        summary: 'Phase 3 diagnostic lifecycle completed without provider real.',
      },
    }),
  )
  const blockedEnvelope = startAiInferenceExecution(request, {
    environment: {
      ...REFERENCE_ENABLED_ENVIRONMENT,
      AI_ENABLED: 'false',
    },
  })
  const failedEnvelope = startAiInferenceExecution(request, {
    environment: REFERENCE_ENABLED_ENVIRONMENT,
    quotaSnapshot: {
      moduleRequestedUnits: -1,
    },
  })

  return {
    accepted: createEnvelopeDiagnostic(acceptedEnvelope),
    blocked: createEnvelopeDiagnostic(blockedEnvelope),
    completed: createEnvelopeDiagnostic(completedEnvelope),
    failed: createEnvelopeDiagnostic(failedEnvelope),
    queued: createEnvelopeDiagnostic(queuedEnvelope),
    running: createEnvelopeDiagnostic(runningEnvelope),
  }
}

function createScenarioDiagnostics(
  unitId: string | null,
  environment: AiQuotaEnvironment,
): AiFoundationScenarioDiagnostic[] {
  const imageRequest = createReferenceRequest('IMAGE_ANALYSIS', unitId, {
    requestId: 'diag_image_scenarios',
  })
  const predictiveRequest = createReferenceRequest('PREDICTIVE_INSIGHTS', unitId, {
    requestId: 'diag_predictive_scenarios',
  })

  const flagBlocked = startAiInferenceExecution(imageRequest, {
    environment: {
      ...environment,
      AI_ENABLED: 'false',
    },
  })
  const quotaBlocked = startAiInferenceExecution(imageRequest, {
    consent: {
      grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
      origin: 'ADMIN_CAPTURE',
    },
    environment,
    quotaSnapshot: {
      moduleRequestedUnits: 1,
      moduleUsedUnits: resolveQuotaLimit(environment.AI_IMAGE_ANALYSIS_BASE_QUOTA),
    },
  })
  const consentBlocked = startAiInferenceExecution(imageRequest, {
    environment,
  })
  const temporarilyUnavailable = startAiInferenceExecution(imageRequest, {
    consent: {
      grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
      origin: 'ADMIN_CAPTURE',
    },
    environment,
    quotaSnapshot: {
      temporarilyUnavailable: true,
    },
  })
  const notSupported = startAiInferenceExecution(
    createReferenceRequest('PREDICTIVE_INSIGHTS', unitId, {
      inferenceKey: 'vision.unsupported.scope',
      requestId: 'diag_not_supported',
    }),
    {
      environment,
    },
  )
  const controlledFailure = startAiInferenceExecution(predictiveRequest, {
    environment,
    quotaSnapshot: {
      moduleRequestedUnits: -1,
    },
  })

  return [
    {
      envelope: createEnvelopeDiagnostic(flagBlocked),
      key: 'FLAG_BLOCK',
      label: 'Bloqueio por flag',
    },
    {
      envelope: createEnvelopeDiagnostic(quotaBlocked),
      key: 'QUOTA_BLOCK',
      label: 'Bloqueio por quota',
    },
    {
      envelope: createEnvelopeDiagnostic(consentBlocked),
      key: 'CONSENT_BLOCK',
      label: 'Bloqueio por consentimento',
    },
    {
      envelope: createEnvelopeDiagnostic(temporarilyUnavailable),
      key: 'TEMPORARY_UNAVAILABLE',
      label: 'Indisponibilidade operacional',
    },
    {
      envelope: createEnvelopeDiagnostic(notSupported),
      key: 'NOT_SUPPORTED',
      label: 'Nao suportado',
    },
    {
      envelope: createEnvelopeDiagnostic(controlledFailure),
      key: 'CONTROLLED_FAILURE',
      label: 'Falha operacional controlada',
    },
  ]
}

function resolveQuotaLimit(rawValue: string | undefined) {
  if (typeof rawValue !== 'string' || !/^\d+$/.test(rawValue.trim())) {
    return 0
  }

  return Number(rawValue.trim())
}

function createModuleDiagnostic(
  module: AiInferenceModule,
  envelope: AiExecutionEnvelope,
): AiFoundationModuleDiagnostic {
  const contract = getAiModuleProviderContract(module)

  return {
    contract: {
      consentRequired: contract.consentRequired,
      requiresHumanReview: contract.requiresHumanReview,
      supportedConsentPurposes: contract.supportedConsentPurposes,
      supportedInferenceKeyPrefixes: contract.supportedInferenceKeyPrefixes,
    },
    current: createEnvelopeDiagnostic(envelope),
    module,
    moduleLabel: getAiModuleLabel(module),
  }
}

function createEnvelopeDiagnostic(
  envelope: AiExecutionEnvelope,
): AiFoundationEnvelopeDiagnostic {
  return {
    consentDecisionStatus: envelope.consent.decisionStatus,
    consentDecisionStatusLabel: getAiConsentDecisionLabel(
      envelope.consent.decisionStatus,
    ),
    consentReasonCode: envelope.consent.reasonCode,
    consentReasonLabel: getAiConsentReasonLabel(envelope.consent.reasonCode),
    consentRequirement: envelope.consent.requirement,
    costClass: envelope.operational.cost.costClass,
    costStatus: envelope.operational.cost.status,
    costStatusLabel: getAiCostStatusLabel(envelope.operational.cost.status),
    events: envelope.events.map(createEventDiagnostic),
    executionMode: envelope.execution.executionMode,
    executionModeLabel: getAiExecutionModeLabel(
      envelope.execution.executionMode,
    ),
    executionState: envelope.execution.state,
    executionStateLabel: getAiExecutionStatusLabel(envelope.execution.state),
    failClosed: envelope.policy?.decision.failClosed ?? true,
    fallbackNextStep: envelope.operational.fallback.nextStep,
    fallbackReasonCode: envelope.operational.fallback.reasonCode,
    fallbackReasonLabel: getAiFallbackReasonLabel(
      envelope.operational.fallback.reasonCode,
    ),
    fallbackStatus: envelope.operational.fallback.status,
    fallbackStatusLabel: getAiFallbackStatusLabel(
      envelope.operational.fallback.status,
    ),
    gateReasonCode: envelope.policy?.gating.decision.reasonCode ?? null,
    gateReasonLabel: getAiGateReasonLabel(
      envelope.policy?.gating.decision.reasonCode ?? null,
    ),
    gateState: envelope.policy?.gating.decision.state ?? null,
    gatingEvaluations: (envelope.policy?.gating.evaluations ?? []).map(
      createFlagDiagnostic,
    ),
    jobStatus: envelope.execution.jobStatus,
    jobStatusLabel: getAiJobStatusLabel(envelope.execution.jobStatus),
    moduleQuota: envelope.policy
      ? createQuotaDiagnostic(envelope.policy.moduleQuota, 'Quota do modulo')
      : null,
    nextStep: envelope.execution.nextStep,
    operationalReasonCode: envelope.operational.operationalReasonCode,
    operationalReasonLabel: getAiOperationalReasonLabel(
      envelope.operational.operationalReasonCode,
    ),
    operationalStatus: envelope.operational.operationalStatus,
    operationalStatusLabel: getAiOperationalStatusLabel(
      envelope.operational.operationalStatus,
    ),
    policyReasonCode: envelope.policy?.decision.reasonCode ?? null,
    policyReasonLabel: getAiPolicyReasonLabel(
      envelope.policy?.decision.reasonCode ?? null,
    ),
    policyState: envelope.policy?.decision.state ?? null,
    providerStatus: envelope.execution.providerStatus,
    providerStatusLabel: getAiExecutionProviderStatusLabel(
      envelope.execution.providerStatus,
    ),
    retentionPolicyVersion: envelope.retention.policyVersion,
    status: envelope.status,
    statusLabel: getAiExecutionStatusLabel(envelope.status),
    statusMessage: envelope.execution.statusMessage,
    unitQuota: envelope.policy
      ? createQuotaDiagnostic(envelope.policy.unitQuota, 'Quota por unidade')
      : null,
  }
}

function createEventDiagnostic(
  event: AiOperationalEvent,
): AiFoundationEventDiagnostic {
  return {
    actionRequired: event.actionRequired,
    eventClass: event.eventClass,
    eventCode: event.eventCode,
    eventLabel: getAiOperationalEventLabel(event.eventCode),
    eventType: event.eventType,
    nextStep: event.nextStep,
    reasonSummary: event.reasonSummary,
    resolutionStatus: event.resolutionStatus,
    severity: event.severity,
    shutdownScope: event.shutdownScope ?? null,
  }
}

function createFlagDiagnostics(
  imagePolicy: AiPolicyResult | null,
  predictivePolicy: AiPolicyResult | null,
) {
  const diagnostics = [
    imagePolicy?.gating.evaluations.find(
      (evaluation) => evaluation.key === imagePolicy.request.flagKeys.global,
    ),
    imagePolicy?.gating.evaluations.find(
      (evaluation) => evaluation.key === imagePolicy.request.flagKeys.module,
    ),
    predictivePolicy?.gating.evaluations.find(
      (evaluation) => evaluation.key === predictivePolicy.request.flagKeys.module,
    ),
  ].filter((evaluation): evaluation is NonNullable<typeof evaluation> => evaluation !== undefined)

  return diagnostics.map(createFlagDiagnostic)
}

function createFlagDiagnostic(
  evaluation: NonNullable<AiPolicyResult['gating']['evaluations'][number]>,
): AiFoundationFlagDiagnostic {
  return {
    environmentKey: evaluation.environmentKey,
    flagKey: evaluation.key,
    label: resolveFlagLabel(evaluation.key),
    normalizedValue: evaluation.normalizedValue,
    rawValue: evaluation.rawValue,
    source: evaluation.source,
    status: evaluation.status,
    statusLabel: getAiFlagStatusLabel(evaluation.status),
  }
}

function createQuotaDiagnostic(
  quota: AiPolicyResult['moduleQuota'],
  label: string,
): AiFoundationQuotaDiagnostic {
  return {
    environmentKey: quota.environmentKey,
    key: quota.key,
    label,
    limit: quota.limit,
    rawValue: quota.rawValue,
    remaining: quota.remaining,
    requested: quota.requested,
    scope: quota.scope,
    status: quota.status,
    statusLabel: getAiQuotaStatusLabel(quota.status),
    used: quota.used,
  }
}

function resolveFlagLabel(flagKey: string) {
  switch (flagKey) {
    case 'ai.enabled':
      return 'Flag global'
    case 'ai.imageAnalysis.enabled':
      return 'Flag de imagem'
    case 'ai.predictiveInsights.enabled':
      return 'Flag preditiva'
    case 'ai.enabledByUnit':
      return 'Escopo por unidade'
    default:
      return flagKey
  }
}
