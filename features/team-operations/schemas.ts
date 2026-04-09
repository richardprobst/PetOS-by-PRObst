import {
  PayrollRunStatus,
  TeamShiftStatus,
  TeamShiftType,
  TimeClockEntryStatus,
} from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const listTeamShiftsQuerySchema = z.object({
  unitId: optionalString,
  employeeUserId: optionalString,
  status: z.nativeEnum(TeamShiftStatus).optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
})

export const createTeamShiftInputSchema = z.object({
  unitId: optionalString,
  employeeUserId: z.string().trim().min(1),
  shiftType: z.nativeEnum(TeamShiftType).default('WORK'),
  status: z.nativeEnum(TeamShiftStatus).default('PLANNED'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  notes: optionalString,
})

export const updateTeamShiftInputSchema = z
  .object({
    employeeUserId: optionalString,
    shiftType: z.nativeEnum(TeamShiftType).optional(),
    status: z.nativeEnum(TeamShiftStatus).optional(),
    startAt: optionalDate,
    endAt: optionalDate,
    notes: z.string().trim().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one team shift field must be provided.',
  })

export const listTimeClockEntriesQuerySchema = z.object({
  unitId: optionalString,
  employeeUserId: optionalString,
  status: z.nativeEnum(TimeClockEntryStatus).optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
})

export const openTimeClockEntryInputSchema = z.object({
  unitId: optionalString,
  employeeUserId: z.string().trim().min(1),
  shiftId: optionalString,
  clockInAt: optionalDate,
  notes: optionalString,
})

export const updateTimeClockEntryInputSchema = z
  .object({
    shiftId: z.string().trim().nullable().optional(),
    clockInAt: optionalDate,
    clockOutAt: optionalDate,
    breakMinutes: z.coerce.number().int().min(0).optional(),
    notes: z.string().trim().nullable().optional(),
    status: z.enum(['ADJUSTED', 'VOIDED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one time clock field must be provided.',
  })

export const closeTimeClockEntryInputSchema = z.object({
  clockOutAt: optionalDate,
  breakMinutes: z.coerce.number().int().min(0).default(0),
  notes: optionalString,
})

export const listPayrollRunsQuerySchema = z.object({
  unitId: optionalString,
  status: z.nativeEnum(PayrollRunStatus).optional(),
  periodStartFrom: optionalDate,
  periodEndTo: optionalDate,
})

export const createPayrollRunInputSchema = z.object({
  unitId: optionalString,
  periodStartAt: z.coerce.date(),
  periodEndAt: z.coerce.date(),
  employeeUserIds: z.array(z.string().trim().min(1)).min(1).optional(),
  notes: optionalString,
})

export const updatePayrollRunInputSchema = z
  .object({
    notes: z.string().trim().nullable().optional(),
    status: z.enum(['CANCELED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one payroll run field must be provided.',
  })

export const finalizePayrollRunInputSchema = z.object({
  notes: optionalString,
})

export type CloseTimeClockEntryInput = z.infer<typeof closeTimeClockEntryInputSchema>
export type CreatePayrollRunInput = z.infer<typeof createPayrollRunInputSchema>
export type CreateTeamShiftInput = z.infer<typeof createTeamShiftInputSchema>
export type ListPayrollRunsQuery = z.infer<typeof listPayrollRunsQuerySchema>
export type ListTeamShiftsQuery = z.infer<typeof listTeamShiftsQuerySchema>
export type ListTimeClockEntriesQuery = z.infer<typeof listTimeClockEntriesQuerySchema>
export type OpenTimeClockEntryInput = z.infer<typeof openTimeClockEntryInputSchema>
export type UpdatePayrollRunInput = z.infer<typeof updatePayrollRunInputSchema>
export type UpdateTeamShiftInput = z.infer<typeof updateTeamShiftInputSchema>
export type UpdateTimeClockEntryInput = z.infer<typeof updateTimeClockEntryInputSchema>
