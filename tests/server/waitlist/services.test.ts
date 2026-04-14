import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { Prisma } from '@prisma/client'
import { operationalStatusIds } from '../../../features/appointments/constants'
import {
  cancelWaitlistEntry,
  createWaitlistEntry,
  promoteWaitlistEntry,
} from '../../../features/waitlist/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const waitlistActor: AuthenticatedUserData = {
  active: true,
  email: 'waitlist@petos.app',
  id: 'user_waitlist_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Waitlist Local',
  permissions: [],
  profiles: ['Gerente'],
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

test('createWaitlistEntry checks duplicate windows inside the transaction', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      client: {
        findUnique: async () => ({
          user: {
            unitId: 'unit_local',
          },
          userId: 'client_1',
        }),
      },
      pet: {
        findUnique: async () => ({
          clientId: 'client_1',
          id: 'pet_1',
        }),
      },
      service: {
        findUnique: async () => ({
          active: true,
          id: 'service_1',
          unitId: 'unit_local',
        }),
      },
      waitlistEntry: {
        findFirst: async () => ({
          id: 'waitlist_existing',
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      createWaitlistEntry(waitlistActor, {
        clientId: 'client_1',
        desiredServiceId: 'service_1',
        notes: 'Preferencia matinal',
        petId: 'pet_1',
        preferredEndAt: new Date('2099-04-13T11:00:00.000Z'),
        preferredStartAt: new Date('2099-04-13T10:00:00.000Z'),
        requestedTransport: false,
        unitId: 'unit_local',
      }),
    /already a pending waitlist entry/,
  )
})

test('cancelWaitlistEntry rejects stale cancellation when the entry changed first', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      waitlistEntry: {
        findUnique: async () => ({
          id: 'waitlist_1',
          status: 'PENDING',
          unitId: 'unit_local',
        }),
        updateMany: async () => ({
          count: 0,
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      cancelWaitlistEntry(waitlistActor, 'waitlist_1', {
        reason: 'Tutor desistiu',
      }),
    /changed before it could be canceled/,
  )
})

test('promoteWaitlistEntry rejects stale promotion when the pending reservation is lost', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointment: {
        create: async () => ({
          id: 'appointment_1',
        }),
        findUnique: async () => ({
          financialStatus: 'PENDING',
          id: 'appointment_1',
          operationalStatusId: operationalStatusIds.scheduled,
          services: [],
        }),
        findUniqueOrThrow: async () => ({
          id: 'appointment_1',
        }),
      },
      appointmentStatusHistory: {
        create: async () => null,
      },
      auditLog: {
        create: async () => null,
      },
      client: {
        findUnique: async () => ({
          user: {
            unitId: 'unit_local',
          },
          userId: 'client_1',
        }),
      },
      operationalStatus: {
        findUnique: async () => ({
          id: operationalStatusIds.scheduled,
        }),
      },
      pet: {
        findUnique: async () => ({
          breed: null,
          clientId: 'client_1',
          id: 'pet_1',
          weightKg: null,
        }),
      },
      scheduleBlock: {
        findMany: async () => [],
      },
      service: {
        findMany: async () => [
          {
            active: true,
            basePrice: new Prisma.Decimal(40),
            estimatedDurationMinutes: 30,
            id: 'service_1',
            unitId: null,
          },
        ],
      },
      waitlistEntry: {
        findUnique: async () => ({
          clientId: 'client_1',
          desiredServiceId: 'service_1',
          id: 'waitlist_1',
          notes: null,
          petId: 'pet_1',
          preferredEmployeeUserId: null,
          requestedTransport: false,
          status: 'PENDING',
          unitId: 'unit_local',
        }),
        updateMany: async () => ({
          count: 0,
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      promoteWaitlistEntry(waitlistActor, 'waitlist_1', {
        startAt: new Date('2099-04-13T10:00:00.000Z'),
      }),
    /changed before it could be promoted/,
  )
})
