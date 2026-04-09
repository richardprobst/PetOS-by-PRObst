import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import { updateTeamShiftInputSchema } from '@/features/team-operations/schemas'
import { getTeamShiftDetails, updateTeamShift } from '@/features/team-operations/services'

interface RouteContext {
  params: Promise<{
    shiftId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.escala.visualizar')
    const { shiftId } = await context.params
    const query = readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)

    return ok(await getTeamShiftDetails(actor, shiftId, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.escala.editar')
    enforceMutationRateLimit(actor, 'admin.team-shifts.update')
    const { shiftId } = await context.params
    const input = await readValidatedJson(request, updateTeamShiftInputSchema)

    return ok(await updateTeamShift(actor, shiftId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
