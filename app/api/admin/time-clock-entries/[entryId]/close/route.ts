import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { closeTimeClockEntryInputSchema } from '@/features/team-operations/schemas'
import { closeTimeClockEntry } from '@/features/team-operations/services'

interface RouteContext {
  params: Promise<{
    entryId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.ponto.editar')
    enforceMutationRateLimit(actor, 'admin.time-clock-entries.close')
    const { entryId } = await context.params
    const input = await readValidatedJson(request, closeTimeClockEntryInputSchema)

    return ok(await closeTimeClockEntry(actor, entryId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
