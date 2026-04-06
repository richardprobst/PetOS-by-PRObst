import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalBoolean = z.preprocess((value) => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return value
}, z.boolean().optional())

const internalProfileNameSchema = z.enum(['Administrador', 'Recepcionista', 'Tosador'])
const employeePayrollModeSchema = z.enum(['MONTHLY', 'HOURLY', 'COMMISSION_ONLY'])

export const createEmployeeInputSchema = z.object({
  unitId: optionalString,
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  phone: optionalString,
  role: z.string().trim().min(1),
  specialty: optionalString,
  commissionPercentage: z.coerce.number().min(0).max(100).optional(),
  payrollMode: employeePayrollModeSchema.optional(),
  baseCompensationAmount: z.coerce.number().min(0).nullable().optional(),
  defaultDailyWorkMinutes: z.coerce.number().int().positive().optional(),
  profileNames: z.array(internalProfileNameSchema).min(1).optional(),
  active: z.boolean().optional(),
})

export const updateEmployeeInputSchema = z
  .object({
    unitId: optionalString,
    name: optionalString,
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    password: z.string().min(8).optional(),
    phone: optionalString,
    role: optionalString,
    specialty: optionalString,
    commissionPercentage: z.coerce.number().min(0).max(100).nullable().optional(),
    payrollMode: employeePayrollModeSchema.optional(),
    baseCompensationAmount: z.coerce.number().min(0).nullable().optional(),
    defaultDailyWorkMinutes: z.coerce.number().int().positive().optional(),
    profileNames: z.array(internalProfileNameSchema).min(1).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listEmployeesQuerySchema = z.object({
  search: optionalString,
  active: optionalBoolean,
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>
