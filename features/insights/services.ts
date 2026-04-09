import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAiExecutionAuditLogs } from '@/server/audit/ai'
import { writeAuditLog } from '@/server/audit/logging'
import {
  hasAnyPermission,
} from '@/server/authorization/access-control'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { operationalStatusIds } from '@/features/appointments/constants'
import { createAiInferenceRequest } from '@/features/ai/domain'
import type { AiExecutionEnvelope } from '@/features/ai/schemas'
import { executeAiProviderAdapter } from '@/server/integrations/ai/adapter'
import { createInternalAppointmentDemandInsightAdapter } from './adapter'
import {
  addDays,
  appointmentDemandInferenceKey,
  buildAppointmentDemandInputSummary,
  createPredictiveInsightEnvelopeSnapshot,
  endOfDay,
  parseAppointmentDemandInsightExplanation,
  startOfDay,
  toIsoDate,
  toPredictiveWeekday,
} from './domain'
import type {
  AppointmentDemandInsightExplanation,
  CreatePredictiveInsightInput,
  ListPredictiveInsightsQuery,
  PredictiveInsightHistoryMode,
  PredictiveInsightKind,
  PredictiveInsightWeekday,
  RecordPredictiveInsightFeedbackInput,
} from './schemas'

const predictiveInsightDetailsInclude =
  Prisma.validator<Prisma.PredictiveInsightSnapshotInclude>()({
    feedbackBy: true,
    requestedBy: true,
    unit: true,
  })

type PredictiveInsightSnapshotDetails = Prisma.PredictiveInsightSnapshotGetPayload<{
  include: typeof predictiveInsightDetailsInclude
}>

type PredictiveInsightOrigin = 'ADMIN_API' | 'SERVER_ACTION'

const weekdayOrder: PredictiveInsightWeekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const internalAppointmentDemandInsightAdapter =
  createInternalAppointmentDemandInsightAdapter()

function getAiPredictiveEnvironment() {
  return {
    AI_ENABLED: process.env.AI_ENABLED,
    AI_IMAGE_ANALYSIS_BASE_QUOTA: process.env.AI_IMAGE_ANALYSIS_BASE_QUOTA,
    AI_IMAGE_ANALYSIS_ENABLED: process.env.AI_IMAGE_ANALYSIS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
    AI_PREDICTIVE_INSIGHTS_ENABLED: process.env.AI_PREDICTIVE_INSIGHTS_ENABLED,
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function assertCanViewPredictiveInsights(actor: AuthenticatedUserData) {
  if (
    hasAnyPermission(actor, [
      'ai.insights.visualizar',
      'ai.insights.executar',
      'agendamento.visualizar',
    ])
  ) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission to inspect predictive insights for agenda demand.',
  )
}

function assertCanGeneratePredictiveInsights(actor: AuthenticatedUserData) {
  if (
    hasAnyPermission(actor, [
      'ai.insights.executar',
      'agendamento.visualizar',
    ])
  ) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission to generate predictive insights for agenda demand.',
  )
}

function assertCanRecordPredictiveInsightFeedback(actor: AuthenticatedUserData) {
  if (
    hasAnyPermission(actor, [
      'ai.insights.feedback',
      'ai.insights.executar',
      'agendamento.visualizar',
    ])
  ) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission to record predictive insight feedback.',
  )
}

function getSnapshotDate(value?: Date) {
  return startOfDay(value ?? new Date())
}

function getHistoryWindow(snapshotDate: Date) {
  return {
    end: endOfDay(addDays(snapshotDate, -1)),
    searchStart: startOfDay(addDays(snapshotDate, -180)),
  }
}

function getForecastWindow(snapshotDate: Date) {
  return {
    end: endOfDay(addDays(snapshotDate, 6)),
    start: startOfDay(snapshotDate),
  }
}

function resolveHistoryMode(historyDaysAvailable: number): PredictiveInsightHistoryMode {
  if (historyDaysAvailable >= 180) {
    return 'FULL_HISTORY'
  }

  if (historyDaysAvailable >= 56) {
    return 'LIMITED_HISTORY'
  }

  return 'BOOTSTRAP_FALLBACK'
}

function resolveConfidence(historyMode: PredictiveInsightHistoryMode) {
  if (historyMode === 'FULL_HISTORY') {
    return 'HIGH' as const
  }

  if (historyMode === 'LIMITED_HISTORY') {
    return 'MEDIUM' as const
  }

  return 'LOW' as const
}

function diffDaysInclusive(start: Date, end: Date) {
  if (end.getTime() < start.getTime()) {
    return 0
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1
}

function createWeekdayAccumulator() {
  return weekdayOrder.reduce<
    Record<PredictiveInsightWeekday, { sampleDays: number; totalAppointments: number }>
  >((accumulator, weekday) => {
    accumulator[weekday] = {
      sampleDays: 0,
      totalAppointments: 0,
    }
    return accumulator
  }, {} as Record<PredictiveInsightWeekday, { sampleDays: number; totalAppointments: number }>)
}

function createDateKey(value: Date) {
  return toIsoDate(value)
}

function assertSupportedPredictiveInsightKind(kind: PredictiveInsightKind) {
  if (kind !== 'APPOINTMENT_DEMAND_FORECAST') {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `Predictive insight kind "${kind}" is not available in this first cut.`,
    )
  }
}

async function buildAppointmentDemandExplanation(
  unitId: string,
  snapshotDate: Date,
): Promise<AppointmentDemandInsightExplanation> {
  const historyWindow = getHistoryWindow(snapshotDate)
  const forecastWindow = getForecastWindow(snapshotDate)

  const [unit, activeEmployeeCount, appointments] = await Promise.all([
    prisma.unit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.employee.count({
      where: {
        unitId,
        user: {
          active: true,
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        unitId,
        operationalStatusId: {
          notIn: [operationalStatusIds.canceled, operationalStatusIds.noShow],
        },
        startAt: {
          gte: historyWindow.searchStart,
          lte: historyWindow.end,
        },
      },
      orderBy: {
        startAt: 'asc',
      },
      select: {
        startAt: true,
      },
    }),
  ])

  if (!unit) {
    throw new AppError('NOT_FOUND', 404, 'Unit not found for predictive insight.')
  }

  const weekdayAccumulator = createWeekdayAccumulator()
  const appointmentsByDate = new Map<string, number>()

  for (
    let cursor = new Date(historyWindow.searchStart);
    cursor.getTime() <= historyWindow.end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const weekday = toPredictiveWeekday(cursor)
    weekdayAccumulator[weekday].sampleDays += 1
  }

  for (const appointment of appointments) {
    const dateKey = createDateKey(appointment.startAt)
    const weekday = toPredictiveWeekday(appointment.startAt)
    appointmentsByDate.set(dateKey, (appointmentsByDate.get(dateKey) ?? 0) + 1)
    weekdayAccumulator[weekday].totalAppointments += 1
  }

  const earliestAppointment = appointments[0]?.startAt ?? null
  const historyDaysAvailable = earliestAppointment
    ? diffDaysInclusive(startOfDay(earliestAppointment), historyWindow.end)
    : 0
  const historyMode = resolveHistoryMode(historyDaysAvailable)
  const confidence = resolveConfidence(historyMode)
  const weekdayAverages = weekdayOrder.map((weekday) => {
    const bucket = weekdayAccumulator[weekday]
    const averageAppointments =
      bucket.sampleDays === 0
        ? 0
        : Number((bucket.totalAppointments / bucket.sampleDays).toFixed(1))

    return {
      averageAppointments,
      sampleDays: bucket.sampleDays,
      weekday,
    }
  })
  const forecastDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(forecastWindow.start, index)
    const weekday = toPredictiveWeekday(date)
    const weekdayAverage =
      weekdayAverages.find((entry) => entry.weekday === weekday)?.averageAppointments ?? 0

    return {
      date: toIsoDate(date),
      predictedAppointments: weekdayAverage,
      weekday,
    }
  })
  const forecastNext7Days = Number(
    forecastDays
      .reduce((sum, day) => sum + day.predictedAppointments, 0)
      .toFixed(1),
  )
  const recentTrailingWindowStart = startOfDay(addDays(snapshotDate, -7))
  const recentTrailing7Days = appointments
    .filter((appointment) => appointment.startAt >= recentTrailingWindowStart)
    .length

  return {
    activeEmployeeCount,
    confidence,
    forecastDays,
    forecastNext7Days,
    forecastWindowEnd: forecastWindow.end,
    forecastWindowStart: forecastWindow.start,
    generatedAt: new Date(),
    generationStrategy: 'HISTORICAL_WEEKDAY_AVERAGE',
    historyDaysAvailable,
    historyMode,
    historyWindowEnd: historyWindow.end,
    historyWindowStart: historyWindow.searchStart,
    recentTrailing7Days,
    totalAppointmentsInHistory: appointments.length,
    unitId: unit.id,
    unitName: unit.name,
    weekdayAverages,
  }
}

function createPredictiveInsightRequest(
  actor: AuthenticatedUserData,
  explanation: AppointmentDemandInsightExplanation,
  origin: PredictiveInsightOrigin,
) {
  return createAiInferenceRequest({
    inferenceKey: appointmentDemandInferenceKey,
    inputSummary: buildAppointmentDemandInputSummary(explanation),
    module: 'PREDICTIVE_INSIGHTS',
    origin,
    references: [
      {
        kind: 'unit',
        value: explanation.unitId,
      },
      {
        kind: 'historyWindow',
        value: `${toIsoDate(explanation.historyWindowStart)}:${toIsoDate(explanation.historyWindowEnd)}`,
      },
      {
        kind: 'forecastWindow',
        value: `${toIsoDate(explanation.forecastWindowStart)}:${toIsoDate(explanation.forecastWindowEnd)}`,
      },
    ],
    requestedAt: new Date(),
    requestedByUserId: actor.id,
    subject: {
      entityId: explanation.unitId,
      entityName: 'Unit',
    },
    unitId: explanation.unitId,
  })
}

function createResultSummary(envelope: AiExecutionEnvelope) {
  if (!envelope.outcome) {
    throw new Error('Predictive insight persistence requires a terminal envelope.')
  }

  if (envelope.outcome.status === 'COMPLETED') {
    return envelope.outcome.interpretedResult.summary
  }

  return envelope.outcome.error.message
}

function createSignalsPayload(envelope: AiExecutionEnvelope) {
  if (!envelope.outcome || envelope.outcome.status !== 'COMPLETED') {
    return undefined
  }

  return toJsonValue(envelope.outcome.interpretedResult.signals)
}

function createRecommendationsPayload(envelope: AiExecutionEnvelope) {
  if (!envelope.outcome || envelope.outcome.status !== 'COMPLETED') {
    return undefined
  }

  return toJsonValue(envelope.outcome.interpretedResult.recommendations)
}

function mapEnvelopeStatusToExecutionStatus(envelope: AiExecutionEnvelope) {
  switch (envelope.status) {
    case 'COMPLETED':
    case 'BLOCKED':
    case 'FAILED':
      return envelope.status
    default:
      throw new Error(
        `Predictive insight persistence only accepts terminal envelopes, received "${envelope.status}".`,
      )
  }
}

async function persistPredictiveInsight(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedUserData,
  input: {
    envelope: AiExecutionEnvelope
    explanation: AppointmentDemandInsightExplanation
    kind: PredictiveInsightKind
    snapshotDate: Date
  },
) {
  const envelopeSnapshot = createPredictiveInsightEnvelopeSnapshot(
    input.kind,
    input.envelope,
    input.explanation,
  )

  return tx.predictiveInsightSnapshot.upsert({
    where: {
      unitId_kind_snapshotDate: {
        kind: input.kind,
        snapshotDate: input.snapshotDate,
        unitId: input.explanation.unitId,
      },
    },
    create: {
      envelopeSnapshot: toJsonValue(envelopeSnapshot),
      executionId: input.envelope.execution.executionId,
      executionStatus: mapEnvelopeStatusToExecutionStatus(input.envelope),
      explanation: toJsonValue(input.explanation),
      feedbackAt: null,
      feedbackByUserId: null,
      feedbackNotes: null,
      feedbackStatus: 'PENDING',
      forecastWindowEnd: input.explanation.forecastWindowEnd,
      forecastWindowStart: input.explanation.forecastWindowStart,
      historyWindowEnd: input.explanation.historyWindowEnd,
      historyWindowStart: input.explanation.historyWindowStart,
      inferenceKey: input.envelope.request.inferenceKey,
      kind: input.kind,
      recommendations: createRecommendationsPayload(input.envelope),
      requestId: input.envelope.request.requestId,
      requestedByUserId: actor.id,
      resultSummary: createResultSummary(input.envelope),
      signals: createSignalsPayload(input.envelope),
      snapshotDate: input.snapshotDate,
      unitId: input.explanation.unitId,
      visibility: 'INTERNAL_OPERATOR_AND_AUDIT',
    },
    include: predictiveInsightDetailsInclude,
    update: {
      envelopeSnapshot: toJsonValue(envelopeSnapshot),
      executionId: input.envelope.execution.executionId,
      executionStatus: mapEnvelopeStatusToExecutionStatus(input.envelope),
      explanation: toJsonValue(input.explanation),
      feedbackAt: null,
      feedbackByUserId: null,
      feedbackNotes: null,
      feedbackStatus: 'PENDING',
      forecastWindowEnd: input.explanation.forecastWindowEnd,
      forecastWindowStart: input.explanation.forecastWindowStart,
      historyWindowEnd: input.explanation.historyWindowEnd,
      historyWindowStart: input.explanation.historyWindowStart,
      inferenceKey: input.envelope.request.inferenceKey,
      recommendations: createRecommendationsPayload(input.envelope),
      requestId: input.envelope.request.requestId,
      requestedByUserId: actor.id,
      resultSummary: createResultSummary(input.envelope),
      signals: createSignalsPayload(input.envelope),
      visibility: 'INTERNAL_OPERATOR_AND_AUDIT',
    },
  })
}

async function getPredictiveInsightByIdOrThrow(
  actor: AuthenticatedUserData,
  predictiveInsightId: string,
) {
  const predictiveInsight = await prisma.predictiveInsightSnapshot.findUnique({
    where: {
      id: predictiveInsightId,
    },
    include: predictiveInsightDetailsInclude,
  })

  if (!predictiveInsight) {
    throw new AppError('NOT_FOUND', 404, 'Predictive insight snapshot not found.')
  }

  assertActorCanAccessLocalUnitRecord(actor, predictiveInsight.unitId)
  return predictiveInsight
}

export function resolvePredictiveInsightReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId)
}

export async function listPredictiveInsights(
  actor: AuthenticatedUserData,
  query: ListPredictiveInsightsQuery,
) {
  assertCanViewPredictiveInsights(actor)
  const scopedUnitId = resolvePredictiveInsightReadUnitId(actor, query.unitId ?? null)
  const snapshotDateFilter =
    query.snapshotDateFrom || query.snapshotDateTo
      ? {
          ...(query.snapshotDateFrom
            ? { gte: startOfDay(query.snapshotDateFrom) }
            : {}),
          ...(query.snapshotDateTo ? { lte: endOfDay(query.snapshotDateTo) } : {}),
        }
      : undefined

  return prisma.predictiveInsightSnapshot.findMany({
    where: {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(snapshotDateFilter ? { snapshotDate: snapshotDateFilter } : {}),
      unitId: scopedUnitId,
    },
    include: predictiveInsightDetailsInclude,
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    take: query.limit,
  })
}

export async function createPredictiveInsight(
  actor: AuthenticatedUserData,
  input: CreatePredictiveInsightInput,
  origin: PredictiveInsightOrigin = 'SERVER_ACTION',
) {
  assertCanGeneratePredictiveInsights(actor)
  assertSupportedPredictiveInsightKind(input.kind)
  const unitId = resolvePredictiveInsightReadUnitId(actor, input.unitId ?? null)
  const snapshotDate = getSnapshotDate(input.snapshotDate)
  const explanation = await buildAppointmentDemandExplanation(unitId, snapshotDate)
  const request = createPredictiveInsightRequest(actor, explanation, origin)
  const execution = await executeAiProviderAdapter(
    request,
    internalAppointmentDemandInsightAdapter,
    {
      environment: getAiPredictiveEnvironment(),
    },
  )

  return prisma.$transaction(async (tx) => {
    const predictiveInsight = await persistPredictiveInsight(tx, actor, {
      envelope: execution.envelope,
      explanation,
      kind: input.kind,
      snapshotDate,
    })

    await writeAiExecutionAuditLogs(tx, {
      actor,
      envelope: execution.envelope,
    })
    await writeAuditLog(tx, {
      action: 'predictive_insight.snapshot.generated',
      details: {
        executionStatus: predictiveInsight.executionStatus,
        feedbackStatus: predictiveInsight.feedbackStatus,
        forecastWindowEnd: predictiveInsight.forecastWindowEnd,
        forecastWindowStart: predictiveInsight.forecastWindowStart,
        historyWindowEnd: predictiveInsight.historyWindowEnd,
        historyWindowStart: predictiveInsight.historyWindowStart,
        kind: predictiveInsight.kind,
        snapshotDate: predictiveInsight.snapshotDate,
      },
      entityId: predictiveInsight.id,
      entityName: 'PredictiveInsightSnapshot',
      unitId: predictiveInsight.unitId,
      userId: actor.id,
    })

    return predictiveInsight
  })
}

export async function recordPredictiveInsightFeedback(
  actor: AuthenticatedUserData,
  predictiveInsightId: string,
  input: RecordPredictiveInsightFeedbackInput,
) {
  assertCanRecordPredictiveInsightFeedback(actor)
  const predictiveInsight = await getPredictiveInsightByIdOrThrow(
    actor,
    predictiveInsightId,
  )

  return prisma.$transaction(async (tx) => {
    const updated = await tx.predictiveInsightSnapshot.update({
      where: {
        id: predictiveInsight.id,
      },
      data: {
        feedbackAt: new Date(),
        feedbackByUserId: actor.id,
        feedbackNotes: input.feedbackNotes ?? null,
        feedbackStatus: input.feedbackStatus,
      },
      include: predictiveInsightDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'predictive_insight.feedback.recorded',
      details: {
        feedbackStatus: updated.feedbackStatus,
        notesPresent: Boolean(updated.feedbackNotes),
        previousFeedbackStatus: predictiveInsight.feedbackStatus,
        snapshotDate: updated.snapshotDate,
      },
      entityId: updated.id,
      entityName: 'PredictiveInsightSnapshot',
      unitId: updated.unitId,
      userId: actor.id,
    })

    return updated
  })
}

export async function getLatestAppointmentDemandInsight(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): Promise<PredictiveInsightSnapshotDetails | null> {
  assertCanViewPredictiveInsights(actor)
  const scopedUnitId = resolvePredictiveInsightReadUnitId(actor, requestedUnitId)

  return prisma.predictiveInsightSnapshot.findFirst({
    where: {
      kind: 'APPOINTMENT_DEMAND_FORECAST',
      unitId: scopedUnitId,
    },
    include: predictiveInsightDetailsInclude,
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
  })
}

export function parsePredictiveInsightExplanation(input: unknown) {
  return parseAppointmentDemandInsightExplanation(input)
}
