import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateCrmCampaignInputSchema } from '@/features/crm/schemas'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import { getCrmCampaignDetails, updateCrmCampaign } from '@/features/crm/services'

interface RouteContext {
  params: Promise<{
    campaignId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.visualizar')
    const { campaignId } = await context.params
    const query = readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)

    return ok(await getCrmCampaignDetails(actor, campaignId, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.editar')
    enforceMutationRateLimit(actor, 'admin.crm.campaigns.update')
    const { campaignId } = await context.params
    const input = await readValidatedJson(request, updateCrmCampaignInputSchema)

    return ok(await updateCrmCampaign(actor, campaignId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
