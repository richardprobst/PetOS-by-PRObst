import { readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { listCommissionsQuerySchema } from '@/features/commissions/schemas'
import { listCommissionSummaries } from '@/features/commissions/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('comissao.visualizar')
    const query = readValidatedSearchParams(request, listCommissionsQuerySchema)

    return ok(await listCommissionSummaries(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
