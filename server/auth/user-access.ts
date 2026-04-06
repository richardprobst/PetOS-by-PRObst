import { Prisma } from '@prisma/client'
import { prisma } from '@/server/db/prisma'
import type { AuthenticatedUserData, StoredAuthenticatedUser } from '@/server/auth/types'

const authUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  passwordHash: true,
  userType: true,
  unitId: true,
  active: true,
  profiles: {
    select: {
      profile: {
        select: {
          name: true,
          permissions: {
            select: {
              permission: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
})

type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect
}>

function mapAuthUserRecord(record: AuthUserRecord): StoredAuthenticatedUser {
  const profiles = record.profiles.map((userProfile) => userProfile.profile.name)
  const permissions = Array.from(
    new Set(
      record.profiles.flatMap((userProfile) =>
        userProfile.profile.permissions.map((profilePermission) => profilePermission.permission.name),
      ),
    ),
  ).sort()

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    passwordHash: record.passwordHash,
    userType: record.userType,
    unitId: record.unitId,
    active: record.active,
    profiles,
    permissions,
  }
}

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase()
}

export async function findStoredAuthUserByEmail(email: string): Promise<StoredAuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmailAddress(email),
    },
    select: authUserSelect,
  })

  return user ? mapAuthUserRecord(user) : null
}

export async function findStoredAuthUserById(id: string): Promise<StoredAuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: authUserSelect,
  })

  return user ? mapAuthUserRecord(user) : null
}

export function toAuthenticatedUserData(user: StoredAuthenticatedUser): AuthenticatedUserData {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    unitId: user.unitId,
    active: user.active,
    profiles: user.profiles,
    permissions: user.permissions,
  }
}
