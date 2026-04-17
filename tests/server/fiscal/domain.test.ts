import assert from 'node:assert/strict'
import test from 'node:test'
import { assertFiscalDocumentStatusTransition } from '../../../features/fiscal/domain'

test('fiscal document status transitions allow retries from FAILED but block terminal reversals', () => {
  assert.doesNotThrow(() => assertFiscalDocumentStatusTransition('PENDING', 'FAILED'))
  assert.doesNotThrow(() => assertFiscalDocumentStatusTransition('FAILED', 'PENDING'))
  assert.doesNotThrow(() => assertFiscalDocumentStatusTransition('ISSUED', 'CANCELED'))

  assert.throws(
    () => assertFiscalDocumentStatusTransition('CANCELED', 'ISSUED'),
    /Invalid fiscal document status transition/,
  )

  assert.throws(
    () => assertFiscalDocumentStatusTransition('ISSUED', 'FAILED'),
    /Invalid fiscal document status transition/,
  )
})
