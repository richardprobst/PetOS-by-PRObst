import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalEmail = z.string().trim().email().transform((value) => value.toLowerCase()).optional()
const optionalBoolean = z.preprocess((value) => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return value
}, z.boolean().optional())

export const createClientInputSchema = z.object({
  unitId: optionalString,
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  state: optionalString,
  zipCode: optionalString,
  contactPreference: optionalString,
  generalNotes: optionalString,
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
})

export const updateClientInputSchema = z
  .object({
    unitId: optionalString,
    name: optionalString,
    email: optionalEmail,
    phone: optionalString,
    address: optionalString,
    city: optionalString,
    state: optionalString,
    zipCode: optionalString,
    contactPreference: optionalString,
    generalNotes: optionalString,
    password: z.string().min(8).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listClientsQuerySchema = z.object({
  search: optionalString,
  active: optionalBoolean,
})

export type CreateClientInput = z.infer<typeof createClientInputSchema>
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>
