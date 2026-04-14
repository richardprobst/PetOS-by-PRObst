import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { operationalStatusIds } from '../../../features/appointments/constants'
import {
  cancelAppointment,
  changeAppointmentStatus,
  checkInAppointment,
} from '../../../features/appointments/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const appointmentActor: AuthenticatedUserData = {
  active: true,
  email: 'agenda@petos.app',
  id: 'user_appointment_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Agenda Local',
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

test('changeAppointmentStatus rejects stale transitions when the appointment changes first', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointment: {
        findUnique: async () => ({
          id: 'appointment_1',
          operationalStatusId: operationalStatusIds.confirmed,
          unitId: 'unit_local',
        }),
        updateMany: async () => ({
          count: 0,
        }),
      },
      operationalStatus: {
        findUnique: async () => ({
          id: operationalStatusIds.checkIn,
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      changeAppointmentStatus(appointmentActor, 'appointment_1', {
        nextStatusId: operationalStatusIds.noShow,
      }),
    /changed before its status could be updated/,
  )
})

test('cancelAppointment rejects stale cancellation when the appointment changed first', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointment: {
        findUnique: async () => ({
          id: 'appointment_1',
          operationalStatusId: operationalStatusIds.confirmed,
          startAt: new Date('2099-04-13T10:00:00.000Z'),
          unitId: 'unit_local',
        }),
        updateMany: async () => ({
          count: 0,
        }),
      },
      unitSetting: {
        findMany: async () => [],
      },
    }),
  )

  await assert.rejects(
    () =>
      cancelAppointment(appointmentActor, 'appointment_1', {
        reason: 'Cliente desistiu',
      }),
    /changed before it could be canceled/,
  )
})

test('checkInAppointment rejects stale check-in when the appointment changed first', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointment: {
        findUnique: async () => ({
          checkIn: null,
          id: 'appointment_1',
          operationalStatusId: operationalStatusIds.confirmed,
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
      checkInAppointment(appointmentActor, 'appointment_1', {
        checklist: [
          {
            checked: true,
            key: 'vacinas',
            label: 'Vacinas em dia',
          },
        ],
      }),
    /changed before check-in could be recorded/,
  )
})
