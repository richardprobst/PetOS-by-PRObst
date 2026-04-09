import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { createAiInferenceRequest } from '../../features/ai/domain'
import { executeAiProviderAdapter } from '../../server/integrations/ai/adapter'
import { createInternalAppointmentDemandInsightAdapter } from '../../features/insights/adapter'
import {
  appointmentDemandInferenceKey,
  buildAppointmentDemandInputSummary,
} from '../../features/insights/domain'
import {
  predictiveInsightKindSchema,
} from '../../features/insights/schemas'
import { resolvePredictiveInsightReadUnitId } from '../../features/insights/services'

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
} as const

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'block4.local@petos.app',
  id: 'user_block4_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Block 4 Local Operator',
  permissions: ['agendamento.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalActor: AuthenticatedUserData = {
  ...localActor,
  email: 'block4.global@petos.app',
  id: 'user_block4_global',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  permissions: [...localActor.permissions, 'multiunidade.global.visualizar'],
}

test('phase 3 block 4 smoke keeps predictive insight reads scoped to the active unit context', () => {
  assert.equal(resolvePredictiveInsightReadUnitId(localActor), 'unit_local')
  assert.equal(resolvePredictiveInsightReadUnitId(globalActor), 'unit_branch')
})

test('phase 3 block 4 smoke keeps the first predictive cut restricted to appointment-demand insights', () => {
  assert.equal(
    predictiveInsightKindSchema.safeParse('APPOINTMENT_DEMAND_FORECAST').success,
    true,
  )
  assert.equal(
    predictiveInsightKindSchema.safeParse('CHURN_RISK_FORECAST').success,
    false,
  )
})

test('phase 3 block 4 smoke keeps the first predictive result recommendation-only and explained by history window', async () => {
  const request = createAiInferenceRequest({
    inferenceKey: appointmentDemandInferenceKey,
    inputSummary: buildAppointmentDemandInputSummary({
      activeEmployeeCount: 3,
      confidence: 'MEDIUM',
      forecastDays: [
        { date: '2026-04-09', predictedAppointments: 3.2, weekday: 'THURSDAY' },
        { date: '2026-04-10', predictedAppointments: 3.9, weekday: 'FRIDAY' },
        { date: '2026-04-11', predictedAppointments: 4.4, weekday: 'SATURDAY' },
        { date: '2026-04-12', predictedAppointments: 1.1, weekday: 'SUNDAY' },
        { date: '2026-04-13', predictedAppointments: 3.3, weekday: 'MONDAY' },
        { date: '2026-04-14', predictedAppointments: 2.9, weekday: 'TUESDAY' },
        { date: '2026-04-15', predictedAppointments: 3.4, weekday: 'WEDNESDAY' },
      ],
      forecastNext7Days: 22.2,
      forecastWindowEnd: new Date('2026-04-15T23:59:59.999Z'),
      forecastWindowStart: new Date('2026-04-09T00:00:00.000Z'),
      generatedAt: new Date('2026-04-09T14:00:00.000Z'),
      generationStrategy: 'HISTORICAL_WEEKDAY_AVERAGE',
      historyDaysAvailable: 84,
      historyMode: 'LIMITED_HISTORY',
      historyWindowEnd: new Date('2026-04-08T23:59:59.999Z'),
      historyWindowStart: new Date('2026-01-16T00:00:00.000Z'),
      recentTrailing7Days: 19,
      totalAppointmentsInHistory: 240,
      unitId: 'unit_local',
      unitName: 'PetOS Centro',
      weekdayAverages: [
        { averageAppointments: 3.3, sampleDays: 12, weekday: 'MONDAY' },
        { averageAppointments: 2.9, sampleDays: 12, weekday: 'TUESDAY' },
        { averageAppointments: 3.4, sampleDays: 12, weekday: 'WEDNESDAY' },
        { averageAppointments: 3.2, sampleDays: 12, weekday: 'THURSDAY' },
        { averageAppointments: 3.9, sampleDays: 12, weekday: 'FRIDAY' },
        { averageAppointments: 4.4, sampleDays: 12, weekday: 'SATURDAY' },
        { averageAppointments: 1.1, sampleDays: 12, weekday: 'SUNDAY' },
      ],
    }),
    module: 'PREDICTIVE_INSIGHTS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-09T14:00:00.000Z'),
    requestedByUserId: 'user_block4_smoke',
    requestId: 'req_block4_smoke',
    subject: {
      entityId: 'unit_local',
      entityName: 'Unit',
    },
    unitId: 'unit_local',
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
  assert.match(result.outcome.interpretedResult.summary, /janela|proximos 7 dias|previsao/i)
  assert.equal(
    result.outcome.interpretedResult.recommendations.some((entry) =>
      /automat/i.test(entry),
    ),
    true,
  )
})
