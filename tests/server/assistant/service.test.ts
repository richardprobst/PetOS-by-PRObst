import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { resetEnvironmentCacheForTests } from '../../../server/env'
import {
  interpretTutorAssistantRequest,
} from '../../../features/assistant/services'

const restorers: Array<() => void> = []

const tutorActor: AuthenticatedUserData = {
  active: true,
  email: 'tutor.assistant@petos.app',
  id: 'user_tutor_assistant',
  multiUnitContext: {
    activeUnitId: 'unit_tutor',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Tutor Assistant',
  permissions: ['portal_tutor.acessar'],
  profiles: ['Tutor'],
  unitId: 'unit_tutor',
  userType: 'CLIENT',
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

async function withAssistantEnvironment<T>(
  overrides: {
    AI_ENABLED?: string | undefined
    AI_VIRTUAL_ASSISTANT_ENABLED?: string | undefined
    AI_VIRTUAL_ASSISTANT_BASE_QUOTA?: string | undefined
  },
  callback: () => Promise<T> | T,
) {
  const previous = {
    APP_NAME: process.env.APP_NAME,
    APP_URL: process.env.APP_URL,
    AI_ENABLED: process.env.AI_ENABLED,
    AI_VIRTUAL_ASSISTANT_BASE_QUOTA: process.env.AI_VIRTUAL_ASSISTANT_BASE_QUOTA,
    AI_VIRTUAL_ASSISTANT_ENABLED: process.env.AI_VIRTUAL_ASSISTANT_ENABLED,
    DATABASE_URL: process.env.DATABASE_URL,
    DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY,
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_REGION: process.env.STORAGE_REGION,
    UPLOAD_ALLOWED_MIME_TYPES: process.env.UPLOAD_ALLOWED_MIME_TYPES,
  }

  Object.assign(process.env, {
    APP_NAME: 'PetOS',
    APP_URL: 'http://localhost:3000',
    AI_ENABLED: 'true',
    AI_VIRTUAL_ASSISTANT_BASE_QUOTA: '25',
    AI_VIRTUAL_ASSISTANT_ENABLED: 'true',
    DATABASE_URL: 'mysql://petos:petos@127.0.0.1:3306/petos',
    DEFAULT_CURRENCY: 'BRL',
    DEFAULT_TIMEZONE: 'America/Sao_Paulo',
    DIRECT_DATABASE_URL: 'mysql://petos:petos@127.0.0.1:3306/petos',
    EMAIL_FROM_ADDRESS: 'no-reply@example.com',
    EMAIL_FROM_NAME: 'PetOS',
    NEXTAUTH_SECRET: 'test-secret-with-at-least-32-chars',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    STORAGE_BUCKET: 'petos-test',
    STORAGE_REGION: 'us-east-1',
    UPLOAD_ALLOWED_MIME_TYPES: 'image/jpeg,application/pdf',
    ...overrides,
  })
  resetEnvironmentCacheForTests()

  try {
    return await callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }

    resetEnvironmentCacheForTests()
  }
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }

  resetEnvironmentCacheForTests()
})

test('interpretTutorAssistantRequest answers HELP through the AI envelope without external provider dependency', async () => {
  const auditActions: string[] = []

  replaceMethod(prisma as object, 'auditLog', {
    create: async ({ data }: { data: { action: string } }) => {
      auditActions.push(data.action)
      return data
    },
  })

  const response = await withAssistantEnvironment({}, () =>
    interpretTutorAssistantRequest(tutorActor, {
      channel: 'TEXT',
      transcript: 'ajuda',
    }),
  )

  assert.equal(response.status, 'ANSWERED')
  assert.equal(response.intent, 'HELP')
  assert.equal(response.envelopeStatus, 'COMPLETED')
  assert.match(response.reply, /consultas|agendamento assistido/i)
  assert.deepEqual(auditActions, ['ai.execution.completed'])
})

test('interpretTutorAssistantRequest blocks fast when the virtual assistant module is disabled by flag', async () => {
  const auditActions: string[] = []

  replaceMethod(prisma as object, 'auditLog', {
    create: async ({ data }: { data: { action: string } }) => {
      auditActions.push(data.action)
      return data
    },
  })

  const response = await withAssistantEnvironment(
    {
      AI_VIRTUAL_ASSISTANT_ENABLED: 'false',
    },
    () =>
      interpretTutorAssistantRequest(tutorActor, {
        channel: 'VOICE',
        transcript: 'ajuda',
      }),
  )

  assert.equal(response.status, 'BLOCKED')
  assert.equal(response.intent, 'HELP')
  assert.equal(response.envelopeStatus, 'BLOCKED')
  assert.match(response.reply, /desabilitad|indisponivel|disabled/i)
  assert.deepEqual(auditActions, [
    'ai.execution.blocked',
    'ai.fallback.evaluated',
  ])
})
