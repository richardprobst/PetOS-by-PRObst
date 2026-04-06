import type { Prisma } from '@prisma/client'
import type { Environment } from '@/server/env'
import type { ReleaseManifest } from '@/server/system/release-manifest'
import { AppError } from '@/server/http/errors'

export interface UpdatePostTaskContext {
  environment: Environment
  manifest: ReleaseManifest
  manifestHash: string
  transaction: Prisma.TransactionClient
}

export interface UpdatePostTaskDefinition {
  execute(context: UpdatePostTaskContext): Promise<unknown>
  id: string
  label: string
}

export const builtInUpdatePostTasks: Record<string, UpdatePostTaskDefinition> = {
  refresh_runtime_manifest: {
    async execute(context) {
      return {
        manifestHash: context.manifestHash,
        note: 'Runtime manifest metadata will be finalized after the execution succeeds.',
      }
    },
    id: 'refresh_runtime_manifest',
    label: 'Refresh runtime manifest metadata',
  },
}

export async function executeRegisteredPostUpdateTask(
  taskId: string,
  context: UpdatePostTaskContext,
  registry: Record<string, UpdatePostTaskDefinition> = builtInUpdatePostTasks,
) {
  const task = registry[taskId]

  if (!task) {
    throw new AppError(
      'CONFLICT',
      409,
      `The post-update task ${taskId} is not supported by this updater runtime.`,
    )
  }

  return task.execute(context)
}
