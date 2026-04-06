import type { Route } from 'next'
import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  createAppointmentCapacityRuleAction,
  createScheduleBlockAction,
  deactivateAppointmentCapacityRuleAction,
  deactivateScheduleBlockAction,
} from '@/features/appointments/advanced-actions'
import {
  listAppointmentCapacityRules,
  listScheduleBlocks,
} from '@/features/appointments/advanced-services'
import {
  allowedTaxiDogStatusTransitions,
} from '@/features/appointments/constants'
import {
  cancelAppointmentAction,
  checkInAppointmentAction,
  createAppointmentAction,
  updateAppointmentStatusAction,
} from '@/features/appointments/actions'
import { listAppointments } from '@/features/appointments/services'
import { listClients } from '@/features/clients/services'
import { listEmployees } from '@/features/employees/services'
import {
  upsertTaxiDogRideAction,
  updateTaxiDogRideStatusAction,
} from '@/features/taxi-dog/actions'
import {
  cancelWaitlistEntryAction,
  createWaitlistEntryAction,
  promoteWaitlistEntryAction,
} from '@/features/waitlist/actions'
import { listWaitlistEntries } from '@/features/waitlist/services'
import { listPets } from '@/features/pets/services'
import { listServices } from '@/features/services/services'
import { formatCurrency, formatDateTime, toDateTimeLocalValue } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

type AgendaView = 'day' | 'week' | 'month'

interface AgendaPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    date?: string
    view?: string
  }>
}

function parseAgendaView(value?: string): AgendaView {
  if (value === 'week' || value === 'month') {
    return value
  }

  return 'day'
}

function parseReferenceDate(value?: string) {
  if (!value) {
    return new Date()
  }

  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(value: Date, months: number) {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return next
}

function formatQueryDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function formatCalendarDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value)
}

function getAgendaWindow(referenceDate: Date, view: AgendaView) {
  if (view === 'day') {
    const start = startOfDay(referenceDate)
    const end = endOfDay(referenceDate)

    return {
      start,
      end,
      previousReferenceDate: addDays(referenceDate, -1),
      nextReferenceDate: addDays(referenceDate, 1),
      label: `Dia ${formatCalendarDate(referenceDate)}`,
    }
  }

  if (view === 'week') {
    const start = startOfDay(referenceDate)
    const weekday = start.getDay()
    const diffToMonday = weekday === 0 ? -6 : 1 - weekday
    start.setDate(start.getDate() + diffToMonday)
    const end = endOfDay(addDays(start, 6))

    return {
      start,
      end,
      previousReferenceDate: addDays(referenceDate, -7),
      nextReferenceDate: addDays(referenceDate, 7),
      label: `Semana ${formatCalendarDate(start)} ate ${formatCalendarDate(end)}`,
    }
  }

  const start = startOfDay(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1))
  const end = endOfDay(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0))

  return {
    start,
    end,
    previousReferenceDate: addMonths(referenceDate, -1),
    nextReferenceDate: addMonths(referenceDate, 1),
    label: `Mes ${new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(referenceDate)}`,
  }
}

function buildAgendaHref(view: AgendaView, referenceDate: Date) {
  return `/admin/agenda?view=${view}&date=${formatQueryDate(referenceDate)}` as Route
}

function getOperationalStatusTone(statusId: string) {
  if (statusId === 'COMPLETED') {
    return 'success'
  }

  if (statusId === 'CANCELED' || statusId === 'NO_SHOW') {
    return 'danger'
  }

  if (statusId === 'READY_FOR_PICKUP') {
    return 'info'
  }

  return 'warning'
}

function getFinancialStatusTone(status: string) {
  if (status === 'PAID' || status === 'INVOICED') {
    return 'success'
  }

  if (status === 'REFUNDED' || status === 'REVERSED') {
    return 'danger'
  }

  return 'warning'
}

function getWaitlistStatusTone(status: string) {
  if (status === 'PROMOTED') {
    return 'success'
  }

  if (status === 'CANCELED' || status === 'EXPIRED') {
    return 'danger'
  }

  return 'warning'
}

function getTaxiDogStatusTone(status: string) {
  if (status === 'COMPLETED') {
    return 'success'
  }

  if (status === 'CANCELED') {
    return 'danger'
  }

  return 'info'
}

function getSizeCategoryLabel(value: string | null) {
  const labels: Record<string, string> = {
    SMALL: 'Pequeno',
    MEDIUM: 'Medio',
    LARGE: 'Grande',
    GIANT: 'Gigante',
    UNKNOWN: 'Nao informado',
  }

  return value ? labels[value] ?? value : 'Qualquer porte'
}

function getScheduleBlockTypeLabel(value: string) {
  const labels: Record<string, string> = {
    UNAVAILABLE: 'Indisponivel',
    BREAK: 'Pausa',
    HOLIDAY: 'Feriado',
    TRANSPORT: 'Taxi Dog',
    OTHER: 'Outro',
  }

  return labels[value] ?? value
}

function getWaitlistStatusLabel(value: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    PROMOTED: 'Promovida',
    CANCELED: 'Cancelada',
    EXPIRED: 'Expirada',
  }

  return labels[value] ?? value
}

function getTaxiDogStatusLabel(value: string) {
  const labels: Record<string, string> = {
    REQUESTED: 'Solicitado',
    SCHEDULED: 'Agendado',
    IN_PROGRESS: 'Em rota',
    COMPLETED: 'Concluido',
    CANCELED: 'Cancelado',
  }

  return labels[value] ?? value
}

function getAppointmentStatusActionOptions(currentStatusId: string) {
  switch (currentStatusId) {
    case 'SCHEDULED':
      return [
        { value: 'CONFIRMED', label: 'Confirmar atendimento' },
        { value: 'NO_SHOW', label: 'Marcar no-show' },
      ]
    case 'CONFIRMED':
      return [{ value: 'NO_SHOW', label: 'Marcar no-show' }]
    case 'CHECK_IN':
      return [{ value: 'IN_SERVICE', label: 'Iniciar atendimento' }]
    case 'IN_SERVICE':
      return [{ value: 'READY_FOR_PICKUP', label: 'Pronto para retirada' }]
    case 'READY_FOR_PICKUP':
      return [{ value: 'COMPLETED', label: 'Concluir atendimento' }]
    default:
      return []
  }
}

function canCancelAppointment(statusId: string) {
  return !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(statusId)
}

function canManageTaxiDog(statusId: string) {
  return !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(statusId)
}

function getTaxiDogNextStatuses(currentStatus: string) {
  return allowedTaxiDogStatusTransitions[currentStatus] ?? []
}

export default async function AdminAgendaPage({ searchParams }: AgendaPageProps) {
  const actor = await requireInternalAreaUser('/admin/agenda')
  assertPermission(actor, 'agendamento.visualizar')
  const params = await searchParams
  const selectedView = parseAgendaView(params.view)
  const referenceDate = parseReferenceDate(params.date)
  const agendaWindow = getAgendaWindow(referenceDate, selectedView)

  const canCreateAppointments = hasPermission(actor, 'agendamento.criar')
  const canUpdateStatuses = hasPermission(actor, 'agendamento.atualizar_status')
  const canCancelAppointments = hasPermission(actor, 'agendamento.cancelar')
  const canCheckIn = hasPermission(actor, 'checkin.executar')
  const canViewCapacity = hasPermission(actor, 'agenda.capacidade.visualizar')
  const canEditCapacity = hasPermission(actor, 'agenda.capacidade.editar')
  const canViewBlocks = hasPermission(actor, 'agenda.bloqueio.visualizar')
  const canEditBlocks = hasPermission(actor, 'agenda.bloqueio.editar')
  const canViewWaitlist = hasPermission(actor, 'agenda.waitlist.visualizar')
  const canEditWaitlist = hasPermission(actor, 'agenda.waitlist.editar')
  const canViewTaxiDog = hasPermission(actor, 'agenda.taxi_dog.visualizar')
  const canEditTaxiDog = hasPermission(actor, 'agenda.taxi_dog.editar')

  const shouldLoadReferenceData =
    canCreateAppointments ||
    canEditCapacity ||
    canEditBlocks ||
    canEditWaitlist ||
    canViewTaxiDog ||
    canEditTaxiDog

  const [
    appointments,
    clients,
    pets,
    services,
    employees,
    capacityRules,
    scheduleBlocks,
    waitlistEntries,
  ] = await Promise.all([
    listAppointments(actor, {
      startFrom: agendaWindow.start,
      startTo: agendaWindow.end,
    }),
    shouldLoadReferenceData ? listClients(actor, { active: true }) : Promise.resolve([]),
    shouldLoadReferenceData ? listPets(actor, {}) : Promise.resolve([]),
    shouldLoadReferenceData ? listServices(actor, { active: true }) : Promise.resolve([]),
    shouldLoadReferenceData ? listEmployees(actor, { active: true }) : Promise.resolve([]),
    canViewCapacity ? listAppointmentCapacityRules(actor, { active: true }) : Promise.resolve([]),
    canViewBlocks
      ? listScheduleBlocks(actor, {
          active: true,
          startFrom: agendaWindow.start,
          startTo: agendaWindow.end,
        })
      : Promise.resolve([]),
    canViewWaitlist
      ? listWaitlistEntries(actor, {
          status: 'PENDING',
          startFrom: agendaWindow.start,
          startTo: agendaWindow.end,
        })
      : Promise.resolve([]),
  ])

  const appointmentCountWithTaxiDog = appointments.filter((appointment) => appointment.taxiDogRide).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agenda avancada"
        title="Capacidade, bloqueios, waitlist e Taxi Dog em fluxo administrativo server-side."
        description="O Bloco 4 expande a agenda do MVP com capacidade por profissional e porte, bloqueios operacionais, promocao controlada da waitlist e fluxo pratico de Taxi Dog, sem abrir CRM nem roteirizacao sofisticada."
        actions={
          <>
            <Link className="ui-button-secondary" href={buildAgendaHref(selectedView, agendaWindow.previousReferenceDate)}>
              Periodo anterior
            </Link>
            <Link className="ui-button-secondary" href={buildAgendaHref(selectedView, new Date())}>
              Hoje
            </Link>
            <Link className="ui-button-secondary" href={buildAgendaHref(selectedView, agendaWindow.nextReferenceDate)}>
              Proximo periodo
            </Link>
          </>
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="surface-panel rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-label">Recorte operacional</p>
            <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
              {agendaWindow.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Use o recorte para validar disponibilidade, bloqueios e promocao da waitlist no mesmo horizonte operacional.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={selectedView === 'day' ? 'ui-button-primary' : 'ui-button-secondary'} href={buildAgendaHref('day', referenceDate)}>
              Dia
            </Link>
            <Link className={selectedView === 'week' ? 'ui-button-primary' : 'ui-button-secondary'} href={buildAgendaHref('week', referenceDate)}>
              Semana
            </Link>
            <Link className={selectedView === 'month' ? 'ui-button-primary' : 'ui-button-secondary'} href={buildAgendaHref('month', referenceDate)}>
              Mes
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Atendimentos no recorte',
              value: appointments.length,
              description: 'Agenda operacional e servicos vinculados.',
            },
            {
              label: 'Bloqueios ativos',
              value: scheduleBlocks.length,
              description: 'Bloqueios gerais ou por profissional respeitados no servidor.',
            },
            {
              label: 'Waitlist pendente',
              value: waitlistEntries.length,
              description: 'Entradas aguardando promocao ou cancelamento.',
            },
            {
              label: 'Taxi Dog no recorte',
              value: appointmentCountWithTaxiDog,
              description: 'Atendimentos com transporte operacional configurado.',
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
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Criar atendimento</p>
          {canCreateAppointments ? (
            <form action={createAppointmentAction} className="mt-4 space-y-4">
              <FormField label="Cliente">
                <select className="ui-input" name="clientId">
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.userId} value={client.userId}>
                      {client.user.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Pet">
                  <select className="ui-input" name="petId">
                    <option value="">Selecione</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} - {pet.client.user.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Profissional principal">
                  <select className="ui-input" name="employeeUserId">
                    <option value="">Alocacao automatica por servico</option>
                    {employees.map((employee) => (
                      <option key={employee.userId} value={employee.userId}>
                        {employee.user.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Servicos" description="Segure Ctrl para selecionar multiplos servicos no mesmo atendimento.">
                <select className="ui-input min-h-36" multiple name="serviceIds">
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Inicio">
                  <input className="ui-input" name="startAt" type="datetime-local" />
                </FormField>
                <FormField label="Fim (opcional)">
                  <input className="ui-input" name="endAt" type="datetime-local" />
                </FormField>
              </div>

              <FormField label="Observacao do cliente">
                <textarea className="ui-input min-h-24" name="clientNotes" />
              </FormField>
              <FormField label="Observacao interna">
                <textarea className="ui-input min-h-24" name="internalNotes" />
              </FormField>

              <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-[color:var(--foreground)]">
                  <input className="h-4 w-4" name="taxiDogEnabled" type="checkbox" value="1" />
                  Incluir Taxi Dog neste atendimento
                </label>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField label="Motorista">
                    <select className="ui-input" name="taxiDogDriverUserId">
                      <option value="">Selecione</option>
                      {employees.map((employee) => (
                        <option key={employee.userId} value={employee.userId}>
                          {employee.user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Tarifa do transporte">
                    <input className="ui-input" defaultValue="0" name="taxiDogFeeAmount" />
                  </FormField>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField label="Endereco de coleta">
                    <input className="ui-input" name="taxiDogPickupAddress" />
                  </FormField>
                  <FormField label="Endereco de entrega">
                    <input className="ui-input" name="taxiDogDropoffAddress" />
                  </FormField>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField label="Janela de coleta - inicio">
                    <input className="ui-input" name="taxiDogPickupWindowStartAt" type="datetime-local" />
                  </FormField>
                  <FormField label="Janela de coleta - fim">
                    <input className="ui-input" name="taxiDogPickupWindowEndAt" type="datetime-local" />
                  </FormField>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField label="Janela de entrega - inicio">
                    <input className="ui-input" name="taxiDogDropoffWindowStartAt" type="datetime-local" />
                  </FormField>
                  <FormField label="Janela de entrega - fim">
                    <input className="ui-input" name="taxiDogDropoffWindowEndAt" type="datetime-local" />
                  </FormField>
                </div>
                <FormField label="Observacoes do transporte">
                  <textarea className="ui-input mt-4 min-h-24" name="taxiDogNotes" />
                </FormField>
              </div>

              <button className="ui-button-primary" type="submit">
                Criar agendamento
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para criar agendamentos administrativos.
            </p>
          )}
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Agenda do recorte</p>
          <div className="mt-4 space-y-4">
            {appointments.length > 0 ? (
              appointments.map((appointment) => {
                const statusOptions = getAppointmentStatusActionOptions(appointment.operationalStatusId)
                const taxiDogStatusOptions = appointment.taxiDogRide
                  ? getTaxiDogNextStatuses(appointment.taxiDogRide.status)
                  : []

                return (
                  <article
                    className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-5"
                    key={appointment.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={getOperationalStatusTone(appointment.operationalStatusId)}>
                            {appointment.operationalStatus.name}
                          </StatusBadge>
                          <StatusBadge tone={getFinancialStatusTone(appointment.financialStatus)}>
                            {appointment.financialStatus}
                          </StatusBadge>
                          {appointment.taxiDogRide ? (
                            <StatusBadge tone={getTaxiDogStatusTone(appointment.taxiDogRide.status)}>
                              Taxi Dog {getTaxiDogStatusLabel(appointment.taxiDogRide.status)}
                            </StatusBadge>
                          ) : null}
                        </div>
                        <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
                          {appointment.pet.name} - {appointment.client.user.name}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                          {formatDateTime(appointment.startAt)} ate {formatDateTime(appointment.endAt)}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">
                          Total estimado: {formatCurrency(Number(appointment.estimatedTotalAmount))}
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm text-[color:var(--foreground-soft)]">
                        <p className="font-semibold text-[color:var(--foreground)]">Servicos</p>
                        <ul className="mt-2 space-y-1">
                          {appointment.services.map((serviceItem) => (
                            <li key={serviceItem.id}>
                              {serviceItem.service.name}
                              {serviceItem.employee?.user.name ? ` - ${serviceItem.employee.user.name}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(appointment.clientNotes || appointment.internalNotes) ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/40 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
                            Cliente
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                            {appointment.clientNotes ?? 'Sem observacoes do cliente.'}
                          </p>
                        </div>
                        <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/40 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
                            Interno
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                            {appointment.internalNotes ?? 'Sem observacoes internas.'}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-4 xl:grid-cols-3">
                      <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/40 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
                          Historico recente
                        </p>
                        <div className="mt-3 space-y-2">
                          {appointment.statusHistory.slice(-3).map((entry) => (
                            <div key={entry.id} className="text-sm text-[color:var(--foreground-soft)]">
                              <p className="font-semibold text-[color:var(--foreground)]">{entry.status.name}</p>
                              <p>
                                {formatDateTime(entry.changedAt)}
                                {entry.changedBy?.name ? ` - ${entry.changedBy.name}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/40 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
                          Operacoes do atendimento
                        </p>

                        <div className="mt-3 space-y-3">
                          {canUpdateStatuses && statusOptions.length > 0 ? (
                            <form action={updateAppointmentStatusAction} className="space-y-3">
                              <input name="appointmentId" type="hidden" value={appointment.id} />
                              <FormField label="Atualizar status">
                                <select className="ui-input" name="nextStatusId">
                                  {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </FormField>
                              <button className="ui-button-secondary w-full" type="submit">
                                Aplicar status
                              </button>
                            </form>
                          ) : null}

                          {canCheckIn &&
                          appointment.operationalStatusId === 'CONFIRMED' &&
                          !appointment.checkIn ? (
                            <form action={checkInAppointmentAction} className="space-y-3">
                              <input name="appointmentId" type="hidden" value={appointment.id} />
                              <label className="flex items-center gap-2 text-sm text-[color:var(--foreground-soft)]">
                                <input defaultChecked name="checklistHealth" type="checkbox" value="1" />
                                Saude revisada
                              </label>
                              <label className="flex items-center gap-2 text-sm text-[color:var(--foreground-soft)]">
                                <input defaultChecked name="checklistPreferences" type="checkbox" value="1" />
                                Preferencias revisadas
                              </label>
                              <label className="flex items-center gap-2 text-sm text-[color:var(--foreground-soft)]">
                                <input defaultChecked name="checklistHandoff" type="checkbox" value="1" />
                                Retirada confirmada
                              </label>
                              <FormField label="Observacoes do check-in">
                                <textarea className="ui-input min-h-20" name="notes" />
                              </FormField>
                              <button className="ui-button-secondary w-full" type="submit">
                                Executar check-in
                              </button>
                            </form>
                          ) : null}

                          {canCancelAppointments && canCancelAppointment(appointment.operationalStatusId) ? (
                            <form action={cancelAppointmentAction} className="space-y-3">
                              <input name="appointmentId" type="hidden" value={appointment.id} />
                              <FormField label="Motivo do cancelamento">
                                <input className="ui-input" name="reason" />
                              </FormField>
                              <button className="ui-button-secondary w-full" type="submit">
                                Cancelar atendimento
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>

                      {canViewTaxiDog ? (
                        <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/40 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
                            Taxi Dog
                          </p>
                          <div className="mt-3 space-y-3">
                            {appointment.taxiDogRide ? (
                              <div className="text-sm text-[color:var(--foreground-soft)]">
                                <p className="font-semibold text-[color:var(--foreground)]">
                                  {getTaxiDogStatusLabel(appointment.taxiDogRide.status)}
                                </p>
                                <p>Tarifa: {formatCurrency(Number(appointment.taxiDogRide.feeAmount))}</p>
                                <p>
                                  Motorista:{' '}
                                  {appointment.taxiDogRide.assignedDriver?.user.name ?? 'Nao atribuido'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                                Nenhum transporte vinculado a este atendimento.
                              </p>
                            )}

                            {canEditTaxiDog && canManageTaxiDog(appointment.operationalStatusId) ? (
                              <form action={upsertTaxiDogRideAction} className="space-y-3">
                                <input name="appointmentId" type="hidden" value={appointment.id} />
                                <FormField label="Motorista">
                                  <select
                                    className="ui-input"
                                    defaultValue={appointment.taxiDogRide?.assignedDriverUserId ?? ''}
                                    name="assignedDriverUserId"
                                  >
                                    <option value="">Selecione</option>
                                    {employees.map((employee) => (
                                      <option key={employee.userId} value={employee.userId}>
                                        {employee.user.name}
                                      </option>
                                    ))}
                                  </select>
                                </FormField>
                                <FormField label="Coleta">
                                  <input
                                    className="ui-input"
                                    defaultValue={appointment.taxiDogRide?.pickupAddress ?? ''}
                                    name="pickupAddress"
                                  />
                                </FormField>
                                <FormField label="Entrega">
                                  <input
                                    className="ui-input"
                                    defaultValue={appointment.taxiDogRide?.dropoffAddress ?? ''}
                                    name="dropoffAddress"
                                  />
                                </FormField>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <FormField label="Janela coleta - inicio">
                                    <input
                                      className="ui-input"
                                      defaultValue={
                                        appointment.taxiDogRide?.pickupWindowStartAt
                                          ? toDateTimeLocalValue(appointment.taxiDogRide.pickupWindowStartAt)
                                          : toDateTimeLocalValue(appointment.startAt)
                                      }
                                      name="pickupWindowStartAt"
                                      type="datetime-local"
                                    />
                                  </FormField>
                                  <FormField label="Janela coleta - fim">
                                    <input
                                      className="ui-input"
                                      defaultValue={
                                        appointment.taxiDogRide?.pickupWindowEndAt
                                          ? toDateTimeLocalValue(appointment.taxiDogRide.pickupWindowEndAt)
                                          : toDateTimeLocalValue(appointment.startAt)
                                      }
                                      name="pickupWindowEndAt"
                                      type="datetime-local"
                                    />
                                  </FormField>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <FormField label="Janela entrega - inicio">
                                    <input
                                      className="ui-input"
                                      defaultValue={
                                        appointment.taxiDogRide?.dropoffWindowStartAt
                                          ? toDateTimeLocalValue(appointment.taxiDogRide.dropoffWindowStartAt)
                                          : toDateTimeLocalValue(appointment.endAt)
                                      }
                                      name="dropoffWindowStartAt"
                                      type="datetime-local"
                                    />
                                  </FormField>
                                  <FormField label="Janela entrega - fim">
                                    <input
                                      className="ui-input"
                                      defaultValue={
                                        appointment.taxiDogRide?.dropoffWindowEndAt
                                          ? toDateTimeLocalValue(appointment.taxiDogRide.dropoffWindowEndAt)
                                          : toDateTimeLocalValue(appointment.endAt)
                                      }
                                      name="dropoffWindowEndAt"
                                      type="datetime-local"
                                    />
                                  </FormField>
                                </div>
                                <FormField label="Tarifa">
                                  <input
                                    className="ui-input"
                                    defaultValue={Number(appointment.taxiDogRide?.feeAmount ?? 0)}
                                    name="feeAmount"
                                  />
                                </FormField>
                                <FormField label="Observacoes">
                                  <textarea
                                    className="ui-input min-h-20"
                                    defaultValue={appointment.taxiDogRide?.notes ?? ''}
                                    name="notes"
                                  />
                                </FormField>
                                <button className="ui-button-secondary w-full" type="submit">
                                  Salvar Taxi Dog
                                </button>
                              </form>
                            ) : null}

                            {canEditTaxiDog && appointment.taxiDogRide && taxiDogStatusOptions.length > 0 ? (
                              <form action={updateTaxiDogRideStatusAction} className="space-y-3">
                                <input name="taxiDogRideId" type="hidden" value={appointment.taxiDogRide.id} />
                                <FormField label="Fluxo do transporte">
                                  <select className="ui-input" name="nextStatus">
                                    {taxiDogStatusOptions.map((status) => (
                                      <option key={status} value={status}>
                                        {getTaxiDogStatusLabel(status)}
                                      </option>
                                    ))}
                                  </select>
                                </FormField>
                                <button className="ui-button-secondary w-full" type="submit">
                                  Atualizar Taxi Dog
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Nenhum atendimento encontrado neste recorte.
              </p>
            )}
          </div>
        </div>
      </section>

      {(canViewCapacity || canEditCapacity) ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Capacidade</p>
            {canEditCapacity ? (
              <form action={createAppointmentCapacityRuleAction} className="mt-4 space-y-4">
                <FormField label="Profissional (opcional)">
                  <select className="ui-input" name="employeeUserId">
                    <option value="">Regra geral da unidade</option>
                    {employees.map((employee) => (
                      <option key={employee.userId} value={employee.userId}>
                        {employee.user.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Porte">
                    <select className="ui-input" name="sizeCategory">
                      <option value="">Qualquer porte</option>
                      <option value="SMALL">Pequeno</option>
                      <option value="MEDIUM">Medio</option>
                      <option value="LARGE">Grande</option>
                      <option value="GIANT">Gigante</option>
                      <option value="UNKNOWN">Nao informado</option>
                    </select>
                  </FormField>
                  <FormField label="Raca (opcional)">
                    <input className="ui-input" name="breed" />
                  </FormField>
                </div>
                <FormField label="Maximo simultaneo">
                  <input className="ui-input" min="1" name="maxConcurrentAppointments" type="number" />
                </FormField>
                <FormField label="Observacoes">
                  <textarea className="ui-input min-h-24" name="notes" />
                </FormField>
                <button className="ui-button-primary" type="submit">
                  Criar regra de capacidade
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil pode consultar capacidade, mas nao editar regras.
              </p>
            )}
          </div>

          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Regras ativas</p>
            {canViewCapacity ? (
              <div className="mt-4">
                <DataTable
                  columns={[
                    {
                      id: 'scope',
                      header: 'Escopo',
                      render: (rule) => (
                        <div>
                          <p className="font-semibold text-[color:var(--foreground)]">
                            {rule.employee?.user.name ?? 'Regra geral'}
                          </p>
                          <p>{getSizeCategoryLabel(rule.sizeCategory)}</p>
                        </div>
                      ),
                    },
                    {
                      id: 'breed',
                      header: 'Raca',
                      render: (rule) => rule.breed ?? 'Todas',
                    },
                    {
                      id: 'capacity',
                      header: 'Capacidade',
                      render: (rule) => rule.maxConcurrentAppointments,
                    },
                    {
                      id: 'action',
                      header: 'Acao',
                      render: (rule) =>
                        canEditCapacity ? (
                          <form action={deactivateAppointmentCapacityRuleAction}>
                            <input name="ruleId" type="hidden" value={rule.id} />
                            <button className="ui-link text-sm font-semibold" type="submit">
                              Desativar
                            </button>
                          </form>
                        ) : (
                          'Somente leitura'
                        ),
                    },
                  ]}
                  rows={capacityRules}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {(canViewBlocks || canEditBlocks) ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Bloqueios operacionais</p>
            {canEditBlocks ? (
              <form action={createScheduleBlockAction} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Tipo">
                    <select className="ui-input" name="blockType">
                      <option value="UNAVAILABLE">Indisponivel</option>
                      <option value="BREAK">Pausa</option>
                      <option value="HOLIDAY">Feriado</option>
                      <option value="TRANSPORT">Taxi Dog</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </FormField>
                  <FormField label="Profissional (opcional)">
                    <select className="ui-input" name="employeeUserId">
                      <option value="">Bloqueio geral da unidade</option>
                      {employees.map((employee) => (
                        <option key={employee.userId} value={employee.userId}>
                          {employee.user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Titulo">
                  <input className="ui-input" name="title" />
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Inicio">
                    <input className="ui-input" name="startAt" type="datetime-local" />
                  </FormField>
                  <FormField label="Fim">
                    <input className="ui-input" name="endAt" type="datetime-local" />
                  </FormField>
                </div>
                <FormField label="Observacoes">
                  <textarea className="ui-input min-h-24" name="notes" />
                </FormField>
                <button className="ui-button-primary" type="submit">
                  Registrar bloqueio
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil pode consultar bloqueios, mas nao cadastrar novos eventos.
              </p>
            )}
          </div>

          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Bloqueios no recorte</p>
            {canViewBlocks ? (
              <div className="mt-4">
                <DataTable
                  columns={[
                    {
                      id: 'title',
                      header: 'Bloqueio',
                      render: (block) => (
                        <div>
                          <p className="font-semibold text-[color:var(--foreground)]">{block.title}</p>
                          <p>{getScheduleBlockTypeLabel(block.blockType)}</p>
                        </div>
                      ),
                    },
                    {
                      id: 'scope',
                      header: 'Escopo',
                      render: (block) => block.employee?.user.name ?? 'Unidade inteira',
                    },
                    {
                      id: 'window',
                      header: 'Janela',
                      render: (block) => `${formatDateTime(block.startAt)} ate ${formatDateTime(block.endAt)}`,
                    },
                    {
                      id: 'action',
                      header: 'Acao',
                      render: (block) =>
                        canEditBlocks ? (
                          <form action={deactivateScheduleBlockAction}>
                            <input name="blockId" type="hidden" value={block.id} />
                            <button className="ui-link text-sm font-semibold" type="submit">
                              Desativar
                            </button>
                          </form>
                        ) : (
                          'Somente leitura'
                        ),
                    },
                  ]}
                  rows={scheduleBlocks}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {(canViewWaitlist || canEditWaitlist) ? (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Waitlist</p>
            {canEditWaitlist ? (
              <form action={createWaitlistEntryAction} className="mt-4 space-y-4">
                <FormField label="Cliente">
                  <select className="ui-input" name="clientId">
                    <option value="">Selecione</option>
                    {clients.map((client) => (
                      <option key={client.userId} value={client.userId}>
                        {client.user.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Pet">
                    <select className="ui-input" name="petId">
                      <option value="">Selecione</option>
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} - {pet.client.user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Servico desejado">
                    <select className="ui-input" name="desiredServiceId">
                      <option value="">Selecione</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Profissional preferido">
                    <select className="ui-input" name="preferredEmployeeUserId">
                      <option value="">Sem preferencia</option>
                      {employees.map((employee) => (
                        <option key={employee.userId} value={employee.userId}>
                          {employee.user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Solicita Taxi Dog">
                    <label className="flex h-[46px] items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 text-sm text-[color:var(--foreground-soft)]">
                      <input name="requestedTransport" type="checkbox" value="1" />
                      Marcar para promover com acompanhamento de transporte
                    </label>
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Janela inicial">
                    <input className="ui-input" name="preferredStartAt" type="datetime-local" />
                  </FormField>
                  <FormField label="Janela final">
                    <input className="ui-input" name="preferredEndAt" type="datetime-local" />
                  </FormField>
                </div>
                <FormField label="Observacoes">
                  <textarea className="ui-input min-h-24" name="notes" />
                </FormField>
                <button className="ui-button-primary" type="submit">
                  Inserir na waitlist
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil pode consultar a waitlist, mas nao inserir novos itens.
              </p>
            )}
          </div>

          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Entradas pendentes</p>
            <div className="mt-4 space-y-4">
              {canViewWaitlist && waitlistEntries.length > 0 ? (
                waitlistEntries.map((entry) => (
                  <article
                    className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
                    key={entry.id}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={getWaitlistStatusTone(entry.status)}>
                            {getWaitlistStatusLabel(entry.status)}
                          </StatusBadge>
                          {entry.requestedTransport ? (
                            <StatusBadge tone="info">Taxi Dog solicitado</StatusBadge>
                          ) : null}
                        </div>
                        <p className="mt-3 text-base font-semibold text-[color:var(--foreground)]">
                          {entry.pet.name} - {entry.client.user.name}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                          {entry.desiredService.name} - {formatDateTime(entry.preferredStartAt)} ate{' '}
                          {formatDateTime(entry.preferredEndAt)}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">
                          Preferencia profissional:{' '}
                          {entry.preferredEmployee?.user.name ?? 'Sem preferencia'}
                        </p>
                        {entry.notes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                            {entry.notes}
                          </p>
                        ) : null}
                      </div>

                      {canEditWaitlist ? (
                        <div className="grid gap-3 xl:w-[22rem]">
                          <form action={promoteWaitlistEntryAction} className="space-y-3 rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
                            <input name="waitlistEntryId" type="hidden" value={entry.id} />
                            <div className="grid gap-3 md:grid-cols-2">
                              <FormField label="Inicio">
                                <input
                                  className="ui-input"
                                  defaultValue={toDateTimeLocalValue(entry.preferredStartAt)}
                                  name="startAt"
                                  type="datetime-local"
                                />
                              </FormField>
                              <FormField label="Fim">
                                <input
                                  className="ui-input"
                                  defaultValue={toDateTimeLocalValue(entry.preferredEndAt)}
                                  name="endAt"
                                  type="datetime-local"
                                />
                              </FormField>
                            </div>
                            <FormField label="Profissional">
                              <select className="ui-input" defaultValue={entry.preferredEmployeeUserId ?? ''} name="employeeUserId">
                                <option value="">Usar preferencia atual</option>
                                {employees.map((employee) => (
                                  <option key={employee.userId} value={employee.userId}>
                                    {employee.user.name}
                                  </option>
                                ))}
                              </select>
                            </FormField>
                            <FormField label="Observacoes internas">
                              <textarea className="ui-input min-h-20" name="internalNotes" />
                            </FormField>
                            <button className="ui-button-secondary w-full" type="submit">
                              Promover para agendamento
                            </button>
                          </form>

                          <form action={cancelWaitlistEntryAction} className="space-y-3 rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
                            <input name="waitlistEntryId" type="hidden" value={entry.id} />
                            <FormField label="Motivo do cancelamento">
                              <input className="ui-input" name="reason" />
                            </FormField>
                            <button className="ui-button-secondary w-full" type="submit">
                              Cancelar waitlist
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                  Nenhuma entrada pendente na waitlist para este recorte.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
