import {
  type AppointmentFinancialStatus,
  type DepositPurpose,
  type DepositStatus,
  type PaymentStatus,
} from '@prisma/client'
import { AppError } from '@/server/http/errors'
import { operationalStatusIds } from '@/features/appointments/constants'

const settledPaymentStatuses = new Set<PaymentStatus>(['PAID', 'PARTIAL'])
const reversedPaymentStatuses = new Set<PaymentStatus>(['REVERSED', 'VOIDED'])

const allowedDepositTransitions: Record<DepositStatus, DepositStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELED', 'EXPIRED'],
  CONFIRMED: ['APPLIED', 'FORFEITED', 'REFUNDED'],
  APPLIED: ['REFUNDED'],
  FORFEITED: ['REFUNDED'],
  REFUNDED: [],
  CANCELED: [],
  EXPIRED: [],
}

interface FinancialStatusSnapshot {
  estimatedTotalAmount: number
  grossSettledAmount: number
  refundedAmount: number
  hasReversedPayment: boolean
  operationalStatusId: string
}

export function deriveDepositStatusFromPaymentStatus(paymentStatus: PaymentStatus): DepositStatus {
  switch (paymentStatus) {
    case 'PAID':
    case 'PARTIAL':
      return 'CONFIRMED'
    case 'REFUNDED':
      return 'REFUNDED'
    case 'REVERSED':
    case 'VOIDED':
    case 'FAILED':
      return 'CANCELED'
    case 'AUTHORIZED':
    case 'PENDING':
    default:
      return 'PENDING'
  }
}

export function derivePaymentStatusFromDepositState(
  status: DepositStatus,
  fallbackStatus: PaymentStatus = 'PENDING',
): PaymentStatus {
  switch (status) {
    case 'CONFIRMED':
    case 'APPLIED':
    case 'FORFEITED':
      return 'PAID'
    case 'REFUNDED':
      return 'REFUNDED'
    case 'CANCELED':
    case 'EXPIRED':
      return 'VOIDED'
    case 'PENDING':
    default:
      return fallbackStatus
  }
}

export function assertDepositStatusTransition(currentStatus: DepositStatus, nextStatus: DepositStatus) {
  if (currentStatus === nextStatus) {
    return
  }

  const allowedTransitions = allowedDepositTransitions[currentStatus] ?? []

  if (!allowedTransitions.includes(nextStatus)) {
    throw new AppError(
      'CONFLICT',
      409,
      `Invalid deposit status transition from ${currentStatus} to ${nextStatus}.`,
    )
  }
}

export function assertPrepaymentRequiresAppointment(
  purpose: DepositPurpose,
  appointmentId: string | null | undefined,
) {
  if (purpose === 'PREPAYMENT' && !appointmentId) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Prepayments must be linked to an appointment.',
    )
  }
}

export function calculateNetSettledAmount(
  grossSettledAmount: number,
  refundedAmount: number,
) {
  return Math.max(0, grossSettledAmount - refundedAmount)
}

export function deriveAppointmentFinancialStatusFromSnapshot(
  snapshot: FinancialStatusSnapshot,
): AppointmentFinancialStatus {
  const netSettledAmount = calculateNetSettledAmount(
    snapshot.grossSettledAmount,
    snapshot.refundedAmount,
  )
  const normalizedEstimatedTotalAmount = Math.max(0, snapshot.estimatedTotalAmount)

  if (snapshot.hasReversedPayment && netSettledAmount === 0) {
    return 'REVERSED'
  }

  if (snapshot.refundedAmount > 0 && snapshot.grossSettledAmount > 0 && netSettledAmount === 0) {
    return 'REFUNDED'
  }

  if (snapshot.operationalStatusId === operationalStatusIds.noShow) {
    return netSettledAmount > 0 ? 'PAID' : 'PENDING'
  }

  if (normalizedEstimatedTotalAmount === 0) {
    return netSettledAmount > 0 ? 'PAID' : 'EXEMPT'
  }

  if (netSettledAmount >= normalizedEstimatedTotalAmount) {
    return 'PAID'
  }

  if (netSettledAmount > 0) {
    return 'PARTIAL'
  }

  return 'PENDING'
}

export function shouldCalculateCommission(
  financialStatus: AppointmentFinancialStatus,
  operationalStatusId: string,
) {
  return financialStatus === 'PAID' && operationalStatusId === operationalStatusIds.completed
}

export function sumSettledPaymentAmount(
  entries: Array<{ amount: number; paymentStatus: PaymentStatus }>,
) {
  return entries.reduce((total, entry) => {
    if (!settledPaymentStatuses.has(entry.paymentStatus)) {
      return total
    }

    return total + entry.amount
  }, 0)
}

export function hasReversedPayment(entries: Array<{ paymentStatus: PaymentStatus }>) {
  return entries.some((entry) => reversedPaymentStatuses.has(entry.paymentStatus))
}

export function calculateRemainingRefundableAmount(
  sourceAmount: number,
  alreadyRefundedAmount: number,
) {
  return Math.max(0, sourceAmount - alreadyRefundedAmount)
}

export function assertRefundAmountWithinAvailableBalance(
  sourceAmount: number,
  alreadyRefundedAmount: number,
  requestedRefundAmount: number,
) {
  const remainingAmount = calculateRemainingRefundableAmount(sourceAmount, alreadyRefundedAmount)

  if (requestedRefundAmount > remainingAmount) {
    throw new AppError(
      'CONFLICT',
      409,
      'Refund amount exceeds the remaining refundable balance for the source transaction.',
    )
  }
}
