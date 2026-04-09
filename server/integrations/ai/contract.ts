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

export const aiProviderAdapterDescriptorSchema = z.object({
  adapterId: z.string().trim().min(1),
  contractVersion: z.string().trim().min(1),
  providerId: z.string().trim().min(1).nullable().default(null),
  modelId: z.string().trim().min(1).nullable().default(null),
  supportedModules: z.array(aiInferenceModuleSchema).min(1),
})

export type AiProviderAdapterDescriptor = z.infer<
  typeof aiProviderAdapterDescriptorSchema
>

export type AiProviderAdapter = {
  adapterId: string
  contractVersion: string
  providerId?: string | null
  modelId?: string | null
  supportedModules: readonly z.infer<typeof aiInferenceModuleSchema>[]
  execute(
    input: AiProviderExecutionRequest,
  ): Promise<AiProviderExecutionResponse>
}

export function normalizeAiProviderAdapter(input: AiProviderAdapter) {
  return aiProviderAdapterDescriptorSchema.parse({
    adapterId: input.adapterId,
    contractVersion: input.contractVersion,
    modelId: input.modelId ?? null,
    providerId: input.providerId ?? null,
    supportedModules: [...input.supportedModules],
  })
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
