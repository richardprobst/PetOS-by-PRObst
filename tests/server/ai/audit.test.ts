import assert from 'node:assert/strict'
import test from 'node:test'
import type { AiConsentEvaluationInput } from '../../../features/ai/consent'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { createAiInferenceRequest } from '../../../features/ai/domain'
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
    requestedAt: new Date('2026-04-08T16:00:00.000Z'),
    requestedByUserId: 'user_ai_audit',
    requestId: 'req_ai_audit',
    subject: {
      entityId: 'pet_ai_audit',
      entityName: 'Pet',
    },
    unitId: 'unit_local',
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

const localActor: AuthenticatedUserData = {
  id: 'user_local_ai_audit',
  name: 'Operador Local',
  email: 'local.ai.audit@petos.app',
  userType: 'ADMIN',
  unitId: 'unit_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  active: true,
  profiles: ['Administrador'],
  permissions: ['cliente.visualizar'],
}

const globalActor: AuthenticatedUserData = {
  ...localActor,
  id: 'user_global_ai_audit',
  email: 'global.ai.audit@petos.app',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  permissions: ['cliente.visualizar', 'multiunidade.global.visualizar'],
}

function createAuditWriter() {
  const entries: Array<{
    action: string
    details: unknown
    entityId: string | null | undefined
    entityName: string
    unitId: string | null | undefined
    userId: string | null | undefined
  }> = []

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
            details: args.data.details ?? {},
            entityId: args.data.entityId,
            entityName: args.data.entityName,
            unitId: args.data.unitId,
            userId: args.data.userId,
          })

          return args.data
        },
      },
    },
  }
}

test('writeAiExecutionAuditLogs emits a completed audit entry for an allowed execution path', async () => {
  const request = createImageRequest()
  const adapter: AiProviderAdapter = {
    adapterId: 'completed-ai-audit-adapter',
    contractVersion: 'phase3-b1-t13',
    modelId: 'assistive-vision-v1',
    providerId: 'declared-provider',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      return {
        status: 'COMPLETED',
        interpretedResult: {
          humanReviewRequired: true,
          recommendations: ['Review result before any action.'],
          signals: [],
          summary: 'Assistive AI summary ready for review.',
        },
        technicalMetadata: {
          handledAt: new Date('2026-04-08T16:00:05.000Z'),
          latencyMs: 180,
          modelId: null,
          providerId: null,
          providerRequestId: 'provider_req_completed',
        },
      }
    },
  }
  const result = await executeAiProviderAdapter(request, adapter, {
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
        contractVersion: 'phase3-b1-t13',
        providerId: 'declared-provider',
        providerStatus: 'DECLARED',
      },
    },
  })
  const audit = createAuditWriter()

  await writeAiExecutionAuditLogs(audit.writer, {
    actor: localActor,
    envelope: result.envelope,
  })

  assert.equal(audit.entries.length, 1)
  assert.equal(audit.entries[0]?.action, 'ai.execution.completed')
  assert.equal(audit.entries[0]?.entityName, 'AiExecution')
  assert.equal(audit.entries[0]?.unitId, 'unit_local')
  assert.equal(audit.entries[0]?.userId, 'user_local_ai_audit')
  const completedDetails = audit.entries[0]?.details as {
    consent?: { decisionStatus?: string }
    multiUnitContext?: { contextType?: string }
    observability?: { executionStatus?: string }
    operational?: { cost?: { status?: string } }
    retention?: { policyVersion?: string }
  }
  assert.equal(
    completedDetails.operational?.cost?.status,
    'ESTIMATED',
  )
  assert.equal(
    completedDetails.observability?.executionStatus,
    'COMPLETED',
  )
  assert.equal(
    completedDetails.multiUnitContext?.contextType,
    'LOCAL',
  )
  assert.equal(
    completedDetails.consent?.decisionStatus,
    'ALLOWED',
  )
  assert.equal(
    completedDetails.retention?.policyVersion,
    'PHASE3_B2_BASELINE',
  )
})

test('writeAiExecutionAuditLogs emits blocked and fallback audit entries for a blocked policy path', async () => {
  const request = createImageRequest()
  const adapter: AiProviderAdapter = {
    adapterId: 'blocked-ai-audit-adapter',
    contractVersion: 'phase3-b1-t13',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      throw new Error('This adapter should not run when AI is disabled.')
    },
  }
  const result = await executeAiProviderAdapter(request, adapter, {
    environment: {
      ...enabledEnvironment,
      AI_ENABLED: 'false',
    },
  })
  const audit = createAuditWriter()

  await writeAiExecutionAuditLogs(audit.writer, {
    actor: localActor,
    envelope: result.envelope,
  })

  assert.equal(result.envelope.status, 'BLOCKED')
  assert.equal(audit.entries.length, 2)
  assert.equal(audit.entries[0]?.action, 'ai.execution.blocked')
  assert.equal(audit.entries[1]?.action, 'ai.fallback.evaluated')
  const blockedDetails = audit.entries[0]?.details as {
    consent?: { decisionStatus?: string }
    outcome?: { error?: { code?: string } }
  }
  const fallbackDetails = audit.entries[1]?.details as {
    operational?: {
      fallback?: {
        reasonCode?: string
        status?: string
      }
    }
  }
  assert.equal(
    blockedDetails.outcome?.error?.code,
    'DISABLED',
  )
  assert.equal(
    blockedDetails.consent?.decisionStatus,
    'NOT_EVALUATED',
  )
  assert.equal(
    fallbackDetails.operational?.fallback?.status,
    'NOT_ELIGIBLE',
  )
  assert.equal(
    fallbackDetails.operational?.fallback?.reasonCode,
    'BLOCKED_BY_POLICY',
  )
})

test('writeAiExecutionAuditLogs emits fallback and human decision entries for a failed execution with declared fallback', async () => {
  const request = createImageRequest({
    requestId: 'req_ai_audit_global',
    unitId: 'unit_branch',
  })
  const adapter: AiProviderAdapter = {
    adapterId: 'failing-ai-audit-adapter',
    contractVersion: 'phase3-b1-t13',
    providerId: 'declared-primary-provider',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute() {
      throw new Error('Simulated provider timeout')
    },
  }
  const result = await executeAiProviderAdapter(request, adapter, {
    consent: imageConsent,
    environment: enabledEnvironment,
    operationalMetadata: {
      fallback: {
        provider: {
          contractVersion: 'phase3-b1-t13-fallback',
          providerId: 'declared-fallback-provider',
          providerStatus: 'DECLARED',
        },
        strategy: 'DECLARED_PROVIDER_SWITCH',
      },
    },
  })
  const audit = createAuditWriter()

  await writeAiExecutionAuditLogs(audit.writer, {
    actor: globalActor,
    envelope: result.envelope,
    humanDecision: {
      decidedAt: new Date('2026-04-08T16:10:00.000Z'),
      decidedByUserId: globalActor.id,
      decisionReasonCode: 'HUMAN_REVIEW_REQUIRED',
      decisionType: 'CONFIRM_ASSISTIVE_REVIEW',
      justificationSummary:
        'Fallback real permanece indisponivel; seguir com revisao manual.',
    },
  })

  assert.equal(result.envelope.status, 'FAILED')
  assert.equal(audit.entries.length, 3)
  assert.equal(audit.entries[0]?.action, 'ai.execution.failed')
  assert.equal(audit.entries[1]?.action, 'ai.fallback.evaluated')
  assert.equal(audit.entries[2]?.action, 'ai.decision.recorded')
  const failedExecutionDetails = audit.entries[0]?.details as {
    consent?: { reasonCode?: string }
  }
  const fallbackEvaluationDetails = audit.entries[1]?.details as {
    operational?: {
      fallback?: {
        nextStep?: string
        status?: string
      }
    }
  }
  const humanDecisionDetails = audit.entries[2]?.details as {
    humanDecision?: { decisionType?: string }
    multiUnitContext?: { contextType?: string }
  }
  assert.equal(
    fallbackEvaluationDetails.operational?.fallback?.status,
    'ELIGIBLE',
  )
  assert.equal(
    fallbackEvaluationDetails.operational?.fallback?.nextStep,
    'REVIEW_FUTURE_FALLBACK',
  )
  assert.equal(
    humanDecisionDetails.multiUnitContext?.contextType,
    'GLOBAL_AUTHORIZED',
  )
  assert.equal(
    humanDecisionDetails.humanDecision?.decisionType,
    'CONFIRM_ASSISTIVE_REVIEW',
  )
  assert.equal(
    failedExecutionDetails.consent?.reasonCode,
    'CONSENT_GRANTED',
  )
})
