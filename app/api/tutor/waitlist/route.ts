import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { readValidatedJson } from '@/server/http/request'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { createTutorWaitlistEntryInputSchema } from '@/features/tutor/schemas'
import { createTutorWaitlistEntry, listTutorWaitlistEntries } from '@/features/tutor/services'

export async function GET(request: Request) {
  try {
    const tutor = await requireTutorApiUser('agenda.waitlist.visualizar_proprio')

    return ok(await listTutorWaitlistEntries(tutor))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const tutor = await requireTutorApiUser('agenda.waitlist.editar_proprio')
    enforceMutationRateLimit(tutor, 'tutor.waitlist.create')
    const input = await readValidatedJson(request, createTutorWaitlistEntryInputSchema)

    return created(await createTutorWaitlistEntry(tutor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
