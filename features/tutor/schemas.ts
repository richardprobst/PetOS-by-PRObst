import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const updateTutorProfileInputSchema = z
  .object({
    name: optionalString,
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    phone: optionalString,
    address: optionalString,
    city: optionalString,
    state: optionalString,
    zipCode: optionalString,
    contactPreference: optionalString,
    generalNotes: optionalString,
    password: z.string().min(8).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const createTutorAppointmentInputSchema = z.object({
  petId: z.string().trim().min(1),
  serviceIds: z.array(z.string().trim().min(1)).min(1),
  startAt: z.coerce.date(),
  endAt: optionalDate,
  clientNotes: optionalString,
})

const tutorPreCheckInPayloadShape = {
  consentConfirmed: z.boolean(),
  contactPhone: z.string().trim().min(8).max(32),
  healthUpdates: optionalString,
  notes: optionalString,
  transportNotes: optionalString,
}

export const tutorPreCheckInPayloadSchema = z
  .object(tutorPreCheckInPayloadShape)
  .refine((value) => value.consentConfirmed, {
    message: 'Pre-check-in requires confirmation of the submitted information.',
    path: ['consentConfirmed'],
  })

export const upsertTutorPreCheckInInputSchema = z
  .object({
    ...tutorPreCheckInPayloadShape,
    appointmentId: z.string().trim().min(1),
  })
  .refine((value) => value.consentConfirmed, {
    message: 'Pre-check-in requires confirmation of the submitted information.',
    path: ['consentConfirmed'],
  })

export const createTutorWaitlistEntryInputSchema = z
  .object({
    desiredServiceId: z.string().trim().min(1),
    notes: optionalString,
    petId: z.string().trim().min(1),
    preferredEndAt: z.coerce.date(),
    preferredStartAt: z.coerce.date(),
    requestedTransport: z.boolean().default(false),
  })
  .refine((value) => value.preferredEndAt > value.preferredStartAt, {
    message: 'Waitlist end time must be later than the start time.',
    path: ['preferredEndAt'],
  })

export const cancelTutorWaitlistEntryInputSchema = z.object({
  reason: optionalString,
  waitlistEntryId: z.string().trim().min(1),
})

export type UpdateTutorProfileInput = z.infer<typeof updateTutorProfileInputSchema>
export type CreateTutorAppointmentInput = z.infer<typeof createTutorAppointmentInputSchema>
export type TutorPreCheckInPayload = z.infer<typeof tutorPreCheckInPayloadSchema>
export type UpsertTutorPreCheckInInput = z.infer<typeof upsertTutorPreCheckInInputSchema>
export type CreateTutorWaitlistEntryInput = z.infer<typeof createTutorWaitlistEntryInputSchema>
export type CancelTutorWaitlistEntryInput = z.infer<typeof cancelTutorWaitlistEntryInputSchema>
