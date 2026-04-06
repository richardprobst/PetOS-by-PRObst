import { readValidatedJson } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { createTutorAppointmentInputSchema } from '@/features/tutor/schemas'
import { createTutorAppointment, getTutorDashboard } from '@/features/tutor/services'

export async function GET(request: Request) {
  try {
    const tutor = await requireTutorApiUser('agendamento.visualizar_proprio')
    const dashboard = await getTutorDashboard(tutor)

    return ok(dashboard.appointments)
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const tutor = await requireTutorApiUser('agendamento.criar_proprio')
    enforceMutationRateLimit(tutor, 'tutor.appointments.create')
    const input = await readValidatedJson(request, createTutorAppointmentInputSchema)

    return created(await createTutorAppointment(tutor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
