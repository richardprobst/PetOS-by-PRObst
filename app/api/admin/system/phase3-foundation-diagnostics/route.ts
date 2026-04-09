import { getAiFoundationDiagnostics } from '@/features/ai/admin-diagnostics'
import { getMultiUnitFoundationDiagnostics } from '@/features/multiunit/admin-diagnostics'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { ok, routeErrorResponse } from '@/server/http/responses'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser()

    return ok({
      ai: getAiFoundationDiagnostics(actor),
      multiunit: getMultiUnitFoundationDiagnostics(actor),
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
