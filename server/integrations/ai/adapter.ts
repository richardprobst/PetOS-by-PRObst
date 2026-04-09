import {
  createAiAuditSnapshot,
  createAiBlockedOutcome,
  createAiCompletedOutcome,
  createAiFailedOutcome,
  createAiTechnicalMetadata,
} from '@/features/ai/domain'
import {
  completeAiInferenceExecution,
  runAiInferenceExecution,
  startAiInferenceExecution,
  type StartAiInferenceExecutionOptions,
} from '@/features/ai/execution'
import type {
  AiAuditSnapshot,
  AiExecutionEnvelope,
  AiInferenceOutcome,
  AiInferenceRequest,
} from '@/features/ai/schemas'
import {
  normalizeAiProviderAdapter,
  normalizeAiProviderExecutionRequest,
  normalizeAiProviderExecutionResponse,
  type AiProviderAdapter,
  type AiProviderAdapterDescriptor,
  type AiProviderExecutionRequest,
  type AiProviderExecutionResponse,
} from './contract'

export interface ExecuteAiProviderAdapterOptions
  extends StartAiInferenceExecutionOptions {}

export interface AiProviderAdapterExecutionResult {
  adapter: AiProviderAdapterDescriptor | null
  adapterRequest: AiProviderExecutionRequest | null
  adapterResponse: AiProviderExecutionResponse | null
  audit: AiAuditSnapshot
  envelope: AiExecutionEnvelope
  outcome: AiInferenceOutcome
}

export async function executeAiProviderAdapter(
  request: AiInferenceRequest,
  adapter: AiProviderAdapter,
  options: ExecuteAiProviderAdapterOptions = {},
): Promise<AiProviderAdapterExecutionResult> {
  const envelope = startAiInferenceExecution(request, {
    ...options,
    executionMode: 'IMMEDIATE',
  })

  if (envelope.status === 'BLOCKED' || envelope.status === 'FAILED') {
    return {
      adapter: null,
      adapterRequest: null,
      adapterResponse: null,
      audit: createAiAuditSnapshot(envelope.outcome),
      envelope,
      outcome: envelope.outcome,
    }
  }

  const runningEnvelope = runAiInferenceExecution(envelope)
  const normalizedAdapter = normalizeAiProviderAdapter(adapter)

  if (!normalizedAdapter.supportedModules.includes(request.module)) {
    const outcome = createAiBlockedOutcome(request, {
      details: createAdapterErrorDetails(normalizedAdapter, {
        message: 'Adapter does not support the requested AI module.',
      }),
      message: `The internal AI provider adapter "${normalizedAdapter.adapterId}" does not support the requested module.`,
      reasonCode: 'NOT_SUPPORTED',
      technicalMetadata: createAdapterTechnicalMetadata(normalizedAdapter),
    })
    const completedEnvelope = completeAiInferenceExecution(
      runningEnvelope,
      outcome,
    )

    return {
      adapter: normalizedAdapter,
      adapterRequest: null,
      adapterResponse: null,
      audit: createAiAuditSnapshot(outcome),
      envelope: completedEnvelope,
      outcome,
    }
  }

  const adapterRequest = normalizeAiProviderExecutionRequest({
    request,
  })

  try {
    const adapterResponse = normalizeAiProviderExecutionResponse(
      await adapter.execute(adapterRequest),
    )
    const outcome = mapAdapterResponseToOutcome(
      request,
      normalizedAdapter,
      adapterResponse,
    )
    const completedEnvelope = completeAiInferenceExecution(
      runningEnvelope,
      outcome,
    )

    return {
      adapter: normalizedAdapter,
      adapterRequest,
      adapterResponse,
      audit: createAiAuditSnapshot(outcome),
      envelope: completedEnvelope,
      outcome,
    }
  } catch (error) {
    const outcome = createAiFailedOutcome(request, {
      details: createAdapterErrorDetails(normalizedAdapter, error),
      message: `The internal AI provider adapter "${normalizedAdapter.adapterId}" failed to execute the normalized request.`,
      retryable: false,
      technicalMetadata: createAdapterTechnicalMetadata(normalizedAdapter),
    })
    const completedEnvelope = completeAiInferenceExecution(
      runningEnvelope,
      outcome,
    )

    return {
      adapter: normalizedAdapter,
      adapterRequest,
      adapterResponse: null,
      audit: createAiAuditSnapshot(outcome),
      envelope: completedEnvelope,
      outcome,
    }
  }
}

function mapAdapterResponseToOutcome(
  request: AiInferenceRequest,
  adapter: AiProviderAdapterDescriptor,
  response: AiProviderExecutionResponse,
): AiInferenceOutcome {
  const technicalMetadata = createAdapterTechnicalMetadata(
    adapter,
    response.technicalMetadata,
  )

  switch (response.status) {
    case 'COMPLETED':
      return createAiCompletedOutcome(request, {
        interpretedResult: response.interpretedResult,
        technicalMetadata,
      })
    case 'FAILED':
      return createAiFailedOutcome(request, {
        details: createAdapterErrorDetails(adapter, {
          ...(response.error.details ?? {}),
          providerErrorCode: response.error.code,
        }),
        message: response.error.message,
        retryable: response.error.retryable,
        technicalMetadata,
      })
    case 'NOT_SUPPORTED':
      return createAiBlockedOutcome(request, {
        details: createAdapterErrorDetails(adapter, {
          ...(response.error.details ?? {}),
          providerErrorCode: response.error.code,
        }),
        message: response.error.message,
        reasonCode: 'NOT_SUPPORTED',
        technicalMetadata,
      })
  }
}

function createAdapterTechnicalMetadata(
  adapter: AiProviderAdapterDescriptor,
  input?: {
    handledAt: Date
    latencyMs: number | null
    modelId: string | null
    providerId: string | null
    providerRequestId: string | null
  },
) {
  return createAiTechnicalMetadata({
    handledAt: input?.handledAt,
    latencyMs: input?.latencyMs ?? null,
    modelId: input?.modelId ?? adapter.modelId,
    providerId: input?.providerId ?? adapter.providerId,
    providerRequestId: input?.providerRequestId ?? null,
  })
}

function createAdapterErrorDetails(
  adapter: AiProviderAdapterDescriptor,
  error: unknown,
) {
  if (error instanceof Error) {
    return {
      adapterId: adapter.adapterId,
      adapterContractVersion: adapter.contractVersion,
      errorName: error.name,
      message: error.message,
      stage: 'provider-adapter',
    }
  }

  if (typeof error === 'object' && error !== null) {
    return {
      adapterId: adapter.adapterId,
      adapterContractVersion: adapter.contractVersion,
      ...error,
      stage: 'provider-adapter',
    }
  }

  return {
    adapterId: adapter.adapterId,
    adapterContractVersion: adapter.contractVersion,
    message: 'Unknown provider adapter failure.',
    stage: 'provider-adapter',
  }
}
