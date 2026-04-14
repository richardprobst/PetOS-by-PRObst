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
        note: 'Os metadados de manifest do runtime serao finalizados depois que a execucao concluir com sucesso.',
      }
    },
    id: 'refresh_runtime_manifest',
    label: 'Atualizar metadados de manifest do runtime',
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
      `A tarefa pos-update ${taskId} nao e suportada por este runtime do updater.`,
    )
  }

  return task.execute(context)
}
