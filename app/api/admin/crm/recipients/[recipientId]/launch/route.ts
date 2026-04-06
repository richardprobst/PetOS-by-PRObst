import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { launchCrmCampaignRecipient } from '@/features/crm/services'

interface RouteContext {
  params: Promise<{
    recipientId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.executar')
    enforceMutationRateLimit(actor, 'admin.crm.recipients.launch')
    const { recipientId } = await context.params

    return ok(await launchCrmCampaignRecipient(actor, recipientId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
