import { getConfigurationFoundationSnapshot } from '@/features/configuration/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()

    return ok({
      configuration: await getConfigurationFoundationSnapshot(actor),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
