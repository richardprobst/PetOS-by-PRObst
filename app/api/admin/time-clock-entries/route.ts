import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  listTimeClockEntriesQuerySchema,
  openTimeClockEntryInputSchema,
} from '@/features/team-operations/schemas'
import { listTimeClockEntries, openTimeClockEntry } from '@/features/team-operations/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('equipe.ponto.visualizar')
    const query = readValidatedSearchParams(request, listTimeClockEntriesQuerySchema)

    return ok(await listTimeClockEntries(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('equipe.ponto.editar')
    enforceMutationRateLimit(actor, 'admin.time-clock-entries.open')
    const input = await readValidatedJson(request, openTimeClockEntryInputSchema)

    return created(await openTimeClockEntry(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
