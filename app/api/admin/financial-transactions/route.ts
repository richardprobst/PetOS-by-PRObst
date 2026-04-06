import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createFinancialTransactionInputSchema,
  listFinancialTransactionsQuerySchema,
} from '@/features/finance/schemas'
import {
  createFinancialTransaction,
  listFinancialTransactions,
} from '@/features/finance/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.visualizar')
    const query = readValidatedSearchParams(request, listFinancialTransactionsQuerySchema)

    return ok(await listFinancialTransactions(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.lancar')
    enforceMutationRateLimit(actor, 'admin.financial-transactions.create')
    const input = await readValidatedJson(request, createFinancialTransactionInputSchema)

    return created(await createFinancialTransaction(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
