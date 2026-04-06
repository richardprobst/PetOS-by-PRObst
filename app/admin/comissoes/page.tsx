import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { listCommissionSummaries } from '@/features/commissions/services'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

export default async function CommissionsPage() {
  const actor = await requireInternalAreaUser('/admin/comissoes')
  assertPermission(actor, 'comissao.visualizar')
  const data = await listCommissionSummaries(actor, {})

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comissoes"
        title="Consulta basica das comissoes calculadas por atendimento e profissional."
        description="A comissao segue bloqueada ate o atendimento estar concluido operacionalmente e o eixo financeiro chegar a `PAID`, inclusive quando houver pre-pagamento antecipado."
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'employee',
                header: 'Profissional',
                render: (summary) => summary.employeeName,
              },
              {
                id: 'items',
                header: 'Itens',
                render: (summary) => summary.itemCount,
              },
              {
                id: 'total',
                header: 'Total',
                render: (summary) => formatCurrency(summary.totalCommissionAmount),
              },
            ]}
            rows={data.summaries}
          />
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'appointment',
                header: 'Atendimento',
                render: (item) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">
                      {item.employee?.user.name ?? 'Sem profissional'}
                    </p>
                    <p>{item.service.name}</p>
                  </div>
                ),
              },
              {
                id: 'pet',
                header: 'Pet',
                render: (item) => item.appointment.pet.name,
              },
              {
                id: 'date',
                header: 'Data',
                render: (item) => formatDateTime(item.appointment.startAt),
              },
              {
                id: 'status',
                header: 'Status',
                render: (item) =>
                  `${item.appointment.operationalStatus.name} • ${item.appointment.financialStatus}`,
              },
              {
                id: 'commission',
                header: 'Comissao',
                render: (item) => formatCurrency(Number(item.calculatedCommissionAmount)),
              },
            ]}
            rows={data.items}
          />
        </div>
      </section>
    </div>
  )
}
