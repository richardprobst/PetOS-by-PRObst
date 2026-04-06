import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { readValidatedJson } from '@/server/http/request'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { tutorPreCheckInPayloadSchema } from '@/features/tutor/schemas'
import { getTutorPreCheckInStatus, upsertTutorPreCheckIn } from '@/features/tutor/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const tutor = await requireTutorApiUser('agendamento.pre_check_in.visualizar_proprio')
    const { appointmentId } = await context.params

    return ok(await getTutorPreCheckInStatus(tutor, appointmentId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const tutor = await requireTutorApiUser('agendamento.pre_check_in.editar_proprio')
    enforceMutationRateLimit(tutor, 'tutor.pre-check-in.update')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, tutorPreCheckInPayloadSchema)

    return ok(
      await upsertTutorPreCheckIn(tutor, {
        appointmentId,
        ...input,
      }),
    )
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
