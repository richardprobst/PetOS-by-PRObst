import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '@prisma/client'
import { operationalStatusIds } from '../../../features/appointments/constants'
import {
  deriveAppointmentFinancialStatus,
  syncAppointmentFinancialStatus,
} from '../../../features/appointments/financial'
import { shouldCalculateCommission } from '../../../features/finance/domain'

test('deriveAppointmentFinancialStatus preserves refunded and reversed final states', () => {
  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 120,
      refundedAmount: 120,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.completed,
    }),
    'REFUNDED',
  )

  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 0,
      refundedAmount: 0,
      hasReversedPayment: true,
      operationalStatusId: operationalStatusIds.completed,
    }),
    'REVERSED',
  )
})

test('deriveAppointmentFinancialStatus uses settled and refunded amounts for phase 2 flows', () => {
  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 0,
      refundedAmount: 0,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.confirmed,
    }),
    'PENDING',
  )

  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 40,
      refundedAmount: 0,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.confirmed,
    }),
    'PARTIAL',
  )

  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 120,
      refundedAmount: 0,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.confirmed,
    }),
    'PAID',
  )

  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 120,
      refundedAmount: 40,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.completed,
    }),
    'PARTIAL',
  )
})

test('deriveAppointmentFinancialStatus treats no-show charges as their own payable outcome', () => {
  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 0,
      refundedAmount: 0,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.noShow,
    }),
    'PENDING',
  )

  assert.equal(
    deriveAppointmentFinancialStatus({
      estimatedTotalAmount: 120,
      grossSettledAmount: 30,
      refundedAmount: 0,
      hasReversedPayment: false,
      operationalStatusId: operationalStatusIds.noShow,
    }),
    'PAID',
  )
})

test('commission only unlocks after payment and operational completion', () => {
  assert.equal(shouldCalculateCommission('PAID', operationalStatusIds.completed), true)
  assert.equal(shouldCalculateCommission('PAID', operationalStatusIds.confirmed), false)
  assert.equal(shouldCalculateCommission('PARTIAL', operationalStatusIds.completed), false)
})

test('syncAppointmentFinancialStatus audits the derived transition with source context', async () => {
  const auditEntries: Array<Record<string, unknown>> = []
  let updatedFinancialStatus: string | null = null

  const tx = {
    appointment: {
      findUnique: async (args: Record<string, unknown>) => {
        if ('select' in args) {
          return {
            estimatedTotalAmount: new Prisma.Decimal(120),
            financialStatus: 'PENDING',
            financialTransactions: [
              {
                amount: new Prisma.Decimal(120),
                paymentStatus: 'PAID',
              },
            ],
            deposits: [],
            id: 'appointment_1',
            operationalStatusId: operationalStatusIds.completed,
            refunds: [],
            unitId: 'unit_local',
          }
        }

        return {
          financialStatus: 'PAID',
          operationalStatusId: operationalStatusIds.completed,
          services: [
            {
              agreedUnitPrice: new Prisma.Decimal(120),
              employee: {
                commissionPercentage: new Prisma.Decimal(10),
              },
              id: 'service_1',
            },
          ],
        }
      },
      update: async ({ data }: { data: { financialStatus: string } }) => {
        updatedFinancialStatus = data.financialStatus
        return null
      },
    },
    appointmentService: {
      update: async () => null,
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditEntries.push(data)
        return null
      },
    },
  }

  await syncAppointmentFinancialStatus(tx as never, 'appointment_1', {
    source: {
      action: 'refund.create',
      actorUserId: 'user_finance_1',
      details: {
        refundId: 'refund_1',
      },
      entityId: 'refund_1',
      entityName: 'Refund',
    },
  })

  assert.equal(updatedFinancialStatus, 'PAID')
  assert.equal(auditEntries.length, 1)
  assert.equal(auditEntries[0]?.action, 'appointment.financial_status.sync')
  assert.equal(auditEntries[0]?.entityId, 'appointment_1')

  const details = auditEntries[0]?.details as {
    from: string
    source: {
      action: string
      entityId: string
      entityName: string
    }
    to: string
  }

  assert.equal(details.from, 'PENDING')
  assert.equal(details.to, 'PAID')
  assert.equal(details.source.action, 'refund.create')
  assert.equal(details.source.entityId, 'refund_1')
  assert.equal(details.source.entityName, 'Refund')
})

test('syncAppointmentFinancialStatus avoids redundant audit when the derived status did not change', async () => {
  const auditEntries: Array<Record<string, unknown>> = []
  let appointmentUpdated = false

  const tx = {
    appointment: {
      findUnique: async (args: Record<string, unknown>) => {
        if ('select' in args) {
          return {
            estimatedTotalAmount: new Prisma.Decimal(120),
            financialStatus: 'PAID',
            financialTransactions: [
              {
                amount: new Prisma.Decimal(120),
                paymentStatus: 'PAID',
              },
            ],
            deposits: [],
            id: 'appointment_1',
            operationalStatusId: operationalStatusIds.completed,
            refunds: [],
            unitId: 'unit_local',
          }
        }

        return {
          financialStatus: 'PAID',
          operationalStatusId: operationalStatusIds.completed,
          services: [],
        }
      },
      update: async () => {
        appointmentUpdated = true
        return null
      },
    },
    appointmentService: {
      update: async () => null,
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditEntries.push(data)
        return null
      },
    },
  }

  await syncAppointmentFinancialStatus(tx as never, 'appointment_1', {
    source: {
      action: 'financial_transaction.update',
      entityId: 'tx_1',
      entityName: 'FinancialTransaction',
    },
  })

  assert.equal(appointmentUpdated, false)
  assert.deepEqual(auditEntries, [])
})
