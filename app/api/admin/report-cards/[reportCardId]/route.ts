import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateReportCardInputSchema } from '@/features/report-cards/schemas'
import { updateReportCard } from '@/features/report-cards/services'

interface RouteContext {
  params: Promise<{
    reportCardId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('report_card.editar')
    enforceMutationRateLimit(actor, 'admin.report-cards.update')
    const { reportCardId } = await context.params
    const input = await readValidatedJson(request, updateReportCardInputSchema)

    return ok(await updateReportCard(actor, reportCardId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
