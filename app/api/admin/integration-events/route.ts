import { readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { listIntegrationEventsQuerySchema } from '@/features/integrations/schemas'
import { listIntegrationEvents } from '@/features/integrations/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('integracao.evento.visualizar')
    const query = readValidatedSearchParams(request, listIntegrationEventsQuerySchema)

    return ok(await listIntegrationEvents(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
