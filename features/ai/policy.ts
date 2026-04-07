import type { Environment } from '@/server/env'
import { getEnv } from '@/server/env'
import { createAiBlockedOutcomeFromPolicyResult } from './domain'
import { gateAiInferenceRequest } from './gating'
import {
  aiPolicyResultSchema,
  aiQuotaEvaluationSchema,
  aiUnitQuotaKeyMap,
  aiModuleQuotaEnvKeyMap,
  aiModuleQuotaKeyMap,
  type AiBlockedOutcome,
  type AiInferenceModule,
  type AiInferenceRequest,
  type AiPolicyDecision,
  type AiPolicyResult,
  type AiQuotaEvaluation,
  type AiQuotaEvaluationStatus,
} from './schemas'

type AiQuotaEnvironment = Pick<
  Environment,
  | 'AI_ENABLED'
  | 'AI_IMAGE_ANALYSIS_ENABLED'
  | 'AI_PREDICTIVE_INSIGHTS_ENABLED'
  | 'AI_IMAGE_ANALYSIS_BASE_QUOTA'
  | 'AI_PREDICTIVE_INSIGHTS_BASE_QUOTA'
>

interface AiQuotaSnapshotInput {
  moduleRequestedUnits?: number
  moduleUsedUnits?: number
  temporarilyUnavailable?: boolean
}

type AiQuotaPolicyResolution =
  | {
      allowed: true
      policy: AiPolicyResult
    }
  | {
      allowed: false
      policy: AiPolicyResult
      outcome: AiBlockedOutcome
    }

function parseNonNegativeInteger(
  rawValue: string | undefined,
): {
  normalizedValue: number | null
  rawValue: string | null
  status: Extract<
    AiQuotaEvaluationStatus,
    'AVAILABLE' | 'NOT_CONFIGURED' | 'INVALID_CONFIGURATION'
  >
} {
  if (typeof rawValue !== 'string') {
    return {
      normalizedValue: null,
      rawValue: null,
      status: 'NOT_CONFIGURED',
    }
  }

  const trimmedValue = rawValue.trim()

  if (trimmedValue === '') {
    return {
      normalizedValue: null,
      rawValue: null,
      status: 'NOT_CONFIGURED',
    }
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return {
      normalizedValue: null,
      rawValue: trimmedValue,
      status: 'INVALID_CONFIGURATION',
    }
  }

  return {
    normalizedValue: Number(trimmedValue),
    rawValue: trimmedValue,
    status: 'AVAILABLE',
  }
}

function normalizeQuotaUnits(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error('AI quota units must be non-negative integers.')
  }

  return value
}

function createModuleQuotaEvaluation(
  module: AiInferenceModule,
  environment: AiQuotaEnvironment,
  snapshot: AiQuotaSnapshotInput,
): AiQuotaEvaluation {
  const parsedQuota = parseNonNegativeInteger(
    module === 'IMAGE_ANALYSIS'
      ? environment.AI_IMAGE_ANALYSIS_BASE_QUOTA
      : environment.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
  )
  const usedUnits = normalizeQuotaUnits(snapshot.moduleUsedUnits, 0)
  const requestedUnits = normalizeQuotaUnits(snapshot.moduleRequestedUnits, 1)

  if (parsedQuota.status === 'NOT_CONFIGURED') {
    return aiQuotaEvaluationSchema.parse({
      environmentKey: aiModuleQuotaEnvKeyMap[module],
      key: aiModuleQuotaKeyMap[module],
      limit: null,
      rawValue: parsedQuota.rawValue,
      remaining: null,
      requested: requestedUnits,
      scope: 'MODULE',
      status: 'NOT_CONFIGURED',
      used: usedUnits,
    })
  }

  if (parsedQuota.status === 'INVALID_CONFIGURATION') {
    return aiQuotaEvaluationSchema.parse({
      environmentKey: aiModuleQuotaEnvKeyMap[module],
      key: aiModuleQuotaKeyMap[module],
      limit: null,
      rawValue: parsedQuota.rawValue,
      remaining: null,
      requested: requestedUnits,
      scope: 'MODULE',
      status: 'INVALID_CONFIGURATION',
      used: usedUnits,
    })
  }

  const limit = parsedQuota.normalizedValue ?? 0
  const remainingAfterRequest = Math.max(0, limit - (usedUnits + requestedUnits))
  const status =
    usedUnits + requestedUnits > limit ? 'EXCEEDED' : 'AVAILABLE'

  return aiQuotaEvaluationSchema.parse({
    environmentKey: aiModuleQuotaEnvKeyMap[module],
    key: aiModuleQuotaKeyMap[module],
    limit,
    rawValue: parsedQuota.rawValue,
    remaining: remainingAfterRequest,
    requested: requestedUnits,
    scope: 'MODULE',
    status,
    used: usedUnits,
  })
}

function createUnitQuotaPlaceholder(module: AiInferenceModule) {
  return aiQuotaEvaluationSchema.parse({
    environmentKey: null,
    key: aiUnitQuotaKeyMap[module],
    limit: null,
    rawValue: null,
    remaining: null,
    requested: null,
    scope: 'UNIT',
    status: 'NOT_EVALUATED',
    used: null,
  })
}

function createAllowedPolicyDecision(): AiPolicyDecision {
  return {
    allowed: true,
    failClosed: true,
    reasonCode: 'ENABLED',
    state: 'ENABLED',
  }
}

function createBlockedPolicyDecision(
  reasonCode: Exclude<AiPolicyDecision['reasonCode'], 'ENABLED'>,
): AiPolicyDecision {
  return {
    allowed: false,
    failClosed: true,
    reasonCode,
    state:
      reasonCode === 'NOT_SUPPORTED'
        ? 'NOT_SUPPORTED'
        : reasonCode === 'TEMPORARILY_UNAVAILABLE'
          ? 'UNAVAILABLE'
          : 'DISABLED',
  }
}

function createNotEvaluatedModuleQuota(module: AiInferenceModule) {
  return aiQuotaEvaluationSchema.parse({
    environmentKey: aiModuleQuotaEnvKeyMap[module],
    key: aiModuleQuotaKeyMap[module],
    limit: null,
    rawValue: null,
    remaining: null,
    requested: null,
    scope: 'MODULE',
    status: 'NOT_EVALUATED',
    used: null,
  })
}

export function evaluateAiQuotaPolicy(
  request: AiInferenceRequest,
  environment: AiQuotaEnvironment = getEnv(),
  snapshot: AiQuotaSnapshotInput = {},
): AiPolicyResult {
  const gatingResolution = gateAiInferenceRequest(request, environment)
  const unitQuota = createUnitQuotaPlaceholder(request.module)

  if (!gatingResolution.allowed) {
    const gatingReasonCode = gatingResolution.gating.decision.reasonCode

    if (gatingReasonCode === 'ENABLED') {
      throw new Error(
        'Blocked AI gating resolution cannot carry the ENABLED reason code.',
      )
    }

    return aiPolicyResultSchema.parse({
      decision: createBlockedPolicyDecision(gatingReasonCode),
      gating: gatingResolution.gating,
      moduleQuota: createNotEvaluatedModuleQuota(request.module),
      request,
      unitQuota,
    })
  }

  const moduleQuota = createModuleQuotaEvaluation(
    request.module,
    environment,
    snapshot,
  )

  if (snapshot.temporarilyUnavailable) {
    return aiPolicyResultSchema.parse({
      decision: createBlockedPolicyDecision('TEMPORARILY_UNAVAILABLE'),
      gating: gatingResolution.gating,
      moduleQuota,
      request,
      unitQuota,
    })
  }

  if (moduleQuota.status === 'EXCEEDED') {
    return aiPolicyResultSchema.parse({
      decision: createBlockedPolicyDecision('QUOTA_EXCEEDED'),
      gating: gatingResolution.gating,
      moduleQuota,
      request,
      unitQuota,
    })
  }

  if (
    moduleQuota.status === 'NOT_CONFIGURED' ||
    moduleQuota.status === 'INVALID_CONFIGURATION'
  ) {
    return aiPolicyResultSchema.parse({
      decision: createBlockedPolicyDecision('QUOTA_NOT_CONFIGURED'),
      gating: gatingResolution.gating,
      moduleQuota,
      request,
      unitQuota,
    })
  }

  return aiPolicyResultSchema.parse({
    decision: createAllowedPolicyDecision(),
    gating: gatingResolution.gating,
    moduleQuota,
    request,
    unitQuota,
  })
}

export function applyAiQuotaPolicy(
  request: AiInferenceRequest,
  environment: AiQuotaEnvironment = getEnv(),
  snapshot: AiQuotaSnapshotInput = {},
): AiQuotaPolicyResolution {
  const policy = evaluateAiQuotaPolicy(request, environment, snapshot)

  if (policy.decision.allowed) {
    return {
      allowed: true,
      policy,
    }
  }

  return {
    allowed: false,
    outcome: createAiBlockedOutcomeFromPolicyResult(policy),
    policy,
  }
}
