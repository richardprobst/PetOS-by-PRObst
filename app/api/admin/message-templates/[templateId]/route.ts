import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateMessageTemplateInputSchema } from '@/features/messages/schemas'
import { updateMessageTemplate } from '@/features/messages/services'

interface RouteContext {
  params: Promise<{
    templateId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('template_mensagem.editar')
    enforceMutationRateLimit(actor, 'admin.message-templates.update')
    const { templateId } = await context.params
    const input = await readValidatedJson(request, updateMessageTemplateInputSchema)

    return ok(await updateMessageTemplate(actor, templateId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
