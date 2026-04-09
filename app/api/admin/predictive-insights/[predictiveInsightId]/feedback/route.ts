import { hasAnyPermission } from '@/server/authorization/access-control'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { AppError } from '@/server/http/errors'
import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { recordPredictiveInsightFeedbackInputSchema } from '@/features/insights/schemas'
import { recordPredictiveInsightFeedback } from '@/features/insights/services'

function assertActorCanRecordPredictiveInsightFeedback(actor: AuthenticatedUserData) {
  if (
    hasAnyPermission(actor, [
      'ai.insights.feedback',
      'ai.insights.executar',
      'agendamento.visualizar',
    ])
  ) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission to record predictive insight feedback.',
  )
}

interface RouteContext {
  params: Promise<{
    predictiveInsightId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser()
    assertActorCanRecordPredictiveInsightFeedback(actor)
    enforceMutationRateLimit(actor, 'admin.predictive-insights.feedback')
    const { predictiveInsightId } = await context.params
    const input = await readValidatedJson(
      request,
      recordPredictiveInsightFeedbackInputSchema,
    )

    return ok(await recordPredictiveInsightFeedback(actor, predictiveInsightId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
