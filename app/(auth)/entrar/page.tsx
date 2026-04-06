import { ActionFlash } from '@/components/ui/action-flash'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/features/auth/components/sign-in-form'
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

  if (user) {
    redirect(resolveAuthorizedHome(user))
  }

  return (
    <main className="surface-panel-strong rounded-[2rem] p-6 md:p-8">
      <ActionFlash message={params.message} status={params.status} />

      <div className="space-y-3">
        <p className="section-label">Entrar</p>
        <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">
          Acesso oficial do PetOS
        </h2>
        <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
          O login do MVP usa `next-auth v4` com credenciais e separa automaticamente
          o contexto administrativo do portal do tutor.
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
