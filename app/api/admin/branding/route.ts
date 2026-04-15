import { getBrandingAdminSnapshot } from '@/features/branding/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { readAdminUnitScopeQuery } from '@/server/http/admin-contracts'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()
    const query = readAdminUnitScopeQuery(request)

    return ok({
      branding: await getBrandingAdminSnapshot(actor, query.unitId),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
