import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  canEditConfigurationFoundation,
  getConfigurationFoundationPermissions,
  getConfigurationFoundationSnapshot,
} from '../../../features/configuration/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { resetEnvironmentCacheForTests } from '../../../server/env'
import { AppError } from '../../../server/http/errors'

const restorers: Array<() => void> = []

const configurationOperator: AuthenticatedUserData = {
  active: true,
  email: 'config@petos.app',
  id: 'user_configuration_operator',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Configuration Operator',
  permissions: ['configuracao.central.visualizar', 'configuracao.central.editar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }

  resetEnvironmentCacheForTests()
})

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

async function withConfigurationEnvironment(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<void>,
) {
  const previous = {
    AI_IMAGE_ANALYSIS_ENABLED: process.env.AI_IMAGE_ANALYSIS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_ENABLED: process.env.AI_PREDICTIVE_INSIGHTS_ENABLED,
    AI_VIRTUAL_ASSISTANT_BASE_QUOTA: process.env.AI_VIRTUAL_ASSISTANT_BASE_QUOTA,
    AI_VIRTUAL_ASSISTANT_ENABLED: process.env.AI_VIRTUAL_ASSISTANT_ENABLED,
    APP_NAME: process.env.APP_NAME,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DEFAULT_CANCELLATION_WINDOW_HOURS: process.env.DEFAULT_CANCELLATION_WINDOW_HOURS,
    DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS:
      process.env.DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS,
    DEFAULT_CRM_INACTIVE_DAYS: process.env.DEFAULT_CRM_INACTIVE_DAYS,
    DEFAULT_CRM_POST_SERVICE_DELAY_HOURS:
      process.env.DEFAULT_CRM_POST_SERVICE_DELAY_HOURS,
    DEFAULT_CRM_REVIEW_DELAY_HOURS: process.env.DEFAULT_CRM_REVIEW_DELAY_HOURS,
    DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY,
    DEFAULT_DEPOSIT_EXPIRATION_MINUTES:
      process.env.DEFAULT_DEPOSIT_EXPIRATION_MINUTES,
    DEFAULT_DOCUMENT_RETENTION_DAYS: process.env.DEFAULT_DOCUMENT_RETENTION_DAYS,
    DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS:
      process.env.DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS,
    DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS:
      process.env.DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS,
    DEFAULT_NO_SHOW_TOLERANCE_MINUTES:
      process.env.DEFAULT_NO_SHOW_TOLERANCE_MINUTES,
    DEFAULT_PAYROLL_PERIOD_DAYS: process.env.DEFAULT_PAYROLL_PERIOD_DAYS,
    DEFAULT_POS_AUTO_FISCAL_DOCUMENT: process.env.DEFAULT_POS_AUTO_FISCAL_DOCUMENT,
    DEFAULT_PRE_CHECK_IN_WINDOW_HOURS:
      process.env.DEFAULT_PRE_CHECK_IN_WINDOW_HOURS,
    DEFAULT_PRODUCT_MIN_STOCK_QUANTITY:
      process.env.DEFAULT_PRODUCT_MIN_STOCK_QUANTITY,
    DEFAULT_RESCHEDULE_WINDOW_HOURS:
      process.env.DEFAULT_RESCHEDULE_WINDOW_HOURS,
    DEFAULT_TEAM_SHIFT_MINUTES: process.env.DEFAULT_TEAM_SHIFT_MINUTES,
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES:
      process.env.DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    FISCAL_PROVIDER: process.env.FISCAL_PROVIDER,
    INSTALLER_ENABLED: process.env.INSTALLER_ENABLED,
    LOG_LEVEL: process.env.LOG_LEVEL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_REGION: process.env.STORAGE_REGION,
    UPLOAD_ALLOWED_MIME_TYPES: process.env.UPLOAD_ALLOWED_MIME_TYPES,
    UPLOAD_MAX_FILE_SIZE_MB: process.env.UPLOAD_MAX_FILE_SIZE_MB,
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  resetEnvironmentCacheForTests()

  try {
    await callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }

    resetEnvironmentCacheForTests()
  }
}

function installConfigurationPrismaStubs(options?: {
  configurationChangesError?: Error
  configurationChangesRows?: Array<{
    category: 'GENERAL' | 'SECURITY_ACCESS'
    changeType: 'SYSTEM_SYNC' | 'UPDATED'
    createdAt: Date
    impactLevel: 'LOW' | 'HIGH'
    key: string
    scope: 'TENANT_GLOBAL' | 'SYSTEM_GLOBAL'
    summary: string | null
    unitId: string | null
    changedByUserId: string | null
  }>
  systemSettingsError?: Error
  systemSettingsRows?: Array<{
    key: string
    scope: 'TENANT_GLOBAL' | 'SYSTEM_GLOBAL' | 'PUBLIC_BRAND'
    unitId: string | null
    valueJson: unknown
    valueText: string | null
  }>
  unitSettingsRows?: Array<{
    key: string
    unitId: string
    value: string
  }>
}) {
  replaceMethod(prisma as object, 'systemSetting', {
    findMany: async () => {
      if (options?.systemSettingsError) {
        throw options.systemSettingsError
      }

      return (
        options?.systemSettingsRows ?? [
          {
            key: 'tenant.identity.company_name',
            scope: 'TENANT_GLOBAL',
            unitId: null,
            valueJson: null,
            valueText: 'PetOS Matriz',
          },
          {
            key: 'security.configuration.approval_required_for_critical_changes',
            scope: 'SYSTEM_GLOBAL',
            unitId: null,
            valueJson: null,
            valueText: 'true',
          },
          {
            key: 'branding.public.brand_name',
            scope: 'PUBLIC_BRAND',
            unitId: null,
            valueJson: null,
            valueText: 'PetOS',
          },
        ]
      )
    },
  })

  replaceMethod(prisma as object, 'configurationChange', {
    findMany: async () => {
      if (options?.configurationChangesError) {
        throw options.configurationChangesError
      }

      return (
        options?.configurationChangesRows ?? [
          {
            category: 'GENERAL',
            changeType: 'SYSTEM_SYNC',
            createdAt: new Date('2026-04-10T12:00:00.000Z'),
            impactLevel: 'LOW',
            key: 'tenant.identity.company_name',
            scope: 'TENANT_GLOBAL',
            summary: 'Bootstrap inicial da fundacao de configuracao.',
            unitId: null,
            changedByUserId: null,
          },
        ]
      )
    },
  })

  replaceMethod(prisma as object, 'unitSetting', {
    findMany: async () =>
      options?.unitSettingsRows ?? [
        {
          key: 'agenda.cancelamento_antecedencia_horas',
          unitId: 'unit_local',
          value: '24',
        },
        {
          key: 'agenda.reagendamento_antecedencia_horas',
          unitId: 'unit_local',
          value: '24',
        },
        {
          key: 'agenda.tolerancia_no_show_minutos',
          unitId: 'unit_local',
          value: '15',
        },
        {
          key: 'financeiro.deposito_expiracao_minutos_padrao',
          unitId: 'unit_local',
          value: '90',
        },
        {
          key: 'crm.inatividade_dias_padrao',
          unitId: 'unit_local',
          value: '120',
        },
      ],
  })
}

function createSchemaCompatibilityError(code: 'P2021' | 'P2022' = 'P2021') {
  return Object.assign(new Error('Schema compatibility error'), { code })
}

test('getConfigurationFoundationSnapshot enforces configuration permission before exposing the phase 5 foundation', async () => {
  await withConfigurationEnvironment(
    {
      AI_IMAGE_ANALYSIS_ENABLED: 'true',
      AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
      AI_VIRTUAL_ASSISTANT_BASE_QUOTA: '30',
      AI_VIRTUAL_ASSISTANT_ENABLED: 'true',
      APP_NAME: 'PetOS',
      APP_URL: 'https://petos.app',
      DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
      DEFAULT_CANCELLATION_WINDOW_HOURS: '24',
      DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS: '180',
      DEFAULT_CRM_INACTIVE_DAYS: '90',
      DEFAULT_CRM_POST_SERVICE_DELAY_HOURS: '6',
      DEFAULT_CRM_REVIEW_DELAY_HOURS: '24',
      DEFAULT_CURRENCY: 'BRL',
      DEFAULT_DEPOSIT_EXPIRATION_MINUTES: '60',
      DEFAULT_DOCUMENT_RETENTION_DAYS: '180',
      DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS: '900',
      DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS: '90',
      DEFAULT_NO_SHOW_TOLERANCE_MINUTES: '15',
      DEFAULT_PAYROLL_PERIOD_DAYS: '30',
      DEFAULT_POS_AUTO_FISCAL_DOCUMENT: 'false',
      DEFAULT_PRE_CHECK_IN_WINDOW_HOURS: '48',
      DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: '1',
      DEFAULT_RESCHEDULE_WINDOW_HOURS: '24',
      DEFAULT_TEAM_SHIFT_MINUTES: '480',
      DEFAULT_TIMEZONE: 'America/Sao_Paulo',
      DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: '10',
      DIRECT_DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
      EMAIL_FROM_ADDRESS: 'ops@petos.app',
      EMAIL_FROM_NAME: 'PetOS',
      EMAIL_PROVIDER: 'smtp',
      FISCAL_PROVIDER: 'focus',
      INSTALLER_ENABLED: 'false',
      LOG_LEVEL: 'info',
      NEXTAUTH_SECRET: '12345678901234567890123456789012',
      NEXTAUTH_URL: 'https://petos.app',
      NEXT_PUBLIC_APP_URL: 'https://petos.app',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX_REQUESTS: '100',
      RATE_LIMIT_WINDOW_MS: '60000',
      STORAGE_BUCKET: 'petos',
      STORAGE_REGION: 'sa-east-1',
      UPLOAD_ALLOWED_MIME_TYPES: 'image/png,image/jpeg,application/pdf',
      UPLOAD_MAX_FILE_SIZE_MB: '10',
    },
    async () => {
      await assert.rejects(
        () =>
          getConfigurationFoundationSnapshot({
            ...configurationOperator,
            permissions: ['agendamento.visualizar'],
            profiles: ['Recepcionista'],
          }),
        (error) =>
          error instanceof AppError &&
          error.status === 403 &&
          error.message.includes('Missing permission for phase 5 configuration foundation'),
      )
    },
  )
})

test('getConfigurationFoundationSnapshot consolidates environment, system and unit settings into a single administrative snapshot', async () => {
  installConfigurationPrismaStubs()

  await withConfigurationEnvironment(
    {
      AI_IMAGE_ANALYSIS_ENABLED: 'true',
      AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
      AI_VIRTUAL_ASSISTANT_BASE_QUOTA: '30',
      AI_VIRTUAL_ASSISTANT_ENABLED: 'true',
      APP_NAME: 'PetOS',
      APP_URL: 'https://petos.app',
      DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
      DEFAULT_CANCELLATION_WINDOW_HOURS: '24',
      DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS: '180',
      DEFAULT_CRM_INACTIVE_DAYS: '90',
      DEFAULT_CRM_POST_SERVICE_DELAY_HOURS: '6',
      DEFAULT_CRM_REVIEW_DELAY_HOURS: '24',
      DEFAULT_CURRENCY: 'BRL',
      DEFAULT_DEPOSIT_EXPIRATION_MINUTES: '60',
      DEFAULT_DOCUMENT_RETENTION_DAYS: '180',
      DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS: '900',
      DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS: '90',
      DEFAULT_NO_SHOW_TOLERANCE_MINUTES: '15',
      DEFAULT_PAYROLL_PERIOD_DAYS: '30',
      DEFAULT_POS_AUTO_FISCAL_DOCUMENT: 'false',
      DEFAULT_PRE_CHECK_IN_WINDOW_HOURS: '48',
      DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: '1',
      DEFAULT_RESCHEDULE_WINDOW_HOURS: '24',
      DEFAULT_TEAM_SHIFT_MINUTES: '480',
      DEFAULT_TIMEZONE: 'America/Sao_Paulo',
      DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: '10',
      DIRECT_DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
      EMAIL_FROM_ADDRESS: 'ops@petos.app',
      EMAIL_FROM_NAME: 'PetOS',
      EMAIL_PROVIDER: 'smtp',
      FISCAL_PROVIDER: 'focus',
      INSTALLER_ENABLED: 'false',
      LOG_LEVEL: 'info',
      NEXTAUTH_SECRET: '12345678901234567890123456789012',
      NEXTAUTH_URL: 'https://petos.app',
      NEXT_PUBLIC_APP_URL: 'https://petos.app',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX_REQUESTS: '100',
      RATE_LIMIT_WINDOW_MS: '60000',
      STORAGE_BUCKET: 'petos',
      STORAGE_REGION: 'sa-east-1',
      UPLOAD_ALLOWED_MIME_TYPES: 'image/png,image/jpeg,application/pdf',
      UPLOAD_MAX_FILE_SIZE_MB: '10',
    },
    async () => {
      const snapshot = await getConfigurationFoundationSnapshot(configurationOperator)

      assert.deepEqual(getConfigurationFoundationPermissions(), [
        'configuracao.central.visualizar',
        'configuracao.visualizar',
        'sistema.manutencao.operar',
        'sistema.reparo.operar',
        'sistema.update.operar',
      ])
      assert.equal(canEditConfigurationFoundation(configurationOperator), true)
      assert.equal(snapshot.storage.systemSettings, 'AVAILABLE')
      assert.equal(snapshot.storage.configurationChanges, 'AVAILABLE')
      assert.equal(snapshot.multiUnit.diagnosticUnitId, 'unit_local')
      assert.equal(snapshot.multiUnit.statusLabel, 'Contexto resolvido')
      assert.equal(snapshot.summary.totalEntries > 10, true)
      assert.equal(
        snapshot.entries.some(
          (entry) =>
            entry.key === 'tenant.identity.company_name' &&
            entry.state === 'CONFIGURED' &&
            entry.currentValue === 'PetOS Matriz',
        ),
        true,
      )
      assert.equal(
        snapshot.entries.some(
          (entry) =>
            entry.key === 'agenda.cancelamento_antecedencia_horas' &&
            entry.scope === 'UNIT' &&
            entry.currentValue === '24',
        ),
        true,
      )
      assert.equal(
        snapshot.entries.some(
          (entry) =>
            entry.key === 'ai.virtual_assistant.enabled' &&
            entry.state === 'ENV_LOCKED' &&
            entry.currentValue === 'true',
        ),
        true,
      )
      assert.equal(
        snapshot.categories.some(
          (category) => category.category === 'WHITE_LABEL' && category.totalEntries > 0,
        ),
        true,
      )
      assert.equal(snapshot.recentChanges[0]?.key, 'tenant.identity.company_name')
    },
  )
})

test('getConfigurationFoundationSnapshot surfaces migration-pending storage instead of crashing when the new configuration tables are absent', async () => {
  installConfigurationPrismaStubs({
    configurationChangesError: createSchemaCompatibilityError(),
    systemSettingsError: createSchemaCompatibilityError(),
  })

  await withConfigurationEnvironment(
    {
      AI_IMAGE_ANALYSIS_ENABLED: 'true',
      AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
      AI_VIRTUAL_ASSISTANT_BASE_QUOTA: '30',
      AI_VIRTUAL_ASSISTANT_ENABLED: 'true',
      APP_NAME: 'PetOS',
      APP_URL: 'https://petos.app',
      DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
      DEFAULT_CANCELLATION_WINDOW_HOURS: '24',
      DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS: '180',
      DEFAULT_CRM_INACTIVE_DAYS: '90',
      DEFAULT_CRM_POST_SERVICE_DELAY_HOURS: '6',
      DEFAULT_CRM_REVIEW_DELAY_HOURS: '24',
      DEFAULT_CURRENCY: 'BRL',
      DEFAULT_DEPOSIT_EXPIRATION_MINUTES: '60',
      DEFAULT_DOCUMENT_RETENTION_DAYS: '180',
      DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS: '900',
      DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS: '90',
      DEFAULT_NO_SHOW_TOLERANCE_MINUTES: '15',
      DEFAULT_PAYROLL_PERIOD_DAYS: '30',
      DEFAULT_POS_AUTO_FISCAL_DOCUMENT: 'false',
      DEFAULT_PRE_CHECK_IN_WINDOW_HOURS: '48',
      DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: '1',
      DEFAULT_RESCHEDULE_WINDOW_HOURS: '24',
      DEFAULT_TEAM_SHIFT_MINUTES: '480',
      DEFAULT_TIMEZONE: 'America/Sao_Paulo',
      DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: '10',
      DIRECT_DATABASE_URL: 'mysql://user:pass@localhost:3306/petos',
      EMAIL_FROM_ADDRESS: 'ops@petos.app',
      EMAIL_FROM_NAME: 'PetOS',
      EMAIL_PROVIDER: 'smtp',
      FISCAL_PROVIDER: 'focus',
      INSTALLER_ENABLED: 'false',
      LOG_LEVEL: 'info',
      NEXTAUTH_SECRET: '12345678901234567890123456789012',
      NEXTAUTH_URL: 'https://petos.app',
      NEXT_PUBLIC_APP_URL: 'https://petos.app',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX_REQUESTS: '100',
      RATE_LIMIT_WINDOW_MS: '60000',
      STORAGE_BUCKET: 'petos',
      STORAGE_REGION: 'sa-east-1',
      UPLOAD_ALLOWED_MIME_TYPES: 'image/png,image/jpeg,application/pdf',
      UPLOAD_MAX_FILE_SIZE_MB: '10',
    },
    async () => {
      const snapshot = await getConfigurationFoundationSnapshot(configurationOperator)

      assert.equal(snapshot.storage.systemSettings, 'MIGRATION_PENDING')
      assert.equal(snapshot.storage.configurationChanges, 'MIGRATION_PENDING')
      assert.equal(
        snapshot.entries.some(
          (entry) =>
            entry.source === 'SYSTEM_SETTING' && entry.state === 'MIGRATION_PENDING',
        ),
        true,
      )
      assert.equal(snapshot.recentChanges.length, 0)
    },
  )
})
