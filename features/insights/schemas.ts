import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const predictiveInsightKindSchema = z.enum([
  'APPOINTMENT_DEMAND_FORECAST',
])

export const predictiveInsightFeedbackStatusSchema = z.enum([
  'PENDING',
  'ACKNOWLEDGED',
  'ACTION_PLANNED',
  'NOT_USEFUL',
])

export const predictiveInsightHistoryModeSchema = z.enum([
  'FULL_HISTORY',
  'LIMITED_HISTORY',
  'BOOTSTRAP_FALLBACK',
])

export const predictiveInsightConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW'])

export const predictiveInsightWeekdaySchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
])

export const predictiveInsightWeekdayAverageSchema = z.object({
  averageAppointments: z.number().nonnegative(),
  sampleDays: z.number().int().nonnegative(),
  weekday: predictiveInsightWeekdaySchema,
})

export const predictiveInsightForecastDaySchema = z.object({
  date: z.string().trim().min(10),
  predictedAppointments: z.number().nonnegative(),
  weekday: predictiveInsightWeekdaySchema,
})

export const appointmentDemandInsightExplanationSchema = z.object({
  activeEmployeeCount: z.number().int().nonnegative(),
  confidence: predictiveInsightConfidenceSchema,
  forecastDays: z.array(predictiveInsightForecastDaySchema).min(1),
  forecastNext7Days: z.number().nonnegative(),
  forecastWindowEnd: z.coerce.date(),
  forecastWindowStart: z.coerce.date(),
  generatedAt: z.coerce.date(),
  generationStrategy: z.literal('HISTORICAL_WEEKDAY_AVERAGE'),
  historyDaysAvailable: z.number().int().nonnegative(),
  historyMode: predictiveInsightHistoryModeSchema,
  historyWindowEnd: z.coerce.date(),
  historyWindowStart: z.coerce.date(),
  recentTrailing7Days: z.number().nonnegative(),
  totalAppointmentsInHistory: z.number().int().nonnegative(),
  unitId: z.string().trim().min(1),
  unitName: z.string().trim().min(1),
  weekdayAverages: z.array(predictiveInsightWeekdayAverageSchema).length(7),
})

export const createPredictiveInsightInputSchema = z.object({
  kind: predictiveInsightKindSchema.default('APPOINTMENT_DEMAND_FORECAST'),
  snapshotDate: optionalDate,
  unitId: optionalString,
})

export const listPredictiveInsightsQuerySchema = z.object({
  kind: predictiveInsightKindSchema.optional(),
  limit: z.coerce.number().int().positive().max(20).default(7),
  snapshotDateFrom: optionalDate,
  snapshotDateTo: optionalDate,
  unitId: optionalString,
})

export const recordPredictiveInsightFeedbackInputSchema = z.object({
  feedbackNotes: optionalString,
  feedbackStatus: predictiveInsightFeedbackStatusSchema,
})

export type PredictiveInsightKind = z.infer<typeof predictiveInsightKindSchema>
export type PredictiveInsightFeedbackStatus = z.infer<
  typeof predictiveInsightFeedbackStatusSchema
>
export type PredictiveInsightHistoryMode = z.infer<
  typeof predictiveInsightHistoryModeSchema
>
export type PredictiveInsightConfidence = z.infer<
  typeof predictiveInsightConfidenceSchema
>
export type PredictiveInsightWeekday = z.infer<
  typeof predictiveInsightWeekdaySchema
>
export type AppointmentDemandInsightExplanation = z.infer<
  typeof appointmentDemandInsightExplanationSchema
>
export type CreatePredictiveInsightInput = z.infer<
  typeof createPredictiveInsightInputSchema
>
export type ListPredictiveInsightsQuery = z.infer<
  typeof listPredictiveInsightsQuerySchema
>
export type RecordPredictiveInsightFeedbackInput = z.infer<
  typeof recordPredictiveInsightFeedbackInputSchema
>
