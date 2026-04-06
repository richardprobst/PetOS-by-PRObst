import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateAppointmentCapacityRuleInputSchema } from '@/features/appointments/schemas'
import { updateAppointmentCapacityRule } from '@/features/appointments/advanced-services'

interface RouteContext {
  params: Promise<{
    ruleId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agenda.capacidade.editar')
    enforceMutationRateLimit(actor, 'admin.appointment_capacity_rules.update')
    const { ruleId } = await context.params
    const input = await readValidatedJson(request, updateAppointmentCapacityRuleInputSchema)

    return ok(await updateAppointmentCapacityRule(actor, ruleId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
