import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertRefundAmountWithinAvailableBalance,
  deriveDepositStatusFromPaymentStatus,
  derivePaymentStatusFromDepositState,
  resolveDepositCreatePaymentStatus,
} from '../../../features/finance/domain'

test('deposit lifecycle maps payment and deposit states consistently', () => {
  assert.equal(deriveDepositStatusFromPaymentStatus('PENDING'), 'PENDING')
  assert.equal(deriveDepositStatusFromPaymentStatus('AUTHORIZED'), 'PENDING')
  assert.equal(deriveDepositStatusFromPaymentStatus('PAID'), 'CONFIRMED')
  assert.equal(deriveDepositStatusFromPaymentStatus('REFUNDED'), 'REFUNDED')

  assert.equal(derivePaymentStatusFromDepositState('CONFIRMED'), 'PAID')
  assert.equal(derivePaymentStatusFromDepositState('APPLIED'), 'PAID')
  assert.equal(derivePaymentStatusFromDepositState('REFUNDED'), 'REFUNDED')
  assert.equal(derivePaymentStatusFromDepositState('EXPIRED'), 'VOIDED')
})

test('refund guard blocks amounts above the remaining refundable balance', () => {
  assert.throws(
    () => assertRefundAmountWithinAvailableBalance(100, 80, 30),
    /remaining refundable balance/,
  )

  assert.doesNotThrow(() => assertRefundAmountWithinAvailableBalance(100, 80, 20))
})

test('deposit creation rejects payment statuses that overstate the requested lifecycle state', () => {
  assert.throws(
    () => resolveDepositCreatePaymentStatus('PENDING', 'PAID'),
    /cannot be created with payment status PAID/,
  )

  assert.equal(resolveDepositCreatePaymentStatus('PENDING', 'AUTHORIZED'), 'AUTHORIZED')
  assert.equal(resolveDepositCreatePaymentStatus('CONFIRMED', 'PARTIAL'), 'PAID')
})
