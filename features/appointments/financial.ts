import { Prisma, type AppointmentFinancialStatus } from '@prisma/client'
import { AppError } from '@/server/http/errors'
import { calculateCommissionAmountFromBilledValue } from '@/features/appointments/commission'
import {
  deriveAppointmentFinancialStatusFromSnapshot,
  hasReversedPayment,
  shouldCalculateCommission,
  sumSettledPaymentAmount,
} from '@/features/finance/domain'

interface AppointmentFinancialStatusInput {
  estimatedTotalAmount: number
  grossSettledAmount: number
  refundedAmount: number
  hasReversedPayment: boolean
  operationalStatusId: string
}

export function deriveAppointmentFinancialStatus(
  input: AppointmentFinancialStatusInput,
): AppointmentFinancialStatus {
  return deriveAppointmentFinancialStatusFromSnapshot(input)
}

export async function recalculateAppointmentServiceCommissions(
  client: Prisma.TransactionClient,
  appointmentId: string,
) {
  const appointment = await client.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      services: {
        include: {
          employee: true,
        },
      },
    },
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for commission calculation.')
  }

  // Commission consolidates only after reliable settlement and service completion.
  // Prepayment can mark the appointment as PAID before execution, but must not unlock payout early.
  const shouldCalculateRealCommission = shouldCalculateCommission(
    appointment.financialStatus,
    appointment.operationalStatusId,
  )

  for (const appointmentService of appointment.services) {
    const commissionPercentage = appointmentService.employee?.commissionPercentage
      ? Number(appointmentService.employee.commissionPercentage)
      : null

    const nextCommissionAmount = shouldCalculateRealCommission
      ? calculateCommissionAmountFromBilledValue(
          Number(appointmentService.agreedUnitPrice),
          commissionPercentage,
        )
      : 0

    await client.appointmentService.update({
      where: {
        id: appointmentService.id,
      },
      data: {
        calculatedCommissionAmount: nextCommissionAmount,
      },
    })
  }
}

export async function syncAppointmentFinancialStatus(
  client: Prisma.TransactionClient,
  appointmentId: string,
) {
  const appointment = await client.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    select: {
      estimatedTotalAmount: true,
      operationalStatusId: true,
      financialTransactions: {
        where: {
          transactionType: {
            in: ['REVENUE'],
          },
        },
        select: {
          amount: true,
          paymentStatus: true,
        },
      },
      deposits: {
        select: {
          amount: true,
          purpose: true,
          status: true,
        },
      },
      refunds: {
        where: {
          status: 'COMPLETED',
        },
        select: {
          amount: true,
        },
      },
    },
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for financial synchronization.')
  }

  const grossSettledAmount =
    sumSettledPaymentAmount(
      appointment.financialTransactions.map((transaction) => ({
        amount: Number(transaction.amount),
        paymentStatus: transaction.paymentStatus,
      })),
    ) +
    appointment.deposits.reduce((total, deposit) => {
      const shouldCountDeposit =
        (deposit.purpose === 'PREPAYMENT' &&
          ['CONFIRMED', 'APPLIED', 'FORFEITED'].includes(deposit.status)) ||
        (deposit.purpose === 'SECURITY' && ['APPLIED', 'FORFEITED'].includes(deposit.status))

      if (!shouldCountDeposit) {
        return total
      }

      return total + Number(deposit.amount)
    }, 0)

  const refundedAmount = appointment.refunds.reduce(
    (total, refund) => total + Number(refund.amount),
    0,
  )

  const nextFinancialStatus = deriveAppointmentFinancialStatus({
    estimatedTotalAmount: Number(appointment.estimatedTotalAmount),
    grossSettledAmount,
    refundedAmount,
    hasReversedPayment: hasReversedPayment(appointment.financialTransactions),
    operationalStatusId: appointment.operationalStatusId,
  })

  await client.appointment.update({
    where: {
      id: appointmentId,
    },
    data: {
      financialStatus: nextFinancialStatus,
    },
  })

  await recalculateAppointmentServiceCommissions(client, appointmentId)
}
