import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { Prisma } from '@prisma/client'
import { listFiscalDocuments } from '../../../features/fiscal/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

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
  permissions: ['financeiro.fiscal.visualizar'],
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

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('listFiscalDocuments scopes the admin read to the active unit and strips internal payload fields', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'fiscalDocument', {
    findMany: async (args: { where: { unitId: string } }) => {
      capturedUnitId = args.where.unitId

      return [
        {
          accessKey: null,
          appointment: {
            client: {
              contactPreference: 'email',
              generalNotes: 'do-not-leak',
              user: {
                active: true,
                email: 'client@petos.app',
                id: 'client_local',
                name: 'Cliente Local',
                passwordHash: 'secret',
                unitId: 'unit_local',
                userType: 'CLIENT',
              },
              userId: 'client_local',
            },
            clientId: 'client_local',
            id: 'appointment_1',
            pet: {
              breed: 'SRD',
              healthNotes: 'do-not-leak',
              id: 'pet_1',
              name: 'Thor',
              species: 'DOG',
            },
            petId: 'pet_1',
            startAt: new Date('2026-04-16T14:00:00.000Z'),
            unitId: 'unit_local',
          },
          appointmentId: 'appointment_1',
          canceledAt: null,
          createdAt: new Date('2026-04-16T14:00:00.000Z'),
          createdBy: {
            active: true,
            email: 'admin@petos.app',
            id: 'admin_local',
            name: 'Admin Local',
            passwordHash: 'secret',
            unitId: 'unit_local',
            userType: 'ADMIN',
          },
          createdByUserId: 'admin_local',
          documentNumber: null,
          documentType: 'SERVICE_INVOICE',
          externalReference: 'nfse-1',
          financialTransaction: {
            amount: new Prisma.Decimal('45.00'),
            appointmentId: 'appointment_1',
            description: 'Banho',
            externalReference: 'txn-1',
            id: 'txn_1',
            integrationProvider: 'OTHER',
            occurredAt: new Date('2026-04-16T14:00:00.000Z'),
            paymentMethod: 'PIX',
            paymentStatus: 'PAID',
            transactionType: 'REVENUE',
            unitId: 'unit_local',
          },
          financialTransactionId: 'txn_1',
          id: 'fiscal_1',
          issuedAt: null,
          lastError: null,
          metadata: {
            requestMode: 'queued',
          },
          providerName: 'NFSE_LOCAL',
          series: null,
          status: 'PENDING',
          unit: {
            id: 'unit_local',
            name: 'Unidade Local',
          },
          unitId: 'unit_local',
          updatedAt: new Date('2026-04-16T14:05:00.000Z'),
        },
      ] as unknown as Awaited<ReturnType<(typeof prisma.fiscalDocument)['findMany']>>
    },
  })

  const documents = await listFiscalDocuments(internalActor, {})

  assert.equal(capturedUnitId, 'unit_local')
  assert.equal(documents.length, 1)
  assert.equal('passwordHash' in (documents[0].createdBy as Record<string, unknown>), false)
  assert.equal(
    'generalNotes' in (documents[0].appointment?.client as Record<string, unknown>),
    false,
  )
  assert.equal(
    'healthNotes' in (documents[0].appointment?.pet as Record<string, unknown>),
    false,
  )
})
