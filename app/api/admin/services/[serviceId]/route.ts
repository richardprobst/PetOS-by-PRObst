import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import { updateServiceInputSchema } from '@/features/services/schemas'
import { getServiceById, updateService } from '@/features/services/services'

interface RouteContext {
  params: Promise<{
    serviceId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('servico.visualizar')
    const { serviceId } = await context.params
    const query = readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)

    return ok(await getServiceById(actor, serviceId, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('servico.editar')
    enforceMutationRateLimit(actor, 'admin.services.update')
    const { serviceId } = await context.params
    const input = await readValidatedJson(request, updateServiceInputSchema)

    return ok(await updateService(actor, serviceId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
