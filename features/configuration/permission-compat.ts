import type { AuthenticatedUserData } from '@/server/auth/types'
import {
  hasAnyPermission,
  isInternalUser,
} from '@/server/authorization/access-control'

const LEGACY_PHASE5_ADMIN_PROFILES = ['Administrador'] as const

export function hasLegacyPhase5AdminCompatibility(
  actor: AuthenticatedUserData,
) {
  return (
    actor.active &&
    isInternalUser(actor) &&
    LEGACY_PHASE5_ADMIN_PROFILES.some((profile) =>
      actor.profiles.includes(profile),
    )
  )
}

export function hasPhase5PermissionCompatibility(
  actor: AuthenticatedUserData,
  permissions: readonly string[],
) {
  return (
    hasAnyPermission(actor, [...permissions]) ||
    hasLegacyPhase5AdminCompatibility(actor)
  )
}
