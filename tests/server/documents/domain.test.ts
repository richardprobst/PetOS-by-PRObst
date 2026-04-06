import assert from 'node:assert/strict'
import test from 'node:test'
import { SignatureMethod } from '@prisma/client'
import {
  assertAllowedFileSize,
  assertAllowedMimeType,
  assertLinkedOwnershipConsistency,
  assertTutorSignatureMethod,
  buildGeneratedFormDocument,
  canTutorReadAsset,
  documentRequiresSignature,
  parseAllowedMimeTypes,
  resolveMediaTypeFromMimeType,
} from '../../../features/documents/domain'

test('document and media ownership must resolve to a single tutor', () => {
  assert.doesNotThrow(() =>
    assertLinkedOwnershipConsistency({
      appointmentClientId: 'client-1',
      clientId: 'client-1',
      petClientId: 'client-1',
    }),
  )

  assert.throws(
    () =>
      assertLinkedOwnershipConsistency({
        appointmentClientId: 'client-1',
        clientId: 'client-2',
      }),
    /same client/,
  )
})

test('tutor access respects access level and linked ownership', () => {
  assert.equal(
    canTutorReadAsset(
      'PROTECTED',
      {
        clientId: 'tutor-1',
      },
      'tutor-1',
    ),
    true,
  )

  assert.equal(
    canTutorReadAsset(
      'PRIVATE',
      {
        clientId: 'tutor-1',
      },
      'tutor-1',
    ),
    false,
  )

  assert.equal(
    canTutorReadAsset(
      'PROTECTED',
      {
        appointmentClientId: 'tutor-2',
      },
      'tutor-1',
    ),
    false,
  )
})

test('upload validation guards mime type and size', () => {
  const allowedMimeTypes = parseAllowedMimeTypes('image/jpeg,image/png,application/pdf')

  assert.doesNotThrow(() => assertAllowedMimeType('application/pdf', allowedMimeTypes))
  assert.throws(() => assertAllowedMimeType('video/mp4', allowedMimeTypes), /not allowed/)
  assert.doesNotThrow(() => assertAllowedFileSize(1024, 10))
  assert.throws(() => assertAllowedFileSize(20 * 1024 * 1024, 10), /maximum allowed size/)
})

test('generated forms become JSON documents with signature metadata support', () => {
  const generated = buildGeneratedFormDocument('{"aceite":true}', 'Autorizacao de Servico')
  const content = generated.content.toString('utf8')

  assert.equal(generated.mimeType, 'application/json')
  assert.match(generated.originalFileName, /autorizacao-de-servico\.json/)
  assert.match(content, /"aceite": true/)
  assert.equal(documentRequiresSignature({ requiresSignature: true }), true)
  assert.equal(documentRequiresSignature({ requiresSignature: false }), false)
})

test('tutor signatures disallow manual method and media type inference stays consistent', () => {
  assert.throws(() => assertTutorSignatureMethod(SignatureMethod.MANUAL), /manual signatures/)
  assert.doesNotThrow(() => assertTutorSignatureMethod(SignatureMethod.DIGITAL_TYPED))
  assert.equal(resolveMediaTypeFromMimeType('image/png'), 'IMAGE')
  assert.equal(resolveMediaTypeFromMimeType('video/mp4'), 'VIDEO')
  assert.equal(resolveMediaTypeFromMimeType('application/pdf'), 'PDF')
})
