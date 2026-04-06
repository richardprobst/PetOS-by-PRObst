import assert from 'node:assert/strict'
import test from 'node:test'
import { operationalStatusIds } from '../../../features/appointments/constants'
import { deriveAppointmentFinancialStatus } from '../../../features/appointments/financial'
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
