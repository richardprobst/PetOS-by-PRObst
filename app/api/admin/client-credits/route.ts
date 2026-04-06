import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createClientCreditInputSchema,
  listClientCreditsQuerySchema,
} from '@/features/finance/schemas'
import { createClientCredit, listClientCredits } from '@/features/finance/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.visualizar')
    const query = readValidatedSearchParams(request, listClientCreditsQuerySchema)

    return ok(await listClientCredits(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.credito.operar')
    enforceMutationRateLimit(actor, 'admin.client-credits.create')
    const input = await readValidatedJson(request, createClientCreditInputSchema)

    return created(await createClientCredit(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
