import { z } from 'zod'
import {
  aiInferenceModuleSchema,
  aiInferenceRequestSchema,
  aiInterpretedResultSchema,
  aiLayerErrorSchema,
  aiTechnicalMetadataSchema,
} from '@/features/ai/schemas'

export const aiProviderExecutionRequestSchema = z.object({
  request: aiInferenceRequestSchema,
})

export type AiProviderExecutionRequest = z.infer<
  typeof aiProviderExecutionRequestSchema
>

export const aiProviderExecutionResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('COMPLETED'),
    interpretedResult: aiInterpretedResultSchema,
    technicalMetadata: aiTechnicalMetadataSchema,
  }),
  z.object({
    status: z.literal('FAILED'),
    error: aiLayerErrorSchema.extend({
      code: z.literal('OPERATIONAL_FAILURE'),
    }),
    technicalMetadata: aiTechnicalMetadataSchema,
  }),
  z.object({
    status: z.literal('NOT_SUPPORTED'),
    error: aiLayerErrorSchema.extend({
      code: z.literal('NOT_SUPPORTED'),
    }),
    technicalMetadata: aiTechnicalMetadataSchema,
  }),
])

export type AiProviderExecutionResponse = z.infer<
  typeof aiProviderExecutionResponseSchema
>

export type AiProviderAdapter = {
  adapterId: string
  supportedModules: readonly z.infer<typeof aiInferenceModuleSchema>[]
  execute(
    input: AiProviderExecutionRequest,
  ): Promise<AiProviderExecutionResponse>
}

export function normalizeAiProviderExecutionRequest(
  input: AiProviderExecutionRequest,
) {
  return aiProviderExecutionRequestSchema.parse(input)
}

export function normalizeAiProviderExecutionResponse(
  input: AiProviderExecutionResponse,
) {
  return aiProviderExecutionResponseSchema.parse(input)
}
