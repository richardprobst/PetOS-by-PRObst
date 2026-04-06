import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  listInventoryMovementsQuerySchema,
  recordInventoryMovementInputSchema,
} from '@/features/inventory/schemas'
import {
  listInventoryMovements,
  recordInventoryMovement,
} from '@/features/inventory/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('estoque.visualizar')
    const query = readValidatedSearchParams(request, listInventoryMovementsQuerySchema)

    return ok(await listInventoryMovements(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('estoque.movimentar')
    enforceMutationRateLimit(actor, 'admin.inventory-movements.create')
    const input = await readValidatedJson(request, recordInventoryMovementInputSchema)

    return created(await recordInventoryMovement(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

