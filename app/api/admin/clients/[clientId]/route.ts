import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateClientInputSchema } from '@/features/clients/schemas'
import { getClientById, updateClient } from '@/features/clients/services'

interface RouteContext {
  params: Promise<{
    clientId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('cliente.visualizar')
    const { clientId } = await context.params

    return ok(await getClientById(actor, clientId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('cliente.editar')
    enforceMutationRateLimit(actor, 'admin.clients.update')
    const { clientId } = await context.params
    const input = await readValidatedJson(request, updateClientInputSchema)

    return ok(await updateClient(actor, clientId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
