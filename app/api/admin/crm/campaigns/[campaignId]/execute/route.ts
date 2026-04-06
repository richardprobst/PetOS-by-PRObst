import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { prepareCrmCampaignExecution } from '@/features/crm/services'

interface RouteContext {
  params: Promise<{
    campaignId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.executar')
    enforceMutationRateLimit(actor, 'admin.crm.campaigns.execute')
    const { campaignId } = await context.params

    return ok(await prepareCrmCampaignExecution(actor, { campaignId }))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
