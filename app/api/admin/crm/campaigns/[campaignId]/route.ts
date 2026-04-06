import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateCrmCampaignInputSchema } from '@/features/crm/schemas'
import { updateCrmCampaign } from '@/features/crm/services'

interface RouteContext {
  params: Promise<{
    campaignId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.visualizar')
    const { campaignId } = await context.params
    const campaign = await prisma.crmCampaign.findUnique({
      where: {
        id: campaignId,
      },
      include: {
        createdBy: true,
        template: true,
        unit: true,
        _count: {
          select: {
            executions: true,
            recipients: true,
          },
        },
      },
    })

    if (!campaign) {
      throw new AppError('NOT_FOUND', 404, 'CRM campaign not found.')
    }

    if (actor.unitId && actor.unitId !== campaign.unitId) {
      throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this CRM campaign.')
    }

    return ok(campaign)
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
