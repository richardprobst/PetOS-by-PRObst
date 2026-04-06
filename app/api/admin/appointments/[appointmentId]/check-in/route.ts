import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { appointmentCheckInInputSchema } from '@/features/appointments/schemas'
import { checkInAppointment } from '@/features/appointments/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('checkin.executar')
    enforceMutationRateLimit(actor, 'admin.appointments.checkin')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, appointmentCheckInInputSchema)

    return ok(await checkInAppointment(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
