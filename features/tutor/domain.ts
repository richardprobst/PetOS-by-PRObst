import { operationalStatusIds } from '@/features/appointments/constants'
import { documentRequiresSignature } from '@/features/documents/domain'

export interface TutorPortalAlert {
  code:
    | 'ALL_CLEAR'
    | 'DOCUMENT_SIGNATURE_PENDING'
    | 'PRE_CHECK_IN_PENDING'
    | 'DEPOSIT_PENDING'
    | 'WAITLIST_PENDING'
    | 'TAXI_DOG_ACTIVE'
  title: string
  description: string
  tone: 'info' | 'warning' | 'success'
}

export interface TutorDocumentAlertCandidate {
  metadata: unknown
  signatures: Array<{
    signerUserId: string | null
    status: string
  }>
}

export interface TutorAppointmentJourneyCandidate {
  startAt: Date
  operationalStatusId: string
  tutorPreCheckIn: {
    id: string
  } | null
  taxiDogRide: {
    status: string
  } | null
}

export interface TutorFinancialSummary {
  availableCreditAmount: number
  completedRefundAmount: number
  pendingDepositAmount: number
}

interface DeriveTutorPortalAlertsInput {
  tutorId: string
  appointments: TutorAppointmentJourneyCandidate[]
  documents: TutorDocumentAlertCandidate[]
  pendingDepositAmount: number
  preCheckInWindowHours: number
  waitlistPendingCount: number
  now?: Date
}

export function canTutorSubmitPreCheckIn(
  appointment: Pick<
    TutorAppointmentJourneyCandidate,
    'operationalStatusId' | 'startAt' | 'tutorPreCheckIn'
  >,
  preCheckInWindowHours: number,
  now = new Date(),
) {
  if (
    appointment.operationalStatusId !== operationalStatusIds.scheduled &&
    appointment.operationalStatusId !== operationalStatusIds.confirmed
  ) {
    return false
  }

  if (appointment.startAt <= now) {
    return false
  }

  const windowMilliseconds = preCheckInWindowHours * 60 * 60 * 1000
  const startsWithinAllowedWindow =
    appointment.startAt.getTime() - now.getTime() <= windowMilliseconds

  return startsWithinAllowedWindow || Boolean(appointment.tutorPreCheckIn)
}

export function splitTutorAppointmentsByTimeline<T extends { startAt: Date }>(
  appointments: T[],
  now = new Date(),
) {
  const upcoming: T[] = []
  const history: T[] = []

  for (const appointment of appointments) {
    if (appointment.startAt >= now) {
      upcoming.push(appointment)
      continue
    }

    history.push(appointment)
  }

  upcoming.sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
  history.sort((left, right) => right.startAt.getTime() - left.startAt.getTime())

  return {
    history,
    upcoming,
  }
}

export function summarizeTutorFinance(input: {
  clientCredits: Array<{
    availableAmount: number
    expiresAt: Date | null
  }>
  deposits: Array<{
    amount: number
    status: string
  }>
  refunds: Array<{
    amount: number
    status: string
  }>
  now?: Date
}): TutorFinancialSummary {
  const now = input.now ?? new Date()

  return {
    pendingDepositAmount: input.deposits.reduce((total, deposit) => {
      if (deposit.status !== 'PENDING' && deposit.status !== 'CONFIRMED') {
        return total
      }

      return total + deposit.amount
    }, 0),
    completedRefundAmount: input.refunds.reduce((total, refund) => {
      if (refund.status !== 'COMPLETED') {
        return total
      }

      return total + refund.amount
    }, 0),
    availableCreditAmount: input.clientCredits.reduce((total, credit) => {
      if (credit.expiresAt && credit.expiresAt <= now) {
        return total
      }

      return total + credit.availableAmount
    }, 0),
  }
}

export function deriveTutorPortalAlerts(input: DeriveTutorPortalAlertsInput): TutorPortalAlert[] {
  const now = input.now ?? new Date()
  const alerts: TutorPortalAlert[] = []

  const pendingDocumentSignatures = input.documents.filter((document) => {
    if (!documentRequiresSignature(document.metadata)) {
      return false
    }

    return !document.signatures.some(
      (signature) =>
        signature.signerUserId === input.tutorId && signature.status === 'SIGNED',
    )
  }).length

  if (pendingDocumentSignatures > 0) {
    alerts.push({
      code: 'DOCUMENT_SIGNATURE_PENDING',
      title: 'Documentos aguardando assinatura',
      description: `${pendingDocumentSignatures} documento(s) aguardam seu aceite no portal.`,
      tone: 'warning',
    })
  }

  const pendingPreCheckIns = input.appointments.filter(
    (appointment) =>
      canTutorSubmitPreCheckIn(appointment, input.preCheckInWindowHours, now) &&
      !appointment.tutorPreCheckIn,
  ).length

  if (pendingPreCheckIns > 0) {
    alerts.push({
      code: 'PRE_CHECK_IN_PENDING',
      title: 'Pre-check-in pendente',
      description: `${pendingPreCheckIns} atendimento(s) proximos ainda precisam do seu pre-check-in.`,
      tone: 'warning',
    })
  }

  if (input.pendingDepositAmount > 0) {
    alerts.push({
      code: 'DEPOSIT_PENDING',
      title: 'Pagamento preparatorio pendente',
      description: 'Ha deposito ou pre-pagamento aguardando conciliacao no seu historico financeiro.',
      tone: 'warning',
    })
  }

  if (input.waitlistPendingCount > 0) {
    alerts.push({
      code: 'WAITLIST_PENDING',
      title: 'Waitlist ativa',
      description: `${input.waitlistPendingCount} solicitacao(oes) continuam aguardando promocao para horario real.`,
      tone: 'info',
    })
  }

  const activeTaxiDogRides = input.appointments.filter((appointment) => {
    const status = appointment.taxiDogRide?.status
    return status === 'REQUESTED' || status === 'SCHEDULED' || status === 'IN_PROGRESS'
  }).length

  if (activeTaxiDogRides > 0) {
    alerts.push({
      code: 'TAXI_DOG_ACTIVE',
      title: 'Taxi Dog em acompanhamento',
      description: `${activeTaxiDogRides} atendimento(s) tem transporte ativo para acompanhar no portal.`,
      tone: 'info',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      code: 'ALL_CLEAR',
      title: 'Portal sem alertas criticos',
      description: 'Seu portal esta sincronizado, sem pendencias operacionais imediatas.',
      tone: 'success',
    })
  }

  return alerts
}
