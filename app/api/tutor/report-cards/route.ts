import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { listTutorReportCards } from '@/features/tutor/services'

export async function GET(request: Request) {
  try {
    const tutor = await requireTutorApiUser('report_card.visualizar_proprio')

    return ok(await listTutorReportCards(tutor))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
