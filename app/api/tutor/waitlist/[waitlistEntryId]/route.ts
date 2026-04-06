import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { readValidatedJson } from '@/server/http/request'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { cancelTutorWaitlistEntryInputSchema } from '@/features/tutor/schemas'
import { cancelTutorWaitlistEntry } from '@/features/tutor/services'

interface RouteContext {
  params: Promise<{
    waitlistEntryId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const tutor = await requireTutorApiUser('agenda.waitlist.editar_proprio')
    enforceMutationRateLimit(tutor, 'tutor.waitlist.cancel')
    const { waitlistEntryId } = await context.params
    const input = cancelTutorWaitlistEntryInputSchema.parse({
      ...(await readValidatedJson(request, cancelTutorWaitlistEntryInputSchema.omit({
        waitlistEntryId: true,
      }))),
      waitlistEntryId,
    })

    return ok(
      await cancelTutorWaitlistEntry(tutor, input.waitlistEntryId, {
        reason: input.reason,
      }),
    )
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
