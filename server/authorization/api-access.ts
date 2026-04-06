import type { AuthenticatedUserData } from '@/server/auth/types'
import { getCurrentAuthUser } from '@/server/auth/session'
import { AppError } from '@/server/http/errors'
import { assertApiRuntimeAccess } from '@/server/system/access'
import {
  assertPermission,
  isInternalUser,
  isTutorUser,
} from '@/server/authorization/access-control'

export async function requireInternalApiUser(
  permission?: string,
): Promise<AuthenticatedUserData> {
  const user = await getCurrentAuthUser()

  if (!user) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required.')
  }

  if (!user.active) {
    throw new AppError('FORBIDDEN', 403, 'Inactive users cannot access this resource.')
  }

  if (!isInternalUser(user)) {
    throw new AppError('FORBIDDEN', 403, 'This resource is restricted to internal users.')
  }

  await assertApiRuntimeAccess('internal', user)

  if (permission) {
    assertPermission(user, permission)
  }

  return user
}

export async function requireTutorApiUser(permission?: string): Promise<AuthenticatedUserData> {
  const user = await getCurrentAuthUser()

  if (!user) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required.')
  }

  if (!user.active) {
    throw new AppError('FORBIDDEN', 403, 'Inactive users cannot access this resource.')
  }

  if (!isTutorUser(user)) {
    throw new AppError('FORBIDDEN', 403, 'This resource is restricted to tutors.')
  }

  await assertApiRuntimeAccess('tutor', user)

  if (permission) {
    assertPermission(user, permission)
  }

  return user
}
