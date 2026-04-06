import assert from 'node:assert/strict'
import test from 'node:test'
import { resetEnvironmentCacheForTests } from '../../../server/env'
import { AppError } from '../../../server/http/errors'
import {
  enforceConfiguredRateLimit,
  resetRateLimitBucketsForTests,
} from '../../../server/security/rate-limit'

const baseEnvironment = {
  NODE_ENV: 'test',
  APP_NAME: 'PetOS',
  APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
  DIRECT_DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
  NEXTAUTH_SECRET: 'super-secret',
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
  RATE_LIMIT_MAX_REQUESTS: '2',
  DEFAULT_CANCELLATION_WINDOW_HOURS: '24',
  DEFAULT_RESCHEDULE_WINDOW_HOURS: '24',
  DEFAULT_NO_SHOW_TOLERANCE_MINUTES: '15',
  DEFAULT_CURRENCY: 'BRL',
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
} satisfies NodeJS.ProcessEnv

function withEnvironment(overrides?: Partial<NodeJS.ProcessEnv>) {
  Object.assign(process.env, baseEnvironment, overrides)
  resetEnvironmentCacheForTests()
  resetRateLimitBucketsForTests()
}

test('enforceConfiguredRateLimit blocks requests that exceed the configured threshold', () => {
  withEnvironment()

  enforceConfiguredRateLimit({
    scope: 'test.scope',
    identifier: 'user-1',
  })
  enforceConfiguredRateLimit({
    scope: 'test.scope',
    identifier: 'user-1',
  })

  assert.throws(
    () =>
      enforceConfiguredRateLimit({
        scope: 'test.scope',
        identifier: 'user-1',
      }),
    (error) => {
      return (
        error instanceof AppError &&
        error.code === 'TOO_MANY_REQUESTS' &&
        error.status === 429
      )
    },
  )
})

test('enforceConfiguredRateLimit is bypassed when rate limiting is disabled', () => {
  withEnvironment({
    RATE_LIMIT_ENABLED: 'false',
  })

  enforceConfiguredRateLimit({
    scope: 'test.scope',
    identifier: 'user-2',
  })
  enforceConfiguredRateLimit({
    scope: 'test.scope',
    identifier: 'user-2',
  })
  enforceConfiguredRateLimit({
    scope: 'test.scope',
    identifier: 'user-2',
  })

  assert.ok(true)
})
