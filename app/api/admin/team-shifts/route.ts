import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createTeamShiftInputSchema,
  listTeamShiftsQuerySchema,
} from '@/features/team-operations/schemas'
import { createTeamShift, listTeamShifts } from '@/features/team-operations/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('equipe.escala.visualizar')
    const query = readValidatedSearchParams(request, listTeamShiftsQuerySchema)

    return ok(await listTeamShifts(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('equipe.escala.editar')
    enforceMutationRateLimit(actor, 'admin.team-shifts.create')
    const input = await readValidatedJson(request, createTeamShiftInputSchema)

    return created(await createTeamShift(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
