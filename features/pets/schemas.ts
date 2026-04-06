import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalDate = z.coerce.date().optional()

export const createPetInputSchema = z.object({
  clientId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  species: z.string().trim().min(1),
  breed: optionalString,
  birthDate: optionalDate,
  weightKg: z.coerce.number().positive().optional(),
  healthNotes: optionalString,
  allergies: optionalString,
  primaryPhotoUrl: z.string().trim().url().optional(),
})

export const updatePetInputSchema = z
  .object({
    clientId: optionalString,
    name: optionalString,
    species: optionalString,
    breed: optionalString,
    birthDate: optionalDate,
    weightKg: z.coerce.number().positive().optional(),
    healthNotes: optionalString,
    allergies: optionalString,
    primaryPhotoUrl: z.string().trim().url().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listPetsQuerySchema = z.object({
  clientId: optionalString,
  search: optionalString,
})

export type CreatePetInput = z.infer<typeof createPetInputSchema>
export type UpdatePetInput = z.infer<typeof updatePetInputSchema>
export type ListPetsQuery = z.infer<typeof listPetsQuerySchema>
