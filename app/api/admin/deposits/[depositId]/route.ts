import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateDepositStatusInputSchema } from '@/features/finance/schemas'
import { updateDepositStatus } from '@/features/finance/services'

interface RouteContext {
  params: Promise<{
    depositId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('financeiro.deposito.operar')
    enforceMutationRateLimit(actor, 'admin.deposits.update')
    const { depositId } = await context.params
    const input = await readValidatedJson(request, updateDepositStatusInputSchema)

    return ok(await updateDepositStatus(actor, depositId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
