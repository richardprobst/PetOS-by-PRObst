import { Prisma } from '@prisma/client'
import type {
  ConfigurationScope,
  IntegrationConnectionStatus,
  IntegrationHealthStatus,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
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
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import { writeAuditLog } from '@/server/audit/logging'
import {
  getIntegrationCatalogEntry,
  maskSecretValue,
  type IntegrationConnectionSnapshot,
  type IntegrationProviderKey,
} from './domain'
import {
  encryptAdministrativeSecret,
  getIntegrationSecretMasterKeySource,
} from './secrets'
import { hasPhase5PermissionCompatibility } from '@/features/configuration/permission-compat'

const CONFIGURATION_READ_PERMISSIONS = [
  'configuracao.central.visualizar',
  'configuracao.visualizar',
]

const CONFIGURATION_EDIT_PERMISSIONS = [
  'configuracao.central.editar',
  'configuracao.editar',
]

type IntegrationConnectionRecord = Prisma.IntegrationConnectionGetPayload<{
  include: {
    secrets: true
    unit: true
  }
}>

type IntegrationStorageStatus = 'AVAILABLE' | 'MIGRATION_PENDING'

export interface IntegrationAdminSnapshot {
  connections: IntegrationConnectionSnapshot[]
  masterKeySource: 'CONFIGURATION_SECRET_MASTER_KEY' | 'NEXTAUTH_SECRET_FALLBACK'
  permissions: {
    canEdit: boolean
    canEditSecrets: boolean
    canTest: boolean
  }
  storage: {
    connections: IntegrationStorageStatus
    secrets: IntegrationStorageStatus
  }
}

export interface IntegrationSerializableSnapshot {
  connections: Array<{
    active: boolean
    configJson: unknown
    displayName: string
    environmentJson: unknown
    healthStatus: IntegrationHealthStatus
    id: string
    lastError: string | null
    lastTestedAt: string | null
    providerKey: string
    scope: ConfigurationScope
    secretMasks: Array<{
      key: string
      valueMask: string
    }>
    status: IntegrationConnectionStatus
    unitId: string | null
  }>
}

export function canReadIntegrationAdministration(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, CONFIGURATION_READ_PERMISSIONS)
}

export function canEditIntegrationAdministration(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, CONFIGURATION_EDIT_PERMISSIONS)
}

export function canEditIntegrationSecrets(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, ['configuracao.segredo.editar'])
}

export function canTestIntegrationConnections(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, ['configuracao.integracao.testar'])
}

export async function getIntegrationAdminSnapshot(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): Promise<IntegrationAdminSnapshot> {
  assertCanReadIntegrationAdministration(actor)

  let connectionsStorage: IntegrationStorageStatus = 'AVAILABLE'
  let secretsStorage: IntegrationStorageStatus = 'AVAILABLE'

  const connections = await withPrismaSchemaCompatibilityFallback(
    async () =>
      prisma.integrationConnection.findMany({
        where: buildAccessibleIntegrationWhere(actor, requestedUnitId ?? null),
        include: {
          secrets: {
            orderBy: {
              updatedAt: 'desc',
            },
          },
          unit: true,
        },
        orderBy: [{ scope: 'asc' }, { providerKey: 'asc' }],
      }),
    async () => {
      connectionsStorage = 'MIGRATION_PENDING'
      secretsStorage = 'MIGRATION_PENDING'
      return [] as IntegrationConnectionRecord[]
    },
  )

  const connectionSnapshots = connections.map((connection) =>
    createIntegrationConnectionSnapshot(connection),
  )

  return {
    connections: connectionSnapshots,
    masterKeySource: getIntegrationSecretMasterKeySource(),
    permissions: {
      canEdit: canEditIntegrationAdministration(actor),
      canEditSecrets: canEditIntegrationSecrets(actor),
      canTest: canTestIntegrationConnections(actor),
    },
    storage: {
      connections: connectionsStorage,
      secrets: secretsStorage,
    },
  }
}

export async function captureLiveIntegrationState() {
  return withPrismaSchemaCompatibilityFallback(
    async () => {
      const connections = await prisma.integrationConnection.findMany({
        include: {
          secrets: {
            where: {
              active: true,
            },
          },
        },
        orderBy: [{ scope: 'asc' }, { providerKey: 'asc' }],
      })

      return {
        connections: connections.map((connection) => ({
          active: connection.active,
          configJson: connection.configJson,
          displayName: connection.displayName,
          environmentJson: connection.environmentJson,
          healthStatus: connection.healthStatus,
          id: connection.id,
          lastError: connection.lastError,
          lastTestedAt: connection.lastTestedAt
            ? connection.lastTestedAt.toISOString()
            : null,
          providerKey: connection.providerKey,
          scope: connection.scope,
          secretMasks: connection.secrets.map((secret) => ({
            key: secret.secretKey,
            valueMask: secret.valueMask,
          })),
          status: connection.status,
          unitId: connection.unitId,
        })),
      } satisfies IntegrationSerializableSnapshot
    },
    async () =>
      ({
        connections: [],
      }) satisfies IntegrationSerializableSnapshot,
  )
}

export async function upsertIntegrationConnection(
  actor: AuthenticatedUserData,
  input: {
    configJson?: string | null
    connectionId?: string | null
    displayName: string
    providerKey: IntegrationProviderKey
    scope: 'SYSTEM_GLOBAL' | 'UNIT'
    status: IntegrationConnectionStatus
    unitId?: string | null
  },
) {
  assertCanEditIntegrationAdministration(actor)
  assertCanEditIntegrationScope(actor, input.scope, input.unitId ?? null)

  const catalogEntry = getIntegrationCatalogEntry(input.providerKey)

  if (!catalogEntry) {
    throw new AppError('BAD_REQUEST', 400, 'Unsupported integration provider.')
  }

  if (!catalogEntry.allowedScopes.includes(input.scope)) {
    throw new AppError(
      'BAD_REQUEST',
      400,
      'The selected integration provider does not support this configuration scope.',
    )
  }

  const normalizedConfig = normalizeJsonString(input.configJson)
  const resolvedUnitId = input.scope === 'UNIT' ? input.unitId ?? null : null

  try {
    return await prisma.$transaction(async (tx) => {
      const existingConnection = input.connectionId
        ? await tx.integrationConnection.findUnique({
            where: {
              id: input.connectionId,
            },
          })
        : await tx.integrationConnection.findFirst({
            where: {
              providerKey: input.providerKey,
              scope: input.scope,
              unitId: resolvedUnitId,
            },
          })

      if (input.connectionId && !existingConnection) {
        throw new AppError('NOT_FOUND', 404, 'Integration connection not found.')
      }

      if (existingConnection) {
        assertCanEditIntegrationScope(
          actor,
          existingConnection.scope,
          existingConnection.unitId,
        )
        assertExistingIntegrationScopeMatchesTarget(
          existingConnection,
          input.scope,
          resolvedUnitId,
        )
      }

      const data = {
        active: input.status !== 'DISABLED',
        configJson: toNullableInputJsonValue(normalizedConfig),
        displayName: input.displayName.trim(),
        healthStatus: resolveHealthStatusFromConfiguration(normalizedConfig),
        lastError: null,
        providerKey: input.providerKey,
        scope: input.scope,
        status: input.status,
        unitId: resolvedUnitId,
        updatedByUserId: actor.id,
      } as const

      const connection = existingConnection
        ? await tx.integrationConnection.update({
            where: {
              id: existingConnection.id,
            },
            data,
            include: {
              secrets: true,
              unit: true,
            },
          })
        : await tx.integrationConnection.create({
            data,
            include: {
              secrets: true,
              unit: true,
            },
          })

      const hydratedConnection = await tx.integrationConnection.findUniqueOrThrow({
        where: {
          id: connection.id,
        },
        include: {
          secrets: true,
          unit: true,
        },
      })

      await writeAuditLog(tx, {
        action: existingConnection
          ? 'configuration.integration.update'
          : 'configuration.integration.create',
        details: {
          providerKey: input.providerKey,
          scope: input.scope,
          status: input.status,
          unitId: resolvedUnitId,
        },
        entityId: hydratedConnection.id,
        entityName: 'IntegrationConnection',
        unitId: resolvedUnitId,
        userId: actor.id,
      })

      return createIntegrationConnectionSnapshot(hydratedConnection)
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 integration connection')
    }

    throw error
  }
}

export async function rotateIntegrationSecret(
  actor: AuthenticatedUserData,
  input: {
    connectionId: string
    secretKey: string
    secretValue: string
  },
) {
  if (!canEditIntegrationSecrets(actor)) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'Missing permission: configuracao.segredo.editar.',
    )
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const connection = await tx.integrationConnection.findUnique({
        where: {
          id: input.connectionId,
        },
        include: {
          secrets: true,
          unit: true,
        },
      })

      if (!connection) {
        throw new AppError('NOT_FOUND', 404, 'Integration connection not found.')
      }

      assertCanEditIntegrationScope(actor, connection.scope, connection.unitId)

      const encryptedValue = encryptAdministrativeSecret(input.secretValue)
      const valueMask = maskSecretValue(input.secretValue)

      const existingSecret = connection.secrets.find(
        (secret) => secret.secretKey === input.secretKey,
      )

      if (existingSecret) {
        await tx.integrationSecret.update({
          where: {
            id: existingSecret.id,
          },
          data: {
            active: true,
            encryptedValue,
            rotatedAt: new Date(),
            rotatedByUserId: actor.id,
            valueMask,
          },
        })
      } else {
        await tx.integrationSecret.create({
          data: {
            active: true,
            connectionId: connection.id,
            encryptedValue,
            rotatedByUserId: actor.id,
            secretKey: input.secretKey.trim(),
            valueMask,
          },
        })
      }

      await tx.integrationConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          healthStatus: 'PENDING_VALIDATION',
          lastError: null,
          updatedByUserId: actor.id,
        },
      })

      await writeAuditLog(tx, {
        action: 'configuration.integration.secret.rotate',
        details: {
          connectionId: connection.id,
          providerKey: connection.providerKey,
          secretKey: input.secretKey.trim(),
          valueMask,
        },
        entityId: connection.id,
        entityName: 'IntegrationSecret',
        unitId: connection.unitId,
        userId: actor.id,
      })

      return {
        connectionId: connection.id,
        secretKey: input.secretKey.trim(),
        valueMask,
      }
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 integration secret')
    }

    throw error
  }
}

export async function testIntegrationConnection(
  actor: AuthenticatedUserData,
  connectionId: string,
) {
  if (!canTestIntegrationConnections(actor)) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'Missing permission: configuracao.integracao.testar.',
    )
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const connection = await tx.integrationConnection.findUnique({
        where: {
          id: connectionId,
        },
        include: {
          secrets: true,
          unit: true,
        },
      })

      if (!connection) {
        throw new AppError('NOT_FOUND', 404, 'Integration connection not found.')
      }

      assertCanReadIntegrationAdministration(actor)
      assertCanEditIntegrationScope(actor, connection.scope, connection.unitId)

      const diagnostic = evaluateIntegrationConnectionHealth(connection)

      const updatedConnection = await tx.integrationConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          environmentJson: diagnostic.environmentJson,
          healthStatus: diagnostic.healthStatus,
          lastError: diagnostic.lastError,
          lastTestedAt: new Date(),
          status: diagnostic.status,
          updatedByUserId: actor.id,
        },
        include: {
          secrets: true,
          unit: true,
        },
      })

      await writeAuditLog(tx, {
        action: 'configuration.integration.test',
        details: {
          diagnostic,
          providerKey: connection.providerKey,
        },
        entityId: updatedConnection.id,
        entityName: 'IntegrationConnection',
        unitId: updatedConnection.unitId,
        userId: actor.id,
      })

      return createIntegrationConnectionSnapshot(updatedConnection)
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 integration connection test')
    }

    throw error
  }
}

function assertCanReadIntegrationAdministration(actor: AuthenticatedUserData) {
  if (canReadIntegrationAdministration(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 integrations administration surface.',
  )
}

function assertCanEditIntegrationAdministration(actor: AuthenticatedUserData) {
  if (canEditIntegrationAdministration(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 integrations editor.',
  )
}

function assertCanEditIntegrationScope(
  actor: AuthenticatedUserData,
  scope: ConfigurationScope,
  unitId: string | null,
) {
  if (scope !== 'UNIT') {
    return
  }

  if (!unitId) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Unit-scoped integrations require a target unit.',
    )
  }

  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'STRUCTURAL_WRITE',
    ownership: createLocalUnitOwnershipBinding(unitId),
    requestedUnitId: unitId,
  })

  if (!decision.allowed) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'User is not allowed to manage an integration on another unit in the current context.',
    )
  }
}

function assertExistingIntegrationScopeMatchesTarget(
  connection: Pick<IntegrationConnectionRecord, 'scope' | 'unitId'>,
  targetScope: ConfigurationScope,
  targetUnitId: string | null,
) {
  if (connection.scope === targetScope && (connection.unitId ?? null) === targetUnitId) {
    return
  }

  throw new AppError(
    'CONFLICT',
    409,
    'Existing integration connections cannot be reassigned to another scope.',
  )
}

function buildAccessibleIntegrationWhere(
  actor: AuthenticatedUserData,
  requestedUnitId: string | null,
): Prisma.IntegrationConnectionWhereInput {
  if (requestedUnitId) {
    const decision = evaluateActorMultiUnitScope(actor, {
      operation: 'READ',
      ownership: createLocalUnitOwnershipBinding(requestedUnitId),
      requestedUnitId,
    })

    if (!decision.allowed) {
      throw new AppError(
        'FORBIDDEN',
        403,
        'User is not allowed to read integration administration for this unit context.',
      )
    }

    return {
      OR: [{ scope: 'SYSTEM_GLOBAL' }, { scope: 'UNIT', unitId: requestedUnitId }],
    }
  }

  return actor.unitId
    ? {
        OR: [{ scope: 'SYSTEM_GLOBAL' }, { scope: 'UNIT', unitId: actor.unitId }],
      }
    : {
        scope: 'SYSTEM_GLOBAL',
      }
}

function createIntegrationConnectionSnapshot(
  connection: IntegrationConnectionRecord,
): IntegrationConnectionSnapshot {
  const catalogEntry = getIntegrationCatalogEntry(connection.providerKey)
  const configRecord = normalizeConnectionConfig(connection.configJson)

  return {
    active: connection.active,
    configEntries: (catalogEntry?.configFields ?? []).map((field) => ({
      key: field.key,
      label: field.label,
      value: hasNonEmptyString(configRecord[field.key])
        ? (configRecord[field.key] as string)
        : null,
    })),
    displayName: connection.displayName,
    environmentSummary:
      connection.environmentJson && typeof connection.environmentJson === 'object'
        ? JSON.stringify(connection.environmentJson)
        : null,
    healthStatus: connection.healthStatus,
    id: connection.id,
    lastError: connection.lastError,
    lastTestedAt: connection.lastTestedAt,
    providerKey: connection.providerKey as IntegrationProviderKey,
    scope: connection.scope,
    secretEntries: (catalogEntry?.secretFields ?? []).map((field) => {
      const secretRecord = connection.secrets.find((secret) => secret.secretKey === field.key)

      return {
        key: field.key,
        label: field.label,
        maskedValue: secretRecord?.valueMask ?? null,
        updatedAt: secretRecord?.updatedAt ?? null,
      }
    }),
    status: connection.status,
    unitId: connection.unitId,
  }
}

function normalizeJsonString(input: string | null | undefined) {
  if (!input || input.trim() === '') {
    return null
  }

  try {
    return JSON.parse(input) as Prisma.JsonObject
  } catch {
    throw new AppError('BAD_REQUEST', 400, 'Invalid JSON payload for integration configuration.')
  }
}

function normalizeConnectionConfig(configJson: Prisma.JsonValue | null) {
  if (!configJson || typeof configJson !== 'object' || Array.isArray(configJson)) {
    return {} as Record<string, unknown>
  }

  return configJson as Record<string, unknown>
}

function resolveHealthStatusFromConfiguration(configJson: Prisma.JsonObject | null) {
  if (!configJson || Object.keys(configJson).length === 0) {
    return 'NOT_CONFIGURED' as const
  }

  return 'PENDING_VALIDATION' as const
}

function toNullableInputJsonValue(value: Prisma.JsonObject | null) {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue)
}

function evaluateIntegrationConnectionHealth(connection: IntegrationConnectionRecord) {
  const env = getEnv()
  const config = normalizeConnectionConfig(connection.configJson)
  const catalogEntry = getIntegrationCatalogEntry(connection.providerKey)
  const secretCount = connection.secrets.filter((secret) => secret.active).length

  const missingRequiredConfig =
    catalogEntry?.configFields
      .filter((field) => field.required)
      .some((field) => !hasNonEmptyString(config[field.key])) ?? false
  const missingRequiredSecret =
    catalogEntry?.secretFields
      .filter((field) => field.required)
      .some(
        (field) =>
          !connection.secrets.some(
            (secret) => secret.active && secret.secretKey === field.key,
          ),
      ) ?? false

  const environmentJson = buildIntegrationEnvironmentSummary(connection.providerKey, env)
  const hasConfiguration = Object.keys(config).length > 0 || secretCount > 0

  if (!hasConfiguration) {
    return {
      environmentJson,
      healthStatus: 'NOT_CONFIGURED' as IntegrationHealthStatus,
      lastError: 'Nenhuma configuracao administrativa foi cadastrada para esta conexao.',
      status: 'DISABLED' as IntegrationConnectionStatus,
    }
  }

  if (missingRequiredConfig || missingRequiredSecret) {
    return {
      environmentJson,
      healthStatus: 'WARNING' as IntegrationHealthStatus,
      lastError:
        'A conexao esta parcialmente configurada. Revise campos obrigatorios e segredos cadastrados.',
      status: 'CONFIGURED' as IntegrationConnectionStatus,
    }
  }

  return {
    environmentJson,
    healthStatus: 'READY' as IntegrationHealthStatus,
    lastError: null,
    status: connection.status === 'DISABLED' ? 'CONFIGURED' : connection.status,
  }
}

function buildIntegrationEnvironmentSummary(
  providerKey: string,
  environment: ReturnType<typeof getEnv>,
) {
  switch (providerKey) {
    case 'STRIPE':
      return {
        envProviderStatus:
          environment.STRIPE_SECRET_KEY || environment.STRIPE_PUBLISHABLE_KEY
            ? 'ENV_PRESENT'
            : 'ENV_EMPTY',
      }
    case 'MERCADO_PAGO':
      return {
        envProviderStatus:
          environment.MERCADO_PAGO_ACCESS_TOKEN || environment.MERCADO_PAGO_PUBLIC_KEY
            ? 'ENV_PRESENT'
            : 'ENV_EMPTY',
      }
    case 'FISCAL':
      return {
        envProvider: environment.FISCAL_PROVIDER ?? null,
        envProviderStatus:
          environment.FISCAL_PROVIDER || environment.FISCAL_API_TOKEN
            ? 'ENV_PRESENT'
            : 'ENV_EMPTY',
      }
    case 'SMTP':
      return {
        envProvider: environment.EMAIL_PROVIDER ?? null,
        envProviderStatus:
          environment.SMTP_HOST || environment.SMTP_PASSWORD ? 'ENV_PRESENT' : 'ENV_EMPTY',
      }
    case 'STORAGE':
      return {
        envProviderStatus:
          environment.STORAGE_BUCKET || environment.STORAGE_SECRET_KEY
            ? 'ENV_PRESENT'
            : 'ENV_EMPTY',
      }
    case 'OPENAI':
      return {
        envProviderStatus: environment.OPENAI_API_KEY ? 'ENV_PRESENT' : 'ENV_EMPTY',
      }
    case 'GEMINI':
      return {
        envProviderStatus: environment.GEMINI_API_KEY ? 'ENV_PRESENT' : 'ENV_EMPTY',
      }
    default:
      return {
        envProviderStatus: 'UNKNOWN',
      }
  }
}

function hasNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() !== ''
}
