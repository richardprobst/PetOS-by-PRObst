import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { cancelPosSaleInputSchema } from '@/features/pos/schemas'
import { cancelPosSale } from '@/features/pos/services'

interface PosSaleCancelRouteContext {
  params: Promise<{
    saleId: string
  }>
}

export async function POST(request: Request, context: PosSaleCancelRouteContext) {
  try {
    const actor = await requireInternalApiUser('pdv.operar')
    enforceMutationRateLimit(actor, 'admin.pos-sales.cancel')
    const { saleId } = await context.params
    const input = await readValidatedJson(request, cancelPosSaleInputSchema)

    return ok(await cancelPosSale(actor, saleId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
