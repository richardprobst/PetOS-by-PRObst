import {
  aiOperationalEventSchema,
  type AiExecutionRecord,
  type AiExecutionState,
  type AiInferenceOutcome,
  type AiInferenceRequest,
  type AiOperationalEvent,
  type AiOperationalEventCode,
  type AiOperationalEventNextStep,
  type AiOperationalMetadata,
  type AiPolicyResult,
  type AiRapidShutdownScope,
} from './schemas'

type AiEnvelopeStatus = Extract<
  AiExecutionState,
  'ACCEPTED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED'
>

interface CreateAiOperationalEventsInput {
  execution: AiExecutionRecord
  operational: AiOperationalMetadata
  outcome: AiInferenceOutcome | null
  policy: AiPolicyResult | null
  request: AiInferenceRequest
  status: AiEnvelopeStatus
}

export function createAiOperationalEvents(
  input: CreateAiOperationalEventsInput,
): AiOperationalEvent[] {
  const events: AiOperationalEvent[] = []

  appendCostEvents(events, input)
  appendErrorEvents(events, input)
  appendRapidShutdownEvents(events, input)

  return events
}

function appendCostEvents(
  events: AiOperationalEvent[],
  input: CreateAiOperationalEventsInput,
) {
  if (input.policy?.decision.reasonCode === 'QUOTA_EXCEEDED') {
    events.push(
      createOperationalEvent('COST_BLOCKED_BY_QUOTA', input, {
        actionRequired: true,
        eventClass: 'FUNCTIONAL_GUARD',
        eventType: 'COST',
        nextStep: 'REVIEW_COST_GUARD',
        origin: 'COST_GUARD',
        reasonSummary:
          'AI execution was blocked because the configured module quota was exceeded.',
        resolutionStatus: 'OPEN',
        severity: 'ERROR',
      }),
    )

    return
  }

  if (input.policy?.decision.reasonCode === 'QUOTA_NOT_CONFIGURED') {
    events.push(
      createOperationalEvent('COST_GUARD_NOT_CONFIGURED', input, {
        actionRequired: true,
        eventClass: 'FUNCTIONAL_GUARD',
        eventType: 'COST',
        nextStep: 'REVIEW_COST_CONFIGURATION',
        origin: 'COST_GUARD',
        reasonSummary:
          'AI execution was blocked because the quota guard is missing or invalid.',
        resolutionStatus: 'OPEN',
        severity: 'WARNING',
      }),
    )

    return
  }

  if (
    input.status === 'BLOCKED' &&
    input.outcome?.status === 'BLOCKED' &&
    input.outcome.error.code === 'DISABLED'
  ) {
    events.push(
      createOperationalEvent('COST_CONSUMPTION_PREVENTED', input, {
        actionRequired: false,
        eventClass: 'FUNCTIONAL_GUARD',
        eventType: 'COST',
        nextStep: 'NONE',
        origin: 'COST_GUARD',
        reasonSummary:
          'AI consumption was prevented because the execution was stopped by a rapid shutdown guard.',
        resolutionStatus: 'INFORMATIONAL',
        severity: 'INFO',
      }),
    )

    return
  }

  switch (input.operational.cost.status) {
    case 'ESTIMATED':
      events.push(
        createOperationalEvent('COST_ESTIMATE_AVAILABLE', input, {
          actionRequired: false,
          eventClass: 'OPERATIONAL_SIGNAL',
          eventType: 'COST',
          nextStep: 'NONE',
          origin: 'COST_GUARD',
          reasonSummary:
            'AI execution carries an estimated cost classification for operational governance.',
          resolutionStatus: 'INFORMATIONAL',
          severity: 'INFO',
        }),
      )
      return
    case 'UNAVAILABLE':
      events.push(
        createOperationalEvent('COST_UNAVAILABLE', input, {
          actionRequired: true,
          eventClass: 'OPERATIONAL_SIGNAL',
          eventType: 'COST',
          nextStep: 'REVIEW_OPERATIONAL_FAILURE',
          origin: 'COST_GUARD',
          reasonSummary:
            'AI execution cost could not be evaluated because the operational path is unavailable.',
          resolutionStatus: 'OPEN',
          severity: 'WARNING',
        }),
      )
      return
    case 'NOT_CONFIGURED':
      events.push(
        createOperationalEvent('COST_NOT_CONFIGURED', input, {
          actionRequired: true,
          eventClass: 'OPERATIONAL_SIGNAL',
          eventType: 'COST',
          nextStep: 'REVIEW_COST_CONFIGURATION',
          origin: 'COST_GUARD',
          reasonSummary:
            'AI execution remains without cost configuration in the current provider-neutral baseline.',
          resolutionStatus: 'OPEN',
          severity: 'WARNING',
        }),
      )
      return
  }
}

function appendErrorEvents(
  events: AiOperationalEvent[],
  input: CreateAiOperationalEventsInput,
) {
  if (input.outcome?.status === 'FAILED') {
    events.push(
      createOperationalEvent('ERROR_OPERATIONAL_FAILURE', input, {
        actionRequired: true,
        eventClass: 'OPERATIONAL_SIGNAL',
        eventType: 'ERROR',
        nextStep: 'REVIEW_OPERATIONAL_FAILURE',
        origin: 'EXECUTION',
        reasonSummary:
          'AI execution ended in a controlled operational failure inside the provider-neutral lifecycle.',
        resolutionStatus: 'OPEN',
        severity: 'ERROR',
      }),
    )

    if (input.operational.fallback.status === 'ELIGIBLE') {
      events.push(
        createOperationalEvent('ERROR_FALLBACK_ELIGIBLE', input, {
          actionRequired: true,
          eventClass: 'OPERATIONAL_SIGNAL',
          eventType: 'ERROR',
          nextStep: 'REVIEW_FALLBACK_PATH',
          origin: 'FALLBACK',
          reasonSummary:
            'A fallback path is conceptually eligible after the operational failure and requires manual review.',
          resolutionStatus: 'OPEN',
          severity: 'WARNING',
        }),
      )
    } else {
      events.push(
        createOperationalEvent('ERROR_TERMINAL_WITHOUT_FALLBACK', input, {
          actionRequired: true,
          eventClass: 'OPERATIONAL_SIGNAL',
          eventType: 'ERROR',
          nextStep: 'REVIEW_FALLBACK_PATH',
          origin: 'FALLBACK',
          reasonSummary:
            'The failure ended without a usable fallback path in the current baseline.',
          resolutionStatus: 'OPEN',
          severity: 'ERROR',
        }),
      )
    }

    return
  }

  if (input.outcome?.status !== 'BLOCKED') {
    return
  }

  switch (input.outcome.error.code) {
    case 'TEMPORARILY_UNAVAILABLE':
      events.push(
        createOperationalEvent('ERROR_TEMPORARILY_UNAVAILABLE', input, {
          actionRequired: true,
          eventClass: 'OPERATIONAL_SIGNAL',
          eventType: 'ERROR',
          nextStep: 'REVIEW_OPERATIONAL_FAILURE',
          origin: 'POLICY',
          reasonSummary:
            'AI execution was blocked because the operational path was marked temporarily unavailable.',
          resolutionStatus: 'OPEN',
          severity: 'ERROR',
        }),
      )
      return
    case 'NOT_SUPPORTED':
      events.push(
        createOperationalEvent('ERROR_NOT_SUPPORTED', input, {
          actionRequired: true,
          eventClass: 'FUNCTIONAL_GUARD',
          eventType: 'ERROR',
          nextStep: 'REVIEW_PROVIDER_CONFIGURATION',
          origin: 'EXECUTION',
          reasonSummary:
            'AI execution was blocked because the current contract does not support the requested module or path.',
          resolutionStatus: 'OPEN',
          severity: 'WARNING',
        }),
      )
      return
  }

  if (input.policy?.decision.reasonCode === 'MISSING_CONFIGURATION') {
    events.push(
      createOperationalEvent('ERROR_MISSING_CONFIGURATION', input, {
        actionRequired: true,
        eventClass: 'FUNCTIONAL_GUARD',
        eventType: 'ERROR',
        nextStep: 'REVIEW_PROVIDER_CONFIGURATION',
        origin: 'POLICY',
        reasonSummary:
          'AI execution was blocked because the current gating or provider-neutral configuration is missing or invalid.',
        resolutionStatus: 'OPEN',
        severity: 'WARNING',
      }),
    )
  }
}

function appendRapidShutdownEvents(
  events: AiOperationalEvent[],
  input: CreateAiOperationalEventsInput,
) {
  if (
    input.status !== 'BLOCKED' ||
    input.outcome?.status !== 'BLOCKED' ||
    input.outcome.error.code !== 'DISABLED'
  ) {
    return
  }

  const shutdownScope = resolveRapidShutdownScope(input)

  events.push(
    createOperationalEvent('RAPID_SHUTDOWN_ACTIVE', input, {
      actionRequired: true,
      eventClass: 'FUNCTIONAL_GUARD',
      eventType: 'RAPID_SHUTDOWN',
      nextStep: 'REVIEW_RAPID_SHUTDOWN',
      origin: 'RAPID_SHUTDOWN',
      reasonSummary:
        shutdownScope === 'GLOBAL'
          ? 'AI execution was prevented by the global rapid shutdown guard.'
          : 'AI execution was prevented by the module rapid shutdown guard.',
      resolutionStatus: 'OPEN',
      severity: 'CRITICAL',
      shutdownScope,
    }),
  )
}

function resolveRapidShutdownScope(
  input: CreateAiOperationalEventsInput,
): AiRapidShutdownScope {
  const globalEvaluation = input.policy?.gating.evaluations.find(
    (evaluation) =>
      evaluation.source === 'ENVIRONMENT' &&
      evaluation.key === input.request.flagKeys.global &&
      evaluation.status === 'DISABLED',
  )

  if (globalEvaluation) {
    return 'GLOBAL'
  }

  return 'MODULE'
}

function createOperationalEvent(
  eventCode: AiOperationalEventCode,
  input: CreateAiOperationalEventsInput,
  overrides: {
    actionRequired: boolean
    eventClass: AiOperationalEvent['eventClass']
    eventType: AiOperationalEvent['eventType']
    nextStep: AiOperationalEventNextStep
    origin: AiOperationalEvent['origin']
    reasonSummary: string
    resolutionStatus: AiOperationalEvent['resolutionStatus']
    severity: AiOperationalEvent['severity']
    shutdownScope?: AiRapidShutdownScope
  },
): AiOperationalEvent {
  const identity =
    input.execution.executionId ??
    input.request.requestId ??
    `${input.request.module}:${input.request.inferenceKey}`

  return aiOperationalEventSchema.parse({
    metadataVersion: 'PHASE3_B1_T15',
    eventId: `ai_event:${eventCode}:${identity}`,
    eventType: overrides.eventType,
    eventClass: overrides.eventClass,
    eventCode,
    severity: overrides.severity,
    origin: overrides.origin,
    module: input.request.module,
    inferenceKey: input.request.inferenceKey,
    requestId: input.request.requestId ?? null,
    executionId: input.execution.executionId,
    unitId: input.request.unitId ?? null,
    executionStatus: input.status,
    operationalStatus: input.operational.operationalStatus,
    policyReasonCode: input.policy?.decision.reasonCode ?? null,
    errorCode:
      input.outcome?.status === 'COMPLETED' || input.outcome === null
        ? null
        : input.outcome.error.code,
    costStatus: input.operational.cost.status,
    fallbackStatus: input.operational.fallbackStatus,
    shutdownScope: overrides.shutdownScope ?? null,
    reasonSummary: overrides.reasonSummary,
    resolutionStatus: overrides.resolutionStatus,
    actionRequired: overrides.actionRequired,
    nextStep: overrides.nextStep,
  })
}
