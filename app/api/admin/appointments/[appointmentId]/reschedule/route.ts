import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { rescheduleAppointmentInputSchema } from '@/features/appointments/schemas'
import { rescheduleAppointment } from '@/features/appointments/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agendamento.editar')
    enforceMutationRateLimit(actor, 'admin.appointments.reschedule')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, rescheduleAppointmentInputSchema)

    return ok(await rescheduleAppointment(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
