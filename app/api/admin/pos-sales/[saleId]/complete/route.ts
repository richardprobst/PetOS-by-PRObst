import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { completePosSaleInputSchema } from '@/features/pos/schemas'
import { completePosSale } from '@/features/pos/services'

interface PosSaleCompleteRouteContext {
  params: Promise<{
    saleId: string
  }>
}

export async function POST(request: Request, context: PosSaleCompleteRouteContext) {
  try {
    const actor = await requireInternalApiUser('pdv.operar')
    enforceMutationRateLimit(actor, 'admin.pos-sales.complete')
    const { saleId } = await context.params
    const input = await readValidatedJson(request, completePosSaleInputSchema)

    return ok(await completePosSale(actor, saleId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

