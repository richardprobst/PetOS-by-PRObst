import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createAppointmentInputSchema,
  listAppointmentsQuerySchema,
} from '@/features/appointments/schemas'
import { createAppointment, listAppointments } from '@/features/appointments/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('agendamento.visualizar')
    const query = readValidatedSearchParams(request, listAppointmentsQuerySchema)

    return ok(await listAppointments(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('agendamento.criar')
    enforceMutationRateLimit(actor, 'admin.appointments.create')
    const input = await readValidatedJson(request, createAppointmentInputSchema)

    return created(await createAppointment(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
