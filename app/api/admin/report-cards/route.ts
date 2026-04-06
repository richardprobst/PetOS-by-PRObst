import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createReportCardInputSchema,
  listReportCardsQuerySchema,
} from '@/features/report-cards/schemas'
import { createReportCard, listReportCards } from '@/features/report-cards/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('report_card.visualizar')
    const query = readValidatedSearchParams(request, listReportCardsQuerySchema)

    return ok(await listReportCards(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('report_card.editar')
    enforceMutationRateLimit(actor, 'admin.report-cards.create')
    const input = await readValidatedJson(request, createReportCardInputSchema)

    return created(await createReportCard(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
