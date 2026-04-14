import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import {
  collectOperationalHealthSnapshot,
  type OperationalHealthSnapshot,
} from '../../../server/readiness/health'
import type { SystemRuntimeSnapshot } from '../../../server/system/runtime-state'

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
    DEFAULT_DEPOSIT_EXPIRATION_MINUTES: '60',
    DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS: '180',
    DEFAULT_DOCUMENT_RETENTION_DAYS: '180',
    DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS: '900',
    DEFAULT_CRM_INACTIVE_DAYS: '90',
    DEFAULT_CRM_REVIEW_DELAY_HOURS: '24',
    DEFAULT_CRM_POST_SERVICE_DELAY_HOURS: '6',
    DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK: 'false',
    DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: '1',
    DEFAULT_POS_AUTO_FISCAL_DOCUMENT: 'false',
    DEFAULT_TEAM_SHIFT_MINUTES: '480',
    DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: '10',
    DEFAULT_PAYROLL_PERIOD_DAYS: '30',
    DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS: '90',
    DEFAULT_CURRENCY: 'BRL',
    DEFAULT_TIMEZONE: 'America/Sao_Paulo',
    ...overrides,
  })
}

function createRuntimeSnapshot(
  overrides: Partial<SystemRuntimeSnapshot> = {},
): SystemRuntimeSnapshot {
  return {
    buildVersion: '0.2.1',
    coreSeedAvailable: true,
    currentInstalledVersion: '0.2.1',
    databaseAvailable: true,
    installerEnabled: true,
    installerLocked: true,
    installerTokenConfigured: true,
    lastTransitionAt: new Date('2026-04-14T12:00:00.000Z'),
    lifecycleSource: 'persisted',
    lifecycleState: 'INSTALLED',
    maintenanceActive: false,
    maintenanceReason: null,
    manifestHash: 'manifest-hash',
    migrationsTableAvailable: true,
    previousVersion: '0.2.0',
    recordExists: true,
    ...overrides,
  }
}

async function collectSnapshot(
  overrides: Partial<{
    databaseCollector: () => Promise<OperationalHealthSnapshot['checks']>
    environmentLoader: () => ReturnType<typeof createEnvironment>
    runtimeCollector: (
      environment: ReturnType<typeof createEnvironment>,
    ) => Promise<SystemRuntimeSnapshot>
  }> = {},
) {
  return collectOperationalHealthSnapshot({
    databaseCollector:
      overrides.databaseCollector ??
      (async () => [
        {
          message: 'Conexao com o banco estabelecida.',
          name: 'database',
          status: 'ok',
        },
        {
          message: 'Tabela de migrations do Prisma detectada.',
          name: 'migrations',
          status: 'ok',
        },
        {
          message: 'Seed base do core/Fase 2 detectada.',
          name: 'seed',
          status: 'ok',
        },
      ]),
    environmentLoader: overrides.environmentLoader ?? (() => createEnvironment()),
    runtimeCollector:
      overrides.runtimeCollector ?? (async () => createRuntimeSnapshot()),
  })
}

test('collectOperationalHealthSnapshot classifies invalid environment as an environment failure', async () => {
  const snapshot = await collectSnapshot({
    environmentLoader: () => {
      throw new Error('invalid env')
    },
  })

  assert.equal(snapshot.failureStage, 'environment')
  assert.equal(snapshot.service, null)
  assert.equal(snapshot.lifecycle, null)
  assert.equal(snapshot.status, 'degraded')
  assert.deepEqual(snapshot.checks, [
    {
      message: 'As variaveis de ambiente obrigatorias estao ausentes ou invalidas.',
      name: 'environment',
      status: 'fail',
    },
  ])
})

test('collectOperationalHealthSnapshot classifies downstream runtime failures separately from env parsing', async () => {
  const snapshot = await collectSnapshot({
    runtimeCollector: async () => {
      throw new Error('runtime bootstrap failed')
    },
  })

  assert.equal(snapshot.failureStage, 'diagnostics')
  assert.equal(snapshot.service, 'PetOS')
  assert.equal(snapshot.lifecycle, null)
  assert.equal(snapshot.status, 'degraded')
  assert.deepEqual(snapshot.checks, [
    {
      message: 'Ambiente carregado com sucesso.',
      name: 'environment',
      status: 'ok',
    },
    {
      message:
        'O ambiente foi carregado, mas o diagnostico operacional nao conseguiu concluir runtime e readiness. Revise logs e bootstrap antes de tratar este host como saudavel.',
      name: 'runtime',
      status: 'fail',
    },
  ])
})

test('collectOperationalHealthSnapshot returns lifecycle metadata when runtime and readiness are healthy', async () => {
  const snapshot = await collectSnapshot()

  assert.equal(snapshot.failureStage, null)
  assert.equal(snapshot.service, 'PetOS')
  assert.equal(snapshot.status, 'ok')
  assert.equal(snapshot.lifecycle?.state, 'INSTALLED')
  assert.equal(snapshot.lifecycle?.source, 'persisted')
  assert.equal(snapshot.checks[0]?.name, 'environment')
  assert.equal(snapshot.checks[1]?.name, 'runtime')
  assert.equal(snapshot.checks[1]?.status, 'ok')
})
