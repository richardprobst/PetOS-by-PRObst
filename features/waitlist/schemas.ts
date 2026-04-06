import { z } from 'zod'
import { waitlistStatusIds } from '@/features/appointments/constants'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const createWaitlistEntryInputSchema = z.object({
  unitId: optionalString,
  clientId: z.string().trim().min(1),
  petId: z.string().trim().min(1),
  desiredServiceId: z.string().trim().min(1),
  preferredEmployeeUserId: optionalString,
  preferredStartAt: z.coerce.date(),
  preferredEndAt: z.coerce.date(),
  requestedTransport: z.boolean().default(false),
  notes: optionalString,
})

export const listWaitlistEntriesQuerySchema = z.object({
  unitId: optionalString,
  clientId: optionalString,
  petId: optionalString,
  desiredServiceId: optionalString,
  status: z.enum(waitlistStatusIds).optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
})

export const cancelWaitlistEntryInputSchema = z.object({
  reason: optionalString,
})

export const promoteWaitlistEntryInputSchema = z.object({
  startAt: z.coerce.date(),
  endAt: optionalDate,
  employeeUserId: optionalString,
  clientNotes: optionalString,
  internalNotes: optionalString,
})

export type CreateWaitlistEntryInput = z.infer<typeof createWaitlistEntryInputSchema>
export type ListWaitlistEntriesQuery = z.infer<typeof listWaitlistEntriesQuerySchema>
export type CancelWaitlistEntryInput = z.infer<typeof cancelWaitlistEntryInputSchema>
export type PromoteWaitlistEntryInput = z.infer<typeof promoteWaitlistEntryInputSchema>
