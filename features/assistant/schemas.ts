import { z } from 'zod'

const optionalString = z.string().trim().min(1).nullable().default(null)

export const tutorAssistantIntentSchema = z.enum([
  'SCHEDULE_APPOINTMENT',
  'QUERY_UPCOMING_APPOINTMENTS',
  'QUERY_FINANCE_SUMMARY',
  'QUERY_WAITLIST_STATUS',
  'QUERY_PENDING_DOCUMENTS',
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
  reply: z.string().trim().min(1),
  status: tutorAssistantResponseStatusSchema,
})

export type TutorAssistantApiResponse = z.infer<
  typeof tutorAssistantApiResponseSchema
>
