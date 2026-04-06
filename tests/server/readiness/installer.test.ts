import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import {
  phase2SeedPermissionNames,
  phase2SeedUnitSettingKeys,
} from '../../../server/foundation/phase2'
import { collectInstallerPreflightSnapshot } from '../../../server/readiness/installer'
import type { PrismaRuntimeCapabilities } from '../../../server/system/prisma-runtime'

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

function createInstallerStub(overrides?: {
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
    $queryRawUnsafe: async () => (overrides?.hasMigrations === false ? [] : [{ table: '_prisma_migrations' }]),
    accessProfile: {
      count: async () => overrides?.accessProfileCount ?? 0,
    },
    operationalStatus: {
      count: async () => overrides?.operationalStatusCount ?? 0,
    },
    permission: {
      count: async () => overrides?.permissionCount ?? 0,
    },
    systemRuntimeState: {
      findUnique: async () => overrides?.runtimeState ?? null,
    },
    unit: {
      count: async () => overrides?.unitCount ?? 0,
    },
    unitSetting: {
      count: async () => overrides?.unitSettingCount ?? 0,
    },
  }
}

function createRuntimeCapabilities(
  overrides: Partial<PrismaRuntimeCapabilities> = {},
): PrismaRuntimeCapabilities {
  return {
    canRunMigrateDeploy: true,
    projectRoot: 'C:\\Users\\casaprobst\\PetOS-by-PRObst-main',
    prismaCliPath: 'C:\\Users\\casaprobst\\PetOS-by-PRObst-main\\node_modules\\prisma\\build\\index.js',
    schemaPath: 'C:\\Users\\casaprobst\\PetOS-by-PRObst-main\\prisma\\schema.prisma',
    ...overrides,
  }
}

test('collectInstallerPreflightSnapshot is ready for a fresh environment with reachable database and no core seed', async () => {
  const snapshot = await collectInstallerPreflightSnapshot(
    createInstallerStub() as unknown as Parameters<typeof collectInstallerPreflightSnapshot>[0],
    createEnvironment(),
    createRuntimeCapabilities(),
  )

  assert.equal(snapshot.status, 'ready')
  assert.equal(snapshot.canProceed, true)
  assert.deepEqual(
    snapshot.checks.map((check) => `${check.name}:${check.status}`),
    ['environment:ok', 'system:ok', 'database:ok', 'migrations:ok', 'seed:warn'],
  )
})

test('collectInstallerPreflightSnapshot blocks setup when the database already looks installed', async () => {
  const snapshot = await collectInstallerPreflightSnapshot(
    createInstallerStub({
      accessProfileCount: 1,
      operationalStatusCount: 8,
      permissionCount: phase2SeedPermissionNames.length,
      unitCount: 1,
      unitSettingCount: phase2SeedUnitSettingKeys.length,
    }) as unknown as Parameters<typeof collectInstallerPreflightSnapshot>[0],
    createEnvironment(),
    createRuntimeCapabilities(),
  )

  assert.equal(snapshot.status, 'blocked')
  assert.equal(snapshot.canProceed, false)
  assert.ok(
    snapshot.checks.some(
      (check) =>
        check.name === 'seed' &&
        check.status === 'fail' &&
        check.message.includes('Core seed data already exists'),
    ),
  )
})

test('collectInstallerPreflightSnapshot blocks setup when the database is unreachable', async () => {
  const snapshot = await collectInstallerPreflightSnapshot(
    createInstallerStub({
      hasConnection: false,
    }) as unknown as Parameters<typeof collectInstallerPreflightSnapshot>[0],
    createEnvironment(),
    createRuntimeCapabilities(),
  )

  assert.equal(snapshot.status, 'blocked')
  assert.equal(snapshot.canProceed, false)
  assert.ok(
    snapshot.checks.some(
      (check) =>
        check.name === 'database' &&
        check.status === 'fail' &&
        check.message.includes('Database connection failed'),
    ),
  )
})

test('collectInstallerPreflightSnapshot blocks setup when migrations are missing and the runtime cannot apply them', async () => {
  const snapshot = await collectInstallerPreflightSnapshot(
    createInstallerStub({
      hasMigrations: false,
    }) as unknown as Parameters<typeof collectInstallerPreflightSnapshot>[0],
    createEnvironment(),
    createRuntimeCapabilities({
      canRunMigrateDeploy: false,
      prismaCliPath: null,
      reason: 'Runtime Prisma CLI is not available.',
    }),
  )

  assert.equal(snapshot.status, 'blocked')
  assert.equal(snapshot.canProceed, false)
  assert.ok(
    snapshot.checks.some(
      (check) =>
        check.name === 'migrations' &&
        check.status === 'fail' &&
        check.message.includes('Runtime Prisma CLI is not available'),
    ),
  )
})
