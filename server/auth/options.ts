import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { credentialsSignInSchema } from '@/features/auth/schemas'
import { verifyPassword } from '@/server/auth/password'
import { prisma } from '@/server/db/prisma'
import {
  findStoredAuthUserByEmail,
  findStoredAuthUserById,
  toAuthenticatedUserData,
} from '@/server/auth/user-access'
import { getEnv } from '@/server/env'
import { writeAuditLog } from '@/server/audit/logging'
import { enforceConfiguredRateLimit } from '@/server/security/rate-limit'

export function getAuthOptions(): NextAuthOptions {
  const authEnvironment = getEnv()

  return {
    secret: authEnvironment.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt',
      maxAge: 60 * 60 * 8,
    },
    pages: {
      signIn: '/entrar',
    },
    providers: [
      CredentialsProvider({
        name: 'PetOS Credentials',
        credentials: {
          email: {
            label: 'E-mail',
            type: 'email',
          },
          password: {
            label: 'Senha',
            type: 'password',
          },
        },
        async authorize(credentials) {
          const parsedCredentials = credentialsSignInSchema.safeParse(credentials)

          if (!parsedCredentials.success) {
            await writeAuditLog(prisma, {
              action: 'auth.sign_in.validation_failed',
              entityName: 'AuthSession',
              details: {
                reason: 'invalid_credentials_payload',
              },
            })
            return null
          }

          enforceConfiguredRateLimit({
            scope: 'auth.sign-in',
            identifier: parsedCredentials.data.email,
            maxRequests: 10,
          })

          const user = await findStoredAuthUserByEmail(parsedCredentials.data.email)

          if (!user || !user.passwordHash || !user.active) {
            await writeAuditLog(prisma, {
              userId: user?.id ?? null,
              unitId: user?.unitId ?? null,
              action: 'auth.sign_in.failed',
              entityName: 'AuthSession',
              details: {
                email: parsedCredentials.data.email,
                reason: !user
                  ? 'user_not_found'
                  : !user.passwordHash
                    ? 'password_not_configured'
                    : 'inactive_user',
              },
            })
            return null
          }

          const passwordMatches = await verifyPassword(
            parsedCredentials.data.password,
            user.passwordHash,
          )

          if (!passwordMatches) {
            await writeAuditLog(prisma, {
              userId: user.id,
              unitId: user.unitId,
              action: 'auth.sign_in.failed',
              entityName: 'AuthSession',
              details: {
                email: parsedCredentials.data.email,
                reason: 'invalid_password',
              },
            })
            return null
          }

          await writeAuditLog(prisma, {
            userId: user.id,
            unitId: user.unitId,
            action: 'auth.sign_in.succeeded',
            entityName: 'AuthSession',
            details: {
              email: user.email,
              userType: user.userType,
            },
          })

          return toAuthenticatedUserData(user)
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.name = user.name
          token.email = user.email
          token.userType = user.userType
          token.unitId = user.unitId
          token.multiUnitContext = user.multiUnitContext
          token.active = user.active
          token.profiles = user.profiles
          token.permissions = user.permissions
          return token
        }

        if (!token.sub) {
          return token
        }

        const storedUser = await findStoredAuthUserById(token.sub)

        if (!storedUser) {
          token.active = false
          token.profiles = []
          token.permissions = []
          return token
        }

        token.name = storedUser.name
        token.email = storedUser.email
        token.userType = storedUser.userType
        token.unitId = storedUser.unitId
        token.multiUnitContext = storedUser.multiUnitContext
        token.active = storedUser.active
        token.profiles = storedUser.profiles
        token.permissions = storedUser.permissions

        return token
      },
      async session({ session, token }) {
        if (!session.user || !token.sub || !token.email || !token.name || !token.userType) {
          return session
        }

        session.user = {
          ...session.user,
          id: token.sub,
          name: token.name,
          email: token.email,
          userType: token.userType,
          unitId: token.unitId ?? null,
          multiUnitContext:
            token.multiUnitContext ?? {
              activeUnitId: token.unitId ?? null,
              contextOrigin: 'SESSION_DEFAULT',
              contextType: 'LOCAL',
            },
          active: token.active ?? true,
          profiles: token.profiles ?? [],
          permissions: token.permissions ?? [],
        }

        return session
      },
    },
  }
}
