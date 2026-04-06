import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { createTaxiDogRideInputSchema } from '@/features/taxi-dog/schemas'
import { upsertTaxiDogRide } from '@/features/taxi-dog/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agenda.taxi_dog.editar')
    enforceMutationRateLimit(actor, 'admin.appointments.taxi_dog')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, createTaxiDogRideInputSchema)

    return ok(await upsertTaxiDogRide(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
