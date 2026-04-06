import type { Route } from 'next'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { AppError } from '@/server/http/errors'

export function hasPermission(user: AuthenticatedUserData, permission: string) {
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthenticatedUserData, permissions: string[]) {
  return permissions.some((permission) => hasPermission(user, permission))
}

export function isTutorUser(user: AuthenticatedUserData) {
  return user.userType === 'CLIENT' || user.profiles.includes('Tutor')
}

export function isInternalUser(user: AuthenticatedUserData) {
  return !isTutorUser(user)
}

export function getPrimaryProfile(user: AuthenticatedUserData) {
  return user.profiles[0] ?? 'Sem perfil'
}

export function resolveAuthorizedHome(user: AuthenticatedUserData): Route {
  return isTutorUser(user) ? '/tutor' : '/admin'
}

export function assertPermission(user: AuthenticatedUserData, permission: string) {
  if (!hasPermission(user, permission)) {
    throw new AppError('FORBIDDEN', 403, `Missing permission: ${permission}.`)
  }
}
