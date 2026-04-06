import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()

export const listCommissionsQuerySchema = z.object({
  employeeUserId: optionalString,
})

export type ListCommissionsQuery = z.infer<typeof listCommissionsQuerySchema>
