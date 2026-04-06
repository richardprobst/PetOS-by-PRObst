import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createClientInputSchema,
  listClientsQuerySchema,
} from '@/features/clients/schemas'
import { createClient, listClients } from '@/features/clients/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('cliente.visualizar')
    const query = readValidatedSearchParams(request, listClientsQuerySchema)

    return ok(await listClients(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('cliente.editar')
    enforceMutationRateLimit(actor, 'admin.clients.create')
    const input = await readValidatedJson(request, createClientInputSchema)

    return created(await createClient(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
