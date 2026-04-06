import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { resetEnvironmentCacheForTests } from '../../../server/env'
import { assertValidIntegrationSignature } from '../../../features/integrations/services'

const originalEnvironment = { ...process.env }

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
