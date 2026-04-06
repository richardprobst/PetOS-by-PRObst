import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { reprocessIntegrationEvent } from '@/features/integrations/services'

interface RouteContext {
  params: Promise<{
    eventId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('integracao.evento.reprocessar')
    enforceMutationRateLimit(actor, 'admin.integration-events.reprocess')
    const { eventId } = await context.params

    return ok(await reprocessIntegrationEvent(actor, eventId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
