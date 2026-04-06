import { readValidatedJson } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { upsertClientCommunicationPreferenceInputSchema } from '@/features/crm/schemas'
import {
  listClientCommunicationPreferences,
  upsertClientCommunicationPreference,
} from '@/features/crm/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('crm.preferencia_contato.visualizar')
    return ok(await listClientCommunicationPreferences(actor))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('crm.preferencia_contato.editar')
    enforceMutationRateLimit(actor, 'admin.crm.preferences.upsert')
    const input = await readValidatedJson(request, upsertClientCommunicationPreferenceInputSchema)

    return created(await upsertClientCommunicationPreference(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
