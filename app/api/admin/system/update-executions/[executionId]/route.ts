import { requireInternalApiUser } from '@/server/authorization/api-access'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { AppError } from '@/server/http/errors'
import { getUpdateExecutionDetails } from '@/features/updater/services'

interface UpdateExecutionDetailsRouteContext {
  params: Promise<{
    executionId: string
  }>
}

export async function GET(
  request: Request,
  { params }: UpdateExecutionDetailsRouteContext,
) {
  try {
    const actor = await requireInternalApiUser('sistema.update.operar')
    const { executionId } = await params
    const execution = await getUpdateExecutionDetails(actor, { executionId })

    if (!execution) {
      throw new AppError('NOT_FOUND', 404, 'Execucao de update nao encontrada.')
    }

    return ok(execution)
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
