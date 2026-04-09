import { getPhase3GovernanceSnapshot } from '@/features/phase3/governance'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()

    return ok({
      phase3: await getPhase3GovernanceSnapshot(actor),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
