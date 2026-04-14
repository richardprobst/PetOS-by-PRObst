import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createAppointmentCapacityRule } from '../../../features/appointments/advanced-services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const advancedActor: AuthenticatedUserData = {
  active: true,
  email: 'capacidade@petos.app',
  id: 'user_capacity_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Capacidade Local',
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

test('createAppointmentCapacityRule rejects duplicates checked inside the transaction', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointmentCapacityRule: {
        findMany: async () => [
          {
            active: true,
            breed: 'Poodle',
            employeeUserId: 'employee_1',
            id: 'rule_existing',
            sizeCategory: 'SMALL',
          },
        ],
      },
      employee: {
        findUnique: async () => ({
          unitId: 'unit_local',
          user: {
            active: true,
          },
          userId: 'employee_1',
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      createAppointmentCapacityRule(advancedActor, {
        breed: 'Poodle',
        employeeUserId: 'employee_1',
        maxConcurrentAppointments: 2,
        sizeCategory: 'SMALL',
      }),
    /already a capacity rule/,
  )
})
