import { z } from 'zod'

export const updateExecutionInputSchema = z.object({
  backupConfirmed: z.boolean().default(false),
})

export const retryUpdateExecutionInputSchema = updateExecutionInputSchema.extend({
  executionId: z.string().trim().min(1),
})

export const listUpdateExecutionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})
