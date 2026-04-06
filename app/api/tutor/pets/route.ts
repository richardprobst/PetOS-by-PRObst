import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { getTutorDashboard } from '@/features/tutor/services'

export async function GET(request: Request) {
  try {
    const tutor = await requireTutorApiUser('pet.visualizar_proprio')
    const dashboard = await getTutorDashboard(tutor)

    return ok(dashboard.pets)
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
