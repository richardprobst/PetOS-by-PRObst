import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import { readValidatedSearchParams } from '@/server/http/request'

export function readAdminUnitScopeQuery(request: Request) {
  return readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)
}
