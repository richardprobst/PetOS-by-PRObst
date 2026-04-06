import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { getTutorFinancialOverview } from '@/features/tutor/services'

export async function GET(request: Request) {
  try {
    const tutor = await requireTutorApiUser('financeiro.visualizar_proprio')

    return ok(await getTutorFinancialOverview(tutor))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
