import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { changeTaxiDogRideStatusInputSchema } from '@/features/taxi-dog/schemas'
import { changeTaxiDogRideStatus } from '@/features/taxi-dog/services'

interface RouteContext {
  params: Promise<{
    rideId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agenda.taxi_dog.editar')
    enforceMutationRateLimit(actor, 'admin.taxi_dog.status')
    const { rideId } = await context.params
    const input = await readValidatedJson(request, changeTaxiDogRideStatusInputSchema)

    return ok(await changeTaxiDogRideStatus(actor, rideId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
