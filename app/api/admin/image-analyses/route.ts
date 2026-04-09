import {
  createImageAnalysisInputSchema,
  listImageAnalysesQuerySchema,
} from '@/features/ai/vision/schemas'
import {
  createImageAnalysis,
  listImageAnalyses,
} from '@/features/ai/vision/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { enforceMutationRateLimit } from '@/server/security/operations'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('ai.imagem.visualizar')
    const query = readValidatedSearchParams(request, listImageAnalysesQuerySchema)

    return ok(await listImageAnalyses(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('ai.imagem.executar')
    enforceMutationRateLimit(actor, 'admin.image-analysis.create')
    const input = await readValidatedJson(request, createImageAnalysisInputSchema)

    return created(await createImageAnalysis(actor, input, 'ADMIN_API'))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
