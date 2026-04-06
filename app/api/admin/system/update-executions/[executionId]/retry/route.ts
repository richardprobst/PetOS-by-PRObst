import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { created, routeErrorResponse } from '@/server/http/responses'
import { readValidatedJson } from '@/server/http/request'
import { retryUpdateExecution } from '@/features/updater/engine'
import { updateExecutionInputSchema } from '@/features/updater/schemas'

interface RetryUpdateExecutionRouteContext {
  params: Promise<{
    executionId: string
  }>
}

export async function POST(
  request: Request,
  { params }: RetryUpdateExecutionRouteContext,
) {
  try {
    const actor = await requireInternalApiUser('sistema.update.operar')
    enforceMutationRateLimit(actor, 'admin.system.update.retry')
    const payload = await readValidatedJson(request, updateExecutionInputSchema)
    const { executionId } = await params

    return created(
      await retryUpdateExecution(actor, {
        backupConfirmed: payload.backupConfirmed,
        executionId,
      }),
    )
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
