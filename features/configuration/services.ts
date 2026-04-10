import type {
  ConfigurationCategory,
  ConfigurationScope,
  ConfigurationValueType,
  Prisma,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import {
  hasAnyPermission,
  hasPermission,
} from '@/server/authorization/access-control'
import { resolveActorUnitSessionContext } from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import {
  isPrismaSchemaCompatibilityError,
  withPrismaSchemaCompatibilityFallback,
} from '@/server/db/prisma-schema-compat'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import {
  configurationCategoryLabels,
  configurationRegistry,
  configurationScopeLabels,
  getConfigurationCategoryLabel,
  getConfigurationScopeLabel,
  type ConfigurationCategoryKey,
  type ConfigurationRegistryDefinition,
  type ConfigurationScopeKey,
} from './domain'

const CONFIGURATION_FOUNDATION_PERMISSIONS = [
  'configuracao.central.visualizar',
  'configuracao.visualizar',
  'sistema.manutencao.operar',
  'sistema.reparo.operar',
  'sistema.update.operar',
] as const

const configurationStorageStatuses = ['AVAILABLE', 'MIGRATION_PENDING'] as const

type ConfigurationStorageStatus = (typeof configurationStorageStatuses)[number]

export interface ConfigurationFoundationEntrySnapshot {
  category: ConfigurationCategoryKey
  categoryLabel: string
  criticalChange: boolean
  currentValue: string | null
  description: string
  environmentKey: string | null
  key: string
  label: string
  mutability: 'ADMIN_EDITABLE' | 'READ_ONLY_ENVIRONMENT'
  scope: ConfigurationScopeKey
  scopeLabel: string
  source: 'ENVIRONMENT' | 'SYSTEM_SETTING' | 'UNIT_SETTING'
  state:
    | 'CONFIGURED'
    | 'ENV_LOCKED'
    | 'MIGRATION_PENDING'
    | 'MISSING'
  unitId: string | null
  valueKind: 'BOOLEAN' | 'INTEGER' | 'JSON' | 'STRING'
}

export interface ConfigurationFoundationCategorySummary {
  category: ConfigurationCategoryKey
  categoryLabel: string
  configuredEntries: number
  criticalEntries: number
  editableEntries: number
  missingEntries: number
  totalEntries: number
}

export interface ConfigurationFoundationScopeSummary {
  configuredEntries: number
  editableEntries: number
  missingEntries: number
  scope: ConfigurationScopeKey
  scopeLabel: string
  totalEntries: number
}

export interface ConfigurationFoundationRecentChange {
  category: ConfigurationCategory
  categoryLabel: string
  changeType: string
  changedAt: Date
  impactLevel: string
  key: string
  scope: ConfigurationScope
  scopeLabel: string
  summary: string | null
  unitId: string | null
  userId: string | null
}

export interface ConfigurationFoundationSnapshot {
  categories: ConfigurationFoundationCategorySummary[]
  entries: ConfigurationFoundationEntrySnapshot[]
  generatedAt: Date
  multiUnit: {
    activeUnitId: string | null
    contextOrigin: string | null
    contextType: string | null
    diagnosticUnitId: string | null
    globalReadAccess: boolean
    globalWriteAccess: boolean
    homeUnitId: string | null
    requestedUnitId: string | null
    status: string
  }
  permissionGate: {
    acceptedPermissions: readonly string[]
    preferredPermission: 'configuracao.central.visualizar'
  }
  recentChanges: ConfigurationFoundationRecentChange[]
  scopes: ConfigurationFoundationScopeSummary[]
  storage: {
    configurationChanges: ConfigurationStorageStatus
    systemSettings: ConfigurationStorageStatus
  }
  summary: {
    configuredEntries: number
    editableEntries: number
    envLockedEntries: number
    missingEntries: number
    totalEntries: number
  }
}

type SystemSettingRecord = Prisma.SystemSettingGetPayload<Record<string, never>>

type ConfigurationChangeRecord = Prisma.ConfigurationChangeGetPayload<Record<string, never>>

export function canReadConfigurationFoundation(actor: AuthenticatedUserData) {
  return hasAnyPermission(actor, [...CONFIGURATION_FOUNDATION_PERMISSIONS])
}

export function canEditConfigurationFoundation(actor: AuthenticatedUserData) {
  return (
    hasPermission(actor, 'configuracao.central.editar') ||
    hasPermission(actor, 'configuracao.editar')
  )
}

export function getConfigurationFoundationPermissions() {
  return [...CONFIGURATION_FOUNDATION_PERMISSIONS]
}

export async function getConfigurationFoundationSnapshot(
  actor: AuthenticatedUserData,
): Promise<ConfigurationFoundationSnapshot> {
  assertCanReadConfigurationFoundation(actor)

  const context = resolveActorUnitSessionContext(actor)
  const diagnosticUnitId =
    context.status === 'RESOLVED'
      ? context.activeUnitId ?? actor.unitId
      : actor.unitId

  const env = getEnv()

  let systemSettingsStorageStatus: ConfigurationStorageStatus = 'AVAILABLE'
  let configurationChangesStorageStatus: ConfigurationStorageStatus = 'AVAILABLE'

  const [systemSettings, configurationChanges, unitSettings] = await Promise.all([
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.systemSetting.findMany({
          orderBy: [{ scope: 'asc' }, { key: 'asc' }],
        }),
      async () => {
        systemSettingsStorageStatus = 'MIGRATION_PENDING'
        return [] as SystemSettingRecord[]
      },
    ),
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.configurationChange.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          take: 8,
        }),
      async () => {
        configurationChangesStorageStatus = 'MIGRATION_PENDING'
        return [] as ConfigurationChangeRecord[]
      },
    ),
    diagnosticUnitId
      ? prisma.unitSetting.findMany({
          where: {
            unitId: diagnosticUnitId,
            key: {
              in: configurationRegistry
                .flatMap((entry) =>
                  entry.source === 'UNIT_SETTING' && entry.unitSettingKey
                    ? [entry.unitSettingKey]
                    : [],
                ),
            },
          },
        })
      : Promise.resolve([]),
  ])

  const entries = configurationRegistry.map((definition) =>
    createConfigurationEntrySnapshot(
      definition,
      env,
      systemSettings,
      unitSettings,
      definition.scope === 'UNIT' ? diagnosticUnitId : null,
      systemSettingsStorageStatus,
    ),
  )

  return {
    categories: Object.keys(configurationCategoryLabels).map((categoryKey) =>
      createCategorySummary(
        categoryKey as ConfigurationCategoryKey,
        entries,
      ),
    ),
    entries,
    generatedAt: new Date(),
    multiUnit: {
      activeUnitId: context.activeUnitId,
      contextOrigin: context.contextOrigin,
      contextType: context.contextType,
      diagnosticUnitId,
      globalReadAccess: context.globalReadAccess,
      globalWriteAccess: context.globalWriteAccess,
      homeUnitId: context.homeUnitId,
      requestedUnitId: context.requestedUnitId,
      status: context.status,
    },
    permissionGate: {
      acceptedPermissions: CONFIGURATION_FOUNDATION_PERMISSIONS,
      preferredPermission: 'configuracao.central.visualizar',
    },
    recentChanges: configurationChanges.map(createRecentChangeSnapshot),
    scopes: Object.keys(configurationScopeLabels).map((scopeKey) =>
      createScopeSummary(scopeKey as ConfigurationScopeKey, entries),
    ),
    storage: {
      configurationChanges: configurationChangesStorageStatus,
      systemSettings: systemSettingsStorageStatus,
    },
    summary: {
      configuredEntries: entries.filter((entry) => entry.state === 'CONFIGURED').length,
      editableEntries: entries.filter((entry) => entry.mutability === 'ADMIN_EDITABLE').length,
      envLockedEntries: entries.filter((entry) => entry.state === 'ENV_LOCKED').length,
      missingEntries: entries.filter((entry) => entry.state === 'MISSING').length,
      totalEntries: entries.length,
    },
  }
}

export function isConfigurationFoundationStorageUnavailable(error: unknown) {
  return isPrismaSchemaCompatibilityError(error)
}

function assertCanReadConfigurationFoundation(actor: AuthenticatedUserData) {
  if (canReadConfigurationFoundation(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    `Missing permission for phase 5 configuration foundation. Expected one of: ${CONFIGURATION_FOUNDATION_PERMISSIONS.join(', ')}.`,
  )
}

function createConfigurationEntrySnapshot(
  definition: ConfigurationRegistryDefinition,
  env: ReturnType<typeof getEnv>,
  systemSettings: SystemSettingRecord[],
  unitSettings: Array<{ key: string; value: string; unitId: string }>,
  diagnosticUnitId: string | null,
  systemSettingsStorageStatus: ConfigurationStorageStatus,
): ConfigurationFoundationEntrySnapshot {
  const currentValue = resolveCurrentValue(
    definition,
    env,
    systemSettings,
    unitSettings,
    diagnosticUnitId,
  )

  let state: ConfigurationFoundationEntrySnapshot['state']

  if (
    definition.source === 'SYSTEM_SETTING' &&
    systemSettingsStorageStatus === 'MIGRATION_PENDING'
  ) {
    state = 'MIGRATION_PENDING'
  } else if (definition.source === 'ENVIRONMENT') {
    state = currentValue !== null ? 'ENV_LOCKED' : 'MISSING'
  } else {
    state = currentValue !== null ? 'CONFIGURED' : 'MISSING'
  }

  return {
    category: definition.category,
    categoryLabel: getConfigurationCategoryLabel(definition.category),
    criticalChange: definition.criticalChange,
    currentValue,
    description: definition.description,
    environmentKey: definition.environmentKey ?? null,
    key: definition.key,
    label: definition.label,
    mutability: definition.mutability,
    scope: definition.scope,
    scopeLabel: getConfigurationScopeLabel(definition.scope),
    source: definition.source,
    state,
    unitId: definition.scope === 'UNIT' ? diagnosticUnitId : null,
    valueKind: definition.valueKind,
  }
}

function resolveCurrentValue(
  definition: ConfigurationRegistryDefinition,
  env: ReturnType<typeof getEnv>,
  systemSettings: SystemSettingRecord[],
  unitSettings: Array<{ key: string; value: string; unitId: string }>,
  diagnosticUnitId: string | null,
) {
  if (definition.source === 'ENVIRONMENT') {
    const rawValue = definition.environmentKey ? env[definition.environmentKey] : undefined
    return normalizePrimitiveValue(rawValue, definition.valueKind) ?? definition.fallbackValue ?? null
  }

  if (definition.source === 'UNIT_SETTING') {
    const record = unitSettings.find(
      (setting) =>
        setting.key === definition.unitSettingKey &&
        setting.unitId === diagnosticUnitId,
    )

    return normalizePrimitiveValue(record?.value, definition.valueKind) ?? definition.fallbackValue ?? null
  }

  const record = systemSettings.find(
    (setting) =>
      setting.key === definition.key &&
      setting.scope === definition.scope &&
      setting.unitId === (definition.scope === 'UNIT' ? diagnosticUnitId : null),
  )

  if (!record) {
    return definition.fallbackValue ?? null
  }

  if (record.valueText !== null) {
    return normalizePrimitiveValue(record.valueText, definition.valueKind) ?? definition.fallbackValue ?? null
  }

  if (record.valueJson !== null) {
    return JSON.stringify(record.valueJson)
  }

  return definition.fallbackValue ?? null
}

function normalizePrimitiveValue(
  value: unknown,
  valueKind: ConfigurationFoundationEntrySnapshot['valueKind'],
) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : null
  }

  if (typeof value !== 'string') {
    return valueKind === 'JSON' ? JSON.stringify(value) : String(value)
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return null
  }

  return trimmed
}

function createCategorySummary(
  category: ConfigurationCategoryKey,
  entries: ConfigurationFoundationEntrySnapshot[],
): ConfigurationFoundationCategorySummary {
  const filteredEntries = entries.filter((entry) => entry.category === category)

  return {
    category,
    categoryLabel: getConfigurationCategoryLabel(category),
    configuredEntries: filteredEntries.filter((entry) => entry.state === 'CONFIGURED').length,
    criticalEntries: filteredEntries.filter((entry) => entry.criticalChange).length,
    editableEntries: filteredEntries.filter((entry) => entry.mutability === 'ADMIN_EDITABLE').length,
    missingEntries: filteredEntries.filter((entry) => entry.state === 'MISSING').length,
    totalEntries: filteredEntries.length,
  }
}

function createScopeSummary(
  scope: ConfigurationScopeKey,
  entries: ConfigurationFoundationEntrySnapshot[],
): ConfigurationFoundationScopeSummary {
  const filteredEntries = entries.filter((entry) => entry.scope === scope)

  return {
    configuredEntries: filteredEntries.filter((entry) => entry.state === 'CONFIGURED').length,
    editableEntries: filteredEntries.filter((entry) => entry.mutability === 'ADMIN_EDITABLE').length,
    missingEntries: filteredEntries.filter((entry) => entry.state === 'MISSING').length,
    scope,
    scopeLabel: getConfigurationScopeLabel(scope),
    totalEntries: filteredEntries.length,
  }
}

function createRecentChangeSnapshot(
  record: ConfigurationChangeRecord,
): ConfigurationFoundationRecentChange {
  return {
    category: record.category,
    categoryLabel: getConfigurationCategoryLabel(record.category),
    changeType: record.changeType,
    changedAt: record.createdAt,
    impactLevel: record.impactLevel,
    key: record.key,
    scope: record.scope,
    scopeLabel: getConfigurationScopeLabel(record.scope),
    summary: record.summary,
    unitId: record.unitId,
    userId: record.changedByUserId,
  }
}
