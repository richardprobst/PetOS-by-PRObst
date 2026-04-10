import type { Route } from 'next'
import Link from 'next/link'
import { SignOutButton } from '@/features/auth/components/sign-out-button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  getPrimaryProfile,
  hasPermission,
  isInternalUser,
} from '@/server/authorization/access-control'
import { resolveActorUnitSessionContext } from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { getCurrentAuthUser } from '@/server/auth/session'
import { collectSystemRuntimeSnapshot } from '@/server/system/runtime-state'

export const dynamic = 'force-dynamic'

const adminNavigation: Array<{
  href: Route
  label: string
  permission: string | null
}> = [
  { href: '/admin', label: 'Visao geral', permission: null },
  {
    href: '/admin/configuracoes',
    label: 'Configuracoes',
    permission: 'configuracao.visualizar',
  },
  { href: '/admin/sistema', label: 'Sistema', permission: 'sistema.runtime.visualizar' },
  { href: '/admin/agenda', label: 'Agenda', permission: 'agendamento.visualizar' },
  { href: '/admin/clientes', label: 'Clientes', permission: 'cliente.visualizar' },
  { href: '/admin/pets', label: 'Pets', permission: 'pet.visualizar' },
  { href: '/admin/servicos', label: 'Servicos', permission: 'servico.visualizar' },
  { href: '/admin/equipe', label: 'Equipe', permission: 'funcionario.visualizar' },
  { href: '/admin/escalas', label: 'Escalas', permission: 'equipe.escala.visualizar' },
  { href: '/admin/ponto', label: 'Ponto', permission: 'equipe.ponto.visualizar' },
  { href: '/admin/folha', label: 'Folha', permission: 'equipe.folha.visualizar' },
  {
    href: '/admin/documentos',
    label: 'Documentos',
    permission: 'documento.visualizar',
  },
  {
    href: '/admin/comunicacao',
    label: 'Comunicacao',
    permission: 'template_mensagem.visualizar',
  },
  { href: '/admin/estoque', label: 'Estoque', permission: 'estoque.visualizar' },
  { href: '/admin/pdv', label: 'PDV', permission: 'pdv.visualizar' },
  { href: '/admin/financeiro', label: 'Financeiro', permission: 'financeiro.visualizar' },
  { href: '/admin/comissoes', label: 'Comissoes', permission: 'comissao.visualizar' },
  {
    href: '/admin/report-cards',
    label: 'Report cards',
    permission: 'report_card.visualizar',
  },
]

function getRuntimeTone(state: string) {
  if (state === 'INSTALLED') {
    return 'success' as const
  }

  if (state === 'NOT_INSTALLED' || state === 'UNKNOWN') {
    return 'warning' as const
  }

  return 'danger' as const
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, runtime] = await Promise.all([
    getCurrentAuthUser(),
    collectSystemRuntimeSnapshot(prisma, getEnv()),
  ])
  const internalUser = user && user.active && isInternalUser(user) ? user : null
  const multiUnitContext = internalUser
    ? resolveActorUnitSessionContext(internalUser)
    : null
  const visibleNavigation = adminNavigation.filter(
    (item) =>
      item.permission === null ||
      (internalUser !== null && hasPermission(internalUser, item.permission)),
  )

  return (
    <div className="min-h-screen py-4 md:py-6">
      <div className="app-shell grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[rgba(255,252,247,0.72)] shadow-[var(--shadow-soft)] md:grid-cols-[260px_1fr]">
        <aside className="border-b border-[color:var(--line)] bg-[rgba(20,28,28,0.96)] px-5 py-6 text-white md:border-b-0 md:border-r md:border-[color:rgba(255,255,255,0.08)] md:px-6">
          <Link className="inline-flex items-center gap-3" href="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] font-mono text-sm uppercase tracking-[0.16em]">
              PO
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.56)]">
                Shell admin
              </p>
              <p className="mt-1 text-base font-semibold">Operacao interna</p>
            </div>
          </Link>

          <nav className="mt-10 grid gap-2">
            {visibleNavigation.map((item) => (
              <Link
                className="rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[rgba(255,255,255,0.72)] transition-colors duration-200 hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.56)]">
              Sessao ativa
            </p>
            <p className="mt-3 text-sm font-semibold text-white">
              {internalUser?.name ?? 'Sessao ainda nao autenticada'}
            </p>
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.64)]">
              {internalUser?.email ?? 'O guard da propria pagina decide o callback final.'}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.56)]">
              Perfil principal
            </p>
            <p className="mt-2 text-sm text-[rgba(255,255,255,0.84)]">
              {internalUser ? getPrimaryProfile(internalUser) : 'Aguardando autenticacao'}
            </p>
          </div>
        </aside>

        <div className="flex min-h-full flex-col bg-[rgba(255,255,255,0.36)]">
          <header className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4 md:px-8">
            <div>
              <p className="section-label">Area administrativa</p>
              <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">
                Acesso protegido para equipe interna com fluxos reais do MVP.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone={getRuntimeTone(runtime.lifecycleState)}>
                  {runtime.lifecycleState}
                </StatusBadge>
                <StatusBadge tone="info">{runtime.currentInstalledVersion ?? runtime.buildVersion}</StatusBadge>
                {multiUnitContext?.contextType ? (
                  <StatusBadge
                    tone={multiUnitContext.contextType === 'GLOBAL_AUTHORIZED' ? 'warning' : 'success'}
                  >
                    {multiUnitContext.contextType}
                  </StatusBadge>
                ) : null}
              </div>
              {multiUnitContext ? (
                <div className="mt-3 text-sm text-[color:var(--foreground-soft)]">
                  <p>
                    Unidade ativa:{' '}
                    <span className="font-semibold text-[color:var(--foreground)]">
                      {multiUnitContext.activeUnitId ?? 'nao resolvida'}
                    </span>
                  </p>
                  <p className="mt-1">
                    Unidade base:{' '}
                    <span className="font-semibold text-[color:var(--foreground)]">
                      {multiUnitContext.homeUnitId ?? 'nao informada'}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Link className="ui-button-secondary" href="/">
                Ir para o inicio
              </Link>
              {internalUser ? <SignOutButton /> : null}
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
