import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createWaitlistEntryInputSchema,
  listWaitlistEntriesQuerySchema,
} from '@/features/waitlist/schemas'
import {
  createWaitlistEntry,
  listWaitlistEntries,
} from '@/features/waitlist/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.waitlist.visualizar')
    const query = readValidatedSearchParams(request, listWaitlistEntriesQuerySchema)

    return ok(await listWaitlistEntries(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.waitlist.editar')
    enforceMutationRateLimit(actor, 'admin.waitlist.create')
    const input = await readValidatedJson(request, createWaitlistEntryInputSchema)

    return created(await createWaitlistEntry(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
