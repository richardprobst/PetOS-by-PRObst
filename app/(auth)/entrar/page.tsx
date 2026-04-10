/* eslint-disable @next/next/no-img-element */
import { ActionFlash } from '@/components/ui/action-flash'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/features/auth/components/sign-in-form'
import { resolveBrandRuntimeForCurrentRequest } from '@/features/branding/services'
import { getCurrentAuthUser } from '@/server/auth/session'
import { resolveAuthorizedHome } from '@/server/authorization/access-control'

export const dynamic = 'force-dynamic'

interface SignInPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentAuthUser()
  const params = await searchParams
  const brandRuntime = await resolveBrandRuntimeForCurrentRequest('AUTH')

  if (user) {
    redirect(resolveAuthorizedHome(user))
  }

  return (
    <main className="surface-panel-strong rounded-[2rem] p-6 md:p-8">
      <ActionFlash message={params.message} status={params.status} />

      <div className="space-y-3">
        <p className="section-label">Entrar</p>
        {brandRuntime.assets.logoPrimaryUrl ? (
          <img
            alt={brandRuntime.identity.publicName}
            className="h-14 w-14 rounded-2xl border border-[color:var(--line)] bg-white/70 object-contain p-2"
            src={brandRuntime.assets.logoPrimaryUrl}
          />
        ) : null}
        <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">
          {brandRuntime.copy.loginHeadline}
        </h2>
        <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
          {brandRuntime.copy.loginDescription}
        </p>
      </div>

      <SignInForm />

      <div className="mt-6">
        <Link className="ui-link text-sm font-semibold" href="/">
          Voltar para a visão geral
        </Link>
      </div>
    </main>
  )
}
