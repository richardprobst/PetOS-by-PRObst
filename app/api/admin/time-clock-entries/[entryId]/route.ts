import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateTimeClockEntryInputSchema } from '@/features/team-operations/schemas'
import { getTimeClockEntryDetails, updateTimeClockEntry } from '@/features/team-operations/services'

interface RouteContext {
  params: Promise<{
    entryId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.ponto.visualizar')
    const { entryId } = await context.params

    return ok(await getTimeClockEntryDetails(actor, entryId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.ponto.editar')
    enforceMutationRateLimit(actor, 'admin.time-clock-entries.update')
    const { entryId } = await context.params
    const input = await readValidatedJson(request, updateTimeClockEntryInputSchema)

    return ok(await updateTimeClockEntry(actor, entryId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
