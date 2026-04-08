import type { UserType } from '@prisma/client'

export interface AuthMultiUnitSessionSnapshot {
  activeUnitId: string | null
  contextType: 'LOCAL' | 'GLOBAL_AUTHORIZED'
  contextOrigin: 'SESSION_DEFAULT' | 'SESSION_OVERRIDE'
}

export interface AuthAccessContext {
  userType: UserType
  unitId: string | null
  multiUnitContext?: AuthMultiUnitSessionSnapshot
  active: boolean
  profiles: string[]
  permissions: string[]
}

export interface AuthenticatedUserData extends AuthAccessContext {
  id: string
  name: string
  email: string
}

export interface StoredAuthenticatedUser extends AuthenticatedUserData {
  passwordHash: string | null
}
