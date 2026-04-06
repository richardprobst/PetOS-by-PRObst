import { readValidatedJson, readValidatedSearchParams } from '@/server/http/request'
import { created, ok, routeErrorResponse } from '@/server/http/responses'
import { requireInternalApiUser } from '@/server/authorization/api-access'
import { enforceMutationRateLimit } from '@/server/security/operations'
import {
  createEmployeeInputSchema,
  listEmployeesQuerySchema,
} from '@/features/employees/schemas'
import { createEmployee, listEmployees } from '@/features/employees/services'

export async function GET(request: Request) {
  try {
    const actor = await requireInternalApiUser('funcionario.visualizar')
    const query = readValidatedSearchParams(request, listEmployeesQuerySchema)

    return ok(await listEmployees(actor, query))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInternalApiUser('funcionario.editar')
    enforceMutationRateLimit(actor, 'admin.employees.create')
    const input = await readValidatedJson(request, createEmployeeInputSchema)

    return created(await createEmployee(actor, input))
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
