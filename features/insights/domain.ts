import type { AiExecutionEnvelope } from '@/features/ai/schemas'
import {
  appointmentDemandInsightExplanationSchema,
  type AppointmentDemandInsightExplanation,
  type PredictiveInsightKind,
  type PredictiveInsightWeekday,
} from './schemas'

type AppointmentDemandInputSummary = {
  insightKind: 'APPOINTMENT_DEMAND_FORECAST'
  explanation: AppointmentDemandInsightExplanation
}

type PredictiveInsightEnvelopeSnapshot = {
  explanation: AppointmentDemandInsightExplanation
  kind: PredictiveInsightKind
  envelope: AiExecutionEnvelope
}

const weekdayLabels: PredictiveInsightWeekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]

export const appointmentDemandInferenceKey = 'predictive.appointment-demand.v1'

export function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

export function addDays(value: Date, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

export function toIsoDate(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10)
}

export function toPredictiveWeekday(value: Date): PredictiveInsightWeekday {
  return weekdayLabels[value.getDay()] ?? 'MONDAY'
}

export function buildAppointmentDemandInputSummary(
  explanation: AppointmentDemandInsightExplanation,
) {
  return JSON.stringify(
    {
      explanation: appointmentDemandInsightExplanationSchema.parse(explanation),
      insightKind: 'APPOINTMENT_DEMAND_FORECAST',
    } satisfies AppointmentDemandInputSummary,
    null,
    2,
  )
}

export function parseAppointmentDemandInputSummary(input: string | null | undefined) {
  if (!input) {
    return null
  }

  try {
    const parsed = JSON.parse(input) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    const record = parsed as Record<string, unknown>

    if (record.insightKind !== 'APPOINTMENT_DEMAND_FORECAST') {
      return null
    }

    return {
      explanation: appointmentDemandInsightExplanationSchema.parse(
        record.explanation,
      ),
      insightKind: 'APPOINTMENT_DEMAND_FORECAST',
    } satisfies AppointmentDemandInputSummary
  } catch {
    return null
  }
}

export function createPredictiveInsightEnvelopeSnapshot(
  kind: PredictiveInsightKind,
  envelope: AiExecutionEnvelope,
  explanation: AppointmentDemandInsightExplanation,
) {
  return JSON.parse(
    JSON.stringify({
      envelope,
      explanation: appointmentDemandInsightExplanationSchema.parse(explanation),
      kind,
    } satisfies PredictiveInsightEnvelopeSnapshot),
  ) as PredictiveInsightEnvelopeSnapshot
}

export function parsePredictiveInsightEnvelopeSnapshot(input: unknown) {
  return JSON.parse(JSON.stringify(input)) as PredictiveInsightEnvelopeSnapshot
}

export function parseAppointmentDemandInsightExplanation(input: unknown) {
  return appointmentDemandInsightExplanationSchema.parse(
    JSON.parse(JSON.stringify(input)),
  )
}
