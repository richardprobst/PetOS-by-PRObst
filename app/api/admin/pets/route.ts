import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { createPetInputSchema, listPetsQuerySchema } from '@/features/pets/schemas'
import { createPet, listPets } from '@/features/pets/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('pet.visualizar')
    const query = readValidatedSearchParams(request, listPetsQuerySchema)

    return ok(await listPets(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('pet.editar')
    enforceMutationRateLimit(actor, 'admin.pets.create')
    const input = await readValidatedJson(request, createPetInputSchema)

    return created(await createPet(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
