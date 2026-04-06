import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createPayrollRunInputSchema,
  listPayrollRunsQuerySchema,
} from '@/features/team-operations/schemas'
import { createPayrollRun, listPayrollRuns } from '@/features/team-operations/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('equipe.folha.visualizar')
    const query = readValidatedSearchParams(request, listPayrollRunsQuerySchema)

    return ok(await listPayrollRuns(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('equipe.folha.editar')
    enforceMutationRateLimit(actor, 'admin.payroll-runs.create')
    const input = await readValidatedJson(request, createPayrollRunInputSchema)

    return created(await createPayrollRun(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
