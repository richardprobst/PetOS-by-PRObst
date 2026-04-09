import { z } from 'zod'
import {
  multiUnitSessionContextSchema,
  type MultiUnitSessionContext,
} from '@/features/multiunit/schemas'
import {
  aiConsentEvaluationSchema,
  aiExecutionEnvelopeSchema,
  aiExecutionObservabilitySnapshotSchema,
  aiExecutionRecordSchema,
  aiInferenceFlagKeysSchema,
  aiInferenceOriginSchema,
  aiInferenceOutcomeSchema,
  aiInferenceSubjectSchema,
  aiInferenceModuleSchema,
  aiOperationalMetadataSchema,
  aiOperationalEventSchema,
  aiRetentionPolicySnapshotSchema,
  type AiExecutionEnvelope,
} from './schemas'

export interface AiHumanDecisionAuditInput {
  decidedAt?: Date
  decidedByUserId?: string | null
  decisionReasonCode?: string | null
  decisionType: string
  justificationSummary: string
}

export interface AiExecutionAuditContextInput {
  actorUserId?: string | null
  humanDecision?: AiHumanDecisionAuditInput
  multiUnitContext?: MultiUnitSessionContext | null
}

const AI_AUDIT_VERSION = 'PHASE3_B1_T15'

export const aiAuditEventTypeSchema = z.enum([
  'EXECUTION',
  'FALLBACK',
  'HUMAN_DECISION',
])

export type AiAuditEventType = z.infer<typeof aiAuditEventTypeSchema>

export const aiHumanDecisionAuditSchema = z.object({
  decisionReasonCode: z.string().trim().min(1).nullable().default(null),
  decisionType: z.string().trim().min(1),
  decidedAt: z.coerce.date(),
  decidedByUserId: z.string().trim().min(1).nullable().default(null),
  justificationSummary: z.string().trim().min(1),
})

export type AiHumanDecisionAudit = z.infer<typeof aiHumanDecisionAuditSchema>

const aiAuditRequestSnapshotSchema = z.object({
  flagKeys: aiInferenceFlagKeysSchema,
  inferenceKey: z.string().trim().min(1),
  inputSummaryPresent: z.boolean(),
  module: aiInferenceModuleSchema,
  origin: aiInferenceOriginSchema,
  referencesCount: z.number().int().nonnegative(),
  requestId: z.string().trim().min(1).nullable().default(null),
  requestedAt: z.coerce.date(),
  requestedByUserId: z.string().trim().min(1).nullable().default(null),
  subject: aiInferenceSubjectSchema,
  unitId: z.string().trim().min(1).nullable().default(null),
})

const aiAuditEntryDetailsSchema = z.object({
  auditVersion: z.literal(AI_AUDIT_VERSION),
  consent: aiConsentEvaluationSchema,
  eventType: aiAuditEventTypeSchema,
  execution: aiExecutionRecordSchema,
  events: z.array(aiOperationalEventSchema).default([]),
  humanDecision: aiHumanDecisionAuditSchema.nullable().default(null),
  multiUnitContext: multiUnitSessionContextSchema.nullable().default(null),
  observability: aiExecutionObservabilitySnapshotSchema,
  operational: aiOperationalMetadataSchema,
  outcome: aiInferenceOutcomeSchema.nullable().default(null),
  request: aiAuditRequestSnapshotSchema,
  retention: aiRetentionPolicySnapshotSchema,
})

export type AiAuditEntryDetails = z.infer<typeof aiAuditEntryDetailsSchema>

export const aiAuditEntrySchema = z.object({
  action: z.string().trim().min(1),
  details: aiAuditEntryDetailsSchema,
  entityId: z.string().trim().min(1),
  entityName: z.literal('AiExecution'),
  unitId: z.string().trim().min(1).nullable().default(null),
  userId: z.string().trim().min(1).nullable().default(null),
})

export type AiAuditEntry = z.infer<typeof aiAuditEntrySchema>

export function createAiAuditEntries(
  envelope: AiExecutionEnvelope,
  context: AiExecutionAuditContextInput = {},
): AiAuditEntry[] {
  const normalizedEnvelope = aiExecutionEnvelopeSchema.parse(envelope)
  const normalizedHumanDecision = context.humanDecision
    ? aiHumanDecisionAuditSchema.parse({
        ...context.humanDecision,
        decidedAt: context.humanDecision.decidedAt ?? new Date(),
      })
    : null
  const multiUnitContext = context.multiUnitContext
    ? multiUnitSessionContextSchema.parse(context.multiUnitContext)
    : null
  const baseDetails = buildAiAuditEntryDetails(
    normalizedEnvelope,
    null,
    multiUnitContext,
  )
  const entries = [
    aiAuditEntrySchema.parse({
      action: resolveAiExecutionAuditAction(normalizedEnvelope.status),
      details: {
        ...baseDetails,
        eventType: 'EXECUTION',
      },
      entityId: resolveAiAuditEntityId(normalizedEnvelope),
      entityName: 'AiExecution',
      unitId: normalizedEnvelope.request.unitId ?? null,
      userId:
        context.actorUserId ??
        normalizedEnvelope.request.requestedByUserId ??
        null,
    }),
  ]

  if (shouldEmitFallbackAudit(normalizedEnvelope)) {
    entries.push(
      aiAuditEntrySchema.parse({
        action: 'ai.fallback.evaluated',
        details: {
          ...baseDetails,
          eventType: 'FALLBACK',
        },
        entityId: resolveAiAuditEntityId(normalizedEnvelope),
        entityName: 'AiExecution',
        unitId: normalizedEnvelope.request.unitId ?? null,
        userId:
          context.actorUserId ??
          normalizedEnvelope.request.requestedByUserId ??
          null,
      }),
    )
  }

  if (normalizedHumanDecision) {
    entries.push(
      aiAuditEntrySchema.parse({
        action: 'ai.decision.recorded',
        details: buildAiAuditEntryDetails(
          normalizedEnvelope,
          normalizedHumanDecision,
          multiUnitContext,
          'HUMAN_DECISION',
        ),
        entityId: resolveAiAuditEntityId(normalizedEnvelope),
        entityName: 'AiExecution',
        unitId: normalizedEnvelope.request.unitId ?? null,
        userId: normalizedHumanDecision.decidedByUserId ?? context.actorUserId ?? null,
      }),
    )
  }

  return entries
}

function buildAiAuditEntryDetails(
  envelope: AiExecutionEnvelope,
  humanDecision: AiHumanDecisionAudit | null,
  multiUnitContext: MultiUnitSessionContext | null,
  eventType: AiAuditEventType = 'EXECUTION',
): AiAuditEntryDetails {
  return aiAuditEntryDetailsSchema.parse({
    auditVersion: AI_AUDIT_VERSION,
    consent: envelope.consent,
    eventType,
    execution: envelope.execution,
    events: envelope.events,
    humanDecision,
    multiUnitContext,
    observability: envelope.observability,
    operational: envelope.operational,
    outcome: envelope.outcome,
    request: {
      flagKeys: envelope.request.flagKeys,
      inferenceKey: envelope.request.inferenceKey,
      inputSummaryPresent: envelope.request.inputSummary !== null,
      module: envelope.request.module,
      origin: envelope.request.origin,
      referencesCount: envelope.request.references.length,
      requestId: envelope.request.requestId ?? null,
      requestedAt: envelope.request.requestedAt,
      requestedByUserId: envelope.request.requestedByUserId ?? null,
      subject: envelope.request.subject,
      unitId: envelope.request.unitId ?? null,
    },
    retention: envelope.retention,
  })
}

function resolveAiExecutionAuditAction(status: AiExecutionEnvelope['status']) {
  switch (status) {
    case 'ACCEPTED':
      return 'ai.execution.accepted'
    case 'QUEUED':
      return 'ai.execution.queued'
    case 'RUNNING':
      return 'ai.execution.running'
    case 'COMPLETED':
      return 'ai.execution.completed'
    case 'BLOCKED':
      return 'ai.execution.blocked'
    case 'FAILED':
      return 'ai.execution.failed'
  }
}

function resolveAiAuditEntityId(envelope: AiExecutionEnvelope) {
  return (
    envelope.execution.executionId ??
    envelope.request.requestId ??
    `${envelope.request.module}:${envelope.request.inferenceKey}`
  )
}

function shouldEmitFallbackAudit(envelope: AiExecutionEnvelope) {
  return (
    envelope.operational.fallback.status !== 'NOT_EVALUATED' &&
    envelope.operational.fallback.status !== 'DECLARED'
  )
}
