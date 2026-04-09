import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import { updateProductInputSchema } from '@/features/inventory/schemas'
import { getProductDetails, updateProduct } from '@/features/inventory/services'

interface ProductRouteContext {
  params: Promise<{
    productId: string
  }>
}

export async function GET(request: Request, context: ProductRouteContext) {
  try {
    const actor = await requireInternalApiUser('produto.visualizar')
    const { productId } = await context.params
    const query = readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)

    return ok(await getProductDetails(actor, productId, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: ProductRouteContext) {
  try {
    const actor = await requireInternalApiUser('produto.editar')
    enforceMutationRateLimit(actor, 'admin.products.update')
    const { productId } = await context.params
    const input = await readValidatedJson(request, updateProductInputSchema)

    return ok(await updateProduct(actor, productId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
