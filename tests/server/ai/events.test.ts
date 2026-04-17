import assert from 'node:assert/strict'
import test from 'node:test'
import type { AiConsentEvaluationInput } from '../../../features/ai/consent'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { startAiInferenceExecution } from '../../../features/ai/execution'
import { executeAiProviderAdapter } from '../../../server/integrations/ai/adapter'
import type { AiProviderAdapter } from '../../../server/integrations/ai/contract'
import { writeAiExecutionAuditLogs } from '../../../server/audit/ai'

function createImageRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'vision.precheck.assistive',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-08T19:00:00.000Z'),
    requestedByUserId: 'user_events',
    requestId: 'req_events',
    subject: {
      entityId: 'pet_events',
      entityName: 'Pet',
    },
    unitId: 'unit_events',
    ...overrides,
  })
}

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const

const imageConsent: AiConsentEvaluationInput = {
  grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
  origin: 'TUTOR_FLOW_OPT_IN',
}

function createAuditWriter() {
  type AuditEventDetails = {
    events?: Array<{
      eventCode?: string
    }>
  }

  const entries: Array<{ action: string; details: AuditEventDetails }> = []

  return {
    entries,
    writer: {
      auditLog: {
        async create(args: {
          data: {
            action: string
            details?: unknown
            entityId?: string | null
            entityName: string
            unitId?: string | null
            userId?: string | null
          }
        }) {
          entries.push({
            action: args.data.action,
            details: (args.data.details ?? {}) as AuditEventDetails,
          })

          return args.data
        },
      },
    },
  }
}

test('accepted AI execution exposes the minimum cost event when estimated cost metadata is available', () => {
  const envelope = startAiInferenceExecution(createImageRequest(), {
    consent: imageConsent,
    environment: enabledEnvironment,
    operationalMetadata: {
      cost: {
        costClass: 'LOW',
        estimateLabel: 'estimated-low-per-request',
        metadataOrigin: 'ESTIMATED',
        status: 'ESTIMATED',
      },
      provider: {
        providerId: 'declared-provider',
        providerStatus: 'DECLARED',
      },
    },
  })

  assert.equal(envelope.status, 'ACCEPTED')
  assert.ok(
    envelope.events.some(
      (event) =>
        event.eventType === 'COST' &&
        event.eventCode === 'COST_ESTIMATE_AVAILABLE' &&
        event.severity === 'INFO',
    ),
  )
})

test('failed AI execution exposes distinct error and fallback events without provider real', async () => {
  const adapter: AiProviderAdapter = {
    adapterId: 'failing-events-adapter',
    contractVersion: 'phase3-b1-t15',
    providerId: 'declared-provider',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      throw new Error('Simulated provider timeout')
    },
  }

  const result = await executeAiProviderAdapter(createImageRequest(), adapter, {
    consent: imageConsent,
    environment: enabledEnvironment,
    operationalMetadata: {
      fallback: {
        provider: {
          providerId: 'declared-fallback-provider',
          providerStatus: 'DECLARED',
        },
        strategy: 'DECLARED_PROVIDER_SWITCH',
      },
    },
  })

  assert.equal(result.envelope.status, 'FAILED')
  assert.ok(
    result.envelope.events.some(
      (event) =>
        event.eventType === 'ERROR' &&
        event.eventCode === 'ERROR_OPERATIONAL_FAILURE' &&
        event.nextStep === 'REVIEW_OPERATIONAL_FAILURE',
    ),
  )
  assert.ok(
    result.envelope.events.some(
      (event) =>
        event.eventType === 'ERROR' &&
        event.eventCode === 'ERROR_FALLBACK_ELIGIBLE' &&
        event.nextStep === 'REVIEW_FALLBACK_PATH',
    ),
  )
})

test('quota blocking emits a dedicated cost governance event', () => {
  const envelope = startAiInferenceExecution(createImageRequest(), {
    consent: imageConsent,
    environment: enabledEnvironment,
    quotaSnapshot: {
      moduleRequestedUnits: 1,
      moduleUsedUnits: 10,
    },
  })

  assert.equal(envelope.status, 'BLOCKED')
  assert.ok(
    envelope.events.some(
      (event) =>
        event.eventType === 'COST' &&
        event.eventCode === 'COST_BLOCKED_BY_QUOTA' &&
        event.eventClass === 'FUNCTIONAL_GUARD',
    ),
  )
})

test('rapid shutdown emits shutdown and prevented-consumption events when execution is blocked by policy', async () => {
  const request = createImageRequest()
  const envelope = startAiInferenceExecution(request, {
    environment: {
      ...enabledEnvironment,
      AI_ENABLED: 'false',
    },
  })
  const audit = createAuditWriter()

  assert.equal(envelope.status, 'BLOCKED')
  assert.ok(
    envelope.events.some(
      (event) =>
        event.eventType === 'RAPID_SHUTDOWN' &&
        event.eventCode === 'RAPID_SHUTDOWN_ACTIVE' &&
        event.shutdownScope === 'GLOBAL',
    ),
  )
  assert.ok(
    envelope.events.some(
      (event) =>
        event.eventType === 'COST' &&
        event.eventCode === 'COST_CONSUMPTION_PREVENTED',
    ),
  )

  await writeAiExecutionAuditLogs(audit.writer, {
    envelope,
  })

  assert.ok(
    audit.entries.some((entry) =>
      entry.details.events?.some(
        (event: { eventCode?: string }) =>
          event.eventCode === 'RAPID_SHUTDOWN_ACTIVE',
      ),
    ),
  )
})
