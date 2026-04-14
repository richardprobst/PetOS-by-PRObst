import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import {
  buildUpdatePreflightReport,
  type UpdatePreflightReport,
} from '../../../features/updater/domain'
import type { ReadinessCheck } from '../../../server/readiness/database'
import type { PrismaRuntimeCapabilities } from '../../../server/system/prisma-runtime'
import { loadEmbeddedReleaseManifest } from '../../../server/system/release-manifest'
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
    buildVersion: '0.2.0',
    coreSeedAvailable: true,
    currentInstalledVersion: '0.2.0',
    databaseAvailable: true,
    installerEnabled: true,
    installerLocked: true,
    installerTokenConfigured: true,
    lastTransitionAt: new Date('2026-04-05T00:00:00.000Z'),
    lifecycleSource: 'persisted',
    lifecycleState: 'INSTALLED',
    maintenanceActive: false,
    maintenanceReason: null,
    manifestHash: null,
    migrationsTableAvailable: true,
    previousVersion: '0.1.0',
    recordExists: true,
    ...overrides,
  }
}

const healthyReadinessChecks: ReadinessCheck[] = [
  {
    message: 'Database connection established.',
    name: 'database',
    status: 'ok',
  },
  {
    message: 'Prisma migrations table detected.',
    name: 'migrations',
    status: 'ok',
  },
  {
    message: 'Core seed data detected.',
    name: 'seed',
    status: 'ok',
  },
]

function createPrismaRuntimeCapabilities(
  overrides: Partial<PrismaRuntimeCapabilities> = {},
): PrismaRuntimeCapabilities {
  return {
    canRunMigrateDeploy: true,
    projectRoot: 'C:\\Users\\casaprobst\\PetOS-by-PRObst-main',
    prismaCliPath:
      'C:\\Users\\casaprobst\\PetOS-by-PRObst-main\\node_modules\\prisma\\build\\index.js',
    schemaPath: 'C:\\Users\\casaprobst\\PetOS-by-PRObst-main\\prisma\\schema.prisma',
    ...overrides,
  }
}

function buildReport(
  overrides: Partial<Parameters<typeof buildUpdatePreflightReport>[0]> = {},
): UpdatePreflightReport {
  return buildUpdatePreflightReport({
    buildVersion: '0.3.0',
    environment: createEnvironment(),
    manifestResult: loadEmbeddedReleaseManifest({
      breakingNotes: ['safe minor upgrade'],
      minSupportedFrom: '0.2.0',
      newRequiredEnvKeys: [],
      postUpdateTasks: [],
      releaseDate: '2026-04-05',
      requiresBackup: false,
      requiresMaintenance: false,
      seedPolicy: 'none',
      version: '0.3.0',
    }),
    prismaCapabilities: createPrismaRuntimeCapabilities(),
    readinessChecks: healthyReadinessChecks,
    readinessStatus: 'ok',
    runtime: createRuntimeSnapshot({
      currentInstalledVersion: '0.2.0',
    }),
    ...overrides,
  })
}

test('buildUpdatePreflightReport blocks when the embedded manifest is invalid', () => {
  const report = buildReport({
    manifestResult: loadEmbeddedReleaseManifest({
      minSupportedFrom: '0.2.0',
      releaseDate: '2026-04-05',
      requiresBackup: false,
      requiresMaintenance: false,
      seedPolicy: 'none',
    }),
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'target.manifest.invalid'), true)
  assert.equal(
    report.gates.find((gate) => gate.code === 'target.manifest.invalid')?.title,
    'Manifest embarcado invalido',
  )
})

test('buildUpdatePreflightReport blocks when build version and target manifest diverge', () => {
  const report = buildReport({
    buildVersion: '0.3.1',
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'target.version.mismatch'), true)
})

test('buildUpdatePreflightReport blocks when the current version is only inferred', () => {
  const report = buildReport({
    runtime: createRuntimeSnapshot({
      currentInstalledVersion: '0.2.0',
      lifecycleSource: 'inferred',
      recordExists: false,
    }),
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'current.version.untrusted'), true)
})

test('buildUpdatePreflightReport blocks when the source version is outside the supported window', () => {
  const report = buildReport({
    runtime: createRuntimeSnapshot({
      currentInstalledVersion: '0.1.0',
    }),
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'update.source.unsupported'), true)
})

test('buildUpdatePreflightReport blocks when a newly required env key is missing', () => {
  const report = buildReport({
    environment: createEnvironment({
      STRIPE_SECRET_KEY: '',
    }),
    manifestResult: loadEmbeddedReleaseManifest({
      breakingNotes: ['new stripe contract'],
      minSupportedFrom: '0.2.0',
      newRequiredEnvKeys: ['STRIPE_SECRET_KEY'],
      postUpdateTasks: [],
      releaseDate: '2026-04-05',
      requiresBackup: false,
      requiresMaintenance: true,
      seedPolicy: 'none',
      version: '0.3.0',
    }),
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'env.STRIPE_SECRET_KEY.missing'), true)
})

test('buildUpdatePreflightReport blocks when the environment is degraded before the update', () => {
  const report = buildReport({
    readinessChecks: [
      ...healthyReadinessChecks.slice(0, 2),
      {
        message: 'Core seed data is missing.',
        name: 'seed',
        status: 'fail',
      },
    ],
    readinessStatus: 'degraded',
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'runtime.readiness.degraded'), true)
})

test('buildUpdatePreflightReport blocks when runtime migrate deploy is unavailable', () => {
  const report = buildReport({
    prismaCapabilities: createPrismaRuntimeCapabilities({
      canRunMigrateDeploy: false,
      prismaCliPath: null,
      reason: 'Prisma CLI missing in this runtime.',
      schemaPath: 'C:\\Users\\casaprobst\\PetOS-by-PRObst-main\\prisma\\schema.prisma',
    }),
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'runtime.migrate.unavailable'), true)
})

test('buildUpdatePreflightReport blocks on incompatible lifecycle states', () => {
  const report = buildReport({
    runtime: createRuntimeSnapshot({
      lifecycleState: 'REPAIR',
      maintenanceActive: true,
      maintenanceReason: 'repair ativo',
    }),
  })

  assert.equal(report.status, 'blocking')
  assert.equal(report.gates.some((gate) => gate.code === 'runtime.lifecycle.incompatible'), true)
})

test('buildUpdatePreflightReport can produce an ok preflight without executing the update', () => {
  const report = buildReport({
    buildVersion: '0.2.1',
    manifestResult: loadEmbeddedReleaseManifest({
      breakingNotes: ['patch release'],
      minSupportedFrom: '0.2.0',
      newRequiredEnvKeys: [],
      postUpdateTasks: [],
      releaseDate: '2026-04-05',
      requiresBackup: false,
      requiresMaintenance: false,
      seedPolicy: 'none',
      version: '0.2.1',
    }),
  })

  assert.equal(report.status, 'ok')
  assert.equal(report.compatibility.updateType, 'upgrade')
  assert.equal(report.compatibility.canProceedToExecution, true)
})

test('buildUpdatePreflightReport treats same version as a safe no-op', () => {
  const report = buildReport({
    buildVersion: '0.2.0',
    manifestResult: loadEmbeddedReleaseManifest({
      breakingNotes: ['same version validation'],
      minSupportedFrom: '0.2.0',
      newRequiredEnvKeys: [],
      postUpdateTasks: [],
      releaseDate: '2026-04-05',
      requiresBackup: false,
      requiresMaintenance: false,
      seedPolicy: 'none',
      version: '0.2.0',
    }),
    runtime: createRuntimeSnapshot({
      currentInstalledVersion: '0.2.0',
    }),
  })

  assert.equal(report.status, 'warning')
  assert.equal(report.compatibility.updateType, 'none')
  assert.equal(report.compatibility.canProceedToExecution, false)
  assert.equal(report.gates.some((gate) => gate.code === 'update.noop'), true)
})
