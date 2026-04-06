import assert from 'node:assert/strict'
import test from 'node:test'
import { AppError } from '../../../server/http/errors'
import {
  assertSupportedPosCompletionPaymentStatus,
  calculatePosSaleLineTotal,
  calculatePosSaleTotals,
  shouldIssueFiscalDocumentForPosSale,
} from '../../../features/pos/domain'

test('calculatePosSaleLineTotal applies quantity and discount', () => {
  assert.deepEqual(
    calculatePosSaleLineTotal({
      discountAmount: 5,
      quantity: 2,
      unitPrice: 20,
    }),
    {
      grossAmount: 40,
      totalAmount: 35,
    },
  )
})

test('calculatePosSaleTotals sums multiple items consistently', () => {
  assert.deepEqual(
    calculatePosSaleTotals([
      {
        discountAmount: 5,
        quantity: 2,
        unitPrice: 20,
      },
      {
        discountAmount: 0,
        quantity: 1,
        unitPrice: 12,
      },
    ]),
    {
      discountAmount: 5,
      subtotalAmount: 52,
      totalAmount: 47,
    },
  )
})

test('calculatePosSaleLineTotal rejects discounts above the gross amount', () => {
  assert.throws(
    () =>
      calculatePosSaleLineTotal({
        discountAmount: 25,
        quantity: 1,
        unitPrice: 20,
      }),
    (error) =>
      error instanceof AppError &&
      error.code === 'UNPROCESSABLE_ENTITY' &&
      error.message === 'Sale item discount cannot exceed the gross line amount.',
  )
})

test('assertSupportedPosCompletionPaymentStatus rejects refunded sale completion', () => {
  assert.throws(
    () => assertSupportedPosCompletionPaymentStatus('REFUNDED'),
    (error) =>
      error instanceof AppError &&
      error.code === 'UNPROCESSABLE_ENTITY' &&
      error.message === 'Payment status REFUNDED cannot be used to complete a POS sale.',
  )
})

test('shouldIssueFiscalDocumentForPosSale only issues on paid sales', () => {
  assert.equal(shouldIssueFiscalDocumentForPosSale(true, 'PAID'), true)
  assert.equal(shouldIssueFiscalDocumentForPosSale(true, 'AUTHORIZED'), false)
  assert.equal(shouldIssueFiscalDocumentForPosSale(false, 'PAID'), false)
})
