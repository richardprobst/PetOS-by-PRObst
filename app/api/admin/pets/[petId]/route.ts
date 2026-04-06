import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updatePetInputSchema } from '@/features/pets/schemas'
import { getPetById, updatePet } from '@/features/pets/services'

interface RouteContext {
  params: Promise<{
    petId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('pet.visualizar')
    const { petId } = await context.params

    return ok(await getPetById(actor, petId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('pet.editar')
    enforceMutationRateLimit(actor, 'admin.pets.update')
    const { petId } = await context.params
    const input = await readValidatedJson(request, updatePetInputSchema)

    return ok(await updatePet(actor, petId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
