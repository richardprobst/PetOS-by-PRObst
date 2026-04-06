import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  createPayrollRunAction,
  finalizePayrollRunAction,
} from '@/features/team-operations/actions'
import {
  getTeamOperationsDefaults,
  listPayrollRuns,
} from '@/features/team-operations/services'
import { listEmployees } from '@/features/employees/services'
import { formatCurrency, formatDateTime, toDateTimeLocalValue } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface PayrollPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(23, 59, 0, 0)
  return date
}

function getPayrollRunTone(value: string) {
  if (value === 'FINALIZED') {
    return 'success'
  }

  if (value === 'CANCELED') {
    return 'danger'
  }

  return 'warning'
}

function getPayrollRunLabel(value: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Rascunho',
    FINALIZED: 'Fechada',
    CANCELED: 'Cancelada',
  }

  return labels[value] ?? value
}

function getPayrollModeLabel(value: string) {
  const labels: Record<string, string> = {
    MONTHLY: 'Mensalista',
    HOURLY: 'Horista',
    COMMISSION_ONLY: 'Comissao pura',
  }

  return labels[value] ?? value
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const actor = await requireInternalAreaUser('/admin/folha')
  assertPermission(actor, 'equipe.folha.visualizar')
  const params = await searchParams
  const canEditPayroll = hasPermission(actor, 'equipe.folha.editar')
  const now = new Date()

  const [defaults, payrollRuns, employees] = await Promise.all([
    getTeamOperationsDefaults(actor),
    listPayrollRuns(actor, {}),
    listEmployees(actor, {
      active: true,
    }),
  ])

  const defaultPeriodStart = startOfDay(addDays(now, -(defaults.defaultPayrollPeriodDays - 1)))
  const defaultPeriodEnd = endOfDay(now)
  const draftRuns = payrollRuns.filter((run) => run.status === 'DRAFT')
  const latestRun = payrollRuns[0] ?? null
  const latestRunNetAmount = latestRun
    ? latestRun.entries.reduce((total, entry) => total + Number(entry.netAmount), 0)
    : 0

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Folha"
        title="Base de payroll da equipe integrada a jornada e comissoes."
        description="A Fase 2 fecha o recorte operacional de folha com periodo, jornadas previstas, tempo trabalhado e comissao ja consolidada. Nao e um modulo amplo trabalhista, mas uma base auditavel e server-side para apuracao da equipe."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="surface-panel rounded-[1.75rem] p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              label: 'Funcionarios ativos',
              value: employees.length,
              description: 'Base operacional atualmente elegivel para escala, ponto e folha.',
            },
            {
              label: 'Folhas geradas',
              value: payrollRuns.length,
              description: 'Rodadas ja registradas para a unidade atual.',
            },
            {
              label: 'Folhas em rascunho',
              value: draftRuns.length,
              description: 'Rodadas ainda abertas para revisao antes do fechamento.',
            },
            {
              label: 'Liquido da ultima folha',
              value: formatCurrency(latestRunNetAmount),
              description: 'Soma dos itens da rodada mais recente.',
            },
          ].map((item) => (
            <article
              className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
              key={item.label}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form action={createPayrollRunAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Gerar folha</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Periodo inicial">
              <input
                className="ui-input"
                defaultValue={toDateTimeLocalValue(defaultPeriodStart)}
                name="periodStartAt"
                type="datetime-local"
              />
            </FormField>
            <FormField label="Periodo final">
              <input
                className="ui-input"
                defaultValue={toDateTimeLocalValue(defaultPeriodEnd)}
                name="periodEndAt"
                type="datetime-local"
              />
            </FormField>
          </div>
          <FormField label="Observacoes">
            <textarea className="ui-input min-h-24" name="notes" />
          </FormField>
          <button className="ui-button-primary" disabled={!canEditPayroll} type="submit">
            Gerar folha em rascunho
          </button>
        </form>

        <form action={finalizePayrollRunAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Fechar folha</h2>
          <FormField label="Folha em rascunho">
            <select className="ui-input" name="runId">
              <option value="">Selecione</option>
              {draftRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {formatDateTime(run.periodStartAt)} ate {formatDateTime(run.periodEndAt)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Observacoes finais">
            <textarea className="ui-input min-h-24" name="notes" />
          </FormField>
          <button
            className="ui-button-primary"
            disabled={!canEditPayroll || draftRuns.length === 0}
            type="submit"
          >
            Fechar folha
          </button>
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            O fechamento revalida jornada, ponto aberto e comissoes consolidadas antes de marcar a rodada como finalizada.
          </p>
        </form>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Folhas recentes</h2>
        <div className="mt-4">
          <DataTable
            columns={[
              {
                header: 'Periodo',
                id: 'payroll-period',
                render: (run) => (
                  <div>
                    <p>{formatDateTime(run.periodStartAt)}</p>
                    <p>{formatDateTime(run.periodEndAt)}</p>
                  </div>
                ),
              },
              {
                header: 'Status',
                id: 'payroll-status',
                render: (run) => (
                  <StatusBadge tone={getPayrollRunTone(run.status)}>
                    {getPayrollRunLabel(run.status)}
                  </StatusBadge>
                ),
              },
              {
                header: 'Equipe',
                id: 'payroll-entries',
                render: (run) => `${run.entries.length} itens`,
              },
              {
                header: 'Liquido',
                id: 'payroll-net',
                render: (run) =>
                  formatCurrency(
                    run.entries.reduce((total, entry) => total + Number(entry.netAmount), 0),
                  ),
              },
              {
                header: 'Criacao',
                id: 'payroll-created',
                render: (run) => formatDateTime(run.createdAt),
              },
            ]}
            rows={payrollRuns.slice(0, 12)}
          />
        </div>
      </section>

      {latestRun ? (
        <section className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Ultima folha detalhada</h2>
          <div className="mt-4">
            <DataTable
              columns={[
                {
                  header: 'Funcionario',
                  id: 'entry-employee',
                  render: (entry) => entry.employee.user.name,
                },
                {
                  header: 'Modo',
                  id: 'entry-mode',
                  render: (entry) => getPayrollModeLabel(entry.payrollModeSnapshot),
                },
                {
                  header: 'Jornada',
                  id: 'entry-minutes',
                  render: (entry) => `${entry.workedMinutes}/${entry.scheduledMinutes} min`,
                },
                {
                  header: 'Comissao',
                  id: 'entry-commission',
                  render: (entry) => formatCurrency(Number(entry.commissionAmount)),
                },
                {
                  header: 'Liquido',
                  id: 'entry-net',
                  render: (entry) => formatCurrency(Number(entry.netAmount)),
                },
              ]}
              rows={latestRun.entries}
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}
