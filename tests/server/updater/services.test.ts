import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'
import { loadEmbeddedReleaseManifest } from '../../../server/system/release-manifest'
import {
  getUpdateExecutionDetails,
  getUpdatePreflight,
  listUpdateExecutions,
} from '../../../features/updater/services'
import { parseEnvironment } from '../../../server/env'
import type { SystemRuntimeSnapshot } from '../../../server/system/runtime-state'

const updateOperator: AuthenticatedUserData = {
  active: true,
  email: 'admin@petos.app',
  id: 'user_admin',
  name: 'Admin PetOS',
  permissions: ['sistema.update.operar'],
  profiles: ['Administrador'],
  unitId: 'unit_1',
  userType: 'ADMIN',
}

const runtimeViewer: AuthenticatedUserData = {
  ...updateOperator,
  id: 'user_viewer',
  permissions: ['sistema.runtime.visualizar'],
}

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

function createRuntimeSnapshot(): SystemRuntimeSnapshot {
  return {
    buildVersion: '0.2.1',
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
  }
}

test('getUpdatePreflight enforces high permission before exposing updater planning', async () => {
  await assert.rejects(
    () =>
      getUpdatePreflight(runtimeViewer, {
        buildVersion: '0.2.1',
        environment: createEnvironment(),
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
        readinessChecks: [
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
        ],
        runtime: createRuntimeSnapshot(),
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'Missing permission: sistema.update.operar.',
  )
})

test('getUpdatePreflight returns a structured plan without executing updates', async () => {
  const report = await getUpdatePreflight(updateOperator, {
    buildVersion: '0.2.1',
    environment: createEnvironment(),
    manifestResult: loadEmbeddedReleaseManifest({
      breakingNotes: ['patch release'],
      minSupportedFrom: '0.2.0',
      newRequiredEnvKeys: [],
      postUpdateTasks: [
        {
          id: 'reindex-runtime',
          label: 'Reindex runtime metadata',
          required: false,
        },
      ],
      releaseDate: '2026-04-05',
      requiresBackup: false,
      requiresMaintenance: false,
      seedPolicy: 'none',
      version: '0.2.1',
    }),
    readinessChecks: [
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
    ],
    runtime: createRuntimeSnapshot(),
  })

  assert.equal(report.status, 'ok')
  assert.equal(report.compatibility.canProceedToExecution, true)
  assert.equal(report.versions.currentInstalledVersion, '0.2.0')
  assert.equal(report.versions.manifestVersion, '0.2.1')
})

test('listUpdateExecutions enforces high permission before exposing execution history', async () => {
  await assert.rejects(
    () =>
      listUpdateExecutions(runtimeViewer, {
        prismaClient: {
          updateExecution: {
            findMany: async () => [],
          },
        } as never,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'Missing permission: sistema.update.operar.',
  )
})

test('getUpdateExecutionDetails returns a mapped retryable execution', async () => {
  const execution = await getUpdateExecutionDetails(updateOperator, {
    executionId: 'execution_1',
    prismaClient: {
      updateExecution: {
        findUnique: async () => ({
          completedAt: null,
          completedByUser: null,
          failedAt: new Date('2026-04-05T10:25:00.000Z'),
          failureSummary: 'Task failed.',
          id: 'execution_1',
          lastFailedStepCode: 'RUN_POST_UPDATE_TASKS',
          lastSuccessfulStepCode: 'APPLY_SEED_POLICY',
          lockExpiresAt: new Date('2026-04-05T10:20:00.000Z'),
          maintenanceEnteredAt: new Date('2026-04-05T10:00:00.000Z'),
          maintenanceExitedAt: null,
          manifestHash: 'manifest-hash',
          mode: 'MANUAL',
          preflightSnapshot: null,
          recoveryState: 'RETRY_AVAILABLE',
          requiresBackup: true,
          requiresMaintenance: true,
          retriedFromExecutionId: null,
          retryCount: 0,
          seedPolicy: 'none',
          sourceVersion: '0.2.0',
          startedAt: new Date('2026-04-05T10:00:00.000Z'),
          startedByUser: {
            email: 'admin@petos.app',
            id: 'user_admin',
            name: 'Admin PetOS',
          },
          status: 'FAILED',
          steps: [
            {
              code: 'RUN_POST_UPDATE_TASKS',
              completedAt: null,
              durationMs: 1200,
              errorSummary: 'Task failed.',
              failedAt: new Date('2026-04-05T10:25:00.000Z'),
              id: 'step_1',
              label: 'Executar tasks pos-update',
              payload: null,
              position: 50,
              startedAt: new Date('2026-04-05T10:24:00.000Z'),
              status: 'FAILED',
            },
          ],
          targetVersion: '0.2.1',
        }),
      },
    } as never,
  })

  assert.equal(execution?.id, 'execution_1')
  assert.equal(execution?.canRetry, true)
  assert.equal(execution?.steps[0]?.code, 'RUN_POST_UPDATE_TASKS')
  assert.equal(execution?.failureSummary, 'Task failed.')
})
