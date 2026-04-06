import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateFiscalDocumentStatusInputSchema } from '@/features/fiscal/schemas'
import { updateFiscalDocumentStatus } from '@/features/fiscal/services'

interface RouteContext {
  params: Promise<{
    documentId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('financeiro.fiscal.operar')
    enforceMutationRateLimit(actor, 'admin.fiscal-documents.update')
    const { documentId } = await context.params
    const input = await readValidatedJson(request, updateFiscalDocumentStatusInputSchema)

    return ok(await updateFiscalDocumentStatus(actor, documentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
