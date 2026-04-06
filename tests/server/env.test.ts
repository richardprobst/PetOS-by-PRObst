import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../server/env'

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
} satisfies NodeJS.ProcessEnv

test('parseEnvironment coerces booleans and numbers from environment variables', () => {
  const environment = parseEnvironment({
    ...baseEnvironment,
    RATE_LIMIT_ENABLED: 'false',
    RATE_LIMIT_WINDOW_MS: '120000',
    SMTP_PORT: '2525',
    DEFAULT_DEPOSIT_EXPIRATION_MINUTES: '90',
    DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS: '1200',
    DEFAULT_PRE_CHECK_IN_WINDOW_HOURS: '72',
    DEFAULT_CRM_INACTIVE_DAYS: '120',
    DEFAULT_CRM_REVIEW_DELAY_HOURS: '36',
    DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK: 'true',
    DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: '4',
    DEFAULT_POS_AUTO_FISCAL_DOCUMENT: 'true',
    DEFAULT_TEAM_SHIFT_MINUTES: '540',
    DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: '15',
    DEFAULT_PAYROLL_PERIOD_DAYS: '14',
  })

  assert.equal(environment.RATE_LIMIT_ENABLED, false)
  assert.equal(environment.RATE_LIMIT_WINDOW_MS, 120000)
  assert.equal(environment.SMTP_PORT, 2525)
  assert.equal(environment.DEFAULT_DEPOSIT_EXPIRATION_MINUTES, 90)
  assert.equal(environment.DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS, 1200)
  assert.equal(environment.DEFAULT_PRE_CHECK_IN_WINDOW_HOURS, 72)
  assert.equal(environment.DEFAULT_CRM_INACTIVE_DAYS, 120)
  assert.equal(environment.DEFAULT_CRM_REVIEW_DELAY_HOURS, 36)
  assert.equal(environment.DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK, true)
  assert.equal(environment.DEFAULT_PRODUCT_MIN_STOCK_QUANTITY, 4)
  assert.equal(environment.DEFAULT_POS_AUTO_FISCAL_DOCUMENT, true)
  assert.equal(environment.DEFAULT_TEAM_SHIFT_MINUTES, 540)
  assert.equal(environment.DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES, 15)
  assert.equal(environment.DEFAULT_PAYROLL_PERIOD_DAYS, 14)
})

test('parseEnvironment treats blank optional values as undefined', () => {
  const environment = parseEnvironment({
    ...baseEnvironment,
    STORAGE_ENDPOINT: '',
    STORAGE_ACCESS_KEY: '',
    STORAGE_SECRET_KEY: '',
    OPENAI_API_KEY: '',
    FISCAL_PROVIDER: '',
    FISCAL_API_BASE_URL: '',
    FISCAL_API_TOKEN: '',
  })

  assert.equal(environment.STORAGE_ENDPOINT, undefined)
  assert.equal(environment.STORAGE_ACCESS_KEY, undefined)
  assert.equal(environment.STORAGE_SECRET_KEY, undefined)
  assert.equal(environment.OPENAI_API_KEY, undefined)
  assert.equal(environment.FISCAL_PROVIDER, undefined)
  assert.equal(environment.FISCAL_API_BASE_URL, undefined)
  assert.equal(environment.FISCAL_API_TOKEN, undefined)
})

test('parseEnvironment requires a strong bootstrap token when installer mode is enabled', () => {
  assert.throws(
    () =>
      parseEnvironment({
        ...baseEnvironment,
        INSTALLER_ENABLED: 'true',
        INSTALLER_BOOTSTRAP_TOKEN: 'short-token',
      }),
    /INSTALLER_BOOTSTRAP_TOKEN must be configured with at least 32 characters/,
  )

  const environment = parseEnvironment({
    ...baseEnvironment,
    INSTALLER_ENABLED: 'true',
    INSTALLER_BOOTSTRAP_TOKEN: '12345678901234567890123456789012',
  })

  assert.equal(environment.INSTALLER_ENABLED, true)
  assert.equal(environment.INSTALLER_BOOTSTRAP_TOKEN, '12345678901234567890123456789012')
})
