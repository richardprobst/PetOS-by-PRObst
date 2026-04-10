import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { resolveBrandRuntimeForCurrentRequest } from '@/features/branding/services'
import { signTutorDocumentAction } from '@/features/documents/actions'
import { isDocumentSignaturePendingForTutor } from '@/features/documents/services'
import { TutorVirtualAssistantPanel } from '@/features/assistant/components/tutor-virtual-assistant-panel'
import { getTutorAssistantUsageSnapshot } from '@/features/assistant/usage'
import {
  cancelTutorWaitlistEntryAction,
  createTutorAppointmentAction,
  createTutorWaitlistEntryAction,
  saveTutorPreCheckInAction,
  updateTutorProfileAction,
} from '@/features/tutor/actions'
import { TutorPwaCard } from '@/features/tutor/components/tutor-pwa-card'
import { canTutorSubmitPreCheckIn } from '@/features/tutor/domain'
import type { TutorPortalAlert } from '@/features/tutor/domain'
import { getTutorPortalOverview } from '@/features/tutor/services'
import { listServices } from '@/features/services/services'
import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
} from '@/lib/formatters'
import { requireTutorAreaUser } from '@/server/authorization/guards'

interface TutorPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
  }>
}

function getNotificationTone(deliveryStatus: string) {
  if (deliveryStatus === 'SENT') {
    return 'success'
  }

  if (deliveryStatus === 'FAILED') {
    return 'danger'
  }

  return 'warning'
}

function getOperationalStatusTone(statusId: string) {
  if (statusId === 'COMPLETED') {
    return 'success'
  }

  if (statusId === 'CANCELED' || statusId === 'NO_SHOW') {
    return 'danger'
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

function getDepositStatusTone(status: string) {
  if (status === 'APPLIED' || status === 'CONFIRMED') {
    return 'success'
  }

  if (status === 'REFUNDED' || status === 'FORFEITED' || status === 'CANCELED') {
    return 'danger'
  }

  return 'warning'
}

function getRefundStatusTone(status: string) {
  if (status === 'COMPLETED') {
    return 'success'
  }

  if (status === 'FAILED' || status === 'CANCELED') {
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

function getAlertTone(tone: TutorPortalAlert['tone']) {
  if (tone === 'warning') {
    return 'warning'
  }

  if (tone === 'success') {
    return 'success'
  }

  return 'info'
}

function getDepositPurposeLabel(purpose: string) {
  if (purpose === 'PREPAYMENT') {
    return 'Pre-pagamento'
  }

  return 'Deposito'
}

function getWaitlistStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    PROMOTED: 'Promovida',
    CANCELED: 'Cancelada',
    EXPIRED: 'Expirada',
  }

  return labels[status] ?? status
}

function getTaxiDogStatusLabel(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: 'Solicitado',
    SCHEDULED: 'Agendado',
    IN_PROGRESS: 'Em rota',
    COMPLETED: 'Concluido',
    CANCELED: 'Cancelado',
  }

  return labels[status] ?? status
}

function getJsonObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function getJsonString(value: unknown, key: string) {
  const objectValue = getJsonObject(value)
  const fieldValue = objectValue?.[key]

  return typeof fieldValue === 'string' && fieldValue.trim() !== '' ? fieldValue : ''
}

export default async function TutorPage({ searchParams }: TutorPageProps) {
  const tutor = await requireTutorAreaUser('/tutor')
  const params = await searchParams
  const [portal, services, assistantUsageSnapshot, brandRuntime] = await Promise.all([
    getTutorPortalOverview(tutor),
    listServices(tutor, { active: true }),
    getTutorAssistantUsageSnapshot(tutor),
    resolveBrandRuntimeForCurrentRequest('TUTOR'),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tutor"
        title={brandRuntime.copy.tutorHeadline}
        description={brandRuntime.copy.tutorDescription}
      />

      <ActionFlash message={params.message} status={params.status} />

      <TutorVirtualAssistantPanel
        pets={portal.dashboard.pets.map((pet) => ({
          id: pet.id,
          name: pet.name,
        }))}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
        }))}
        usageSnapshot={assistantUsageSnapshot}
      />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]" id="alertas">
        <TutorPwaCard />

        <div className="grid gap-4">
          {portal.alerts.map((alert) => (
            <FeedbackMessage
              className="surface-panel"
              description={alert.description}
              key={alert.code}
              title={alert.title}
              tone={getAlertTone(alert.tone)}
            />
          ))}

          <div className="surface-panel rounded-[1.75rem] p-6">
            <p className="section-label">Notificacoes</p>
            <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
              Avisos operacionais do seu proprio atendimento.
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
              O portal continua exibindo apenas comunicacoes ligadas ao seu cadastro e aos seus agendamentos.
            </p>

            <div className="mt-5 space-y-4">
              {portal.notifications.length > 0 ? (
                portal.notifications.map((notification) => (
                  <article
                    className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
                    key={notification.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={notification.channel === 'WHATSAPP' ? 'success' : 'info'}>
                        {notification.channel}
                      </StatusBadge>
                      <StatusBadge tone={getNotificationTone(notification.deliveryStatus)}>
                        {notification.deliveryStatus}
                      </StatusBadge>
                      {notification.appointment ? (
                        <span className="text-xs uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
                          {notification.appointment.pet.name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                      {notification.template?.name ?? 'Mensagem operacional'}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                      {formatDateTime(notification.sentAt)}
                      {notification.appointment
                        ? ` - ${notification.appointment.operationalStatus.name}`
                        : ''}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                      {notification.messageContent}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                  Ainda nao ha notificacoes registradas para a sua conta.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" id="perfil">
        <form action={updateTutorProfileAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <p className="section-label">Perfil</p>
          <FormField label="Nome">
            <input className="ui-input" defaultValue={portal.dashboard.user.name} name="name" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="E-mail">
              <input className="ui-input" defaultValue={portal.dashboard.user.email} name="email" type="email" />
            </FormField>
            <FormField label="Telefone">
              <input className="ui-input" defaultValue={portal.dashboard.user.phone ?? ''} name="phone" />
            </FormField>
          </div>
          <FormField label="Endereco">
            <input className="ui-input" defaultValue={portal.dashboard.address ?? ''} name="address" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Cidade">
              <input className="ui-input" defaultValue={portal.dashboard.city ?? ''} name="city" />
            </FormField>
            <FormField label="Estado">
              <input className="ui-input" defaultValue={portal.dashboard.state ?? ''} name="state" />
            </FormField>
            <FormField label="CEP">
              <input className="ui-input" defaultValue={portal.dashboard.zipCode ?? ''} name="zipCode" />
            </FormField>
          </div>
          <FormField label="Preferencia de contato">
            <input className="ui-input" defaultValue={portal.dashboard.contactPreference ?? ''} name="contactPreference" />
          </FormField>
          <FormField label="Observacoes gerais">
            <textarea className="ui-input min-h-24" defaultValue={portal.dashboard.generalNotes ?? ''} name="generalNotes" />
          </FormField>
          <FormField label="Nova senha">
            <input className="ui-input" name="password" type="password" />
          </FormField>
          <button className="ui-button-primary" type="submit">
            Atualizar perfil
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6" id="agendamento">
          <p className="section-label">Solicitar atendimento</p>
          <form action={createTutorAppointmentAction} className="mt-4 space-y-4">
            <FormField label="Pet">
              <select className="ui-input" name="petId">
                <option value="">Selecione</option>
                {portal.dashboard.pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              description="Segure Ctrl para selecionar mais de um servico no mesmo atendimento."
              label="Servicos"
            >
              <select className="ui-input min-h-32" multiple name="serviceIds">
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
            <FormField label="Observacoes">
              <textarea className="ui-input min-h-24" name="clientNotes" />
            </FormField>
            <FeedbackMessage
              description="O portal permite solicitar horario e acompanhar o andamento, mas a alocacao operacional continua sendo validada no servidor."
              title="Recorte do tutor"
              tone="info"
            />
            <button className="ui-button-primary" type="submit">
              Solicitar agendamento
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" id="jornada">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Jornada do pet</p>
          <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
            Proximos atendimentos, pre-check-in e acompanhamento operacional.
          </p>
          <div className="mt-5 space-y-4">
            {portal.appointmentTimeline.upcoming.length > 0 ? (
              portal.appointmentTimeline.upcoming.map((appointment) => {
                const payload = getJsonObject(appointment.tutorPreCheckIn?.payload)
                const preCheckInEditable = canTutorSubmitPreCheckIn(
                  appointment,
                  portal.preCheckInWindowHours,
                )

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
                          {appointment.waitlistSource ? (
                            <StatusBadge tone="info">Promovido da waitlist</StatusBadge>
                          ) : null}
                          {appointment.tutorPreCheckIn ? (
                            <StatusBadge tone="success">Pre-check-in enviado</StatusBadge>
                          ) : preCheckInEditable ? (
                            <StatusBadge tone="warning">Pre-check-in pendente</StatusBadge>
                          ) : null}
                        </div>

                        <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                          {appointment.pet.name}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                          {formatDateTime(appointment.startAt)} - {formatDateTime(appointment.endAt)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                          {appointment.services.map((service) => service.service.name).join(', ')}
                        </p>
                        {appointment.clientNotes ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                            {appointment.clientNotes}
                          </p>
                        ) : null}
                      </div>

                      {appointment.taxiDogRide ? (
                        <div className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4 lg:w-[19rem]">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={getTaxiDogStatusTone(appointment.taxiDogRide.status)}>
                              {getTaxiDogStatusLabel(appointment.taxiDogRide.status)}
                            </StatusBadge>
                            <StatusBadge tone="info">Taxi Dog</StatusBadge>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                            Motorista:{' '}
                            {appointment.taxiDogRide.assignedDriver?.user.name ?? 'Aguardando alocacao'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                            Coleta:{' '}
                            {appointment.taxiDogRide.pickupWindowStartAt &&
                            appointment.taxiDogRide.pickupWindowEndAt
                              ? `${formatDateTime(appointment.taxiDogRide.pickupWindowStartAt)} ate ${formatDateTime(appointment.taxiDogRide.pickupWindowEndAt)}`
                              : 'Janela ainda nao confirmada'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                            Entrega:{' '}
                            {appointment.taxiDogRide.dropoffWindowStartAt &&
                            appointment.taxiDogRide.dropoffWindowEndAt
                              ? `${formatDateTime(appointment.taxiDogRide.dropoffWindowStartAt)} ate ${formatDateTime(appointment.taxiDogRide.dropoffWindowEndAt)}`
                              : 'Janela ainda nao confirmada'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                            Tarifa prevista: {formatCurrency(Number(appointment.taxiDogRide.feeAmount))}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {appointment.tutorPreCheckIn ? (
                      <div className="mt-4 rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          Pre-check-in registrado em {formatDateTime(appointment.tutorPreCheckIn.submittedAt)}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">
                          Telefone de contato: {appointment.tutorPreCheckIn.contactPhone ?? portal.dashboard.user.phone ?? 'Nao informado'}
                        </p>
                        {appointment.tutorPreCheckIn.notes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                            {appointment.tutorPreCheckIn.notes}
                          </p>
                        ) : null}
                        {getJsonString(payload, 'healthUpdates') ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                            Saude e cuidados: {getJsonString(payload, 'healthUpdates')}
                          </p>
                        ) : null}
                        {getJsonString(payload, 'transportNotes') ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                            Transporte: {getJsonString(payload, 'transportNotes')}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {preCheckInEditable ? (
                      <form action={saveTutorPreCheckInAction} className="mt-4 space-y-4 rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
                        <input name="appointmentId" type="hidden" value={appointment.id} />
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField label="Telefone de contato">
                            <input
                              className="ui-input"
                              defaultValue={appointment.tutorPreCheckIn?.contactPhone ?? portal.dashboard.user.phone ?? ''}
                              name="contactPhone"
                            />
                          </FormField>
                          <FormField label="Janela de envio">
                            <input
                              className="ui-input"
                              disabled
                              value={`${portal.preCheckInWindowHours}h antes do atendimento`}
                            />
                          </FormField>
                        </div>
                        <FormField label="Observacoes gerais">
                          <textarea
                            className="ui-input min-h-24"
                            defaultValue={appointment.tutorPreCheckIn?.notes ?? ''}
                            name="notes"
                          />
                        </FormField>
                        <FormField label="Saude e cuidados recentes">
                          <textarea
                            className="ui-input min-h-24"
                            defaultValue={getJsonString(payload, 'healthUpdates')}
                            name="healthUpdates"
                          />
                        </FormField>
                        <FormField label="Notas de transporte ou entrega">
                          <textarea
                            className="ui-input min-h-24"
                            defaultValue={getJsonString(payload, 'transportNotes')}
                            name="transportNotes"
                          />
                        </FormField>
                        <label className="flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                          <input
                            defaultChecked={appointment.tutorPreCheckIn?.consentConfirmed ?? false}
                            name="consentConfirmed"
                            type="checkbox"
                            value="1"
                          />
                          Confirmo que as informacoes acima estao corretas para a equipe do atendimento.
                        </label>
                        <button className="ui-button-primary" type="submit">
                          Salvar pre-check-in
                        </button>
                      </form>
                    ) : null}
                  </article>
                )
              })
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Ainda nao ha atendimentos futuros vinculados ao seu portal.
              </p>
            )}
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6" id="financeiro">
          <p className="section-label">Financeiro proprio</p>
          <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
            Depositos, creditos e reembolsos do seu historico.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'Depositos pendentes',
                value: formatCurrency(portal.finance.summary.pendingDepositAmount),
              },
              {
                label: 'Creditos disponiveis',
                value: formatCurrency(portal.finance.summary.availableCreditAmount),
              },
              {
                label: 'Reembolsos concluidos',
                value: formatCurrency(portal.finance.summary.completedRefundAmount),
              },
            ].map((item) => (
              <article
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
                key={item.label}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">Depositos e pre-pagamentos</p>
              <DataTable
                className="mt-3"
                columns={[
                  {
                    id: 'purpose',
                    header: 'Finalidade',
                    render: (deposit) => (
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">
                          {getDepositPurposeLabel(deposit.purpose)}
                        </p>
                        <p>{formatCurrency(Number(deposit.amount))}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    render: (deposit) => (
                      <StatusBadge tone={getDepositStatusTone(deposit.status)}>{deposit.status}</StatusBadge>
                    ),
                  },
                  {
                    id: 'appointment',
                    header: 'Atendimento',
                    render: (deposit) => deposit.appointment?.pet.name ?? 'Sem agendamento',
                  },
                ]}
                rows={portal.finance.deposits}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">Creditos disponiveis</p>
              <DataTable
                className="mt-3"
                columns={[
                  {
                    id: 'origin',
                    header: 'Origem',
                    render: (credit) => (
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">{credit.originType}</p>
                        <p>{formatCurrency(Number(credit.availableAmount))}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'expiresAt',
                    header: 'Validade',
                    render: (credit) =>
                      credit.expiresAt ? formatDateTime(credit.expiresAt) : 'Sem expiracao',
                  },
                  {
                    id: 'notes',
                    header: 'Observacoes',
                    render: (credit) => credit.notes ?? 'Sem observacoes adicionais',
                  },
                ]}
                rows={portal.finance.clientCredits}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">Reembolsos</p>
              <DataTable
                className="mt-3"
                columns={[
                  {
                    id: 'amount',
                    header: 'Valor',
                    render: (refund) => (
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">
                          {formatCurrency(Number(refund.amount))}
                        </p>
                        <p>{refund.reason}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    render: (refund) => (
                      <StatusBadge tone={getRefundStatusTone(refund.status)}>{refund.status}</StatusBadge>
                    ),
                  },
                  {
                    id: 'processedAt',
                    header: 'Processado em',
                    render: (refund) =>
                      refund.processedAt ? formatDateTime(refund.processedAt) : 'Aguardando processamento',
                  },
                ]}
                rows={portal.finance.refunds}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" id="waitlist">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Waitlist</p>
          <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
            Solicite janelas concorridas sem abrir automacao comercial.
          </p>
          <form action={createTutorWaitlistEntryAction} className="mt-4 space-y-4">
            <FormField label="Pet">
              <select className="ui-input" name="petId">
                <option value="">Selecione</option>
                {portal.dashboard.pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
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
            <label className="flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
              <input name="requestedTransport" type="checkbox" value="1" />
              Quero acompanhar essa solicitacao com necessidade de Taxi Dog.
            </label>
            <button className="ui-button-primary" type="submit">
              Entrar na waitlist
            </button>
          </form>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Suas entradas</p>
          <div className="mt-4 space-y-4">
            {portal.waitlistEntries.length > 0 ? (
              portal.waitlistEntries.map((entry) => (
                <article
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={getWaitlistStatusTone(entry.status)}>
                      {getWaitlistStatusLabel(entry.status)}
                    </StatusBadge>
                    {entry.requestedTransport ? (
                      <StatusBadge tone="info">Taxi Dog solicitado</StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-base font-semibold text-[color:var(--foreground)]">
                    {entry.pet.name} - {entry.desiredService.name}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                    {formatDateTime(entry.preferredStartAt)} ate {formatDateTime(entry.preferredEndAt)}
                  </p>
                  {entry.promotedAppointment ? (
                    <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">
                      Promovida para atendimento em {formatDateTime(entry.promotedAppointment.startAt)}.
                    </p>
                  ) : null}
                  {entry.notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-soft)]">
                      {entry.notes}
                    </p>
                  ) : null}
                  {entry.status === 'PENDING' ? (
                    <form action={cancelTutorWaitlistEntryAction} className="mt-4 space-y-3">
                      <input name="waitlistEntryId" type="hidden" value={entry.id} />
                      <FormField label="Motivo do cancelamento">
                        <input className="ui-input" name="reason" />
                      </FormField>
                      <button className="ui-button-secondary" type="submit">
                        Cancelar solicitacao
                      </button>
                    </form>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Ainda nao ha entradas de waitlist registradas para a sua conta.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" id="documentos">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Documentos</p>
          <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
            Autorizacoes, vacinas e anexos vinculados ao seu atendimento.
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
            O acesso continua protegido no servidor. Documentos privados internos nao aparecem aqui.
          </p>

          <div className="mt-5 space-y-4">
            {portal.documents.length > 0 ? (
              portal.documents.map((document) => {
                const pendingSignature = isDocumentSignaturePendingForTutor(tutor, document)

                return (
                  <article
                    className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
                    key={document.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone="info">{document.type}</StatusBadge>
                      <StatusBadge tone={pendingSignature ? 'warning' : 'success'}>
                        {pendingSignature ? 'Assinatura pendente' : 'Acesso liberado'}
                      </StatusBadge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                      {document.title}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                      {document.originalFileName ?? 'Documento gerado pelo sistema'} -{' '}
                      {formatFileSize(document.sizeBytes)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <a className="ui-button-secondary" href={`/api/assets/documents/${document.id}`}>
                        Baixar documento
                      </a>
                    </div>

                    {pendingSignature ? (
                      <form action={signTutorDocumentAction} className="mt-4 space-y-3">
                        <input name="documentId" type="hidden" value={document.id} />
                        <input name="signerEmail" type="hidden" value={tutor.email} />
                        <FormField label="Nome para assinatura">
                          <input className="ui-input" defaultValue={tutor.name} name="signerName" />
                        </FormField>
                        <FormField label="Payload JSON opcional">
                          <textarea
                            className="ui-input min-h-24"
                            name="payloadJson"
                            placeholder='{"aceite": true, "origem": "portal_tutor"}'
                          />
                        </FormField>
                        <button className="ui-button-primary" type="submit">
                          Assinar documento
                        </button>
                      </form>
                    ) : null}
                  </article>
                )
              })
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Ainda nao ha documentos operacionais disponiveis para a sua conta.
              </p>
            )}
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Midia</p>
          <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
            Fotos, videos e anexos protegidos.
          </p>
          <div className="mt-5 space-y-4">
            {portal.mediaAssets.length > 0 ? (
              portal.mediaAssets.map((mediaAsset) => (
                <article
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/50 p-4"
                  key={mediaAsset.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="info">{mediaAsset.type}</StatusBadge>
                    <StatusBadge tone="success">{mediaAsset.accessLevel}</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                    {mediaAsset.description ?? mediaAsset.originalFileName ?? 'Midia operacional'}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">
                    {formatFileSize(mediaAsset.sizeBytes)} - {formatDateTime(mediaAsset.createdAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a className="ui-button-secondary" href={`/api/assets/media/${mediaAsset.id}`}>
                      Abrir midia
                    </a>
                    <a
                      className="ui-link text-sm font-semibold"
                      href={`/api/assets/media/${mediaAsset.id}?download=1`}
                    >
                      Baixar
                    </a>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Ainda nao ha midias operacionais protegidas para o seu perfil.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]" id="historico">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Pets</p>
          <DataTable
            className="mt-4"
            columns={[
              {
                id: 'pet',
                header: 'Pet',
                render: (pet) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{pet.name}</p>
                    <p>
                      {pet.species}
                      {pet.breed ? ` - ${pet.breed}` : ''}
                    </p>
                  </div>
                ),
              },
              {
                id: 'notes',
                header: 'Saude',
                render: (pet) => pet.healthNotes ?? 'Sem observacoes',
              },
            ]}
            rows={portal.dashboard.pets}
          />
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Historico de atendimentos</p>
          <DataTable
            className="mt-4"
            columns={[
              {
                id: 'appointment',
                header: 'Atendimento',
                render: (appointment) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{appointment.pet.name}</p>
                    <p>{formatDateTime(appointment.startAt)}</p>
                  </div>
                ),
              },
              {
                id: 'services',
                header: 'Servicos',
                render: (appointment) =>
                  appointment.services.map((service) => service.service.name).join(', '),
              },
              {
                id: 'status',
                header: 'Status',
                render: (appointment) => (
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={getOperationalStatusTone(appointment.operationalStatusId)}>
                      {appointment.operationalStatus.name}
                    </StatusBadge>
                    <StatusBadge tone={getFinancialStatusTone(appointment.financialStatus)}>
                      {appointment.financialStatus}
                    </StatusBadge>
                  </div>
                ),
              },
              {
                id: 'report',
                header: 'Report card',
                render: (appointment) => (appointment.reportCard ? 'Disponivel' : 'Pendente'),
              },
            ]}
            rows={portal.appointmentTimeline.history}
          />
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6" id="report-cards">
        <p className="section-label">Report cards</p>
        <DataTable
          className="mt-4"
          columns={[
            {
              id: 'pet',
              header: 'Pet',
              render: (reportCard) => reportCard.appointment.pet.name,
            },
            {
              id: 'generated',
              header: 'Gerado em',
              render: (reportCard) => formatDateTime(reportCard.generatedAt),
            },
            {
              id: 'notes',
              header: 'Resumo',
              render: (reportCard) =>
                reportCard.nextReturnRecommendation ??
                reportCard.generalNotes ??
                'Sem resumo adicional',
            },
          ]}
          rows={portal.reportCards}
        />
      </section>
    </div>
  )
}
