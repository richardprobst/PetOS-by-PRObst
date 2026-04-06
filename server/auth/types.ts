import type { UserType } from '@prisma/client'

export interface AuthAccessContext {
  userType: UserType
  unitId: string | null
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
