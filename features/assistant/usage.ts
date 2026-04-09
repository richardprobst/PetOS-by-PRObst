import type { AuditLog } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { assertPermission } from '@/server/authorization/access-control'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { canReadAiFoundationDiagnostics, getAiFoundationDiagnosticPermissions } from '@/features/ai/admin-diagnostics'
import { resolveMultiUnitSessionContext } from '@/features/multiunit/context'
import {
  tutorAssistantChannelSchema,
  tutorAssistantInteractionSummarySchema,
  tutorAssistantIntentSchema,
  tutorAssistantResponseStatusSchema,
  tutorAssistantUsageSnapshotSchema,
  type TutorAssistantIntent,
  type TutorAssistantInteractionSummary,
  type TutorAssistantUsageSnapshot,
} from './schemas'

const ASSISTANT_EXECUTION_ACTIONS = [
  'ai.execution.completed',
  'ai.execution.blocked',
  'ai.execution.failed',
] as const

type AssistantAuditRecord = Pick<
  AuditLog,
  'action' | 'details' | 'id' | 'occurredAt' | 'unitId' | 'userId'
>

export interface TutorAssistantAdminDiagnostics {
  generatedAt: Date
  recentInteractions: TutorAssistantInteractionSummary[]
  scope: {
    activeUnitId: string | null
    contextType: string | null
    diagnosticUnitId: string | null
    globalReadAccess: boolean
    status: string
  }
  summary: TutorAssistantUsageSnapshot['summary'] & {
    answeredLast30Days: number
  }
  topIntents: Array<{
    count: number
    intent: TutorAssistantIntent
  }>
}

interface BuildUsageSnapshotOptions {
  now?: Date
  recentLimit?: number
}

function subtractDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() - days)
  return next
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function readString(value: unknown, key: string) {
  const record = asRecord(value)
  const fieldValue = record?.[key]

  return typeof fieldValue === 'string' && fieldValue.trim() !== ''
    ? fieldValue
    : null
}

function readSignals(value: unknown) {
  const interpretedResult = asRecord(value)
  const rawSignals = interpretedResult?.signals

  if (!Array.isArray(rawSignals)) {
    return new Map<string, string>()
  }

  return rawSignals.reduce((accumulator, rawSignal) => {
    const signal = asRecord(rawSignal)
    const key = readString(signal, 'key')
    const rawValue = signal?.value
    const value = typeof rawValue === 'string' && rawValue.trim() !== '' ? rawValue : null

    if (key && value) {
      accumulator.set(key, value)
    }

    return accumulator
  }, new Map<string, string>())
}

function normalizeText(value: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function deriveIntentFromInferenceKey(inferenceKey: string | null) {
  if (!inferenceKey) {
    return 'UNKNOWN'
  }

  if (inferenceKey.startsWith('voice.tutor.schedule.')) {
    return 'SCHEDULE_APPOINTMENT'
  }

  if (inferenceKey.startsWith('voice.tutor.query.upcoming.')) {
    return 'QUERY_UPCOMING_APPOINTMENTS'
  }

  if (inferenceKey.startsWith('voice.tutor.query.finance.')) {
    return 'QUERY_FINANCE_SUMMARY'
  }

  if (inferenceKey.startsWith('voice.tutor.query.waitlist.')) {
    return 'QUERY_WAITLIST_STATUS'
  }

  if (inferenceKey.startsWith('voice.tutor.query.documents.')) {
    return 'QUERY_PENDING_DOCUMENTS'
  }

  if (inferenceKey.startsWith('voice.tutor.query.report-cards.')) {
    return 'QUERY_REPORT_CARDS'
  }

  if (inferenceKey.startsWith('voice.tutor.help.')) {
    return 'HELP'
  }

  return 'UNKNOWN'
}

function deriveResponseStatus(input: {
  action: string
  inferenceKey: string | null
  intent: TutorAssistantIntent
  replyPreview: string | null
  signals: Map<string, string>
}) {
  if (input.action !== 'ai.execution.completed') {
    return 'BLOCKED'
  }

  const signaledStatus = tutorAssistantResponseStatusSchema.safeParse(
    input.signals.get('assistant_response_status'),
  )

  if (signaledStatus.success) {
    return signaledStatus.data
  }

  const normalizedReply = normalizeText(input.replyPreview)

  if (input.inferenceKey?.includes('.confirm.')) {
    return 'ANSWERED'
  }

  if (
    input.intent === 'UNKNOWN' ||
    normalizedReply.includes('ainda nao consegui interpretar') ||
    normalizedReply.includes('ainda faltam')
  ) {
    return 'NEEDS_CLARIFICATION'
  }

  if (
    input.intent === 'SCHEDULE_APPOINTMENT' &&
    normalizedReply.includes('montei um rascunho')
  ) {
    return 'NEEDS_CONFIRMATION'
  }

  return 'ANSWERED'
}

function parseAssistantInteraction(
  auditLog: AssistantAuditRecord,
): TutorAssistantInteractionSummary | null {
  const details = asRecord(auditLog.details)
  const request = asRecord(details?.request)

  if (readString(request, 'module') !== 'VIRTUAL_ASSISTANT') {
    return null
  }

  const outcome = asRecord(details?.outcome)
  const interpretedResult = asRecord(outcome?.interpretedResult)
  const signals = readSignals(interpretedResult)
  const inferredIntent = tutorAssistantIntentSchema.safeParse(
    signals.get('assistant_intent'),
  )
  const inferredChannel = tutorAssistantChannelSchema.safeParse(
    signals.get('assistant_channel'),
  )
  const inferenceKey = readString(request, 'inferenceKey')
  const replyPreview = readString(interpretedResult, 'summary')
  const intent = inferredIntent.success
    ? inferredIntent.data
    : deriveIntentFromInferenceKey(inferenceKey)

  return tutorAssistantInteractionSummarySchema.parse({
    channel: inferredChannel.success ? inferredChannel.data : null,
    inferenceKey: inferenceKey ?? 'voice.tutor.unknown.interpret.v1',
    intent,
    occurredAt: auditLog.occurredAt,
    replyPreview,
    status: deriveResponseStatus({
      action: auditLog.action,
      inferenceKey,
      intent,
      replyPreview,
      signals,
    }),
  })
}

function createUsageSummary(
  interactions: TutorAssistantInteractionSummary[],
  now: Date,
) {
  const last7DaysStart = subtractDays(now, 7)
  const last30DaysStart = subtractDays(now, 30)
  const recent7Days = interactions.filter(
    (interaction) => interaction.occurredAt >= last7DaysStart,
  )
  const recent30Days = interactions.filter(
    (interaction) => interaction.occurredAt >= last30DaysStart,
  )

  return {
    blockedLast30Days: recent30Days.filter(
      (interaction) => interaction.status === 'BLOCKED',
    ).length,
    confirmationsLast30Days: recent30Days.filter(
      (interaction) => interaction.status === 'NEEDS_CONFIRMATION',
    ).length,
    lastInteractionAt: interactions[0]?.occurredAt ?? null,
    needsClarificationLast30Days: recent30Days.filter(
      (interaction) => interaction.status === 'NEEDS_CLARIFICATION',
    ).length,
    textInteractionsLast30Days: recent30Days.filter(
      (interaction) => interaction.channel === 'TEXT',
    ).length,
    totalLast7Days: recent7Days.length,
    totalLast30Days: recent30Days.length,
    voiceInteractionsLast30Days: recent30Days.filter(
      (interaction) => interaction.channel === 'VOICE',
    ).length,
  }
}

function dedupeAuditLogs(logs: AssistantAuditRecord[]) {
  return [...new Map(logs.map((entry) => [entry.id, entry])).values()]
}

export function buildTutorAssistantUsageSnapshotFromAuditLogs(
  logs: AssistantAuditRecord[],
  options: BuildUsageSnapshotOptions = {},
): TutorAssistantUsageSnapshot {
  const now = options.now ?? new Date()
  const recentLimit = options.recentLimit ?? 6
  const interactions = dedupeAuditLogs(logs)
    .map(parseAssistantInteraction)
    .filter(
      (interaction): interaction is TutorAssistantInteractionSummary =>
        interaction !== null,
    )
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())

  return tutorAssistantUsageSnapshotSchema.parse({
    recentInteractions: interactions.slice(0, recentLimit),
    summary: createUsageSummary(interactions, now),
  })
}

export async function getTutorAssistantUsageSnapshot(
  tutor: AuthenticatedUserData,
  options: BuildUsageSnapshotOptions = {},
) {
  assertPermission(tutor, 'portal_tutor.acessar')

  const now = options.now ?? new Date()
  const last30DaysStart = subtractDays(now, 30)
  const [recentWindowLogs, latestLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [...ASSISTANT_EXECUTION_ACTIONS],
        },
        occurredAt: {
          gte: last30DaysStart,
        },
        userId: tutor.id,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [...ASSISTANT_EXECUTION_ACTIONS],
        },
        userId: tutor.id,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: 24,
    }),
  ])

  return buildTutorAssistantUsageSnapshotFromAuditLogs(
    [...recentWindowLogs, ...latestLogs],
    options,
  )
}

export function buildTutorAssistantAdminDiagnosticsFromAuditLogs(
  logs: AssistantAuditRecord[],
  input: TutorAssistantAdminDiagnostics['scope'],
  options: BuildUsageSnapshotOptions = {},
): TutorAssistantAdminDiagnostics {
  const usageSnapshot = buildTutorAssistantUsageSnapshotFromAuditLogs(logs, options)
  const last30DaysStart = subtractDays(options.now ?? new Date(), 30)
  const recent30Days = usageSnapshot.recentInteractions
  const allInteractions = dedupeAuditLogs(logs)
    .map(parseAssistantInteraction)
    .filter(
      (interaction): interaction is TutorAssistantInteractionSummary =>
        interaction !== null,
    )
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
  const topIntents = [...allInteractions]
    .filter((interaction) => interaction.occurredAt >= last30DaysStart)
    .reduce((accumulator, interaction) => {
      accumulator.set(
        interaction.intent,
        (accumulator.get(interaction.intent) ?? 0) + 1,
      )

      return accumulator
    }, new Map<TutorAssistantIntent, number>())

  return {
    generatedAt: options.now ?? new Date(),
    recentInteractions: recent30Days,
    scope: input,
    summary: {
      ...usageSnapshot.summary,
      answeredLast30Days: allInteractions.filter(
        (interaction) =>
          interaction.occurredAt >= last30DaysStart &&
          interaction.status === 'ANSWERED',
      ).length,
    },
    topIntents: [...topIntents.entries()]
      .map(([intent, count]) => ({ count, intent }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 4),
  }
}

export async function getTutorAssistantAdminDiagnostics(
  actor: AuthenticatedUserData,
  options: BuildUsageSnapshotOptions = {},
) {
  if (!canReadAiFoundationDiagnostics(actor)) {
    throw new AppError(
      'FORBIDDEN',
      403,
      `Missing high permission for tutor assistant diagnostics. Expected one of: ${getAiFoundationDiagnosticPermissions().join(', ')}.`,
    )
  }

  const context = resolveMultiUnitSessionContext(actor)
  const diagnosticUnitId =
    context.status === 'RESOLVED'
      ? context.activeUnitId ?? actor.unitId
      : actor.unitId

  if (!diagnosticUnitId) {
    return buildTutorAssistantAdminDiagnosticsFromAuditLogs(
      [],
      {
        activeUnitId: context.activeUnitId ?? null,
        contextType: context.contextType,
        diagnosticUnitId: null,
        globalReadAccess: context.globalReadAccess,
        status: context.status,
      },
      options,
    )
  }

  const now = options.now ?? new Date()
  const last30DaysStart = subtractDays(now, 30)
  const [recentWindowLogs, latestLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [...ASSISTANT_EXECUTION_ACTIONS],
        },
        occurredAt: {
          gte: last30DaysStart,
        },
        unitId: diagnosticUnitId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [...ASSISTANT_EXECUTION_ACTIONS],
        },
        unitId: diagnosticUnitId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: 24,
    }),
  ])

  return buildTutorAssistantAdminDiagnosticsFromAuditLogs(
    [...recentWindowLogs, ...latestLogs],
    {
      activeUnitId: context.activeUnitId ?? null,
      contextType: context.contextType,
      diagnosticUnitId,
      globalReadAccess: context.globalReadAccess,
      status: context.status,
    },
    options,
  )
}
