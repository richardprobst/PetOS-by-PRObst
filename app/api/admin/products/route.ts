import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createProductInputSchema,
  listProductsQuerySchema,
} from '@/features/inventory/schemas'
import {
  createProduct,
  listProducts,
} from '@/features/inventory/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('produto.visualizar')
    const query = readValidatedSearchParams(request, listProductsQuerySchema)

    return ok(await listProducts(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('produto.editar')
    enforceMutationRateLimit(actor, 'admin.products.create')
    const input = await readValidatedJson(request, createProductInputSchema)

    return created(await createProduct(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

