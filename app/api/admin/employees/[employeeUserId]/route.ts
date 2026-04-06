import { readValidatedJson } from '@/server/http/request'
import { ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { updateEmployeeInputSchema } from '@/features/employees/schemas'
import { getEmployeeById, updateEmployee } from '@/features/employees/services'

interface RouteContext {
  params: Promise<{
    employeeUserId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('funcionario.visualizar')
    const { employeeUserId } = await context.params

    return ok(await getEmployeeById(actor, employeeUserId))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireInternalApiUser('funcionario.editar')
    enforceMutationRateLimit(actor, 'admin.employees.update')
    const { employeeUserId } = await context.params
    const input = await readValidatedJson(request, updateEmployeeInputSchema)

    return ok(await updateEmployee(actor, employeeUserId, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
