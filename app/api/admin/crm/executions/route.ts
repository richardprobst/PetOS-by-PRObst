import { readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { listCrmExecutionsQuerySchema } from '@/features/crm/schemas'
import { listCrmExecutions } from '@/features/crm/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.visualizar')
    const query = readValidatedSearchParams(request, listCrmExecutionsQuerySchema)

    return ok(await listCrmExecutions(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
