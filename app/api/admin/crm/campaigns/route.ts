import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createCrmCampaignInputSchema,
  listCrmCampaignsQuerySchema,
} from '@/features/crm/schemas'
import { createCrmCampaign, listCrmCampaigns } from '@/features/crm/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.visualizar')
    const query = readValidatedSearchParams(request, listCrmCampaignsQuerySchema)

    return ok(await listCrmCampaigns(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('crm.campanha.editar')
    enforceMutationRateLimit(actor, 'admin.crm.campaigns.create')
    const input = await readValidatedJson(request, createCrmCampaignInputSchema)

    return created(await createCrmCampaign(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
