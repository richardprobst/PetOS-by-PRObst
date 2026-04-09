import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import { updatePayrollRunInputSchema } from '@/features/team-operations/schemas'
import { getPayrollRunDetails, updatePayrollRun } from '@/features/team-operations/services'

interface RouteContext {
  params: Promise<{
    runId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.folha.visualizar')
    const { runId } = await context.params
    const query = readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)

    return ok(await getPayrollRunDetails(actor, runId, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('equipe.folha.editar')
    enforceMutationRateLimit(actor, 'admin.payroll-runs.update')
    const { runId } = await context.params
    const input = await readValidatedJson(request, updatePayrollRunInputSchema)

    return ok(await updatePayrollRun(actor, runId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
