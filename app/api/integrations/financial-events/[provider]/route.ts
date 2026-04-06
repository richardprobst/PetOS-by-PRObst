import { routeErrorResponse } from '@/server/http/responses'
import { AppError } from '@/server/http/errors'
import { normalizedIntegrationEventInputSchema } from '@/features/integrations/schemas'
import { ingestNormalizedIntegrationEvent } from '@/features/integrations/services'

interface RouteContext {
  params: Promise<{
    provider: string
  }>
}

function resolveProvider(providerParam: string) {
  switch (providerParam) {
    case 'stripe':
      return 'STRIPE' as const
    case 'mercado-pago':
      return 'MERCADO_PAGO' as const
    case 'fiscal':
      return 'FISCAL' as const
    default:
      throw new AppError('NOT_FOUND', 404, 'Unsupported integration provider.')
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { provider: providerParam } = await context.params
    const provider = resolveProvider(providerParam)
    const rawBody = await request.text()

    let payload: unknown

    try {
      payload = JSON.parse(rawBody)
    } catch {
      throw new AppError('BAD_REQUEST', 400, 'Invalid JSON payload.')
    }

    const input = normalizedIntegrationEventInputSchema.parse(payload)

    return Response.json(
      {
        data: await ingestNormalizedIntegrationEvent(provider, input, {
          headers: request.headers,
          rawBody,
        }),
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
