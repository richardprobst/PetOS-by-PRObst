import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  decryptAdministrativeSecret,
  encryptAdministrativeSecret,
  getIntegrationSecretMasterKeySource,
} from '../../../features/integrations-admin/secrets'
import { resetEnvironmentCacheForTests } from '../../../server/env'

const previousConfigurationKey = process.env.CONFIGURATION_SECRET_MASTER_KEY
const previousNextAuthSecret = process.env.NEXTAUTH_SECRET
const previousRequiredEnvironment = {
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  UPLOAD_ALLOWED_MIME_TYPES: process.env.UPLOAD_ALLOWED_MIME_TYPES,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  STORAGE_REGION: process.env.STORAGE_REGION,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
}
const requiredEnvironmentDefaults = {
  APP_NAME: 'PetOS',
  APP_URL: 'https://petos.local',
  NEXT_PUBLIC_APP_URL: 'https://petos.local',
  DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
  DIRECT_DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
  NEXTAUTH_URL: 'https://petos.local',
  UPLOAD_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,application/pdf',
  STORAGE_BUCKET: 'petos-tests',
  STORAGE_REGION: 'us-east-1',
  EMAIL_FROM_NAME: 'PetOS',
  EMAIL_FROM_ADDRESS: 'test@petos.local',
  DEFAULT_CURRENCY: 'BRL',
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
}

afterEach(() => {
  if (previousConfigurationKey === undefined) {
    delete process.env.CONFIGURATION_SECRET_MASTER_KEY
  } else {
    process.env.CONFIGURATION_SECRET_MASTER_KEY = previousConfigurationKey
  }

  if (previousNextAuthSecret === undefined) {
    delete process.env.NEXTAUTH_SECRET
  } else {
    process.env.NEXTAUTH_SECRET = previousNextAuthSecret
  }

  for (const [key, value] of Object.entries(previousRequiredEnvironment)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  resetEnvironmentCacheForTests()
})

function applyRequiredEnvironmentDefaults() {
  for (const [key, value] of Object.entries(requiredEnvironmentDefaults)) {
    process.env[key] = value
  }

  resetEnvironmentCacheForTests()
}

test('administrative secrets roundtrip with explicit configuration master key', () => {
  applyRequiredEnvironmentDefaults()
  process.env.CONFIGURATION_SECRET_MASTER_KEY = '12345678901234567890123456789012'
  process.env.NEXTAUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456'

  const encrypted = encryptAdministrativeSecret('secret-value')

  assert.notEqual(encrypted, 'secret-value')
  assert.equal(decryptAdministrativeSecret(encrypted), 'secret-value')
  assert.equal(getIntegrationSecretMasterKeySource(), 'CONFIGURATION_SECRET_MASTER_KEY')
})

test('administrative secrets fall back to NEXTAUTH_SECRET when no dedicated key exists', () => {
  applyRequiredEnvironmentDefaults()
  delete process.env.CONFIGURATION_SECRET_MASTER_KEY
  process.env.NEXTAUTH_SECRET = 'abcdefghijklmnopqrstuvwxyz123456'

  const encrypted = encryptAdministrativeSecret('fallback-secret')

  assert.equal(decryptAdministrativeSecret(encrypted), 'fallback-secret')
  assert.equal(getIntegrationSecretMasterKeySource(), 'NEXTAUTH_SECRET_FALLBACK')
})
