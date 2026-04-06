import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { finalizePayrollRunInputSchema } from '@/features/team-operations/schemas'
import { finalizePayrollRun } from '@/features/team-operations/services'

interface RouteContext {
  params: Promise<{
    runId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.folha.editar')
    enforceMutationRateLimit(actor, 'admin.payroll-runs.finalize')
    const { runId } = await context.params
    const input = await readValidatedJson(request, finalizePayrollRunInputSchema)

    return ok(await finalizePayrollRun(actor, runId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
