import {
  createPredictiveInsightInputSchema,
  listPredictiveInsightsQuerySchema,
} from '@/features/insights/schemas'
import {
  createPredictiveInsight,
  listPredictiveInsights,
} from '@/features/insights/services'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { hasAnyPermission } from '@/server/authorization/access-control'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { AppError } from '@/server/http/errors'
import { enforceMutationRateLimit } from '@/server/security/operations'

function assertActorCanViewPredictiveInsights(actor: AuthenticatedUserData) {
  if (
    hasAnyPermission(actor, [
      'agendamento.visualizar',
      'ai.insights.visualizar',
      'ai.insights.executar',
    ])
  ) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission to inspect predictive insights for agenda demand.',
  )
}

function assertActorCanGeneratePredictiveInsights(actor: AuthenticatedUserData) {
  if (
    hasAnyPermission(actor, ['agendamento.visualizar', 'ai.insights.executar'])
  ) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission to generate predictive insights for agenda demand.',
  )
}

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()
    assertActorCanViewPredictiveInsights(actor)
    const query = readValidatedSearchParams(request, listPredictiveInsightsQuerySchema)

    return ok(await listPredictiveInsights(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser()
    assertActorCanGeneratePredictiveInsights(actor)
    enforceMutationRateLimit(actor, 'admin.predictive-insights.create')
    const input = await readValidatedJson(request, createPredictiveInsightInputSchema)

    return created(await createPredictiveInsight(actor, input, 'ADMIN_API'))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
