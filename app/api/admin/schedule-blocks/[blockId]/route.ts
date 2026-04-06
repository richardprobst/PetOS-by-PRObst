import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateScheduleBlockInputSchema } from '@/features/appointments/schemas'
import { updateScheduleBlock } from '@/features/appointments/advanced-services'

interface RouteContext {
  params: Promise<{
    blockId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('agenda.bloqueio.editar')
    enforceMutationRateLimit(actor, 'admin.schedule_blocks.update')
    const { blockId } = await context.params
    const input = await readValidatedJson(request, updateScheduleBlockInputSchema)

    return ok(await updateScheduleBlock(actor, blockId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
