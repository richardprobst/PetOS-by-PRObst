import { Prisma } from '@prisma/client'
import type {
  ConfigurationCategory,
  ConfigurationChangeType,
  ConfigurationImpactLevel,
  ConfigurationScope,
} from '@prisma/client'
import { writeAuditLog, type AuditWriter } from '@/server/audit/logging'

type ConfigurationChangeWriter = AuditWriter & {
  configurationChange: {
    create(args: {
      data: Prisma.ConfigurationChangeUncheckedCreateInput
    }): PromiseLike<unknown>
  }
}

export interface WriteConfigurationChangeInput {
  afterValue?: unknown
  beforeValue?: unknown
  category: ConfigurationCategory
  changeType: ConfigurationChangeType
  changedByUserId?: string | null
  impactLevel?: ConfigurationImpactLevel
  key: string
  requestId?: string | null
  scope: ConfigurationScope
  sensitive?: boolean
  summary?: string | null
  systemSettingId?: string | null
  unitId?: string | null
}

function redactIfSensitive(value: unknown, sensitive: boolean) {
  if (!sensitive) {
    return value
  }

  if (value === null || value === undefined) {
    return value
  }

  return {
    redacted: true,
  }
}

function toNullableJsonValue(value: unknown) {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue)
}

export async function writeConfigurationChange(
  writer: ConfigurationChangeWriter,
  input: WriteConfigurationChangeInput,
) {
  const beforeValue = redactIfSensitive(input.beforeValue, input.sensitive === true)
  const afterValue = redactIfSensitive(input.afterValue, input.sensitive === true)
  const impactLevel = input.impactLevel ?? 'LOW'

  await writer.configurationChange.create({
    data: {
      afterValue: toNullableJsonValue(afterValue),
      beforeValue: toNullableJsonValue(beforeValue),
      category: input.category,
      changeType: input.changeType,
      changedByUserId: input.changedByUserId ?? null,
      impactLevel,
      key: input.key,
      requestId: input.requestId ?? null,
      scope: input.scope,
      summary: input.summary ?? null,
      systemSettingId: input.systemSettingId ?? null,
      unitId: input.unitId ?? null,
    },
  })

  await writeAuditLog(writer, {
    action: `configuration.${input.changeType.toLowerCase()}`,
    details: {
      afterValue,
      beforeValue,
      category: input.category,
      impactLevel,
      key: input.key,
      requestId: input.requestId ?? null,
      scope: input.scope,
      sensitive: input.sensitive === true,
      summary: input.summary ?? null,
      systemSettingId: input.systemSettingId ?? null,
    },
    entityId: input.systemSettingId ?? null,
    entityName: 'SystemSetting',
    unitId: input.unitId ?? null,
    userId: input.changedByUserId ?? null,
  })
}
