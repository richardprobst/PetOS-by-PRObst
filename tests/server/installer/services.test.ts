import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../../../server/env'
import {
  phase2SeedPermissionNames,
  phase2SeedUnitSettingKeys,
} from '../../../server/foundation/phase2'
import { AppError } from '../../../server/http/errors'
import {
  buildInstallerDraftSummary,
  finalizeInstallerSetup,
  validateInstallerSetupDraft,
} from '../../../features/installer/services'
import { getBuildVersion } from '../../../server/system/version'

function createEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return parseEnvironment({
    NODE_ENV: 'test',
    APP_NAME: 'PetOS',
    APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    DATABASE_URL: 'mysql://user:password@db.internal:3306/petos',
    DIRECT_DATABASE_URL: 'mysql://user:password@db.internal:3306/petos',
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

function createInstallerServicesStub(overrides?: {
  accessProfileCount?: number
  existingUserId?: string | null
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
      findUniqueOrThrow: async () => ({
        id: 'profile-admin',
        name: 'Administrador',
      }),
      upsert: async ({ create, where }: { create: { description: string; name: string }; where: { name: string } }) => ({
        id: `profile-${where.name}`,
        name: create.name,
      }),
    },
    auditLog: {
      create: async () => undefined,
    },
    client: {
      findMany: async () => [],
    },
    clientCommunicationPreference: {
      upsert: async () => undefined,
    },
    messageTemplate: {
      upsert: async () => undefined,
    },
    operationalStatus: {
      count: async () => overrides?.operationalStatusCount ?? 0,
      upsert: async () => undefined,
    },
    permission: {
      count: async () => overrides?.permissionCount ?? 0,
      findUniqueOrThrow: async ({ where }: { where: { name: string } }) => ({
        id: `permission-${where.name}`,
        name: where.name,
      }),
      upsert: async () => undefined,
    },
    profilePermission: {
      upsert: async () => undefined,
    },
    systemRuntimeState: {
      findUnique: async () => overrides?.runtimeState ?? null,
      upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
        ...create,
        ...update,
      }),
    },
    unit: {
      count: async () => overrides?.unitCount ?? 0,
      create: async ({ data }: { data: { active: boolean; email?: string; name: string; phone?: string } }) => ({
        active: data.active,
        email: data.email ?? null,
        id: 'unit_123',
        name: data.name,
        phone: data.phone ?? null,
      }),
      findFirst: async () => null,
      update: async ({ data, where }: { data: { email?: string | null; name: string; phone?: string | null }; where: { id: string } }) => ({
        email: data.email ?? null,
        id: where.id,
        name: data.name,
        phone: data.phone ?? null,
      }),
    },
    unitSetting: {
      count: async () => overrides?.unitSettingCount ?? 0,
      upsert: async () => undefined,
    },
    user: {
      findUnique: async () =>
        overrides?.existingUserId
          ? {
              id: overrides.existingUserId,
            }
          : null,
      upsert: async ({ create }: { create: { email: string; name: string } }) => ({
        email: create.email,
        id: 'user_admin_123',
        name: create.name,
      }),
    },
    userProfile: {
      upsert: async () => undefined,
    },
    $transaction: async <T>(callback: (transaction: unknown) => Promise<T>) =>
      callback(createInstallerServicesStub(overrides)),
  }
}

const validInput = {
  adminEmail: 'admin@petos.local',
  adminName: 'Admin PetOS',
  adminPassword: 'super-secret-password',
  adminPasswordConfirmation: 'super-secret-password',
  companyName: 'PetOS',
  unitEmail: '',
  unitName: 'Unidade Principal',
  unitPhone: '',
  unitTimezone: 'America/Sao_Paulo',
} as const

test('buildInstallerDraftSummary normalizes organization and environment data', () => {
  const summary = buildInstallerDraftSummary(validInput, createEnvironment())

  assert.equal(summary.admin.email, 'admin@petos.local')
  assert.equal(summary.environment.databaseHost, 'db.internal:3306')
  assert.equal(summary.organization.unitEmail, undefined)
  assert.ok(summary.warnings.some((warning) => warning.includes('Storage externo')))
})

test('validateInstallerSetupDraft accepts a fresh environment with no existing admin user', async () => {
  const summary = await validateInstallerSetupDraft(
    createInstallerServicesStub() as unknown as Parameters<typeof validateInstallerSetupDraft>[0],
    validInput,
    createEnvironment(),
  )

  assert.equal(summary.organization.unitName, 'Unidade Principal')
  assert.equal(summary.admin.name, 'Admin PetOS')
})

test('validateInstallerSetupDraft rejects environments that already look installed', async () => {
  await assert.rejects(
    validateInstallerSetupDraft(
      createInstallerServicesStub({
        accessProfileCount: 1,
        operationalStatusCount: 8,
        permissionCount: phase2SeedPermissionNames.length,
        unitCount: 1,
        unitSettingCount: phase2SeedUnitSettingKeys.length,
      }) as unknown as Parameters<typeof validateInstallerSetupDraft>[0],
      validInput,
      createEnvironment(),
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message.includes('Installer preflight is not ready'),
  )
})

test('validateInstallerSetupDraft rejects an admin e-mail that already exists in the database', async () => {
  await assert.rejects(
    validateInstallerSetupDraft(
      createInstallerServicesStub({
        existingUserId: 'user_123',
      }) as unknown as Parameters<typeof validateInstallerSetupDraft>[0],
      validInput,
      createEnvironment(),
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 409 &&
      error.message.includes('Ja existe um usuario com esse e-mail administrativo'),
  )
})

function createInstallerFinalizeStub() {
  const runtimeWrites: Array<Record<string, unknown>> = []
  const auditWrites: Array<Record<string, unknown>> = []

  const base = createInstallerServicesStub()
  const transactionClient = {
    ...base,
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditWrites.push(data)
        return data
      },
    },
    systemRuntimeState: {
      findUnique: async () => null,
      upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const payload = {
          ...create,
          ...update,
        }

        runtimeWrites.push(payload)
        return payload
      },
    },
  }

  return {
    auditWrites,
    runtimeWrites,
    stub: {
      ...transactionClient,
      $transaction: async <T>(callback: (transaction: typeof transactionClient) => Promise<T>) =>
        callback(transactionClient),
    },
  }
}

test('finalizeInstallerSetup bootstraps the initial install and persists runtime lock', async () => {
  const { auditWrites, runtimeWrites, stub } = createInstallerFinalizeStub()

  const result = await finalizeInstallerSetup(
    stub as unknown as Parameters<typeof finalizeInstallerSetup>[0],
    validInput,
    createEnvironment(),
  )

  assert.equal(result.adminEmail, 'admin@petos.local')
  assert.equal(result.unitName, 'Unidade Principal')
  assert.equal(result.version, getBuildVersion())
  assert.equal(runtimeWrites[0]?.lifecycleState, 'INSTALLING')
  assert.equal(runtimeWrites[1]?.lifecycleState, 'INSTALLED')
  assert.ok(runtimeWrites[1]?.installerLockedAt instanceof Date)
  assert.equal(auditWrites[0]?.action, 'setup.installation_completed')
})
