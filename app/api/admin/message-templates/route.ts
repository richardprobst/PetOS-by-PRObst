import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createMessageTemplateInputSchema,
  listMessageTemplatesQuerySchema,
} from '@/features/messages/schemas'
import { createMessageTemplate, listMessageTemplates } from '@/features/messages/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('template_mensagem.visualizar')
    const query = readValidatedSearchParams(request, listMessageTemplatesQuerySchema)

    return ok(await listMessageTemplates(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('template_mensagem.editar')
    enforceMutationRateLimit(actor, 'admin.message-templates.create')
    const input = await readValidatedJson(request, createMessageTemplateInputSchema)

    return created(await createMessageTemplate(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
