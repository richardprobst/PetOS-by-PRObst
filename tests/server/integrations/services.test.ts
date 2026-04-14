import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { resetEnvironmentCacheForTests } from '../../../server/env'
import {
  assertValidIntegrationSignature,
  reprocessIntegrationEvent,
} from '../../../features/integrations/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const originalEnvironment = { ...process.env }
const restorers: Array<() => void> = []
const localActor: AuthenticatedUserData = {
  active: true,
  email: 'integrations@petos.app',
  id: 'user_integrations_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Integracoes Local',
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

function loadTestEnvironment() {
  process.env = {
    ...originalEnvironment,
    NODE_ENV: 'test',
    APP_NAME: 'PetOS',
    APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
    DIRECT_DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
    NEXTAUTH_SECRET: 'super-secret-for-tests',
    NEXTAUTH_URL: 'http://localhost:3000',
    UPLOAD_MAX_FILE_SIZE_MB: '10',
    UPLOAD_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,application/pdf',
    STORAGE_BUCKET: 'petos-files',
    STORAGE_REGION: 'us-east-1',
    EMAIL_FROM_NAME: 'PetOS',
    EMAIL_FROM_ADDRESS: 'no-reply@example.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    LOG_LEVEL: 'info',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    DEFAULT_CANCELLATION_WINDOW_HOURS: '24',
    DEFAULT_RESCHEDULE_WINDOW_HOURS: '24',
    DEFAULT_NO_SHOW_TOLERANCE_MINUTES: '15',
    DEFAULT_CURRENCY: 'BRL',
    DEFAULT_TIMEZONE: 'America/Sao_Paulo',
    STRIPE_WEBHOOK_SECRET: 'stripe-test-secret',
    MERCADO_PAGO_WEBHOOK_SECRET: 'mercado-pago-test-secret',
    FISCAL_API_TOKEN: 'fiscal-test-secret',
  }
  resetEnvironmentCacheForTests()
}

test.after(() => {
  process.env = originalEnvironment
  resetEnvironmentCacheForTests()

  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('assertValidIntegrationSignature accepts a matching hmac signature', () => {
  loadTestEnvironment()
  const rawBody = JSON.stringify({ eventType: 'financial_transaction.updated' })
  const signature = createHmac('sha256', 'stripe-test-secret').update(rawBody).digest('hex')

  assert.doesNotThrow(() =>
    assertValidIntegrationSignature('STRIPE', rawBody, `sha256=${signature}`),
  )
})

test('assertValidIntegrationSignature rejects an invalid signature', () => {
  loadTestEnvironment()
  const rawBody = JSON.stringify({ eventType: 'financial_transaction.updated' })

  assert.throws(
    () => assertValidIntegrationSignature('MERCADO_PAGO', rawBody, 'sha256=invalid'),
    /Invalid integration signature/,
  )
})

test('reprocessIntegrationEvent fails closed on ambiguous deposit references', async () => {
  replaceMethod(prisma as object, 'integrationEvent', {
    findUnique: async () => ({
      eventType: 'deposit.updated',
      executedBy: null,
      externalEventId: 'event_1',
      id: 'event_1',
      payload: {
        depositStatus: 'CONFIRMED',
        externalReference: 'dep_ref_1',
      },
      provider: 'MERCADO_PAGO',
      resourceId: null,
      resourceType: 'deposit',
      unit: null,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      auditLog: {
        create: async () => null,
      },
      deposit: {
        findMany: async () => [
          {
            id: 'deposit_1',
          },
          {
            id: 'deposit_2',
          },
        ],
      },
      integrationEvent: {
        update: async () => {
          throw new Error('integrationEvent.update should not run after ambiguous lookup')
        },
      },
    }),
  )

  await assert.rejects(
    () => reprocessIntegrationEvent(localActor, 'event_1'),
    /Multiple deposit records share the same external reference/,
  )
})

test('reprocessIntegrationEvent scopes fiscal document lookup by provider name', async () => {
  let capturedWhere: Record<string, unknown> | null = null

  replaceMethod(prisma as object, 'integrationEvent', {
    findUnique: async () => ({
      eventType: 'fiscal_document.updated',
      executedBy: null,
      externalEventId: 'event_2',
      id: 'event_2',
      payload: {
        externalReference: 'doc_ref_1',
        fiscalDocumentStatus: 'AUTHORIZED',
      },
      provider: 'STRIPE',
      resourceId: null,
      resourceType: 'fiscal_document',
      unit: null,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      auditLog: {
        create: async () => null,
      },
      fiscalDocument: {
        findMany: async (args: { where: Record<string, unknown> }) => {
          capturedWhere = args.where

          return [
            {
              id: 'document_1',
              unitId: 'unit_local',
            },
          ]
        },
        update: async () => ({
          id: 'document_1',
          unitId: 'unit_local',
        }),
      },
      integrationEvent: {
        update: async () => ({
          eventType: 'fiscal_document.updated',
          executedBy: null,
          id: 'event_2',
          provider: 'STRIPE',
          unit: null,
          unitId: 'unit_local',
        }),
      },
    }),
  )

  await reprocessIntegrationEvent(localActor, 'event_2')

  assert.deepEqual(capturedWhere, {
    externalReference: 'doc_ref_1',
    providerName: 'STRIPE',
  })
})
