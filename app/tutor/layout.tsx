import type { Route } from 'next'
import Link from 'next/link'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { requireTutorAreaUser } from '@/server/authorization/guards'

export const dynamic = 'force-dynamic'

const tutorNavigation: Array<{
  href: {
    pathname: Route
    hash?: string
  }
  label: string
}> = [
  { href: { pathname: '/tutor' }, label: 'Visao geral' },
  { href: { pathname: '/tutor', hash: 'alertas' }, label: 'Alertas' },
  { href: { pathname: '/tutor', hash: 'perfil' }, label: 'Perfil' },
  { href: { pathname: '/tutor', hash: 'agendamento' }, label: 'Agendamento' },
  { href: { pathname: '/tutor', hash: 'jornada' }, label: 'Jornada' },
  { href: { pathname: '/tutor', hash: 'financeiro' }, label: 'Financeiro' },
  { href: { pathname: '/tutor', hash: 'waitlist' }, label: 'Waitlist' },
  { href: { pathname: '/tutor', hash: 'documentos' }, label: 'Documentos' },
  { href: { pathname: '/tutor', hash: 'historico' }, label: 'Historico' },
  { href: { pathname: '/tutor', hash: 'report-cards' }, label: 'Report cards' },
]

export default async function TutorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireTutorAreaUser('/tutor')

  return (
    <div className="min-h-screen py-4 md:py-6">
      <div className="app-shell overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[rgba(255,252,247,0.72)] shadow-[var(--shadow-soft)]">
        <header className="border-b border-[color:var(--line)] bg-[rgba(255,255,255,0.48)] px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="section-label">Portal do tutor</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Perfil, jornada, documentos, financeiro proprio e base PWA do portal ampliado do tutor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex flex-wrap gap-3 text-sm font-medium text-[color:var(--foreground-soft)]">
                {tutorNavigation.map((item) => (
                  <Link
                    className="rounded-full border border-[color:var(--line)] px-4 py-2 transition-colors duration-200 hover:border-[color:var(--line-strong)] hover:bg-[rgba(255,255,255,0.72)] hover:text-[color:var(--foreground)]"
                    href={item.href}
                    key={`${item.href.pathname}${item.href.hash ?? ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <SignOutButton />
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.52)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
              Sessao do tutor
            </p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">{user.name}</p>
            <p className="mt-1 text-xs text-[color:var(--foreground-soft)]">{user.email}</p>
          </div>
        </header>

        <main className="px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
