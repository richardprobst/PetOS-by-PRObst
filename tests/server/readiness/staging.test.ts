import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import { evaluateStagingEnvironment } from '../../../server/readiness/staging'

function createEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return parseEnvironment({
    NODE_ENV: 'production',
    APP_NAME: 'PetOS',
    APP_URL: 'https://staging.petos.app',
    NEXT_PUBLIC_APP_URL: 'https://staging.petos.app',
    DATABASE_URL: 'mysql://user:password@mysql.internal:3306/petos_staging',
    DIRECT_DATABASE_URL: 'mysql://user:password@mysql.internal:3306/petos_staging',
    NEXTAUTH_SECRET: '12345678901234567890123456789012',
    NEXTAUTH_URL: 'https://staging.petos.app',
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
    ...overrides,
  })
}

test('evaluateStagingEnvironment accepts a consistent staging environment', () => {
  const issues = evaluateStagingEnvironment(createEnvironment())

  assert.deepEqual(issues, [])
})

test('evaluateStagingEnvironment rejects localhost and placeholder secrets', () => {
  const issues = evaluateStagingEnvironment(
    createEnvironment({
      APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXTAUTH_URL: 'http://localhost:3000',
      DATABASE_URL: 'mysql://user:password@127.0.0.1:3306/petos',
      DIRECT_DATABASE_URL: 'mysql://user:password@127.0.0.1:3306/petos',
      NEXTAUTH_SECRET: 'replace_with_a_secret',
    }),
  )

  assert.deepEqual(
    issues.map((issue) => issue.message),
    [
      'Staging URLs must use HTTPS.',
      'Staging URLs cannot point to localhost, loopback, or .local domains.',
      'NEXTAUTH_SECRET must be a non-placeholder secret with at least 32 characters for staging.',
      'DATABASE_URL and DIRECT_DATABASE_URL must point to a non-local MySQL host in staging.',
    ],
  )
})

test('evaluateStagingEnvironment warns about non-production NODE_ENV and mismatched origins', () => {
  const issues = evaluateStagingEnvironment(
    createEnvironment({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'https://public-staging.petos.app',
    }),
  )

  assert.deepEqual(
    issues.map((issue) => `${issue.level}:${issue.message}`),
    [
      'warn:NODE_ENV should usually be set to production in staging.',
      'fail:APP_URL, NEXT_PUBLIC_APP_URL, and NEXTAUTH_URL must share the same origin.',
    ],
  )
})

test('evaluateStagingEnvironment requires a full fiscal contract when any fiscal variable is set', () => {
  const issues = evaluateStagingEnvironment(
    createEnvironment({
      FISCAL_PROVIDER: 'provider-x',
    }),
  )

  assert.deepEqual(
    issues.map((issue) => `${issue.level}:${issue.message}`),
    [
      'fail:FISCAL_PROVIDER, FISCAL_API_BASE_URL, and FISCAL_API_TOKEN must be configured together when fiscal integration is enabled.',
    ],
  )
})

test('evaluateStagingEnvironment requires complete gateway webhook contracts when providers are partially configured', () => {
  const issues = evaluateStagingEnvironment(
    createEnvironment({
      STRIPE_SECRET_KEY: 'sk_test_123',
      MERCADO_PAGO_ACCESS_TOKEN: 'mp_test_123',
    }),
  )

  assert.deepEqual(
    issues.map((issue) => `${issue.level}:${issue.message}`),
    [
      'fail:STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured together when Stripe integration is enabled.',
      'fail:MERCADO_PAGO_ACCESS_TOKEN and MERCADO_PAGO_WEBHOOK_SECRET must be configured together when Mercado Pago integration is enabled.',
    ],
  )
})
