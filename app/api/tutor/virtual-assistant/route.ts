import { revalidatePath } from 'next/cache'
import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireTutorApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { confirmTutorAssistantDraft, interpretTutorAssistantRequest } from '@/features/assistant/services'
import { tutorAssistantApiRequestSchema } from '@/features/assistant/schemas'

export async function POST(request: Request) {
  try {
    const tutor = await requireTutorApiUser('portal_tutor.acessar')
    const payload = await readValidatedJson(request, tutorAssistantApiRequestSchema)

    if (payload.mode === 'INTERPRET') {
      enforceMutationRateLimit(tutor, 'tutor.virtual-assistant.interpret')
      return ok(await interpretTutorAssistantRequest(tutor, payload.input))
    }

    enforceMutationRateLimit(tutor, 'tutor.virtual-assistant.confirm')
    const response = await confirmTutorAssistantDraft(tutor, payload.input)
    revalidatePath('/tutor')

    return ok(response)
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
