import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createRefundInputSchema,
  listRefundsQuerySchema,
} from '@/features/finance/schemas'
import { createRefund, listRefunds } from '@/features/finance/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.visualizar')
    const query = readValidatedSearchParams(request, listRefundsQuerySchema)

    return ok(await listRefunds(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.reembolso.operar')
    enforceMutationRateLimit(actor, 'admin.refunds.create')
    const input = await readValidatedJson(request, createRefundInputSchema)

    return created(await createRefund(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
