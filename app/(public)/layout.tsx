import type { Route } from 'next'
import Link from 'next/link'
import { enforceUiRuntimeAccess } from '@/server/system/access'

export const dynamic = 'force-dynamic'

const publicLinks: Array<{ href: Route; label: string }> = [
  { href: '/', label: 'Visao geral' },
  { href: '/admin', label: 'Shell admin' },
  { href: '/tutor', label: 'Shell tutor' },
  { href: '/entrar', label: 'Entrar' },
]

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await enforceUiRuntimeAccess('public')

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(248,245,239,0.78)] backdrop-blur-xl">
        <div className="app-shell flex items-center justify-between py-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--foreground)] text-sm font-bold uppercase tracking-[0.2em] text-white">
              PO
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                PetOS
              </p>
              <p className="text-sm text-[color:var(--foreground-soft)]">
                Entrada publica do MVP
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[color:var(--foreground-soft)] md:flex">
            {publicLinks.map((link) => (
              <Link
                className="transition-colors duration-200 hover:text-[color:var(--foreground)]"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-[color:var(--line)] py-6 text-sm text-[color:var(--foreground-soft)]">
        <div className="app-shell flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>Entrada publica enxuta, com acesso aos shells protegidos do MVP.</p>
          <p>Fases futuras e integracoes financeiras completas seguem fora do escopo atual.</p>
        </div>
      </footer>
    </div>
  )
}
