import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateTutorProfileInputSchema } from '@/features/tutor/schemas'
import { getTutorDashboard, updateTutorProfile } from '@/features/tutor/services'

export async function GET(request: Request) {
  try {
    const tutor = await requireTutorApiUser('cliente.visualizar_proprio')
    const dashboard = await getTutorDashboard(tutor)

    return ok({
      client: {
        ...dashboard,
        appointments: undefined,
      },
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request) {
  try {
    const tutor = await requireTutorApiUser('cliente.editar_proprio')
    enforceMutationRateLimit(tutor, 'tutor.profile.update')
    const input = await readValidatedJson(request, updateTutorProfileInputSchema)

    return ok(await updateTutorProfile(tutor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
