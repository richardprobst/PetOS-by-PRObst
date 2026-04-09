import type { Environment } from '@/server/env'
import { getEnv } from '@/server/env'
import {
  createAiBlockedOutcomeFromGatingResult,
  createAiBlockedGateDecision,
  createAiFlagKeys,
  createAiAllowedGateDecision,
} from './domain'
import { isAiInferenceKeySupportedByModule } from './provider-routing'
import {
  AI_GLOBAL_ENV_KEY,
  AI_GLOBAL_FLAG_KEY,
  AI_UNIT_FLAG_KEY,
  aiGateEvaluationSchema,
  aiGatingResultSchema,
  aiModuleEnvFlagKeyMap,
  type AiBlockedOutcome,
  type AiGateDecision,
  type AiGateEvaluation,
  type AiGateEvaluationStatus,
  type AiGatingResult,
  type AiInferenceRequest,
} from './schemas'

type AiGateEnvironment = Pick<
  Environment,
  | 'AI_ENABLED'
  | 'AI_IMAGE_ANALYSIS_ENABLED'
  | 'AI_PREDICTIVE_INSIGHTS_ENABLED'
  | 'AI_VIRTUAL_ASSISTANT_ENABLED'
>

type AiGateResolution =
  | {
      allowed: true
      gating: AiGatingResult
    }
  | {
      allowed: false
      gating: AiGatingResult
      outcome: AiBlockedOutcome
    }

function parseAiEnvironmentFlagValue(
  rawValue: string | undefined,
): {
  normalizedValue: boolean | null
  rawValue: string | null
  status: AiGateEvaluationStatus
} {
  if (typeof rawValue !== 'string') {
    return {
      normalizedValue: null,
      rawValue: null,
      status: 'MISSING',
    }
  }

  const trimmedValue = rawValue.trim()

  if (trimmedValue === '') {
    return {
      normalizedValue: null,
      rawValue: null,
      status: 'MISSING',
    }
  }

  if (trimmedValue === 'true') {
    return {
      normalizedValue: true,
      rawValue: trimmedValue,
      status: 'ENABLED',
    }
  }

  if (trimmedValue === 'false') {
    return {
      normalizedValue: false,
      rawValue: trimmedValue,
      status: 'DISABLED',
    }
  }

  return {
    normalizedValue: null,
    rawValue: trimmedValue,
    status: 'INVALID',
  }
}

function createAiEnvironmentEvaluation(input: {
  environmentKey: string
  key: string
  rawValue: string | undefined
}): AiGateEvaluation {
  const parsedFlag = parseAiEnvironmentFlagValue(input.rawValue)

  return aiGateEvaluationSchema.parse({
    environmentKey: input.environmentKey,
    key: input.key,
    normalizedValue: parsedFlag.normalizedValue,
    rawValue: parsedFlag.rawValue,
    source: 'ENVIRONMENT',
    status: parsedFlag.status,
  })
}

function createAiUnitPlaceholderEvaluation(request: AiInferenceRequest) {
  return aiGateEvaluationSchema.parse({
    environmentKey: null,
    key: request.flagKeys.unit ?? AI_UNIT_FLAG_KEY,
    normalizedValue: null,
    rawValue: request.unitId,
    source: 'UNIT_SCOPE',
    status: 'NOT_EVALUATED',
  })
}

function resolveModuleFlagEnvironmentValue(
  request: AiInferenceRequest,
  environment: AiGateEnvironment,
) {
  switch (request.module) {
    case 'IMAGE_ANALYSIS':
      return environment.AI_IMAGE_ANALYSIS_ENABLED
    case 'PREDICTIVE_INSIGHTS':
      return environment.AI_PREDICTIVE_INSIGHTS_ENABLED
    case 'VIRTUAL_ASSISTANT':
      return environment.AI_VIRTUAL_ASSISTANT_ENABLED
  }
}

function resolveAiModuleSupportReason(
  request: AiInferenceRequest,
): AiGateDecision | null {
  const expectedFlagKeys = createAiFlagKeys(request.module)

  if (
    request.flagKeys.global !== AI_GLOBAL_FLAG_KEY ||
    request.flagKeys.module !== expectedFlagKeys.module
  ) {
    return createAiBlockedGateDecision(request, 'NOT_SUPPORTED')
  }

  const isInferenceKeySupported = isAiInferenceKeySupportedByModule(
    request.module,
    request.inferenceKey,
  )

  if (!isInferenceKeySupported) {
    return createAiBlockedGateDecision(request, 'NOT_SUPPORTED')
  }

  return null
}

function resolveAiDecisionFromEvaluations(
  request: AiInferenceRequest,
  evaluations: AiGateEvaluation[],
): AiGateDecision {
  const firstBlockingEvaluation = evaluations.find(
    (evaluation) =>
      evaluation.source === 'ENVIRONMENT' &&
      evaluation.status !== 'ENABLED',
  )

  if (!firstBlockingEvaluation) {
    return createAiAllowedGateDecision(request)
  }

  if (firstBlockingEvaluation.status === 'DISABLED') {
    return createAiBlockedGateDecision(request, 'DISABLED_BY_POLICY')
  }

  return createAiBlockedGateDecision(request, 'MISSING_CONFIGURATION')
}

export function evaluateAiGating(
  request: AiInferenceRequest,
  environment: AiGateEnvironment = getEnv(),
): AiGatingResult {
  const supportDecision = resolveAiModuleSupportReason(request)
  const evaluations: AiGateEvaluation[] = []

  if (!supportDecision) {
    evaluations.push(
      createAiEnvironmentEvaluation({
        environmentKey: AI_GLOBAL_ENV_KEY,
        key: request.flagKeys.global,
        rawValue: environment.AI_ENABLED,
      }),
      createAiEnvironmentEvaluation({
        environmentKey: aiModuleEnvFlagKeyMap[request.module],
        key: request.flagKeys.module,
        rawValue: resolveModuleFlagEnvironmentValue(request, environment),
      }),
    )
  }

  evaluations.push(createAiUnitPlaceholderEvaluation(request))

  return aiGatingResultSchema.parse({
    decision:
      supportDecision ?? resolveAiDecisionFromEvaluations(request, evaluations),
    evaluations,
    request,
  })
}

export function gateAiInferenceRequest(
  request: AiInferenceRequest,
  environment: AiGateEnvironment = getEnv(),
): AiGateResolution {
  const gating = evaluateAiGating(request, environment)

  if (gating.decision.allowed) {
    return {
      allowed: true,
      gating,
    }
  }

  return {
    allowed: false,
    gating,
    outcome: createAiBlockedOutcomeFromGatingResult(gating),
  }
}
