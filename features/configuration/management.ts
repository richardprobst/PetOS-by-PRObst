import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type {
  ConfigurationCategory,
  ConfigurationImpactLevel,
  ConfigurationScope,
  ConfigurationValueType,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { hasPermission } from '@/server/authorization/access-control'
import {
  createLocalUnitOwnershipBinding,
  evaluateActorMultiUnitScope,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import {
  createStorageUnavailableAppError,
  isPrismaSchemaCompatibilityError,
  withPrismaSchemaCompatibilityFallback,
} from '@/server/db/prisma-schema-compat'
import { AppError } from '@/server/http/errors'
import { getBrandingAdminSnapshot, captureLiveBrandingState } from '@/features/branding/services'
import {
  captureLiveIntegrationState,
  getIntegrationAdminSnapshot,
} from '@/features/integrations-admin/services'
import {
  configurationRegistry,
  getConfigurationRegistryDefinition,
  type ConfigurationRegistryValueKind,
} from './domain'
import { writeConfigurationChange } from './audit'
import {
  canEditConfigurationFoundation,
  canReadConfigurationFoundation,
  getConfigurationFoundationSnapshot,
  type ConfigurationFoundationEntrySnapshot,
  type ConfigurationFoundationSnapshot,
} from './services'
import { hasPhase5PermissionCompatibility } from './permission-compat'

type SystemSettingRecord = Prisma.SystemSettingGetPayload<Record<string, never>>
type UnitSettingRecord = Prisma.UnitSettingGetPayload<Record<string, never>>
type ConfigurationApprovalRecord = Prisma.ConfigurationApprovalGetPayload<Record<string, never>>
type ConfigurationPublishRecord = Prisma.ConfigurationPublishGetPayload<Record<string, never>>
type UnitRecord = Prisma.UnitGetPayload<Record<string, never>>

export interface ConfigurationSerializableSnapshot {
  branding: Awaited<ReturnType<typeof captureLiveBrandingState>>['serializable']
  generatedAt: string
  integrations: Awaited<ReturnType<typeof captureLiveIntegrationState>>
  settings: {
    systemSettings: Array<{
      active: boolean
      category: ConfigurationCategory
      description: string | null
      key: string
      scope: ConfigurationScope
      unitId: string | null
      valueJson: Prisma.JsonValue | null
      valueText: string | null
      valueType: ConfigurationValueType
    }>
    unitSettings: Array<{
      description: string | null
      key: string
      unitId: string
      value: string
    }>
  }
}

export interface ConfigurationCenterSnapshot {
  aiAdministrative: {
    modules: Array<{
      desiredEnabled: string | null
      desiredQuota: string | null
      drift: 'ALIGNED' | 'DRIFTED' | 'ENV_DISABLED'
      envEnabled: string | null
      envQuota: string | null
      key: 'IMAGE_ANALYSIS' | 'PREDICTIVE_INSIGHTS' | 'VIRTUAL_ASSISTANT'
      label: string
    }>
  }
  branding: Awaited<ReturnType<typeof getBrandingAdminSnapshot>>
  foundation: ConfigurationFoundationSnapshot
  generalSettings: ConfigurationFoundationEntrySnapshot[]
  integrations: Awaited<ReturnType<typeof getIntegrationAdminSnapshot>>
  publishing: {
    approvalRequired: boolean
    currentLiveHash: string
    currentLiveSnapshot: ConfigurationSerializableSnapshot
    driftDetected: boolean
    latestPublishedHash: string | null
    latestPublishedVersion: number | null
    pendingApprovals: Array<{
      createdAt: Date
      id: string
      impactLevel: ConfigurationImpactLevel
      status: string
      summary: string | null
    }>
    publishHistory: Array<{
      createdAt: Date
      id: string
      rollbackOfPublishId: string | null
      snapshotHash: string
      summary: string | null
      version: number
    }>
  }
  selectedUnit: {
    id: string | null
    name: string | null
  }
  unitOptions: Array<{
    active: boolean
    id: string
    name: string
  }>
  unitSettings: ConfigurationFoundationEntrySnapshot[]
}

const GENERAL_SETTING_KEYS = [
  'tenant.identity.company_name',
  'tenant.identity.public_name',
  'tenant.contact.support_email',
  'tenant.contact.support_phone',
  'security.configuration.approval_required_for_critical_changes',
  'branding.primary_domain',
] as const

const UNIT_SETTING_KEYS = [
  'agenda.cancelamento_antecedencia_horas',
  'agenda.reagendamento_antecedencia_horas',
  'agenda.tolerancia_no_show_minutos',
  'agenda.pre_check_in_antecedencia_horas',
  'crm.inatividade_dias_padrao',
  'crm.review_booster_atraso_horas_padrao',
  'crm.pos_servico_atraso_horas_padrao',
  'financeiro.deposito_expiracao_minutos_padrao',
  'financeiro.credito_validade_dias_padrao',
  'integracoes.eventos_retencao_dias',
] as const

const AI_ACTUAL_DESIRED_MAP = [
  {
    desiredEnabledKey: 'ai.image_analysis.desired_enabled',
    desiredQuotaKey: 'ai.image_analysis.desired_base_quota',
    envEnabledKey: 'ai.image_analysis.enabled',
    key: 'IMAGE_ANALYSIS' as const,
    label: 'Analise de imagem',
  },
  {
    desiredEnabledKey: 'ai.predictive_insights.desired_enabled',
    desiredQuotaKey: 'ai.predictive_insights.desired_base_quota',
    envEnabledKey: 'ai.predictive_insights.enabled',
    key: 'PREDICTIVE_INSIGHTS' as const,
    label: 'Insights preditivos',
  },
  {
    desiredEnabledKey: 'ai.virtual_assistant.desired_enabled',
    desiredQuotaKey: 'ai.virtual_assistant.desired_base_quota',
    envEnabledKey: 'ai.virtual_assistant.enabled',
    key: 'VIRTUAL_ASSISTANT' as const,
    label: 'Assistente virtual',
  },
] as const

export function canPublishConfiguration(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, [
    'configuracao.publicar',
    'white_label.publicar',
  ])
}

export function canApproveConfiguration(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, ['configuracao.aprovar'])
}

export async function getConfigurationCenterSnapshot(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): Promise<ConfigurationCenterSnapshot> {
  if (!canReadConfigurationFoundation(actor)) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'Missing permission for the Phase 5 configuration center.',
    )
  }

  const [foundation, unitOptions, integrations, branding, liveSnapshot, approvals, publishes] =
    await Promise.all([
      getConfigurationFoundationSnapshot(actor, {
        requestedUnitId: requestedUnitId ?? null,
      }),
      listConfigurationUnitOptions(actor),
      getIntegrationAdminSnapshot(actor, requestedUnitId ?? null),
      getBrandingAdminSnapshot(actor, requestedUnitId ?? null),
      captureCurrentConfigurationSnapshot(),
      listConfigurationApprovals(),
      listConfigurationPublishes(),
    ])

  const latestPublished = publishes[0] ?? null
  const latestPublishedHash = latestPublished?.snapshotHash ?? null
  const currentLiveHash = hashConfigurationSnapshot(liveSnapshot)

  return {
    aiAdministrative: {
      modules: AI_ACTUAL_DESIRED_MAP.map((mapping) => {
        const envEnabled = findEntryValue(foundation.entries, mapping.envEnabledKey)
        const desiredEnabled = findEntryValue(foundation.entries, mapping.desiredEnabledKey)
        const envQuota = findEntryValue(
          foundation.entries,
          mapping.envEnabledKey.replace('.enabled', '.base_quota'),
        )
        const desiredQuota = findEntryValue(foundation.entries, mapping.desiredQuotaKey)

        return {
          desiredEnabled,
          desiredQuota,
          drift:
            envEnabled === 'false'
              ? 'ENV_DISABLED'
              : envEnabled === desiredEnabled && (envQuota ?? null) === (desiredQuota ?? null)
                ? 'ALIGNED'
                : 'DRIFTED',
          envEnabled,
          envQuota,
          key: mapping.key,
          label: mapping.label,
        }
      }),
    },
    branding,
    foundation,
    generalSettings: foundation.entries.filter((entry) =>
      GENERAL_SETTING_KEYS.includes(entry.key as (typeof GENERAL_SETTING_KEYS)[number]),
    ),
    integrations,
    publishing: {
      approvalRequired:
        findEntryValue(
          foundation.entries,
          'security.configuration.approval_required_for_critical_changes',
        ) !== 'false',
      currentLiveHash,
      currentLiveSnapshot: liveSnapshot,
      driftDetected: latestPublishedHash !== currentLiveHash,
      latestPublishedHash,
      latestPublishedVersion: latestPublished?.version ?? null,
      pendingApprovals: approvals.map((approval) => ({
        createdAt: approval.createdAt,
        id: approval.id,
        impactLevel: approval.impactLevel,
        status: approval.status,
        summary: approval.summary,
      })),
      publishHistory: publishes.map((publish) => ({
        createdAt: publish.createdAt,
        id: publish.id,
        rollbackOfPublishId: publish.rollbackOfPublishId,
        snapshotHash: publish.snapshotHash,
        summary: publish.summary,
        version: publish.version,
      })),
    },
    selectedUnit: {
      id: foundation.multiUnit.diagnosticUnitId,
      name:
        unitOptions.find((unit) => unit.id === foundation.multiUnit.diagnosticUnitId)?.name ??
        null,
    },
    unitOptions,
    unitSettings: foundation.entries.filter((entry) =>
      UNIT_SETTING_KEYS.includes(entry.key as (typeof UNIT_SETTING_KEYS)[number]),
    ),
  }
}

export async function updateGeneralConfiguration(
  actor: AuthenticatedUserData,
  input: {
    companyName: string
    publicName: string
    supportEmail?: string | null
    supportPhone?: string | null
  },
) {
  assertCanEditConfiguration(actor)

  return prisma.$transaction(async (tx) => {
    await Promise.all([
      upsertSystemConfigurationEntry(tx, actor, 'tenant.identity.company_name', input.companyName),
      upsertSystemConfigurationEntry(tx, actor, 'tenant.identity.public_name', input.publicName),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'tenant.contact.support_email',
        input.supportEmail ?? null,
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'tenant.contact.support_phone',
        input.supportPhone ?? null,
      ),
    ])
  }).catch(handleConfigurationWriteError('phase 5 general configuration'))
}

export async function updateUnitConfiguration(
  actor: AuthenticatedUserData,
  input: {
    cancellationWindowHours: number
    clientCreditExpirationDays: number
    crmInactivityDays: number
    crmPostServiceDelayHours: number
    crmReviewDelayHours: number
    depositExpirationMinutes: number
    integrationRetentionDays: number
    noShowToleranceMinutes: number
    preCheckInWindowHours: number
    rescheduleWindowHours: number
    unitId: string
  },
) {
  assertCanEditConfiguration(actor)
  assertCanWriteUnitSetting(actor, input.unitId)

  return prisma.$transaction(async (tx) => {
    await Promise.all([
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'agenda.cancelamento_antecedencia_horas',
        input.unitId,
        input.cancellationWindowHours.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'agenda.reagendamento_antecedencia_horas',
        input.unitId,
        input.rescheduleWindowHours.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'agenda.tolerancia_no_show_minutos',
        input.unitId,
        input.noShowToleranceMinutes.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'agenda.pre_check_in_antecedencia_horas',
        input.unitId,
        input.preCheckInWindowHours.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'crm.inatividade_dias_padrao',
        input.unitId,
        input.crmInactivityDays.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'crm.review_booster_atraso_horas_padrao',
        input.unitId,
        input.crmReviewDelayHours.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'crm.pos_servico_atraso_horas_padrao',
        input.unitId,
        input.crmPostServiceDelayHours.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'financeiro.deposito_expiracao_minutos_padrao',
        input.unitId,
        input.depositExpirationMinutes.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'financeiro.credito_validade_dias_padrao',
        input.unitId,
        input.clientCreditExpirationDays.toString(),
      ),
      upsertUnitConfigurationEntry(
        tx,
        actor,
        'integracoes.eventos_retencao_dias',
        input.unitId,
        input.integrationRetentionDays.toString(),
      ),
    ])
  }).catch(handleConfigurationWriteError('phase 5 unit configuration'))
}

export async function updateAiAdministrativeConfiguration(
  actor: AuthenticatedUserData,
  input: {
    assistantDesiredEnabled: boolean
    assistantDesiredQuota?: number | null
    assistantExperienceMode: string
    imageAnalysisDesiredEnabled: boolean
    imageAnalysisDesiredQuota?: number | null
    predictiveDesiredEnabled: boolean
    predictiveDesiredQuota?: number | null
  },
) {
  assertCanEditConfiguration(actor)

  return prisma.$transaction(async (tx) => {
    await Promise.all([
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'ai.virtual_assistant.desired_enabled',
        booleanToString(input.assistantDesiredEnabled),
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'ai.virtual_assistant.desired_base_quota',
        optionalIntegerToString(input.assistantDesiredQuota),
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'portal.tutor.assistant_experience_mode',
        input.assistantExperienceMode,
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'ai.image_analysis.desired_enabled',
        booleanToString(input.imageAnalysisDesiredEnabled),
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'ai.image_analysis.desired_base_quota',
        optionalIntegerToString(input.imageAnalysisDesiredQuota),
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'ai.predictive_insights.desired_enabled',
        booleanToString(input.predictiveDesiredEnabled),
      ),
      upsertSystemConfigurationEntry(
        tx,
        actor,
        'ai.predictive_insights.desired_base_quota',
        optionalIntegerToString(input.predictiveDesiredQuota),
      ),
    ])
  }).catch(handleConfigurationWriteError('phase 5 AI administration'))
}

export async function requestConfigurationPublish(
  actor: AuthenticatedUserData,
  summary?: string | null,
) {
  if (!canPublishConfiguration(actor)) {
    throw new AppError('FORBIDDEN', 403, 'Missing permission: configuracao.publicar.')
  }

  const liveSnapshot = await captureCurrentConfigurationSnapshot()
  const liveHash = hashConfigurationSnapshot(liveSnapshot)
  const latestPublished = await getLatestConfigurationPublish()
  const latestPublishedSnapshot = parsePublishedConfigurationSnapshot(
    latestPublished?.snapshotJson ?? null,
  )
  const diff = compareConfigurationSnapshots(liveSnapshot, latestPublishedSnapshot)

  if (!diff.hasChanges) {
    throw new AppError(
      'CONFLICT',
      409,
      'There are no unpublished Phase 5 configuration changes to publish.',
    )
  }

  const approvalRequired = await isApprovalRequiredForCriticalChanges()

  if (approvalRequired && diff.hasCriticalChanges) {
    return prisma.configurationApproval
      .create({
        data: {
          diffJson: diff,
          impactLevel: diff.impactLevel,
          reason: null,
          requestedByUserId: actor.id,
          snapshotJson: liveSnapshot as unknown as Prisma.InputJsonValue,
          status: 'PENDING',
          summary: summary ?? null,
        },
      })
      .catch(handleConfigurationWriteError('phase 5 configuration approval'))
  }

  return createConfigurationPublishRecord(actor, liveSnapshot, liveHash, {
    approvalId: null,
    rollbackOfPublishId: null,
    summary: summary ?? null,
  })
}

export async function decideConfigurationApproval(
  actor: AuthenticatedUserData,
  input: {
    approvalId: string
    decision: 'APPROVED' | 'CANCELED' | 'REJECTED'
    reason?: string | null
  },
) {
  if (!canApproveConfiguration(actor)) {
    throw new AppError('FORBIDDEN', 403, 'Missing permission: configuracao.aprovar.')
  }

  const approval = await prisma.configurationApproval.findUnique({
    where: {
      id: input.approvalId,
    },
  })

  if (!approval) {
    throw new AppError('NOT_FOUND', 404, 'Configuration approval request not found.')
  }

  if (approval.status !== 'PENDING') {
    throw new AppError(
      'CONFLICT',
      409,
      'Only pending configuration approvals can be decided.',
    )
  }

  if (input.decision === 'APPROVED') {
    return prisma.$transaction(async (tx) => {
      const updatedApproval = await tx.configurationApproval.update({
        where: {
          id: approval.id,
        },
        data: {
          decidedAt: new Date(),
          decidedByUserId: actor.id,
          reason: input.reason ?? null,
          status: 'APPROVED',
        },
      })

      const snapshot = parsePublishedConfigurationSnapshot(approval.snapshotJson)

      if (!snapshot) {
        throw new AppError(
          'UNPROCESSABLE_ENTITY',
          422,
          'The approval request does not contain a valid configuration snapshot.',
        )
      }

      const snapshotHash = hashConfigurationSnapshot(snapshot)
      return createConfigurationPublishRecord(actor, snapshot, snapshotHash, {
        approvalId: updatedApproval.id,
        rollbackOfPublishId: null,
        summary: updatedApproval.summary,
        transaction: tx,
      })
    }).catch(handleConfigurationWriteError('phase 5 configuration approval decision'))
  }

  return prisma.configurationApproval
    .update({
      where: {
        id: approval.id,
      },
      data: {
        decidedAt: new Date(),
        decidedByUserId: actor.id,
        reason: input.reason ?? null,
        status: input.decision,
      },
    })
    .catch(handleConfigurationWriteError('phase 5 configuration approval decision'))
}

export async function rollbackConfigurationPublish(
  actor: AuthenticatedUserData,
  input: {
    publishId: string
    summary?: string | null
  },
) {
  if (!canPublishConfiguration(actor)) {
    throw new AppError('FORBIDDEN', 403, 'Missing permission: configuracao.publicar.')
  }

  const publish = await prisma.configurationPublish.findUnique({
    where: {
      id: input.publishId,
    },
  })

  if (!publish) {
    throw new AppError('NOT_FOUND', 404, 'Configuration publish version not found.')
  }

  const snapshot = parsePublishedConfigurationSnapshot(publish.snapshotJson)

  if (!snapshot) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'The selected publish version does not contain a valid configuration snapshot.',
    )
  }

  const snapshotHash = hashConfigurationSnapshot(snapshot)
  return createConfigurationPublishRecord(actor, snapshot, snapshotHash, {
    approvalId: null,
    rollbackOfPublishId: publish.id,
    summary: input.summary ?? `Rollback para a versao ${publish.version}.`,
  })
}

async function captureCurrentConfigurationSnapshot(): Promise<ConfigurationSerializableSnapshot> {
  const [systemSettings, unitSettings, branding, integrations] = await Promise.all([
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.systemSetting.findMany({
          orderBy: [{ scope: 'asc' }, { unitId: 'asc' }, { key: 'asc' }],
        }),
      async () => [] as SystemSettingRecord[],
    ),
    prisma.unitSetting.findMany({
      orderBy: [{ unitId: 'asc' }, { key: 'asc' }],
    }),
    captureLiveBrandingState(),
    captureLiveIntegrationState(),
  ])

  return {
    branding: branding.serializable,
    generatedAt: new Date().toISOString(),
    integrations,
    settings: {
      systemSettings: systemSettings.map((setting) => ({
        active: setting.active,
        category: setting.category,
        description: setting.description,
        key: setting.key,
        scope: setting.scope,
        unitId: setting.unitId,
        valueJson: setting.valueJson,
        valueText: setting.valueText,
        valueType: setting.valueType,
      })),
      unitSettings: unitSettings.map((setting) => ({
        description: setting.description,
        key: setting.key,
        unitId: setting.unitId,
        value: setting.value,
      })),
    },
  }
}

async function listConfigurationUnitOptions(actor: AuthenticatedUserData) {
  const units = await prisma.unit.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  if (hasPermission(actor, 'multiunidade.global.visualizar')) {
    return units.map(toUnitOption)
  }

  return units.filter((unit) => unit.id === actor.unitId).map(toUnitOption)
}

async function listConfigurationApprovals() {
  return withPrismaSchemaCompatibilityFallback(
    async () =>
      prisma.configurationApproval.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    async () => [] as ConfigurationApprovalRecord[],
  )
}

async function listConfigurationPublishes() {
  return withPrismaSchemaCompatibilityFallback(
    async () =>
      prisma.configurationPublish.findMany({
        orderBy: {
          version: 'desc',
        },
        take: 10,
      }),
    async () => [] as ConfigurationPublishRecord[],
  )
}

async function getLatestConfigurationPublish() {
  return withPrismaSchemaCompatibilityFallback(
    async () =>
      prisma.configurationPublish.findFirst({
        orderBy: {
          version: 'desc',
        },
      }),
    async () => null as ConfigurationPublishRecord | null,
  )
}

async function upsertSystemConfigurationEntry(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedUserData,
  key: string,
  value: string | null,
) {
  const definition = getRequiredConfigurationDefinition(key)
  const valueKind = definition.valueKind as ConfigurationRegistryValueKind

  const existingSetting = await tx.systemSetting.findFirst({
    where: {
      key,
      scope: definition.scope,
      unitId: null,
    },
  })

  const data = {
    active: true,
    category: definition.category,
    description: definition.description,
    key,
    scope: definition.scope,
    updatedByUserId: actor.id,
    valueJson: resolveSystemSettingJsonValue(valueKind, value),
    valueText: valueKind === 'JSON' ? null : value,
    valueType: valueKind === 'JSON' ? 'JSON' : normalizeValueType(valueKind),
  } satisfies Prisma.SystemSettingUncheckedCreateInput

  const setting = existingSetting
    ? await tx.systemSetting.update({
        where: {
          id: existingSetting.id,
        },
        data,
      })
    : await tx.systemSetting.create({
        data,
      })

  await writeConfigurationChange(tx, {
    afterValue: value,
    beforeValue:
      existingSetting?.valueJson ??
      existingSetting?.valueText ??
      getDefinitionFallbackValue(definition),
    category: definition.category,
    changeType: existingSetting ? 'UPDATED' : 'CREATED',
    changedByUserId: actor.id,
    impactLevel: definition.criticalChange ? 'HIGH' : 'LOW',
    key,
    scope: definition.scope,
    summary: `Atualizacao central de ${definition.label}.`,
    systemSettingId: setting.id,
  })
}

async function upsertUnitConfigurationEntry(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedUserData,
  key: string,
  unitId: string,
  value: string,
) {
  const definition = getRequiredConfigurationDefinition(key)

  if (definition.source !== 'UNIT_SETTING') {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `Configuration entry ${key} is not mapped to UnitSetting.`,
    )
  }

  const existingSetting = await tx.unitSetting.findUnique({
    where: {
      unitId_key: {
        key: definition.unitSettingKey ?? key,
        unitId,
      },
    },
  })

  const setting = existingSetting
    ? await tx.unitSetting.update({
        where: {
          unitId_key: {
            key: definition.unitSettingKey ?? key,
            unitId,
          },
        },
        data: {
          description: definition.description,
          value,
        },
      })
    : await tx.unitSetting.create({
        data: {
          description: definition.description,
          key: definition.unitSettingKey ?? key,
          unitId,
          value,
        },
      })

  await writeConfigurationChange(tx, {
    afterValue: value,
    beforeValue: existingSetting?.value ?? getDefinitionFallbackValue(definition),
    category: definition.category,
    changeType: existingSetting ? 'UPDATED' : 'CREATED',
    changedByUserId: actor.id,
    impactLevel: definition.criticalChange ? 'HIGH' : 'LOW',
    key,
    scope: definition.scope,
    summary: `Atualizacao por unidade de ${definition.label}.`,
    systemSettingId: null,
    unitId: setting.unitId,
  })
}

async function createConfigurationPublishRecord(
  actor: AuthenticatedUserData,
  snapshot: ConfigurationSerializableSnapshot,
  snapshotHash: string,
  input: {
    approvalId: string | null
    rollbackOfPublishId: string | null
    summary?: string | null
    transaction?: Prisma.TransactionClient
  },
) {
  const writer = input.transaction ?? prisma
  const latestPublished = await withPrismaSchemaCompatibilityFallback(
    async () =>
      writer.configurationPublish.findFirst({
        orderBy: {
          version: 'desc',
        },
      }),
    async () => null as ConfigurationPublishRecord | null,
  )

  const publish = await writer.configurationPublish.create({
    data: {
      approvalId: input.approvalId,
      publishedByUserId: actor.id,
      rollbackOfPublishId: input.rollbackOfPublishId,
      snapshotHash,
      snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      summary: input.summary ?? null,
      version: (latestPublished?.version ?? 0) + 1,
    },
  })

  await writeConfigurationChange(writer, {
    afterValue: {
      publishId: publish.id,
      snapshotHash,
      version: publish.version,
    },
    category: 'SECURITY_ACCESS',
    changeType: input.rollbackOfPublishId ? 'ROLLED_BACK' : 'PUBLISHED',
    changedByUserId: actor.id,
    impactLevel: 'CRITICAL',
    key: 'configuration.publish.runtime',
    scope: 'SYSTEM_GLOBAL',
    summary:
      input.summary ??
      (input.rollbackOfPublishId
        ? `Rollback publicado para a versao ${publish.version}.`
        : `Publicacao administrativa da configuracao na versao ${publish.version}.`),
  })

  return publish
}

async function isApprovalRequiredForCriticalChanges() {
  const existingSetting = await withPrismaSchemaCompatibilityFallback(
    async () =>
      prisma.systemSetting.findFirst({
        where: {
          key: 'security.configuration.approval_required_for_critical_changes',
          scope: 'SYSTEM_GLOBAL',
          unitId: null,
        },
      }),
    async () => null as SystemSettingRecord | null,
  )

  return existingSetting?.valueText !== 'false'
}

function compareConfigurationSnapshots(
  live: ConfigurationSerializableSnapshot,
  published: ConfigurationSerializableSnapshot | null,
) {
  if (!published) {
    return {
      changedKeys: ['configuration.bootstrap'],
      fromVersion: null,
      hasChanges: true,
      hasCriticalChanges: true,
      impactLevel: 'CRITICAL' as ConfigurationImpactLevel,
      criticalKeys: ['configuration.bootstrap'],
    }
  }

  const changedKeys = new Set<string>()
  const criticalKeys = new Set<string>()

  const publishedSystemSettings = new Map(
    published.settings.systemSettings.map((setting) => [
      `${setting.scope}:${setting.unitId ?? 'global'}:${setting.key}`,
      JSON.stringify(setting),
    ]),
  )
  const liveSystemSettings = new Map(
    live.settings.systemSettings.map((setting) => [
      `${setting.scope}:${setting.unitId ?? 'global'}:${setting.key}`,
      JSON.stringify(setting),
    ]),
  )

  for (const [compoundKey, serializedValue] of liveSystemSettings) {
    if (publishedSystemSettings.get(compoundKey) !== serializedValue) {
      const rawKey = compoundKey.split(':').slice(2).join(':')
      changedKeys.add(rawKey)
      if (getConfigurationRegistryDefinition(rawKey)?.criticalChange) {
        criticalKeys.add(rawKey)
      }
    }
  }

  const publishedUnitSettings = new Map(
    published.settings.unitSettings.map((setting) => [
      `${setting.unitId}:${setting.key}`,
      JSON.stringify(setting),
    ]),
  )
  const liveUnitSettings = new Map(
    live.settings.unitSettings.map((setting) => [
      `${setting.unitId}:${setting.key}`,
      JSON.stringify(setting),
    ]),
  )

  for (const [compoundKey, serializedValue] of liveUnitSettings) {
    if (publishedUnitSettings.get(compoundKey) !== serializedValue) {
      const rawKey = compoundKey.split(':').slice(1).join(':')
      changedKeys.add(rawKey)
      if (getConfigurationRegistryDefinition(rawKey)?.criticalChange) {
        criticalKeys.add(rawKey)
      }
    }
  }

  if (JSON.stringify(live.branding) !== JSON.stringify(published.branding)) {
    changedKeys.add('branding.runtime')
    criticalKeys.add('branding.runtime')
  }

  if (JSON.stringify(live.integrations) !== JSON.stringify(published.integrations)) {
    changedKeys.add('integrations.runtime')
    criticalKeys.add('integrations.runtime')
  }

  return {
    changedKeys: [...changedKeys],
    criticalKeys: [...criticalKeys],
    fromVersion: null,
    hasChanges: changedKeys.size > 0,
    hasCriticalChanges: criticalKeys.size > 0,
    impactLevel:
      criticalKeys.size > 0
        ? ('CRITICAL' as ConfigurationImpactLevel)
        : ('LOW' as ConfigurationImpactLevel),
  }
}

function parsePublishedConfigurationSnapshot(snapshotJson: Prisma.JsonValue | null) {
  if (!snapshotJson || typeof snapshotJson !== 'object' || Array.isArray(snapshotJson)) {
    return null
  }

  return snapshotJson as unknown as ConfigurationSerializableSnapshot
}

function hashConfigurationSnapshot(snapshot: ConfigurationSerializableSnapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

function toUnitOption(unit: UnitRecord) {
  return {
    active: unit.active,
    id: unit.id,
    name: unit.name,
  }
}

function assertCanEditConfiguration(actor: AuthenticatedUserData) {
  if (canEditConfigurationFoundation(actor)) {
    return
  }

  throw new AppError('FORBIDDEN', 403, 'Missing permission: configuracao.central.editar.')
}

function assertCanWriteUnitSetting(actor: AuthenticatedUserData, unitId: string) {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'STRUCTURAL_WRITE',
    ownership: createLocalUnitOwnershipBinding(unitId),
    requestedUnitId: unitId,
  })

  if (!decision.allowed) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'User is not allowed to edit unit settings in the current unit context.',
    )
  }
}

function getRequiredConfigurationDefinition(key: string) {
  const definition = getConfigurationRegistryDefinition(key)

  if (!definition) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `Configuration registry entry not found: ${key}.`,
    )
  }

  if (definition.mutability !== 'ADMIN_EDITABLE') {
    throw new AppError(
      'FORBIDDEN',
      403,
      `Configuration entry ${key} is not editable in the administrative center.`,
    )
  }

  return definition
}

function normalizeValueType(valueKind: string): ConfigurationValueType {
  switch (valueKind) {
    case 'BOOLEAN':
      return 'BOOLEAN'
    case 'INTEGER':
      return 'INTEGER'
    case 'JSON':
      return 'JSON'
    case 'STRING':
    default:
      return 'STRING'
  }
}

function resolveSystemSettingJsonValue(
  valueKind: ConfigurationRegistryValueKind,
  value: string | null,
) {
  if (valueKind !== 'JSON') {
    return Prisma.JsonNull
  }

  if (value === null || value.trim() === '') {
    return Prisma.JsonNull
  }

  return JSON.parse(value) as Prisma.InputJsonValue
}

function getDefinitionFallbackValue(definition: (typeof configurationRegistry)[number]) {
  return 'fallbackValue' in definition ? definition.fallbackValue ?? null : null
}

function findEntryValue(entries: ConfigurationFoundationEntrySnapshot[], key: string) {
  return entries.find((entry) => entry.key === key)?.currentValue ?? null
}

function booleanToString(value: boolean) {
  return value ? 'true' : 'false'
}

function optionalIntegerToString(value: number | null | undefined) {
  return value === null || value === undefined ? null : value.toString()
}

function handleConfigurationWriteError(surface: string) {
  return (error: unknown) => {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError(surface)
    }

    throw error
  }
}
