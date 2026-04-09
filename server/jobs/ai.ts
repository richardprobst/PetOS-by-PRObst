import {
  queueAiInferenceExecution,
  runAiInferenceExecution,
} from '@/features/ai/execution'
import type {
  AiAcceptedExecutionEnvelope,
  AiQueuedExecutionEnvelope,
  AiRunningExecutionEnvelope,
} from '@/features/ai/schemas'

export function scheduleAiExecutionJob(
  envelope: AiAcceptedExecutionEnvelope,
): AiQueuedExecutionEnvelope {
  return queueAiInferenceExecution(envelope)
}

export function startAiExecutionJob(
  envelope: AiAcceptedExecutionEnvelope | AiQueuedExecutionEnvelope,
): AiRunningExecutionEnvelope {
  return runAiInferenceExecution(envelope)
}
