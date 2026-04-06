import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createServiceInputSchema,
  listServicesQuerySchema,
} from '@/features/services/schemas'
import { createService, listServices } from '@/features/services/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('servico.visualizar')
    const query = readValidatedSearchParams(request, listServicesQuerySchema)

    return ok(await listServices(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('servico.editar')
    enforceMutationRateLimit(actor, 'admin.services.create')
    const input = await readValidatedJson(request, createServiceInputSchema)

    return created(await createService(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
