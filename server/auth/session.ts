import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/server/auth/options'
import type { AuthenticatedUserData } from '@/server/auth/types'

function isAuthenticatedUserData(value: unknown): value is AuthenticatedUserData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AuthenticatedUserData>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.userType === 'string' &&
    typeof candidate.active === 'boolean' &&
    Array.isArray(candidate.profiles) &&
    Array.isArray(candidate.permissions)
  )
}

export async function getCurrentAuthSession() {
  return getServerSession(getAuthOptions())
}

export async function getCurrentAuthUser(): Promise<AuthenticatedUserData | null> {
  const session = await getCurrentAuthSession()
  const sessionUser = session?.user

  if (!isAuthenticatedUserData(sessionUser)) {
    return null
  }

  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    userType: sessionUser.userType,
    unitId: sessionUser.unitId ?? null,
    active: sessionUser.active,
    profiles: sessionUser.profiles,
    permissions: sessionUser.permissions,
  }
}
