import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import {
  phase2SeedPermissionNames,
  phase2SeedUnitSettingKeys,
} from '../../../server/foundation/phase2'
import {
  assertInstallerPreflightAccess,
  collectSystemRuntimeSnapshot,
  SYSTEM_RUNTIME_STATE_ID,
} from '../../../server/system/runtime-state'
import { getBuildVersion } from '../../../server/system/version'

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

function createRuntimeStateStub(overrides?: {
  accessProfileCount?: number
  hasConnection?: boolean
  hasMigrations?: boolean
  operationalStatusCount?: number
  permissionCount?: number
  runtimeState?: {
    currentVersion?: string | null
    id: string
    installerLockedAt?: Date | null
    lifecycleState:
      | 'NOT_INSTALLED'
      | 'INSTALLING'
      | 'INSTALLED'
      | 'INSTALL_FAILED'
      | 'MAINTENANCE'
      | 'UPDATING'
      | 'UPDATE_FAILED'
      | 'REPAIR'
  } | null
  unitCount?: number
  unitSettingCount?: number
}) {
  return {
    $queryRaw: async () => {
      if (overrides?.hasConnection === false) {
        throw new Error('database unavailable')
      }

      return [{ 1: 1 }]
    },
    $executeRawUnsafe: async () => {
      if (overrides?.hasMigrations === false) {
        throw Object.assign(new Error("Table '_prisma_migrations' doesn't exist"), {
          code: 'P2010',
          message:
            "Invalid `prisma.$executeRawUnsafe()` invocation:\n\nRaw query failed. Code: `1146`. Message: `Table 'petos._prisma_migrations' doesn't exist`",
          name: 'PrismaClientKnownRequestError',
        })
      }

      return 0
    },
    accessProfile: {
      count: async () => overrides?.accessProfileCount ?? 1,
    },
    operationalStatus: {
      count: async () => overrides?.operationalStatusCount ?? 8,
    },
    permission: {
      count: async () => overrides?.permissionCount ?? phase2SeedPermissionNames.length,
    },
    systemRuntimeState: {
      findUnique: async () => overrides?.runtimeState ?? null,
    },
    unit: {
      count: async () => overrides?.unitCount ?? 1,
    },
    unitSetting: {
      count: async () => overrides?.unitSettingCount ?? phase2SeedUnitSettingKeys.length,
    },
  }
}

test('collectSystemRuntimeSnapshot infers NOT_INSTALLED when the database has no Prisma migrations table', async () => {
  const snapshot = await collectSystemRuntimeSnapshot(
    createRuntimeStateStub({
      hasMigrations: false,
      unitCount: 0,
    }) as unknown as Parameters<typeof collectSystemRuntimeSnapshot>[0],
    createEnvironment(),
  )

  assert.equal(snapshot.databaseAvailable, true)
  assert.equal(snapshot.migrationsTableAvailable, false)
  assert.equal(snapshot.lifecycleState, 'NOT_INSTALLED')
  assert.equal(snapshot.lifecycleSource, 'inferred')
  assert.equal(snapshot.installerLocked, false)
})

test('collectSystemRuntimeSnapshot infers INSTALLED when core seed exists but no runtime record exists yet', async () => {
  const snapshot = await collectSystemRuntimeSnapshot(
    createRuntimeStateStub({
      runtimeState: null,
    }) as unknown as Parameters<typeof collectSystemRuntimeSnapshot>[0],
    createEnvironment(),
  )

  assert.equal(snapshot.lifecycleState, 'INSTALLED')
  assert.equal(snapshot.lifecycleSource, 'inferred')
  assert.equal(snapshot.installerLocked, true)
  assert.equal(snapshot.currentInstalledVersion, getBuildVersion())
})

test('collectSystemRuntimeSnapshot prefers the persisted runtime state when it exists', async () => {
  const snapshot = await collectSystemRuntimeSnapshot(
    createRuntimeStateStub({
      runtimeState: {
        currentVersion: '0.2.0',
        id: SYSTEM_RUNTIME_STATE_ID,
        installerLockedAt: new Date('2026-04-04T00:00:00.000Z'),
        lifecycleState: 'MAINTENANCE',
      },
    }) as unknown as Parameters<typeof collectSystemRuntimeSnapshot>[0],
    createEnvironment(),
  )

  assert.equal(snapshot.lifecycleState, 'MAINTENANCE')
  assert.equal(snapshot.lifecycleSource, 'persisted')
  assert.equal(snapshot.currentInstalledVersion, '0.2.0')
  assert.equal(snapshot.maintenanceActive, true)
  assert.equal(snapshot.installerLocked, true)
})

test('collectSystemRuntimeSnapshot returns UNKNOWN when the database is unreachable', async () => {
  const snapshot = await collectSystemRuntimeSnapshot(
    createRuntimeStateStub({
      hasConnection: false,
    }) as unknown as Parameters<typeof collectSystemRuntimeSnapshot>[0],
    createEnvironment(),
  )

  assert.equal(snapshot.databaseAvailable, false)
  assert.equal(snapshot.lifecycleState, 'UNKNOWN')
  assert.equal(snapshot.lifecycleSource, 'unavailable')
})

test('assertInstallerPreflightAccess requires a valid bootstrap token', () => {
  const environment = createEnvironment()

  assert.doesNotThrow(() =>
    assertInstallerPreflightAccess(
      new Request('http://localhost/api/setup/preflight', {
        headers: {
          'x-installer-token': '12345678901234567890123456789012',
        },
      }),
      environment,
    ),
  )

  assert.throws(
    () =>
      assertInstallerPreflightAccess(
        new Request('http://localhost/api/setup/preflight', {
          headers: {
            'x-installer-token': 'invalid-token',
          },
        }),
        environment,
      ),
    /valid installer bootstrap token is required/i,
  )
})
