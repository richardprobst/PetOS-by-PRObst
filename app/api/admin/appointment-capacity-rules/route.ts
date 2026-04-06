import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createAppointmentCapacityRuleInputSchema,
  listAppointmentCapacityRulesQuerySchema,
} from '@/features/appointments/schemas'
import {
  createAppointmentCapacityRule,
  listAppointmentCapacityRules,
} from '@/features/appointments/advanced-services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.capacidade.visualizar')
    const query = readValidatedSearchParams(request, listAppointmentCapacityRulesQuerySchema)

    return ok(await listAppointmentCapacityRules(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.capacidade.editar')
    enforceMutationRateLimit(actor, 'admin.appointment_capacity_rules.create')
    const input = await readValidatedJson(request, createAppointmentCapacityRuleInputSchema)

    return created(await createAppointmentCapacityRule(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
