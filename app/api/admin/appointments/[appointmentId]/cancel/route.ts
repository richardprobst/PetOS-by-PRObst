import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { cancelAppointmentInputSchema } from '@/features/appointments/schemas'
import { cancelAppointment } from '@/features/appointments/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agendamento.cancelar')
    enforceMutationRateLimit(actor, 'admin.appointments.cancel')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, cancelAppointmentInputSchema)

    return ok(await cancelAppointment(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
