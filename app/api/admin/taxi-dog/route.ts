import { readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { listTaxiDogRidesQuerySchema } from '@/features/taxi-dog/schemas'
import { listTaxiDogRides } from '@/features/taxi-dog/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.taxi_dog.visualizar')
    const query = readValidatedSearchParams(request, listTaxiDogRidesQuerySchema)

    return ok(await listTaxiDogRides(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
