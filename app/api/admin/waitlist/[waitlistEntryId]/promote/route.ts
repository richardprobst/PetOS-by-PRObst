import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { promoteWaitlistEntryInputSchema } from '@/features/waitlist/schemas'
import { promoteWaitlistEntry } from '@/features/waitlist/services'

interface RouteContext {
  params: Promise<{
    waitlistEntryId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agenda.waitlist.editar')
    enforceMutationRateLimit(actor, 'admin.waitlist.promote')
    const { waitlistEntryId } = await context.params
    const input = await readValidatedJson(request, promoteWaitlistEntryInputSchema)

    return ok(await promoteWaitlistEntry(actor, waitlistEntryId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
