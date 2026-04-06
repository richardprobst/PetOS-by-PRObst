import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentAuthUser } from '@/server/auth/session'
import { resolveAuthorizedHome } from '@/server/authorization/access-control'

export const dynamic = 'force-dynamic'

export default async function AccessResolverPage() {
  const user = await getCurrentAuthUser()

  if (!user) {
    redirect('/entrar' as Route)
  }

  redirect(resolveAuthorizedHome(user))
}
