import { getConfigurationCenterSnapshot } from '@/features/configuration/management'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { readAdminUnitScopeQuery } from '@/server/http/admin-contracts'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()
    const query = readAdminUnitScopeQuery(request)

    return ok({
      configurationCenter: await getConfigurationCenterSnapshot(
        actor,
        query.unitId,
      ),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
