import { z } from 'zod'
import {
  operationalStatusIds,
  petSizeCategories,
  scheduleBlockTypes,
  taxiDogStatusIds,
} from '@/features/appointments/constants'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

const appointmentServiceItemSchema = z.object({
  serviceId: z.string().trim().min(1),
  employeeUserId: optionalString,
  agreedUnitPrice: z.coerce.number().positive().optional(),
})

const taxiDogInputSchema = z
  .object({
    assignedDriverUserId: optionalString,
    pickupAddress: optionalString,
    dropoffAddress: optionalString,
    pickupWindowStartAt: optionalDate,
    pickupWindowEndAt: optionalDate,
    dropoffWindowStartAt: optionalDate,
    dropoffWindowEndAt: optionalDate,
    feeAmount: z.coerce.number().min(0).default(0),
    notes: optionalString,
  })
  .refine(
    (value) =>
      (!value.pickupWindowStartAt && !value.pickupWindowEndAt) ||
      Boolean(value.pickupWindowStartAt && value.pickupWindowEndAt),
    {
      message: 'Pickup window requires both start and end time.',
      path: ['pickupWindowEndAt'],
    },
  )
  .refine(
    (value) =>
      (!value.dropoffWindowStartAt && !value.dropoffWindowEndAt) ||
      Boolean(value.dropoffWindowStartAt && value.dropoffWindowEndAt),
    {
      message: 'Dropoff window requires both start and end time.',
      path: ['dropoffWindowEndAt'],
    },
  )

const checkInChecklistItemSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  checked: z.boolean(),
  notes: optionalString,
})

export const createAppointmentInputSchema = z.object({
  unitId: optionalString,
  clientId: z.string().trim().min(1),
  petId: z.string().trim().min(1),
  startAt: z.coerce.date(),
  endAt: optionalDate,
  clientNotes: optionalString,
  internalNotes: optionalString,
  services: z.array(appointmentServiceItemSchema).min(1),
  taxiDog: taxiDogInputSchema.optional(),
})

export const updateAppointmentInputSchema = z
  .object({
    unitId: optionalString,
    clientId: optionalString,
    petId: optionalString,
    startAt: optionalDate,
    endAt: optionalDate,
    clientNotes: optionalString,
    internalNotes: optionalString,
    services: z.array(appointmentServiceItemSchema).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listAppointmentsQuerySchema = z.object({
  unitId: optionalString,
  clientId: optionalString,
  petId: optionalString,
  operationalStatusId: optionalString,
  startFrom: optionalDate,
  startTo: optionalDate,
})

export const changeAppointmentStatusInputSchema = z.object({
  nextStatusId: z.enum([
    operationalStatusIds.confirmed,
    operationalStatusIds.inService,
    operationalStatusIds.readyForPickup,
    operationalStatusIds.completed,
    operationalStatusIds.noShow,
  ]),
})

export const cancelAppointmentInputSchema = z.object({
  reason: optionalString,
})

export const rescheduleAppointmentInputSchema = z.object({
  startAt: z.coerce.date(),
  endAt: optionalDate,
  services: z.array(appointmentServiceItemSchema).min(1).optional(),
  reason: optionalString,
})

export const appointmentCheckInInputSchema = z.object({
  checklist: z.array(checkInChecklistItemSchema).min(1),
  notes: optionalString,
})

export const createAppointmentCapacityRuleInputSchema = z.object({
  employeeUserId: optionalString,
  sizeCategory: z.enum(petSizeCategories).optional(),
  breed: optionalString,
  maxConcurrentAppointments: z.coerce.number().int().positive(),
  notes: optionalString,
})

export const updateAppointmentCapacityRuleInputSchema = z
  .object({
    employeeUserId: optionalString,
    sizeCategory: z.enum(petSizeCategories).nullable().optional(),
    breed: z.string().trim().nullable().optional(),
    maxConcurrentAppointments: z.coerce.number().int().positive().optional(),
    active: z.boolean().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listAppointmentCapacityRulesQuerySchema = z.object({
  employeeUserId: optionalString,
  active: z.coerce.boolean().optional(),
})

export const createScheduleBlockInputSchema = z.object({
  employeeUserId: optionalString,
  blockType: z.enum(scheduleBlockTypes),
  title: z.string().trim().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  notes: optionalString,
})

export const updateScheduleBlockInputSchema = z
  .object({
    employeeUserId: optionalString,
    blockType: z.enum(scheduleBlockTypes).optional(),
    title: optionalString,
    startAt: optionalDate,
    endAt: optionalDate,
    active: z.boolean().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listScheduleBlocksQuerySchema = z.object({
  employeeUserId: optionalString,
  active: z.coerce.boolean().optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
})

export const createTaxiDogRideInputSchema = taxiDogInputSchema

export const changeTaxiDogRideStatusInputSchema = z.object({
  nextStatus: z.enum(taxiDogStatusIds),
})

export const listTaxiDogRidesQuerySchema = z.object({
  appointmentId: optionalString,
  assignedDriverUserId: optionalString,
  status: z.enum(taxiDogStatusIds).optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
})

export type AppointmentServiceItemInput = z.infer<typeof appointmentServiceItemSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentInputSchema>
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>
export type ChangeAppointmentStatusInput = z.infer<typeof changeAppointmentStatusInputSchema>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentInputSchema>
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentInputSchema>
export type AppointmentCheckInInput = z.infer<typeof appointmentCheckInInputSchema>
export type TaxiDogInput = z.infer<typeof taxiDogInputSchema>
export type CreateAppointmentCapacityRuleInput = z.infer<typeof createAppointmentCapacityRuleInputSchema>
export type UpdateAppointmentCapacityRuleInput = z.infer<typeof updateAppointmentCapacityRuleInputSchema>
export type ListAppointmentCapacityRulesQuery = z.infer<typeof listAppointmentCapacityRulesQuerySchema>
export type CreateScheduleBlockInput = z.infer<typeof createScheduleBlockInputSchema>
export type UpdateScheduleBlockInput = z.infer<typeof updateScheduleBlockInputSchema>
export type ListScheduleBlocksQuery = z.infer<typeof listScheduleBlocksQuerySchema>
export type CreateTaxiDogRideInput = z.infer<typeof createTaxiDogRideInputSchema>
export type ChangeTaxiDogRideStatusInput = z.infer<typeof changeTaxiDogRideStatusInputSchema>
export type ListTaxiDogRidesQuery = z.infer<typeof listTaxiDogRidesQuerySchema>
