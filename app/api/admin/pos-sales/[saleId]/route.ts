import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { getPosSaleDetails } from '@/features/pos/services'

interface PosSaleRouteContext {
  params: Promise<{
    saleId: string
  }>
}

export async function GET(request: Request, context: PosSaleRouteContext) {
  try {
    const actor = await requireInternalApiUser('pdv.visualizar')
    const { saleId } = await context.params

    return ok(await getPosSaleDetails(actor, saleId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

