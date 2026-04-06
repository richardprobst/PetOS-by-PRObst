import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import {
  createInstallerSessionCookieValue,
  readInstallerSessionCookieValue,
  verifyInstallerBootstrapToken,
} from '../../../server/system/installer-session'

function createEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return parseEnvironment({
    NODE_ENV: 'test',
    APP_NAME: 'PetOS',
    APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
    DIRECT_DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
    NEXTAUTH_SECRET: 'super-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
    INSTALLER_ENABLED: 'true',
    INSTALLER_BOOTSTRAP_TOKEN: '12345678901234567890123456789012',
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
    DEFAULT_PRE_CHECK_IN_WINDOW_HOURS: '48',
    DEFAULT_CRM_INACTIVE_DAYS: '90',
    DEFAULT_CRM_REVIEW_DELAY_HOURS: '24',
    DEFAULT_CRM_POST_SERVICE_DELAY_HOURS: '6',
    DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK: 'false',
    DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: '1',
    DEFAULT_POS_AUTO_FISCAL_DOCUMENT: 'false',
    DEFAULT_TEAM_SHIFT_MINUTES: '480',
    DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: '10',
    DEFAULT_PAYROLL_PERIOD_DAYS: '30',
    DEFAULT_CURRENCY: 'BRL',
    DEFAULT_TIMEZONE: 'America/Sao_Paulo',
    ...overrides,
  })
}

test('verifyInstallerBootstrapToken accepts only the configured token', () => {
  const environment = createEnvironment()

  assert.equal(
    verifyInstallerBootstrapToken('12345678901234567890123456789012', environment),
    true,
  )
  assert.equal(verifyInstallerBootstrapToken('invalid-token', environment), false)
  assert.equal(verifyInstallerBootstrapToken('', environment), false)
})

test('installer session cookie payload is accepted while valid and rejected after expiration', () => {
  const environment = createEnvironment()
  const now = Date.now()
  const cookieValue = createInstallerSessionCookieValue(environment, now)

  const activePayload = readInstallerSessionCookieValue(cookieValue, environment, now + 1_000)
  assert.ok(activePayload)
  assert.equal(activePayload?.purpose, 'installer')

  const expiredPayload = readInstallerSessionCookieValue(
    cookieValue,
    environment,
    now + 30 * 60 * 1000 + 1,
  )
  assert.equal(expiredPayload, null)
})

test('installer session cookie payload is rejected when tampered', () => {
  const environment = createEnvironment()
  const cookieValue = createInstallerSessionCookieValue(environment, Date.now())
  const [encodedPayload] = cookieValue.split('.')

  assert.equal(
    readInstallerSessionCookieValue(`${encodedPayload}.tampered-signature`, environment),
    null,
  )
})
