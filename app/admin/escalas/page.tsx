import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  cancelTeamShiftAction,
  createTeamShiftAction,
} from '@/features/team-operations/actions'
import {
  getTeamOperationsDefaults,
  listTeamShifts,
} from '@/features/team-operations/services'
import { listEmployees } from '@/features/employees/services'
import { formatDateTime, toDateTimeLocalValue } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface TeamShiftPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

function getShiftTypeLabel(value: string) {
  const labels: Record<string, string> = {
    WORK: 'Trabalho',
    ON_CALL: 'Sobreaviso',
    TRAINING: 'Treinamento',
    DAY_OFF: 'Folga',
  }

  return labels[value] ?? value
}

function getShiftStatusTone(value: string) {
  if (value === 'CONFIRMED') {
    return 'success'
  }

  if (value === 'CANCELED') {
    return 'danger'
  }

  return 'warning'
}

function getShiftStatusLabel(value: string) {
  const labels: Record<string, string> = {
    PLANNED: 'Planejada',
    CONFIRMED: 'Confirmada',
    CANCELED: 'Cancelada',
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

export default async function TeamShiftsPage({ searchParams }: TeamShiftPageProps) {
  const actor = await requireInternalAreaUser('/admin/escalas')
  assertPermission(actor, 'equipe.escala.visualizar')
  const params = await searchParams
  const canEditShifts = hasPermission(actor, 'equipe.escala.editar')
  const now = new Date()
  const windowStart = addDays(startOfDay(now), -7)
  const windowEnd = addDays(startOfDay(now), 14)

  const [defaults, shifts, employees] = await Promise.all([
    getTeamOperationsDefaults(actor),
    listTeamShifts(actor, {
      startFrom: windowStart,
      startTo: windowEnd,
    }),
    listEmployees(actor, {
      active: true,
    }),
  ])

  const activeShifts = shifts.filter((shift) => shift.status !== 'CANCELED')

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Escalas"
        title="Escalas operacionais da equipe com autoridade no servidor."
        description="O Bloco 8 adiciona escalas e jornada base da equipe sem abrir um modulo amplo de RH. O recorte desta fase garante alocacao auditavel por unidade, funcionario e janela de trabalho."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="surface-panel rounded-[1.75rem] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Escalas no recorte',
              value: shifts.length,
              description: 'Planejadas, confirmadas e canceladas na janela operacional atual.',
            },
            {
              label: 'Escalas ativas',
              value: activeShifts.length,
              description: 'Escalas que ainda contam para jornada e folha.',
            },
            {
              label: 'Jornada padrao',
              value: `${defaults.defaultShiftMinutes} min`,
              description: 'Configuracao base usada para referencia na equipe e na folha.',
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
        <form action={createTeamShiftAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Nova escala</h2>
          <div className="grid gap-4 md:grid-cols-2">
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
            <FormField label="Tipo">
              <select className="ui-input" defaultValue="WORK" name="shiftType">
                <option value="WORK">Trabalho</option>
                <option value="ON_CALL">Sobreaviso</option>
                <option value="TRAINING">Treinamento</option>
                <option value="DAY_OFF">Folga</option>
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Inicio">
              <input
                className="ui-input"
                defaultValue={toDateTimeLocalValue(now)}
                name="startAt"
                type="datetime-local"
              />
            </FormField>
            <FormField label="Fim">
              <input
                className="ui-input"
                defaultValue={toDateTimeLocalValue(
                  new Date(now.getTime() + defaults.defaultShiftMinutes * 60_000),
                )}
                name="endAt"
                type="datetime-local"
              />
            </FormField>
          </div>

          <FormField label="Status inicial">
            <select className="ui-input" defaultValue="PLANNED" name="status">
              <option value="PLANNED">Planejada</option>
              <option value="CONFIRMED">Confirmada</option>
            </select>
          </FormField>

          <FormField label="Observacoes">
            <textarea className="ui-input min-h-28" name="notes" />
          </FormField>

          <button className="ui-button-primary" disabled={!canEditShifts} type="submit">
            Criar escala
          </button>
          {!canEditShifts ? (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para editar escalas.
            </p>
          ) : null}
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Escalas recentes</h2>
          <div className="mt-4">
            <DataTable
              columns={[
                {
                  header: 'Funcionario',
                  id: 'shift-employee',
                  render: (shift) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">
                        {shift.employee.user.name}
                      </p>
                      <p>{getShiftTypeLabel(shift.shiftType)}</p>
                    </div>
                  ),
                },
                {
                  header: 'Janela',
                  id: 'shift-window',
                  render: (shift) => (
                    <div>
                      <p>{formatDateTime(shift.startAt)}</p>
                      <p>{formatDateTime(shift.endAt)}</p>
                    </div>
                  ),
                },
                {
                  header: 'Status',
                  id: 'shift-status',
                  render: (shift) => (
                    <StatusBadge tone={getShiftStatusTone(shift.status)}>
                      {getShiftStatusLabel(shift.status)}
                    </StatusBadge>
                  ),
                },
                {
                  header: 'Observacoes',
                  id: 'shift-notes',
                  render: (shift) => shift.notes ?? 'Sem observacoes',
                },
                {
                  header: 'Acoes',
                  id: 'shift-actions',
                  render: (shift) =>
                    canEditShifts && shift.status !== 'CANCELED' ? (
                      <form action={cancelTeamShiftAction}>
                        <input name="shiftId" type="hidden" value={shift.id} />
                        <button className="ui-button-secondary" type="submit">
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      'Sem acao'
                    ),
                },
              ]}
              rows={shifts.slice(0, 12)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
