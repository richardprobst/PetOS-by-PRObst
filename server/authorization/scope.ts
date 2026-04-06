import type { AuthenticatedUserData } from '@/server/auth/types'
import { AppError } from '@/server/http/errors'

export function resolveScopedUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): string {
  if (actor.unitId && requestedUnitId && actor.unitId !== requestedUnitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to operate on another unit.')
  }

  const resolvedUnitId = requestedUnitId ?? actor.unitId

  if (!resolvedUnitId) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'A target unit is required for this operation.')
  }

  return resolvedUnitId
}

export function assertActorCanAccessUnit(
  actor: AuthenticatedUserData,
  unitId?: string | null,
): void {
  if (actor.unitId && unitId && actor.unitId !== unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this unit.')
  }
}
