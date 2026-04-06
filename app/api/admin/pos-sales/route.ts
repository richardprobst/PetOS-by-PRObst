import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createPosSaleInputSchema,
  listPosSalesQuerySchema,
} from '@/features/pos/schemas'
import {
  createPosSale,
  listPosSales,
} from '@/features/pos/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('pdv.visualizar')
    const query = readValidatedSearchParams(request, listPosSalesQuerySchema)

    return ok(await listPosSales(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('pdv.operar')
    enforceMutationRateLimit(actor, 'admin.pos-sales.create')
    const input = await readValidatedJson(request, createPosSaleInputSchema)

    return created(await createPosSale(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

