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

export const createServiceInputSchema = z.object({
  unitId: optionalString,
  name: z.string().trim().min(1),
  description: optionalString,
  basePrice: z.coerce.number().positive(),
  estimatedDurationMinutes: z.coerce.number().int().positive(),
  active: z.boolean().optional(),
})

export const updateServiceInputSchema = z
  .object({
    unitId: optionalString,
    name: optionalString,
    description: optionalString,
    basePrice: z.coerce.number().positive().optional(),
    estimatedDurationMinutes: z.coerce.number().int().positive().optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listServicesQuerySchema = z.object({
  unitId: optionalString,
  search: optionalString,
  active: optionalBoolean,
})

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>
