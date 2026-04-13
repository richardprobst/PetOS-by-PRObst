import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { upsertIntegrationConnection } from '../../../features/integrations-admin/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { AppError } from '../../../server/http/errors'

const restorers: Array<() => void> = []

const localIntegrationActor: AuthenticatedUserData = {
  active: true,
  email: 'config@petos.app',
  id: 'user_integration_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Configuracao Local',
  permissions: ['configuracao.central.editar'],
  profiles: ['Gerente'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

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

test('upsertIntegrationConnection blocks cross-unit updates when an existing id belongs to another unit', async () => {
  const transactionClient = {
    auditLog: {
      create: async () => ({}),
    },
    integrationConnection: {
      create: async () => {
        throw new Error('integration connection should not be created when scope validation fails')
      },
      findFirst: async () => null,
      findUnique: async () => ({
        id: 'connection_branch',
        scope: 'UNIT',
        unitId: 'unit_branch',
      }),
      findUniqueOrThrow: async () => {
        throw new Error('integration connection should not be hydrated when scope validation fails')
      },
      update: async () => {
        throw new Error('integration connection should not be updated when scope validation fails')
      },
    },
  }

  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  )

  await assert.rejects(
    () =>
      upsertIntegrationConnection(localIntegrationActor, {
        connectionId: 'connection_branch',
        displayName: 'Mercado Pago local',
        providerKey: 'MERCADO_PAGO',
        scope: 'UNIT',
        status: 'CONFIGURED',
        unitId: 'unit_local',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message ===
        'User is not allowed to manage an integration on another unit in the current context.',
  )
})
