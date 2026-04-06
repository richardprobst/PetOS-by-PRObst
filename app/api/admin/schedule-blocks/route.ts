import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createScheduleBlockInputSchema,
  listScheduleBlocksQuerySchema,
} from '@/features/appointments/schemas'
import {
  createScheduleBlock,
  listScheduleBlocks,
} from '@/features/appointments/advanced-services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.bloqueio.visualizar')
    const query = readValidatedSearchParams(request, listScheduleBlocksQuerySchema)

    return ok(await listScheduleBlocks(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('agenda.bloqueio.editar')
    enforceMutationRateLimit(actor, 'admin.schedule_blocks.create')
    const input = await readValidatedJson(request, createScheduleBlockInputSchema)

    return created(await createScheduleBlock(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
