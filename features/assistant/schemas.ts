import { z } from 'zod'

const optionalString = z.string().trim().min(1).nullable().default(null)

export const tutorAssistantIntentSchema = z.enum([
  'SCHEDULE_APPOINTMENT',
  'QUERY_UPCOMING_APPOINTMENTS',
  'QUERY_FINANCE_SUMMARY',
  'QUERY_WAITLIST_STATUS',
  'QUERY_PENDING_DOCUMENTS',
  'QUERY_REPORT_CARDS',
  'HELP',
  'UNKNOWN',
])

export type TutorAssistantIntent = z.infer<typeof tutorAssistantIntentSchema>

export const tutorAssistantChannelSchema = z.enum(['TEXT', 'VOICE'])

export type TutorAssistantChannel = z.infer<typeof tutorAssistantChannelSchema>

export const tutorAssistantResponseStatusSchema = z.enum([
  'ANSWERED',
  'NEEDS_CONFIRMATION',
  'NEEDS_CLARIFICATION',
  'BLOCKED',
])

export type TutorAssistantResponseStatus = z.infer<
  typeof tutorAssistantResponseStatusSchema
>

export const tutorAssistantMissingSlotSchema = z.enum([
  'PET',
  'SERVICE',
  'DATE',
  'TIME',
])

export type TutorAssistantMissingSlot = z.infer<
  typeof tutorAssistantMissingSlotSchema
>

export const tutorAssistantAppointmentDraftSchema = z.object({
  assistantSummary: z.string().trim().min(1),
  clientNotes: optionalString,
  missingSlots: z.array(tutorAssistantMissingSlotSchema).default([]),
  petId: optionalString,
  petName: optionalString,
  serviceIds: z.array(z.string().trim().min(1)).default([]),
  serviceNames: z.array(z.string().trim().min(1)).default([]),
  sourceTranscript: z.string().trim().min(1),
  startAt: z.coerce.date().nullable().default(null),
})

export type TutorAssistantAppointmentDraft = z.infer<
  typeof tutorAssistantAppointmentDraftSchema
>

export const tutorAssistantInteractionSummarySchema = z.object({
  channel: tutorAssistantChannelSchema.nullable().default(null),
  channelLabel: optionalString,
  inferenceKey: z.string().trim().min(1),
  intent: tutorAssistantIntentSchema,
  intentLabel: z.string().trim().min(1),
  occurredAt: z.coerce.date(),
  replyPreview: optionalString,
  status: tutorAssistantResponseStatusSchema,
  statusLabel: z.string().trim().min(1),
})

export type TutorAssistantInteractionSummary = z.infer<
  typeof tutorAssistantInteractionSummarySchema
>

export const tutorAssistantUsageSummarySchema = z.object({
  blockedLast30Days: z.number().int().nonnegative(),
  confirmationsLast30Days: z.number().int().nonnegative(),
  lastInteractionAt: z.coerce.date().nullable().default(null),
  needsClarificationLast30Days: z.number().int().nonnegative(),
  textInteractionsLast30Days: z.number().int().nonnegative(),
  totalLast7Days: z.number().int().nonnegative(),
  totalLast30Days: z.number().int().nonnegative(),
  voiceInteractionsLast30Days: z.number().int().nonnegative(),
})

export type TutorAssistantUsageSummary = z.infer<
  typeof tutorAssistantUsageSummarySchema
>

export const tutorAssistantUsageSnapshotSchema = z.object({
  recentInteractions: z.array(tutorAssistantInteractionSummarySchema).default([]),
  summary: tutorAssistantUsageSummarySchema,
})

export type TutorAssistantUsageSnapshot = z.infer<
  typeof tutorAssistantUsageSnapshotSchema
>

export const tutorAssistantOperationalValidationStatusSchema = z.enum([
  'NO_ACTIVITY',
  'EARLY_USAGE',
  'READY_WITH_GUARDRAILS',
  'ATTENTION_REQUIRED',
])

export type TutorAssistantOperationalValidationStatus = z.infer<
  typeof tutorAssistantOperationalValidationStatusSchema
>

export const tutorAssistantOperationalValidationVoiceCoverageSchema = z.enum([
  'NOT_OBSERVED',
  'PARTIAL',
  'OBSERVED',
])

export type TutorAssistantOperationalValidationVoiceCoverage = z.infer<
  typeof tutorAssistantOperationalValidationVoiceCoverageSchema
>

export const tutorAssistantOperationalValidationAlertSeveritySchema = z.enum([
  'INFO',
  'WARNING',
  'ERROR',
])

export type TutorAssistantOperationalValidationAlertSeverity = z.infer<
  typeof tutorAssistantOperationalValidationAlertSeveritySchema
>

export const tutorAssistantOperationalValidationAlertSchema = z.object({
  key: z.string().trim().min(1),
  nextStep: z.string().trim().min(1),
  severity: tutorAssistantOperationalValidationAlertSeveritySchema,
  summary: z.string().trim().min(1),
  title: z.string().trim().min(1),
})

export type TutorAssistantOperationalValidationAlert = z.infer<
  typeof tutorAssistantOperationalValidationAlertSchema
>

export const tutorAssistantOperationalValidationSnapshotSchema = z.object({
  alerts: z.array(tutorAssistantOperationalValidationAlertSchema).default([]),
  blockRatePercent: z.number().min(0).max(100),
  clarificationRatePercent: z.number().min(0).max(100),
  scheduleIntentCoverageLast30Days: z.number().int().nonnegative(),
  status: tutorAssistantOperationalValidationStatusSchema,
  statusLabel: z.string().trim().min(1),
  statusSummary: z.string().trim().min(1),
  voiceCoverageStatus: tutorAssistantOperationalValidationVoiceCoverageSchema,
  voiceCoverageStatusLabel: z.string().trim().min(1),
})

export type TutorAssistantOperationalValidationSnapshot = z.infer<
  typeof tutorAssistantOperationalValidationSnapshotSchema
>

export const tutorAssistantInterpretRequestSchema = z.object({
  channel: tutorAssistantChannelSchema.default('TEXT'),
  transcript: z.string().trim().min(1).max(500),
})

export type TutorAssistantInterpretRequest = z.infer<
  typeof tutorAssistantInterpretRequestSchema
>

export const tutorAssistantConfirmRequestSchema = z.object({
  draft: tutorAssistantAppointmentDraftSchema.extend({
    petId: z.string().trim().min(1),
    serviceIds: z.array(z.string().trim().min(1)).min(1),
    startAt: z.coerce.date(),
  }),
})

export type TutorAssistantConfirmRequest = z.infer<
  typeof tutorAssistantConfirmRequestSchema
>

export const tutorAssistantApiRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    input: tutorAssistantInterpretRequestSchema,
    mode: z.literal('INTERPRET'),
  }),
  z.object({
    input: tutorAssistantConfirmRequestSchema,
    mode: z.literal('CONFIRM'),
  }),
])

export type TutorAssistantApiRequest = z.infer<
  typeof tutorAssistantApiRequestSchema
>

export const tutorAssistantApiResponseSchema = z.object({
  appointmentId: optionalString,
  appointmentStartAt: z.coerce.date().nullable().default(null),
  draft: tutorAssistantAppointmentDraftSchema.nullable().default(null),
  envelopeStatus: z.enum([
    'ACCEPTED',
    'QUEUED',
    'RUNNING',
    'COMPLETED',
    'BLOCKED',
    'FAILED',
  ]),
  intent: tutorAssistantIntentSchema,
  intentLabel: z.string().trim().min(1),
  reply: z.string().trim().min(1),
  status: tutorAssistantResponseStatusSchema,
  statusLabel: z.string().trim().min(1),
  usageSnapshot: tutorAssistantUsageSnapshotSchema.nullable().default(null),
})

export type TutorAssistantApiResponse = z.infer<
  typeof tutorAssistantApiResponseSchema
>
