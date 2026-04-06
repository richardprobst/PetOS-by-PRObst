import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateCommissionAmountFromBilledValue } from '../../../features/appointments/commission'

test('calculateCommissionAmountFromBilledValue returns zero without billed value or commission percentage', () => {
  assert.equal(calculateCommissionAmountFromBilledValue(0, 10), 0)
  assert.equal(calculateCommissionAmountFromBilledValue(150, null), 0)
  assert.equal(calculateCommissionAmountFromBilledValue(150, 0), 0)
})

test('calculateCommissionAmountFromBilledValue calculates and rounds commission to cents', () => {
  assert.equal(calculateCommissionAmountFromBilledValue(199.9, 12.5), 24.99)
})
