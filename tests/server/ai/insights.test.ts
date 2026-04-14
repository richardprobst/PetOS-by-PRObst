import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { resetEnvironmentCacheForTests } from '../../../server/env'
import { AppError } from '../../../server/http/errors'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { executeAiProviderAdapter } from '../../../server/integrations/ai/adapter'
import { createInternalAppointmentDemandInsightAdapter } from '../../../features/insights/adapter'
import {
  appointmentDemandInferenceKey,
  buildAppointmentDemandInputSummary,
} from '../../../features/insights/domain'
import {
  createPredictiveInsight,
  listPredictiveInsights,
  parsePredictiveInsightExplanation,
  recordPredictiveInsightFeedback,
  resolvePredictiveInsightReadUnitId,
} from '../../../features/insights/services'
import type { AppointmentDemandInsightExplanation } from '../../../features/insights/schemas'

const restorers: Array<() => void> = []

type AuditCreateArgs = {
  data: {
    action: string
  } & Record<string, unknown>
}

type PredictiveInsightFindManyArgs = {
  where: {
    unitId?: string | null
  }
}

type PredictiveInsightSnapshotCreateArgs = {
  create: Record<string, unknown>
}

type PredictiveInsightSnapshotUpdateArgs = {
  data: Record<string, unknown>
}

type TransactionCallback = (tx: unknown) => Promise<unknown>

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }

  resetEnvironmentCacheForTests()
})

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
}

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'insights.local@petos.app',
  id: 'user_insights_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Insights Local Operator',
  permissions: ['agendamento.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  email: 'insights.global@petos.app',
  id: 'user_insights_global',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  permissions: [...localActor.permissions, 'multiunidade.global.visualizar'],
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

function createSchemaCompatibilityError(code: 'P2021' | 'P2022' = 'P2021') {
  return Object.assign(new Error('Schema compatibility error'), { code })
}

async function withAiEnvironment<T>(
  overrides: Partial<typeof enabledEnvironment>,
  callback: () => Promise<T> | T,
) {
  const previous = {
    AI_ENABLED: process.env.AI_ENABLED,
    AI_IMAGE_ANALYSIS_ENABLED: process.env.AI_IMAGE_ANALYSIS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
    AI_PREDICTIVE_INSIGHTS_ENABLED: process.env.AI_PREDICTIVE_INSIGHTS_ENABLED,
  }

  Object.assign(process.env, enabledEnvironment, overrides)
  resetEnvironmentCacheForTests()

  try {
    return await callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }

    resetEnvironmentCacheForTests()
  }
}

function createExplanation(
  overrides: Partial<AppointmentDemandInsightExplanation> = {},
): AppointmentDemandInsightExplanation {
  return {
    activeEmployeeCount: 3,
    confidence: 'HIGH',
    forecastDays: [
      { date: '2026-04-09', predictedAppointments: 3.4, weekday: 'THURSDAY' },
      { date: '2026-04-10', predictedAppointments: 4.1, weekday: 'FRIDAY' },
      { date: '2026-04-11', predictedAppointments: 4.8, weekday: 'SATURDAY' },
      { date: '2026-04-12', predictedAppointments: 1.2, weekday: 'SUNDAY' },
      { date: '2026-04-13', predictedAppointments: 3.9, weekday: 'MONDAY' },
      { date: '2026-04-14', predictedAppointments: 3.1, weekday: 'TUESDAY' },
      { date: '2026-04-15', predictedAppointments: 3.7, weekday: 'WEDNESDAY' },
    ],
    forecastNext7Days: 24.2,
    forecastWindowEnd: new Date('2026-04-15T23:59:59.999Z'),
    forecastWindowStart: new Date('2026-04-09T00:00:00.000Z'),
    generatedAt: new Date('2026-04-09T10:00:00.000Z'),
    generationStrategy: 'HISTORICAL_WEEKDAY_AVERAGE',
    historyDaysAvailable: 180,
    historyMode: 'FULL_HISTORY',
    historyWindowEnd: new Date('2026-04-08T23:59:59.999Z'),
    historyWindowStart: new Date('2025-10-11T00:00:00.000Z'),
    recentTrailing7Days: 22,
    totalAppointmentsInHistory: 520,
    unitId: 'unit_local',
    unitName: 'PetOS Centro',
    weekdayAverages: [
      { averageAppointments: 3.9, sampleDays: 25, weekday: 'MONDAY' },
      { averageAppointments: 3.1, sampleDays: 26, weekday: 'TUESDAY' },
      { averageAppointments: 3.7, sampleDays: 26, weekday: 'WEDNESDAY' },
      { averageAppointments: 3.4, sampleDays: 26, weekday: 'THURSDAY' },
      { averageAppointments: 4.1, sampleDays: 26, weekday: 'FRIDAY' },
      { averageAppointments: 4.8, sampleDays: 26, weekday: 'SATURDAY' },
      { averageAppointments: 1.2, sampleDays: 25, weekday: 'SUNDAY' },
    ],
    ...overrides,
  }
}

function createPersistedPredictiveInsight(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createdAt: new Date('2026-04-09T10:05:00.000Z'),
    envelopeSnapshot: {},
    executionId: 'exec_insight_1',
    executionStatus: 'COMPLETED',
    explanation: createExplanation(),
    feedbackAt: null,
    feedbackBy: null,
    feedbackByUserId: null,
    feedbackNotes: null,
    feedbackStatus: 'PENDING',
    forecastWindowEnd: new Date('2026-04-15T23:59:59.999Z'),
    forecastWindowStart: new Date('2026-04-09T00:00:00.000Z'),
    id: 'insight_1',
    inferenceKey: appointmentDemandInferenceKey,
    kind: 'APPOINTMENT_DEMAND_FORECAST',
    recommendations: ['Revisar capacidade na sexta-feira.'],
    requestId: 'req_insight_1',
    requestedBy: { id: localActor.id, name: localActor.name },
    requestedByUserId: localActor.id,
    resultSummary: 'Previsao assistiva pronta para agenda.',
    signals: [{ key: 'forecastNext7Days', label: 'Forecast next 7 days', value: 24.2 }],
    snapshotDate: new Date('2026-04-09T00:00:00.000Z'),
    unit: { id: 'unit_local', name: 'PetOS Centro' },
    unitId: 'unit_local',
    updatedAt: new Date('2026-04-09T10:05:00.000Z'),
    visibility: 'INTERNAL_OPERATOR_AND_AUDIT',
    ...overrides,
  } satisfies Record<string, unknown>
}

test('internal appointment-demand adapter returns a recommendation-only result explained by window and unit', async () => {
  const explanation = createExplanation()
  const request = createAiInferenceRequest({
    inferenceKey: appointmentDemandInferenceKey,
    inputSummary: buildAppointmentDemandInputSummary(explanation),
    module: 'PREDICTIVE_INSIGHTS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-09T10:00:00.000Z'),
    requestedByUserId: localActor.id,
    requestId: 'req_insight_adapter',
    subject: {
      entityId: explanation.unitId,
      entityName: 'Unit',
    },
    unitId: explanation.unitId,
  })

  const result = await executeAiProviderAdapter(
    request,
    createInternalAppointmentDemandInsightAdapter(),
    {
      environment: enabledEnvironment,
    },
  )

  assert.equal(result.envelope.status, 'COMPLETED')
  assert.equal(result.outcome.status, 'COMPLETED')
  assert.equal(result.outcome.interpretedResult.humanReviewRequired, false)
  assert.match(result.outcome.interpretedResult.summary, /proximos 7 dias/i)
  assert.equal(result.outcome.interpretedResult.signals.length >= 4, true)
  assert.equal(result.audit.status, 'COMPLETED')
})

test('createPredictiveInsight persists a completed appointment-demand snapshot with audit trail', async () => {
  const auditActions: string[] = []

  replaceMethod(prisma as object, 'unit', {
    findUnique: async () => ({
      id: 'unit_local',
      name: 'PetOS Centro',
    }),
  })
  replaceMethod(prisma as object, 'employee', {
    count: async () => 3,
  })
  replaceMethod(prisma as object, 'appointment', {
    findMany: async () => [
      { startAt: new Date('2026-04-02T10:00:00.000Z') },
      { startAt: new Date('2026-04-03T10:00:00.000Z') },
      { startAt: new Date('2026-04-04T10:00:00.000Z') },
      { startAt: new Date('2026-03-28T10:00:00.000Z') },
      { startAt: new Date('2025-10-15T10:00:00.000Z') },
    ],
  })
  replaceMethod(prisma as object, '$transaction', async (callback: TransactionCallback) =>
    callback({
      auditLog: {
        create: async ({ data }: AuditCreateArgs) => {
          auditActions.push(data.action)
          return data
        },
      },
      predictiveInsightSnapshot: {
        upsert: async ({ create }: PredictiveInsightSnapshotCreateArgs) =>
          createPersistedPredictiveInsight({
            envelopeSnapshot: create.envelopeSnapshot,
            executionId: create.executionId,
            executionStatus: create.executionStatus,
            explanation: create.explanation,
            recommendations: create.recommendations,
            requestId: create.requestId,
            requestedByUserId: create.requestedByUserId,
            resultSummary: create.resultSummary,
            signals: create.signals,
            snapshotDate: create.snapshotDate,
            unitId: create.unitId,
          }),
      },
    }),
  )

  const predictiveInsight = await withAiEnvironment({}, () =>
    createPredictiveInsight(
      localActor,
      {
        kind: 'APPOINTMENT_DEMAND_FORECAST',
        snapshotDate: new Date('2026-04-09T12:00:00.000Z'),
      },
      'ADMIN_API',
    ),
  )

  const explanation = parsePredictiveInsightExplanation(predictiveInsight.explanation)

  assert.equal(predictiveInsight.executionStatus, 'COMPLETED')
  assert.equal(predictiveInsight.feedbackStatus, 'PENDING')
  assert.equal(explanation.forecastNext7Days >= 0, true)
  assert.equal(auditActions.includes('ai.execution.completed'), true)
  assert.equal(auditActions.includes('predictive_insight.snapshot.generated'), true)
})

test('createPredictiveInsight keeps fail-closed behavior when predictive AI is disabled', async () => {
  replaceMethod(prisma as object, 'unit', {
    findUnique: async () => ({
      id: 'unit_local',
      name: 'PetOS Centro',
    }),
  })
  replaceMethod(prisma as object, 'employee', {
    count: async () => 2,
  })
  replaceMethod(prisma as object, 'appointment', {
    findMany: async () => [],
  })
  replaceMethod(prisma as object, '$transaction', async (callback: TransactionCallback) =>
    callback({
      auditLog: {
        create: async ({ data }: AuditCreateArgs) => data,
      },
      predictiveInsightSnapshot: {
        upsert: async ({ create }: PredictiveInsightSnapshotCreateArgs) =>
          createPersistedPredictiveInsight({
            executionStatus: create.executionStatus,
            recommendations: create.recommendations,
            resultSummary: create.resultSummary,
          }),
      },
    }),
  )

  const predictiveInsight = await withAiEnvironment(
    {
      AI_PREDICTIVE_INSIGHTS_ENABLED: 'false',
    },
    () =>
      createPredictiveInsight(localActor, {
        kind: 'APPOINTMENT_DEMAND_FORECAST',
      }),
  )

  assert.equal(predictiveInsight.executionStatus, 'BLOCKED')
  assert.match(predictiveInsight.resultSummary ?? '', /disabled|desabilitad/i)
})

test('recordPredictiveInsightFeedback updates the utility trail and writes audit log', async () => {
  const auditActions: string[] = []

  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    findUnique: async () => createPersistedPredictiveInsight(),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: TransactionCallback) =>
    callback({
      auditLog: {
        create: async ({ data }: AuditCreateArgs) => {
          auditActions.push(data.action)
          return data
        },
      },
      predictiveInsightSnapshot: {
        update: async ({ data }: PredictiveInsightSnapshotUpdateArgs) =>
          createPersistedPredictiveInsight({
            feedbackAt: new Date('2026-04-09T11:00:00.000Z'),
            feedbackBy: { id: localActor.id, name: localActor.name },
            feedbackByUserId: data.feedbackByUserId,
            feedbackNotes: data.feedbackNotes,
            feedbackStatus: data.feedbackStatus,
          }),
      },
    }),
  )

  const updated = await recordPredictiveInsightFeedback(localActor, 'insight_1', {
    feedbackNotes: 'Usado para revisar a capacidade de sexta-feira.',
    feedbackStatus: 'ACTION_PLANNED',
  })

  assert.equal(updated.feedbackStatus, 'ACTION_PLANNED')
  assert.equal(updated.feedbackByUserId, localActor.id)
  assert.equal(auditActions.includes('predictive_insight.feedback.recorded'), true)
})

test('listPredictiveInsights respects the resolved multi-unit read context', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    findMany: async ({ where }: PredictiveInsightFindManyArgs) => {
      capturedUnitId = where.unitId ?? null
      return []
    },
  })

  const predictiveInsights = await listPredictiveInsights(globalReadActor, {
    kind: 'APPOINTMENT_DEMAND_FORECAST',
    limit: 5,
  })

  assert.deepEqual(predictiveInsights, [])
  assert.equal(capturedUnitId, 'unit_branch')
  assert.equal(resolvePredictiveInsightReadUnitId(globalReadActor), 'unit_branch')
})

test('listPredictiveInsights degrades to an empty result when the predictive tables are not available yet', async () => {
  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    findMany: async () => {
      throw createSchemaCompatibilityError()
    },
  })

  const predictiveInsights = await listPredictiveInsights(localActor, {
    kind: 'APPOINTMENT_DEMAND_FORECAST',
    limit: 5,
  })

  assert.deepEqual(predictiveInsights, [])
})

test('recordPredictiveInsightFeedback returns a controlled service-unavailable error when the predictive tables are missing', async () => {
  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    findUnique: async () => {
      throw createSchemaCompatibilityError()
    },
  })

  await assert.rejects(
    () =>
      recordPredictiveInsightFeedback(localActor, 'insight_missing', {
        feedbackStatus: 'ACKNOWLEDGED',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 503 &&
      /predictive insights storage is unavailable/i.test(error.message),
  )
})
