import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createFiscalDocumentInputSchema,
  listFiscalDocumentsQuerySchema,
} from '@/features/fiscal/schemas'
import { createFiscalDocument, listFiscalDocuments } from '@/features/fiscal/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.fiscal.visualizar')
    const query = readValidatedSearchParams(request, listFiscalDocumentsQuerySchema)

    return ok(await listFiscalDocuments(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('financeiro.fiscal.operar')
    enforceMutationRateLimit(actor, 'admin.fiscal-documents.create')
    const input = await readValidatedJson(request, createFiscalDocumentInputSchema)

    return created(await createFiscalDocument(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
