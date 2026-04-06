import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { startUpdateExecution } from '@/features/updater/engine'
import { listUpdateExecutions } from '@/features/updater/services'
import {
  listUpdateExecutionsQuerySchema,
  updateExecutionInputSchema,
} from '@/features/updater/schemas'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('sistema.update.operar')
    const query = readValidatedSearchParams(request, listUpdateExecutionsQuerySchema)

    return ok(await listUpdateExecutions(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('sistema.update.operar')
    enforceMutationRateLimit(actor, 'admin.system.update.start')
    const input = await readValidatedJson(request, updateExecutionInputSchema)

    return created(await startUpdateExecution(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
