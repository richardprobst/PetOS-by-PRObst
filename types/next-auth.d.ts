import type { DefaultSession } from 'next-auth'
import type { AuthAccessContext } from '@/server/auth/types'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] &
      AuthAccessContext & {
        id: string
        name: string
        email: string
      }
  }

  interface User extends AuthAccessContext {
    id: string
    name: string
    email: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends Partial<AuthAccessContext> {
    userType?: AuthAccessContext['userType']
    unitId?: string | null
    active?: boolean
    profiles?: string[]
    permissions?: string[]
  }
}
