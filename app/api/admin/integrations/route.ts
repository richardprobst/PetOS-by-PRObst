import { getIntegrationAdminSnapshot } from '@/features/integrations-admin/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()
    const { searchParams } = new URL(request.url)

    return ok({
      integrations: await getIntegrationAdminSnapshot(actor, searchParams.get('unitId')),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
