import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createMessageLogInputSchema,
  listMessageLogsQuerySchema,
} from '@/features/messages/schemas'
import { createMessageLog, listMessageLogs } from '@/features/messages/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('template_mensagem.visualizar')
    const query = readValidatedSearchParams(request, listMessageLogsQuerySchema)

    return ok(await listMessageLogs(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('template_mensagem.editar')
    enforceMutationRateLimit(actor, 'admin.message-logs.create')
    const input = await readValidatedJson(request, createMessageLogInputSchema)

    return created(await createMessageLog(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
