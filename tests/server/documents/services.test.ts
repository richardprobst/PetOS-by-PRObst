import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  getDocumentBinaryForActor,
  isDocumentSignaturePendingForTutor,
  listTutorDocuments,
  listTutorMediaAssets,
  signDocument,
} from '../../../features/documents/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { AppError } from '../../../server/http/errors'

const restorers: Array<() => void> = []

const tutorActor: AuthenticatedUserData = {
  active: true,
  email: 'tutor@petos.app',
  id: 'client_tutor',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Tutor Local',
  permissions: [
    'documento.visualizar_proprio',
    'documento.assinar_proprio',
    'midia.visualizar_propria',
  ],
  profiles: ['Tutor'],
  unitId: 'unit_local',
  userType: 'CLIENT',
}

const tutorSessionOnlyActor: AuthenticatedUserData = {
  ...tutorActor,
  unitId: null,
}

const internalActor: AuthenticatedUserData = {
  active: true,
  email: 'admin@petos.app',
  id: 'admin_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Admin Local',
  permissions: ['documento.assinar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

function buildReadableDocument(unitId = 'unit_local', requiresSignature = true) {
  return {
    accessLevel: 'PROTECTED',
    appointment: {
      client: {
        user: {
          passwordHash: 'secret',
        },
      },
      clientId: tutorActor.id,
      pet: {
        id: 'pet_1',
        name: 'Thor',
      },
    },
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    checksum: null,
    client: {
      user: {
        passwordHash: 'secret',
      },
    },
    clientId: tutorActor.id,
    createdAt: new Date('2026-04-13T10:00:00.000Z'),
    expiresAt: null,
    id: `document_${unitId}`,
    metadata: {
      requiresSignature,
    },
    mimeType: 'application/pdf',
    originalFileName: 'autorizacao.pdf',
    pet: {
      client: {
        user: {
          passwordHash: 'secret',
        },
      },
      clientId: tutorActor.id,
    },
    petId: 'pet_1',
    signatures: [
      {
        signerUser: {
          id: tutorActor.id,
          passwordHash: 'secret',
        },
        signerUserId: null,
        status: 'PENDING',
      },
    ],
    sizeBytes: 2048n,
    storageKey: 'documents/document.pdf',
    title: 'Autorizacao',
    type: 'SERVICE_AUTHORIZATION',
    unitId,
    uploadedBy: {
      id: 'admin_local',
      passwordHash: 'secret',
    },
  }
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('listTutorDocuments scopes the tutor query to the active unit and returns only tutor-facing fields', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'document', {
    findMany: async (args: { where: { unitId: string } }) => {
      capturedUnitId = args.where.unitId

      return [
        {
          accessLevel: 'PROTECTED',
          appointment: {
            clientId: tutorActor.id,
          },
          clientId: tutorActor.id,
          createdAt: new Date('2026-04-13T10:00:00.000Z'),
          expiresAt: null,
          id: 'document_1',
          metadata: {
            internalFlag: 'do-not-leak',
            requiresSignature: true,
          },
          mimeType: 'application/pdf',
          originalFileName: 'autorizacao.pdf',
          pet: {
            clientId: tutorActor.id,
          },
          petId: 'pet_1',
          signatures: [
            {
              signerUser: {
                passwordHash: 'secret',
              },
              signerUserId: null,
              status: 'PENDING',
            },
          ],
          sizeBytes: 2048n,
          title: 'Autorizacao',
          type: 'SERVICE_AUTHORIZATION',
          unitId: 'unit_local',
        },
      ]
    },
  })

  const documents = await listTutorDocuments(tutorActor)

  assert.equal(capturedUnitId, 'unit_local')
  assert.equal('client' in documents[0], false)
  assert.equal('appointment' in documents[0], false)
  assert.equal('pet' in documents[0], false)
  assert.deepEqual(documents[0].metadata, {
    requiresSignature: true,
  })
  assert.equal(documents[0].signatures.length, 1)
  assert.equal(isDocumentSignaturePendingForTutor(tutorActor, documents[0]), true)
})

test('listTutorMediaAssets scopes the tutor query to the active unit and removes unrelated ownership payloads', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'mediaAsset', {
    findMany: async (args: { where: { unitId: string } }) => {
      capturedUnitId = args.where.unitId

      return [
        {
          accessLevel: 'PROTECTED',
          appointment: {
            clientId: tutorActor.id,
          },
          clientId: tutorActor.id,
          createdAt: new Date('2026-04-13T10:00:00.000Z'),
          description: 'Foto do banho',
          id: 'media_1',
          metadata: {
            captureStage: 'AFTER',
            internalFlag: 'do-not-leak',
          },
          mimeType: 'image/jpeg',
          originalFileName: 'thor.jpg',
          pet: {
            clientId: tutorActor.id,
          },
          petId: 'pet_1',
          sizeBytes: 4096n,
          type: 'IMAGE',
          unitId: 'unit_local',
        },
      ]
    },
  })

  const mediaAssets = await listTutorMediaAssets(tutorActor)

  assert.equal(capturedUnitId, 'unit_local')
  assert.equal('client' in mediaAssets[0], false)
  assert.equal('appointment' in mediaAssets[0], false)
  assert.equal('pet' in mediaAssets[0], false)
  assert.deepEqual(mediaAssets[0].metadata, {
    captureStage: 'AFTER',
    galleryLabel: null,
  })
})

test('getDocumentBinaryForActor rejects tutor reads from another unit even when session context is the only unit source', async () => {
  replaceMethod(prisma as object, 'document', {
    findUnique: async () => buildReadableDocument('unit_branch'),
  })

  await assert.rejects(
    () => getDocumentBinaryForActor(tutorSessionOnlyActor, 'document_unit_branch'),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403,
  )
})

test('signDocument rejects cross-unit internal signatures addressed by arbitrary id', async () => {
  replaceMethod(prisma as object, 'document', {
    findUnique: async () => buildReadableDocument('unit_branch'),
  })

  await assert.rejects(
    () =>
      signDocument(internalActor, 'document_unit_branch', {
        method: 'MANUAL',
        signerEmail: internalActor.email,
        signerName: 'Admin Local',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message === 'User is not allowed to access this record in the current unit context.',
  )
})

test('signDocument rejects tutor signatures when the document does not require tutor acceptance', async () => {
  replaceMethod(prisma as object, 'document', {
    findUnique: async () => buildReadableDocument('unit_local', false),
  })

  await assert.rejects(
    () =>
      signDocument(tutorActor, 'document_local', {
        method: 'DIGITAL_TYPED',
        signerEmail: tutorActor.email,
        signerName: tutorActor.name,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message === 'This document is not pending a tutor signature.',
  )
})
