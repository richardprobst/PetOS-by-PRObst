import { requireInternalApiUser } from '@/server/authorization/api-access'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { getUpdatePreflight } from '@/features/updater/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('sistema.update.operar')

    return ok(await getUpdatePreflight(actor))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
