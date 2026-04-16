import { getConfigurationFoundationSnapshot } from '@/features/configuration/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { assertCanReadConfigurationFoundationSurface } from '@/server/http/admin-contracts'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()
    assertCanReadConfigurationFoundationSurface(actor)

    return ok({
      configuration: await getConfigurationFoundationSnapshot(actor),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
