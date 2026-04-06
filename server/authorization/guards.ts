import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentAuthUser } from '@/server/auth/session'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { AppError } from '@/server/http/errors'
import { enforceUiRuntimeAccess } from '@/server/system/access'
import {
  isInternalUser,
  isTutorUser,
  resolveAuthorizedHome,
} from '@/server/authorization/access-control'

function buildSignInPath(callbackUrl: string): Route {
  const searchParams = new URLSearchParams({
    callbackUrl,
  })

  return `/entrar?${searchParams.toString()}` as Route
}

export async function requireAuthenticatedUser(
  callbackUrl: string,
): Promise<AuthenticatedUserData> {
  const user = await getCurrentAuthUser()

  if (!user) {
    redirect(buildSignInPath(callbackUrl))
  }

  if (!user.active) {
    throw new AppError('FORBIDDEN', 403, 'Inactive users cannot access the application.')
  }

  return user
}

export async function requireInternalAreaUser(callbackUrl = '/admin') {
  const user = await requireAuthenticatedUser(callbackUrl)

  if (!isInternalUser(user)) {
    redirect(resolveAuthorizedHome(user))
  }

  await enforceUiRuntimeAccess('internal', user)
  return user
}

export async function requireTutorAreaUser(callbackUrl = '/tutor') {
  const user = await requireAuthenticatedUser(callbackUrl)

  if (!isTutorUser(user)) {
    redirect(resolveAuthorizedHome(user))
  }

  await enforceUiRuntimeAccess('tutor', user)
  return user
}
