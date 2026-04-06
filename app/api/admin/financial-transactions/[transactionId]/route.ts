import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateFinancialTransactionInputSchema } from '@/features/finance/schemas'
import { updateFinancialTransaction } from '@/features/finance/services'

interface RouteContext {
  params: Promise<{
    transactionId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('financeiro.lancar')
    enforceMutationRateLimit(actor, 'admin.financial-transactions.update')
    const { transactionId } = await context.params
    const input = await readValidatedJson(request, updateFinancialTransactionInputSchema)

    return ok(await updateFinancialTransaction(actor, transactionId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
