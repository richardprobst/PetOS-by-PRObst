import { reviewImageAnalysisInputSchema } from '@/features/ai/vision/schemas'
import { reviewImageAnalysis } from '@/features/ai/vision/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { enforceMutationRateLimit } from '@/server/security/operations'

interface ReviewImageAnalysisRouteContext {
  params: Promise<{
    analysisId: string
  }>
}

export async function POST(
  request: Request,
  context: ReviewImageAnalysisRouteContext,
) {
  try {
    const actor = await requireInternalApiUser('ai.imagem.revisar')
    enforceMutationRateLimit(actor, 'admin.image-analysis.review')
    const { analysisId } = await context.params
    const input = await readValidatedJson(request, reviewImageAnalysisInputSchema)

    return ok(await reviewImageAnalysis(actor, analysisId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
