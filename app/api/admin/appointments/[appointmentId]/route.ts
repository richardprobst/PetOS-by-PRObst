import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateAppointmentInputSchema } from '@/features/appointments/schemas'
import { getAppointmentById, updateAppointment } from '@/features/appointments/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agendamento.visualizar')
    const { appointmentId } = await context.params

    return ok(await getAppointmentById(actor, appointmentId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agendamento.editar')
    enforceMutationRateLimit(actor, 'admin.appointments.update')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, updateAppointmentInputSchema)

    return ok(await updateAppointment(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
