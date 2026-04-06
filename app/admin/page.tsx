import type { Route } from 'next'
import Link from 'next/link'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { listAppointments } from '@/features/appointments/services'
import { listClients } from '@/features/clients/services'
import { listCommissionSummaries } from '@/features/commissions/services'
import { listEmployees } from '@/features/employees/services'
import { listFinancialTransactions } from '@/features/finance/services'
import { listMessageLogs } from '@/features/messages/services'
import { listPets } from '@/features/pets/services'
import { listReportCards } from '@/features/report-cards/services'
import { listServices } from '@/features/services/services'
import { hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface OverviewRow {
  area: string
  count: number
  href: Route
}

export default async function AdminPage() {
  const actor = await requireInternalAreaUser('/admin')
  const canViewClients = hasPermission(actor, 'cliente.visualizar')
  const canViewPets = hasPermission(actor, 'pet.visualizar')
  const canViewServices = hasPermission(actor, 'servico.visualizar')
  const canViewEmployees = hasPermission(actor, 'funcionario.visualizar')
  const canViewAppointments = hasPermission(actor, 'agendamento.visualizar')
  const canViewFinancial = hasPermission(actor, 'financeiro.visualizar')
  const canViewCommunication = hasPermission(actor, 'template_mensagem.visualizar')
  const canViewCommissions = hasPermission(actor, 'comissao.visualizar')
  const canViewReportCards = hasPermission(actor, 'report_card.visualizar')
  const canViewSystem = hasPermission(actor, 'sistema.runtime.visualizar')

  const [
    clients,
    pets,
    services,
    employees,
    appointments,
    financialTransactions,
    messageLogs,
    commissions,
    reportCards,
  ] = await Promise.all([
    canViewClients ? listClients(actor, {}) : Promise.resolve([]),
    canViewPets ? listPets(actor, {}) : Promise.resolve([]),
    canViewServices ? listServices(actor, {}) : Promise.resolve([]),
    canViewEmployees ? listEmployees(actor, {}) : Promise.resolve([]),
    canViewAppointments ? listAppointments(actor, {}) : Promise.resolve([]),
    canViewFinancial ? listFinancialTransactions(actor, {}) : Promise.resolve([]),
    canViewCommunication ? listMessageLogs(actor, {}) : Promise.resolve([]),
    canViewCommissions
      ? listCommissionSummaries(actor, {})
      : Promise.resolve({ summaries: [], items: [] }),
    canViewReportCards ? listReportCards(actor, {}) : Promise.resolve([]),
  ])

  const overviewRows = [
    canViewClients ? { area: 'Clientes', count: clients.length, href: '/admin/clientes' } : null,
    canViewPets ? { area: 'Pets', count: pets.length, href: '/admin/pets' } : null,
    canViewServices ? { area: 'Servicos', count: services.length, href: '/admin/servicos' } : null,
    canViewEmployees ? { area: 'Equipe', count: employees.length, href: '/admin/equipe' } : null,
    canViewAppointments ? { area: 'Agenda', count: appointments.length, href: '/admin/agenda' } : null,
    canViewSystem ? { area: 'Sistema', count: 1, href: '/admin/sistema' } : null,
    canViewFinancial
      ? { area: 'Financeiro', count: financialTransactions.length, href: '/admin/financeiro' }
      : null,
    canViewCommunication
      ? { area: 'Comunicacao', count: messageLogs.length, href: '/admin/comunicacao' }
      : null,
    canViewCommissions
      ? { area: 'Comissoes', count: commissions.items.length, href: '/admin/comissoes' }
      : null,
    canViewReportCards
      ? { area: 'Report cards', count: reportCards.length, href: '/admin/report-cards' }
      : null,
  ].filter((row): row is OverviewRow => row !== null)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Operacao interna do MVP ligada a cadastros, agenda, financeiro e portal."
        description="Esta visao geral centraliza o estado atual do sistema e distribui a equipe para os fluxos reais implementados no MVP."
      />

      <div className="surface-panel rounded-[1.75rem] p-6">
        {overviewRows.length > 0 ? (
          <DataTable
            columns={[
              {
                id: 'area',
                header: 'Modulo',
                render: (row) => row.area,
              },
              {
                id: 'count',
                header: 'Itens',
                render: (row) => row.count,
              },
              {
                id: 'action',
                header: 'Abrir',
                render: (row) => (
                  <Link className="ui-link text-sm font-semibold" href={row.href}>
                    Acessar modulo
                  </Link>
                ),
              },
            ]}
            rows={overviewRows}
          />
        ) : (
          <p className="text-sm text-[color:var(--foreground-soft)]">
            O perfil atual nao possui modulos administrativos liberados neste MVP.
          </p>
        )}
      </div>
    </div>
  )
}
