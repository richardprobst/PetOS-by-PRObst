import { readValidatedJson } from '@/server/http/request'
import { created, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { useClientCreditInputSchema } from '@/features/finance/schemas'
import { applyClientCredit } from '@/features/finance/services'

interface RouteContext {
  params: Promise<{
    creditId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('financeiro.credito.operar')
    enforceMutationRateLimit(actor, 'admin.client-credits.use')
    const { creditId } = await context.params
    const payload = await readValidatedJson(request, useClientCreditInputSchema)

    return created(
      await applyClientCredit(actor, {
        ...payload,
        creditId,
      }),
    )
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
