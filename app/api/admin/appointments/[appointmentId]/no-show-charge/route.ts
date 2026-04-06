import { readValidatedJson } from '@/server/http/request'
import { created, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { recordNoShowChargeInputSchema } from '@/features/finance/schemas'
import { recordNoShowProtectionCharge } from '@/features/finance/services'

interface RouteContext {
  params: Promise<{
    appointmentId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('financeiro.lancar')
    enforceMutationRateLimit(actor, 'admin.appointments.no-show-charge')
    const { appointmentId } = await context.params
    const input = await readValidatedJson(request, recordNoShowChargeInputSchema)

    return created(await recordNoShowProtectionCharge(actor, appointmentId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
