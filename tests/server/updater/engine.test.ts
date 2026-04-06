import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  Prisma,
  PrismaClient,
  SystemLifecycleState,
  UpdateExecutionMode,
  UpdateExecutionStatus,
  UpdateExecutionStepStatus,
  UpdateRecoveryState,
} from '@prisma/client'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { parseEnvironment } from '../../../server/env'
import { AppError } from '../../../server/http/errors'
import type { PrismaRuntimeCapabilities } from '../../../server/system/prisma-runtime'
import { loadEmbeddedReleaseManifest } from '../../../server/system/release-manifest'
import type { SystemRuntimeSnapshot } from '../../../server/system/runtime-state'
import {
  retryUpdateExecution,
  startUpdateExecution,
} from '../../../features/updater/engine'

const updateOperator: AuthenticatedUserData = {
  active: true,
  email: 'admin@petos.local',
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

function createManifest(version = '0.2.1', overrides: Record<string, unknown> = {}) {
  return loadEmbeddedReleaseManifest({
    breakingNotes: ['safe installer updater release'],
    minSupportedFrom: '0.2.0',
    newRequiredEnvKeys: [],
    postUpdateTasks: [],
    releaseDate: '2026-04-05',
    requiresBackup: false,
    requiresMaintenance: true,
    seedPolicy: 'none',
    version,
    ...overrides,
  })
}

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

interface UpdateExecutionRow {
  completedAt: Date | null
  completedByUserId: string | null
  createdAt: Date
  failedAt: Date | null
  failureSummary: string | null
  id: string
  lastFailedStepCode: string | null
  lastSuccessfulStepCode: string | null
  lockExpiresAt: Date
  maintenanceEnteredAt: Date | null
  maintenanceExitedAt: Date | null
  manifestHash: string
  mode: UpdateExecutionMode
  preflightSnapshot: Prisma.JsonValue | null
  recoveryState: UpdateRecoveryState
  requiresBackup: boolean
  requiresMaintenance: boolean
  retriedFromExecutionId: string | null
  retryCount: number
  seedPolicy: string
  sourceVersion: string
  startedAt: Date
  startedByUserId: string | null
  status: UpdateExecutionStatus
  targetVersion: string
  updatedAt: Date
}

interface UpdateExecutionStepRow {
  code: string
  completedAt: Date | null
  createdAt: Date
  durationMs: number | null
  errorSummary: string | null
  executionId: string
  failedAt: Date | null
  id: string
  label: string
  payload: Prisma.JsonValue | null
  position: number
  startedAt: Date | null
  status: UpdateExecutionStepStatus
  updatedAt: Date
}

interface RuntimeStateRow {
  createdAt: Date
  currentVersion: string | null
  id: string
  installationCompletedAt: Date | null
  installerLockedAt: Date | null
  lastTransitionAt: Date
  lifecycleState: SystemLifecycleState
  maintenanceActivatedAt: Date | null
  maintenanceReason: string | null
  manifestHash: string | null
  previousVersion: string | null
  updatedAt: Date
  updatedByUserId: string | null
}

function createRuntimeState(
  overrides: Partial<RuntimeStateRow> = {},
): RuntimeStateRow {
  return {
    createdAt: new Date('2026-04-05T00:00:00.000Z'),
    currentVersion: '0.2.0',
    id: 'default',
    installationCompletedAt: new Date('2026-04-05T00:00:00.000Z'),
    installerLockedAt: new Date('2026-04-05T00:00:00.000Z'),
    lastTransitionAt: new Date('2026-04-05T00:00:00.000Z'),
    lifecycleState: 'INSTALLED',
    maintenanceActivatedAt: null,
    maintenanceReason: null,
    manifestHash: 'manifest-source',
    previousVersion: '0.1.0',
    updatedAt: new Date('2026-04-05T00:00:00.000Z'),
    updatedByUserId: null,
    ...overrides,
  }
}

function createRuntimeSnapshot(
  state: RuntimeStateRow,
  overrides: Partial<SystemRuntimeSnapshot> = {},
): SystemRuntimeSnapshot {
  return {
    buildVersion: '0.2.1',
    coreSeedAvailable: true,
    currentInstalledVersion: state.currentVersion,
    databaseAvailable: true,
    installerEnabled: true,
    installerLocked: Boolean(state.installerLockedAt),
    installerTokenConfigured: true,
    lastTransitionAt: state.lastTransitionAt,
    lifecycleSource: 'persisted',
    lifecycleState: state.lifecycleState,
    maintenanceActive:
      state.lifecycleState === 'MAINTENANCE' || state.lifecycleState === 'UPDATING',
    maintenanceReason: state.maintenanceReason,
    manifestHash: state.manifestHash,
    migrationsTableAvailable: true,
    previousVersion: state.previousVersion,
    recordExists: true,
    ...overrides,
  }
}

function createReadinessChecks(status: 'ok' | 'fail' = 'ok') {
  return [
    {
      message: 'Database connection established.',
      name: 'database' as const,
      status: 'ok' as const,
    },
    {
      message: 'Prisma migrations table detected.',
      name: 'migrations' as const,
      status: 'ok' as const,
    },
    {
      message: status === 'ok' ? 'Core seed data detected.' : 'Core seed data missing.',
      name: 'seed' as const,
      status,
    },
  ]
}

function createUpdateEngineStub(options?: {
  activeExecution?: UpdateExecutionRow
  readinessSequence?: Array<ReturnType<typeof createReadinessChecks>>
  runtimeState?: Partial<RuntimeStateRow>
}) {
  const runtimeTransitions: SystemLifecycleState[] = []
  const runtimeState = createRuntimeState(options?.runtimeState)
  const auditEntries: Array<Record<string, unknown>> = []
  const executions: UpdateExecutionRow[] = options?.activeExecution
    ? [options.activeExecution]
    : []
  const steps: UpdateExecutionStepRow[] = []
  const readinessSequence = [...(options?.readinessSequence ?? [createReadinessChecks()])]
  const users = new Map([
    [
      updateOperator.id,
      {
        email: updateOperator.email,
        id: updateOperator.id,
        name: updateOperator.name,
      },
    ],
  ])
  let executionSequence = executions.length
  let stepSequence = 0

  function touchRuntime(data: Partial<RuntimeStateRow>) {
    Object.assign(runtimeState, Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ))
    runtimeState.updatedAt = data.updatedAt ?? new Date('2026-04-05T12:00:00.000Z')
    if (data.lifecycleState) {
      runtimeTransitions.push(data.lifecycleState)
    }
  }

  function matchWhere<T extends { id: string }>(
    value: T,
    where: Record<string, unknown>,
  ) {
    return Object.entries(where).every(([key, expected]) => {
      if (
        expected &&
        typeof expected === 'object' &&
        'in' in (expected as Record<string, unknown>)
      ) {
        return (expected as { in: unknown[] }).in.includes(
          value[key as keyof T] as unknown,
        )
      }

      if (
        expected &&
        typeof expected === 'object' &&
        'gt' in (expected as Record<string, unknown>)
      ) {
        return (
          (value[key as keyof T] as unknown as Date).getTime() >
          ((expected as { gt: Date }).gt).getTime()
        )
      }

      if (
        expected &&
        typeof expected === 'object' &&
        'lte' in (expected as Record<string, unknown>)
      ) {
        return (
          (value[key as keyof T] as unknown as Date).getTime() <=
          ((expected as { lte: Date }).lte).getTime()
        )
      }

      return value[key as keyof T] === expected
    })
  }

  function hydrateExecution(record: UpdateExecutionRow) {
    return {
      ...record,
      completedByUser: record.completedByUserId
        ? users.get(record.completedByUserId) ?? null
        : null,
      startedByUser: record.startedByUserId
        ? users.get(record.startedByUserId) ?? null
        : null,
      steps: steps
        .filter((step) => step.executionId === record.id)
        .sort((left, right) => left.position - right.position),
    }
  }

  const transactionClient = {
    $queryRaw: async () => [{ 1: 1 }],
    $queryRawUnsafe: async () => [{ table: '_prisma_migrations' }],
    accessProfile: {
      count: async () => 1,
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditEntries.push(data)
        return data
      },
    },
    operationalStatus: {
      count: async () => 8,
    },
    permission: {
      count: async () => 8,
    },
    systemRuntimeState: {
      findUnique: async () => runtimeState,
      updateMany: async ({
        data,
        where,
      }: {
        data: Partial<RuntimeStateRow>
        where: {
          id: string
          lifecycleState?: { in: SystemLifecycleState[] }
        }
      }) => {
        if (
          where.id !== runtimeState.id ||
          (where.lifecycleState &&
            !where.lifecycleState.in.includes(runtimeState.lifecycleState))
        ) {
          return { count: 0 }
        }

        touchRuntime(data)
        return { count: 1 }
      },
      upsert: async ({
        create,
        update,
      }: {
        create: Partial<RuntimeStateRow>
        update: Partial<RuntimeStateRow>
      }) => {
        touchRuntime({
          ...create,
          ...update,
        })

        return runtimeState
      },
    },
    unit: {
      count: async () => 1,
    },
    unitSetting: {
      count: async () => 1,
    },
    updateExecution: {
      create: async ({ data }: { data: Partial<UpdateExecutionRow> }) => {
        executionSequence += 1
        const row: UpdateExecutionRow = {
          completedAt: null,
          completedByUserId: null,
          createdAt: new Date('2026-04-05T12:00:00.000Z'),
          failedAt: null,
          failureSummary: null,
          id: `execution_${executionSequence}`,
          lastFailedStepCode: null,
          lastSuccessfulStepCode: null,
          lockExpiresAt: new Date('2026-04-05T12:15:00.000Z'),
          maintenanceEnteredAt: null,
          maintenanceExitedAt: null,
          manifestHash: 'manifest-target',
          mode: 'MANUAL',
          preflightSnapshot: null,
          recoveryState: 'NONE',
          requiresBackup: false,
          requiresMaintenance: false,
          retriedFromExecutionId: null,
          retryCount: 0,
          seedPolicy: 'none',
          sourceVersion: '0.2.0',
          startedAt: new Date('2026-04-05T12:00:00.000Z'),
          startedByUserId: updateOperator.id,
          status: 'PREPARING',
          targetVersion: '0.2.1',
          updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          ...data,
        }

        executions.push(row)
        return row
      },
      findFirst: async ({
        where,
      }: {
        where?: Record<string, unknown>
      } = {}) => {
        const record = executions.find((execution) =>
          where ? matchWhere(execution, where) : true,
        )

        return record ? hydrateExecution(record) : null
      },
      findMany: async ({
        orderBy,
        take,
        where,
      }: {
        include?: unknown
        orderBy?: { startedAt: 'asc' | 'desc' }
        take?: number
        where?: Record<string, unknown>
      } = {}) => {
        const records = executions
          .filter((execution) => (where ? matchWhere(execution, where) : true))
          .sort((left, right) =>
            orderBy?.startedAt === 'asc'
              ? left.startedAt.getTime() - right.startedAt.getTime()
              : right.startedAt.getTime() - left.startedAt.getTime(),
          )
          .slice(0, take ?? executions.length)

        return records.map((record) => hydrateExecution(record))
      },
      findUnique: async ({
        where,
      }: {
        include?: unknown
        where: { id: string }
      }) => {
        const record = executions.find((execution) => execution.id === where.id)
        return record ? hydrateExecution(record) : null
      },
      update: async ({
        data,
        where,
      }: {
        data: Partial<UpdateExecutionRow>
        where: { id: string }
      }) => {
        const record = executions.find((execution) => execution.id === where.id)

        if (!record) {
          throw new Error(`Unknown execution ${where.id}`)
        }

        Object.assign(
          record,
          Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
        )
        record.updatedAt = new Date('2026-04-05T12:00:00.000Z')
        return record
      },
    },
    updateExecutionStep: {
      createMany: async ({
        data,
      }: {
        data: Array<{
          code: string
          executionId: string
          label: string
          position: number
        }>
      }) => {
        for (const entry of data) {
          stepSequence += 1
          steps.push({
            code: entry.code,
            completedAt: null,
            createdAt: new Date('2026-04-05T12:00:00.000Z'),
            durationMs: null,
            errorSummary: null,
            executionId: entry.executionId,
            failedAt: null,
            id: `step_${stepSequence}`,
            label: entry.label,
            payload: null,
            position: entry.position,
            startedAt: null,
            status: 'PENDING',
            updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          })
        }

        return { count: data.length }
      },
      update: async ({
        data,
        where,
      }: {
        data: Partial<UpdateExecutionStepRow>
        where: { executionId_code: { code: string; executionId: string } }
      }) => {
        const record = steps.find(
          (step) =>
            step.executionId === where.executionId_code.executionId &&
            step.code === where.executionId_code.code,
        )

        if (!record) {
          throw new Error(`Unknown step ${where.executionId_code.code}`)
        }

        Object.assign(
          record,
          Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
        )
        record.updatedAt = new Date('2026-04-05T12:00:00.000Z')
        return record
      },
      updateMany: async ({
        data,
        where,
      }: {
        data: Partial<UpdateExecutionStepRow>
        where: { executionId?: string; status?: UpdateExecutionStepStatus }
      }) => {
        let count = 0

        for (const record of steps) {
          if (
            (where.executionId && record.executionId !== where.executionId) ||
            (where.status && record.status !== where.status)
          ) {
            continue
          }

          Object.assign(
            record,
            Object.fromEntries(
              Object.entries(data).filter(([, value]) => value !== undefined),
            ),
          )
          record.updatedAt = new Date('2026-04-05T12:00:00.000Z')
          count += 1
        }

        return { count }
      },
    },
  }

  return {
    auditEntries,
    executions,
    prismaClient: {
      ...transactionClient,
      $transaction: async <T>(
        callback: (transaction: typeof transactionClient) => Promise<T>,
      ) => callback(transactionClient),
    } as unknown as PrismaClient,
    runtimeState,
    runtimeTransitions,
    steps,
    takeReadinessChecks() {
      return readinessSequence.shift() ?? createReadinessChecks()
    },
  }
}

test('startUpdateExecution blocks access for users without update permission', async () => {
  await assert.rejects(
    () =>
      startUpdateExecution(runtimeViewer, {
        backupConfirmed: true,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'Missing permission: sistema.update.operar.',
  )
})

test('startUpdateExecution blocks when manifest and build versions diverge', async () => {
  const stub = createUpdateEngineStub()

  await assert.rejects(
    () =>
      startUpdateExecution(
        updateOperator,
        {
          backupConfirmed: true,
        },
        {
          buildVersion: '0.2.2',
          environment: createEnvironment(),
          manifestResult: createManifest('0.2.1'),
          prismaCapabilities: createPrismaRuntimeCapabilities(),
          prismaClient: stub.prismaClient,
        },
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message.includes('preflight'),
  )
})

test('startUpdateExecution blocks when another execution already holds the lock', async () => {
  const stub = createUpdateEngineStub({
    activeExecution: {
      completedAt: null,
      completedByUserId: null,
      createdAt: new Date('2026-04-05T12:00:00.000Z'),
      failedAt: null,
      failureSummary: null,
      id: 'execution_locked',
      lastFailedStepCode: null,
      lastSuccessfulStepCode: null,
      lockExpiresAt: new Date('2026-04-06T12:30:00.000Z'),
      maintenanceEnteredAt: new Date('2026-04-05T12:00:00.000Z'),
      maintenanceExitedAt: null,
      manifestHash: 'manifest-target',
      mode: 'MANUAL',
      preflightSnapshot: null,
      recoveryState: 'NONE',
      requiresBackup: false,
      requiresMaintenance: true,
      retriedFromExecutionId: null,
      retryCount: 0,
      seedPolicy: 'none',
      sourceVersion: '0.2.0',
      startedAt: new Date('2026-04-05T12:00:00.000Z'),
      startedByUserId: updateOperator.id,
      status: 'RUNNING',
      targetVersion: '0.2.1',
      updatedAt: new Date('2026-04-05T12:00:00.000Z'),
    },
  })

  await assert.rejects(
    () =>
      startUpdateExecution(
        updateOperator,
        {
          backupConfirmed: true,
        },
        {
          buildVersion: '0.2.1',
          environment: createEnvironment(),
          manifestResult: createManifest('0.2.1'),
          now: () => new Date('2026-04-06T12:10:00.000Z'),
          prismaCapabilities: createPrismaRuntimeCapabilities(),
          prismaClient: stub.prismaClient,
          readinessCollector: async () => stub.takeReadinessChecks(),
          runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
        },
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message.includes('already running'),
  )
})

test('startUpdateExecution enters maintenance, executes the steps and completes successfully', async () => {
  const stub = createUpdateEngineStub()

  const result = await startUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: createManifest('0.2.1'),
      migrateRunner: async () => undefined,
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  assert.equal(result?.status, 'COMPLETED')
  assert.deepEqual(
    stub.runtimeTransitions,
    ['UPDATING', 'INSTALLED'],
  )
  assert.equal(stub.runtimeState.currentVersion, '0.2.1')
  assert.equal(stub.runtimeState.lifecycleState, 'INSTALLED')
  assert.equal(result?.steps.every((step) => step.status === 'COMPLETED' || step.status === 'SKIPPED'), true)
})

test('startUpdateExecution stops on migration failure and keeps the runtime in update failure', async () => {
  const stub = createUpdateEngineStub()

  const result = await startUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: createManifest('0.2.1'),
      migrateRunner: async () => {
        throw new AppError('CONFLICT', 409, 'Migration failed on host.')
      },
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  assert.equal(result?.status, 'FAILED')
  assert.equal(result?.lastFailedStepCode, 'APPLY_MIGRATIONS')
  assert.equal(result?.recoveryState, 'MANUAL_INTERVENTION_REQUIRED')
  assert.equal(stub.runtimeState.lifecycleState, 'UPDATE_FAILED')
  assert.equal(stub.runtimeState.currentVersion, '0.2.0')
})

test('critical post-update task failure blocks completion and exposes retry', async () => {
  const stub = createUpdateEngineStub()
  let executions = 0

  const result = await startUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: createManifest('0.2.1', {
        postUpdateTasks: [
          {
            id: 'refresh_runtime_manifest',
            label: 'Refresh runtime manifest',
            required: true,
          },
        ],
      }),
      migrateRunner: async () => undefined,
      postTaskRegistry: {
        refresh_runtime_manifest: {
          async execute() {
            executions += 1
            throw new Error('Task failed in runtime.')
          },
          id: 'refresh_runtime_manifest',
          label: 'Refresh runtime manifest',
        },
      },
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  assert.equal(executions, 1)
  assert.equal(result?.status, 'FAILED')
  assert.equal(result?.lastFailedStepCode, 'RUN_POST_UPDATE_TASKS')
  assert.equal(result?.recoveryState, 'RETRY_AVAILABLE')
  assert.equal(stub.runtimeState.lifecycleState, 'UPDATE_FAILED')
})

test('retryUpdateExecution reruns idempotent tasks safely when recovery allows it', async () => {
  const stub = createUpdateEngineStub()
  let attempts = 0
  const manifest = createManifest('0.2.1', {
    postUpdateTasks: [
      {
        id: 'refresh_runtime_manifest',
        label: 'Refresh runtime manifest',
        required: true,
      },
    ],
  })

  const registry = {
    refresh_runtime_manifest: {
      async execute() {
        attempts += 1

        if (attempts === 1) {
          throw new Error('Task failed on first attempt.')
        }

        return {
          attempt: attempts,
        }
      },
      id: 'refresh_runtime_manifest',
      label: 'Refresh runtime manifest',
    },
  }

  const firstExecution = await startUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: manifest,
      migrateRunner: async () => undefined,
      postTaskRegistry: registry,
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  assert.equal(firstExecution?.status, 'FAILED')
  assert.equal(firstExecution?.recoveryState, 'RETRY_AVAILABLE')

  const retriedExecution = await retryUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
      executionId: firstExecution?.id ?? '',
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: manifest,
      migrateRunner: async () => undefined,
      postTaskRegistry: registry,
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  assert.equal(attempts, 2)
  assert.equal(retriedExecution?.status, 'COMPLETED')
  assert.equal(retriedExecution?.mode, 'RETRY')
  assert.equal(retriedExecution?.retriedFromExecutionId, firstExecution?.id)
  assert.equal(stub.runtimeState.lifecycleState, 'INSTALLED')
})

test('retryUpdateExecution blocks executions without retryable recovery state', async () => {
  const stub = createUpdateEngineStub()

  const failedExecution = await startUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: createManifest('0.2.1'),
      migrateRunner: async () => {
        throw new AppError('CONFLICT', 409, 'Migration failed on host.')
      },
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  await assert.rejects(
    () =>
      retryUpdateExecution(
        updateOperator,
        {
          backupConfirmed: true,
          executionId: failedExecution?.id ?? '',
        },
        {
          buildVersion: '0.2.1',
          environment: createEnvironment(),
          manifestResult: createManifest('0.2.1'),
          migrateRunner: async () => undefined,
          prismaCapabilities: createPrismaRuntimeCapabilities(),
          prismaClient: stub.prismaClient,
          readinessCollector: async () => stub.takeReadinessChecks(),
          runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
        },
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message.includes('retryable'),
  )
})

test('startUpdateExecution ends in controlled failure when final validation degrades after finalization', async () => {
  const stub = createUpdateEngineStub({
    readinessSequence: [createReadinessChecks('ok'), createReadinessChecks('fail')],
  })

  const result = await startUpdateExecution(
    updateOperator,
    {
      backupConfirmed: true,
    },
    {
      buildVersion: '0.2.1',
      environment: createEnvironment(),
      manifestResult: createManifest('0.2.1'),
      migrateRunner: async () => undefined,
      prismaCapabilities: createPrismaRuntimeCapabilities(),
      prismaClient: stub.prismaClient,
      readinessCollector: async () => stub.takeReadinessChecks(),
      runtimeCollector: async () => createRuntimeSnapshot(stub.runtimeState),
    },
  )

  assert.equal(result?.status, 'FAILED')
  assert.equal(result?.lastFailedStepCode, 'FINAL_VALIDATE')
  assert.equal(result?.recoveryState, 'MANUAL_INTERVENTION_REQUIRED')
  assert.equal(stub.runtimeState.lifecycleState, 'UPDATE_FAILED')
  assert.equal(stub.runtimeState.currentVersion, '0.2.1')
})
