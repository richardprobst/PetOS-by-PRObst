import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createDepositInputSchema,
  listDepositsQuerySchema,
} from '@/features/finance/schemas'
import { createDeposit, listDeposits } from '@/features/finance/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.visualizar')
    const query = readValidatedSearchParams(request, listDepositsQuerySchema)

    return ok(await listDeposits(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.deposito.operar')
    enforceMutationRateLimit(actor, 'admin.deposits.create')
    const input = await readValidatedJson(request, createDepositInputSchema)

    return created(await createDeposit(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
