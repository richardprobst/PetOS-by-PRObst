import { readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { getPosSaleDetails } from '@/features/pos/services'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'

interface PosSaleRouteContext {
  params: Promise<{
    saleId: string
  }>
}

export async function GET(request: Request, context: PosSaleRouteContext) {
  try {
    const actor = await requireInternalApiUser('pdv.visualizar')
    const { saleId } = await context.params
    const query = readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)

    return ok(await getPosSaleDetails(actor, saleId, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
