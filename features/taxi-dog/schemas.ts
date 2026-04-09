import { z } from 'zod'
import { taxiDogStatusIds } from '@/features/appointments/constants'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const createTaxiDogRideInputSchema = z
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

export const changeTaxiDogRideStatusInputSchema = z.object({
  nextStatus: z.enum(taxiDogStatusIds),
})

export const listTaxiDogRidesQuerySchema = z.object({
  unitId: optionalString,
  appointmentId: optionalString,
  assignedDriverUserId: optionalString,
  status: z.enum(taxiDogStatusIds).optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
})

export type CreateTaxiDogRideInput = z.infer<typeof createTaxiDogRideInputSchema>
export type ChangeTaxiDogRideStatusInput = z.infer<typeof changeTaxiDogRideStatusInputSchema>
export type ListTaxiDogRidesQuery = z.infer<typeof listTaxiDogRidesQuerySchema>
