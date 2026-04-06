import type { AuthenticatedUserData } from '@/server/auth/types'
import { enforceConfiguredRateLimit } from '@/server/security/rate-limit'

export function enforceMutationRateLimit(user: AuthenticatedUserData, scope: string) {
  enforceConfiguredRateLimit({
    scope,
    identifier: user.id,
    maxRequests: 30,
  })
}
