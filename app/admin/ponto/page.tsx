import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  closeTimeClockEntryAction,
  openTimeClockEntryAction,
} from '@/features/team-operations/actions'
import {
  getTeamOperationsDefaults,
  listTeamShifts,
  listTimeClockEntries,
} from '@/features/team-operations/services'
import { calculateWorkedMinutes } from '@/features/team-operations/domain'
import { listEmployees } from '@/features/employees/services'
import { formatDateTime, toDateTimeLocalValue } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface TimeClockPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

function getEntryStatusTone(value: string) {
  if (value === 'CLOSED') {
    return 'success'
  }

  if (value === 'VOIDED') {
    return 'danger'
  }

  if (value === 'ADJUSTED') {
    return 'info'
  }

  return 'warning'
}

function getEntryStatusLabel(value: string) {
  const labels: Record<string, string> = {
    OPEN: 'Aberto',
    CLOSED: 'Fechado',
    ADJUSTED: 'Ajustado',
    VOIDED: 'Invalidado',
  }

  return labels[value] ?? value
}

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

export default async function TimeClockPage({ searchParams }: TimeClockPageProps) {
  const actor = await requireInternalAreaUser('/admin/ponto')
  assertPermission(actor, 'equipe.ponto.visualizar')
  const params = await searchParams
  const canEditTimeClock = hasPermission(actor, 'equipe.ponto.editar')
  const now = new Date()
  const todayStart = startOfDay(now)
  const [defaults, employees, openEntries, recentEntries, todayShifts] = await Promise.all([
    getTeamOperationsDefaults(actor),
    listEmployees(actor, {
      active: true,
    }),
    listTimeClockEntries(actor, {
      status: 'OPEN',
    }),
    listTimeClockEntries(actor, {
      startFrom: addDays(todayStart, -7),
    }),
    listTeamShifts(actor, {
      startFrom: todayStart,
      startTo: addDays(todayStart, 2),
    }),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ponto"
        title="Ponto operacional auditavel para a equipe da Fase 2."
        description="O recorte desta fase controla abertura, fechamento e apuracao basica de jornada, preservando o servidor como autoridade e sem abrir um modulo trabalhista amplo."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="surface-panel rounded-[1.75rem] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Registros abertos',
              value: openEntries.length,
              description: 'Entradas em aberto que bloqueiam o fechamento da folha.',
            },
            {
              label: 'Registros recentes',
              value: recentEntries.length,
              description: 'Historico recente considerado para auditoria operacional.',
            },
            {
              label: 'Tolerancia padrao',
              value: `${defaults.timeClockToleranceMinutes} min`,
              description: 'Parametro base de referencia para atrasos e antecipacoes.',
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

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form action={openTimeClockEntryAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Abrir ponto</h2>
          <FormField label="Funcionario">
            <select className="ui-input" name="employeeUserId">
              <option value="">Selecione</option>
              {employees.map((employee) => (
                <option key={employee.userId} value={employee.userId}>
                  {employee.user.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Escala vinculada (opcional)">
            <select className="ui-input" name="shiftId">
              <option value="">Sem vinculo</option>
              {todayShifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.employee.user.name} - {formatDateTime(shift.startAt)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Entrada">
            <input
              className="ui-input"
              defaultValue={toDateTimeLocalValue(now)}
              name="clockInAt"
              type="datetime-local"
            />
          </FormField>
          <FormField label="Observacoes">
            <textarea className="ui-input min-h-24" name="notes" />
          </FormField>
          <button className="ui-button-primary" disabled={!canEditTimeClock} type="submit">
            Abrir ponto
          </button>
        </form>

        <form action={closeTimeClockEntryAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Fechar ponto</h2>
          <FormField label="Registro em aberto">
            <select className="ui-input" name="entryId">
              <option value="">Selecione</option>
              {openEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.employee.user.name} - {formatDateTime(entry.clockInAt)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Saida">
              <input
                className="ui-input"
                defaultValue={toDateTimeLocalValue(now)}
                name="clockOutAt"
                type="datetime-local"
              />
            </FormField>
            <FormField label="Intervalo (min)">
              <input className="ui-input" defaultValue="0" name="breakMinutes" />
            </FormField>
          </div>
          <FormField label="Observacoes">
            <textarea className="ui-input min-h-24" name="notes" />
          </FormField>
          <button
            className="ui-button-primary"
            disabled={!canEditTimeClock || openEntries.length === 0}
            type="submit"
          >
            Fechar ponto
          </button>
        </form>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Registros recentes</h2>
        <div className="mt-4">
          <DataTable
            columns={[
              {
                header: 'Funcionario',
                id: 'entry-employee',
                render: (entry) => entry.employee.user.name,
              },
              {
                header: 'Entrada / Saida',
                id: 'entry-window',
                render: (entry) => (
                  <div>
                    <p>{formatDateTime(entry.clockInAt)}</p>
                    <p>{entry.clockOutAt ? formatDateTime(entry.clockOutAt) : 'Em aberto'}</p>
                  </div>
                ),
              },
              {
                header: 'Status',
                id: 'entry-status',
                render: (entry) => (
                  <StatusBadge tone={getEntryStatusTone(entry.status)}>
                    {getEntryStatusLabel(entry.status)}
                  </StatusBadge>
                ),
              },
              {
                header: 'Minutos',
                id: 'entry-worked',
                render: (entry) =>
                  entry.clockOutAt
                    ? `${calculateWorkedMinutes(entry.clockInAt, entry.clockOutAt, entry.breakMinutes)} min`
                    : 'Em aberto',
              },
              {
                header: 'Escala',
                id: 'entry-shift',
                render: (entry) => entry.shift?.id.slice(0, 8) ?? 'Sem vinculo',
              },
            ]}
            rows={recentEntries.slice(0, 15)}
          />
        </div>
      </section>
    </div>
  )
}
