import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { changeAppointmentStatusInputSchema } from '@/features/appointments/schemas'
import { changeAppointmentStatus } from '@/features/appointments/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agendamento.atualizar_status')
    enforceMutationRateLimit(actor, 'admin.appointments.status')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, changeAppointmentStatusInputSchema)

    return ok(await changeAppointmentStatus(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
