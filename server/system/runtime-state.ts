import type { Prisma, PrismaClient, SystemLifecycleState } from '@prisma/client'
import { getEnv, type Environment } from '@/server/env'
import { AppError } from '@/server/http/errors'
import {
  hasCoreSeedData,
  inspectCoreSeedSnapshot,
  prismaMigrationsTableExists,
} from '@/server/readiness/database'
import { getBuildVersion } from './version'
import { verifyInstallerBootstrapToken } from './installer-session'

export const SYSTEM_RUNTIME_STATE_ID = 'default'

export type EffectiveSystemLifecycleState = SystemLifecycleState | 'UNKNOWN'
export type SystemLifecycleSource = 'persisted' | 'inferred' | 'unavailable'

export interface SystemRuntimeSnapshot {
  buildVersion: string
  coreSeedAvailable: boolean | null
  currentInstalledVersion: string | null
  databaseAvailable: boolean
  installerEnabled: boolean
  installerLocked: boolean
  installerTokenConfigured: boolean
  lifecycleSource: SystemLifecycleSource
  lifecycleState: EffectiveSystemLifecycleState
  maintenanceReason: string | null
  maintenanceActive: boolean
  manifestHash: string | null
  migrationsTableAvailable: boolean
  previousVersion: string | null
  recordExists: boolean
  lastTransitionAt: Date | null
}

type SystemRuntimeDatabaseClient = Pick<
  PrismaClient,
  | '$queryRawUnsafe'
  | 'accessProfile'
  | 'operationalStatus'
  | 'permission'
  | 'systemRuntimeState'
  | 'unit'
  | 'unitSetting'
>

type SystemRuntimeMutationClient = Pick<Prisma.TransactionClient, 'systemRuntimeState'>

interface UpsertSystemRuntimeStateInput {
  currentVersion?: string | null
  installationCompletedAt?: Date | null
  installerLockedAt?: Date | null
  lifecycleState: SystemLifecycleState
  maintenanceActivatedAt?: Date | null
  maintenanceReason?: string | null
  manifestHash?: string | null
  previousVersion?: string | null
  updatedByUserId?: string | null
}

function resolveOptionalRuntimeUpdate<T>(value: T | null | undefined) {
  return value === undefined ? undefined : value
}

function getInstallerBootstrapTokenFromRequest(request: Request) {
  const explicitToken = request.headers.get('x-installer-token')?.trim()

  if (explicitToken) {
    return explicitToken
  }

  const authorization = request.headers.get('authorization')?.trim()

  if (!authorization) {
    return null
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization)
  return match?.[1]?.trim() ?? null
}

export function assertInstallerPreflightAccess(
  request: Request,
  environment: Environment = getEnv(),
) {
  if (!environment.INSTALLER_ENABLED) {
    throw new AppError('FORBIDDEN', 403, 'Installer mode is disabled for this environment.')
  }

  const providedToken = getInstallerBootstrapTokenFromRequest(request)

  if (!providedToken || !environment.INSTALLER_BOOTSTRAP_TOKEN) {
    throw new AppError('FORBIDDEN', 403, 'A valid installer bootstrap token is required.')
  }

  if (!verifyInstallerBootstrapToken(providedToken, environment)) {
    throw new AppError('FORBIDDEN', 403, 'A valid installer bootstrap token is required.')
  }
}

export async function collectSystemRuntimeSnapshot(
  prisma: SystemRuntimeDatabaseClient,
  environment: Environment = getEnv(),
): Promise<SystemRuntimeSnapshot> {
  const baseSnapshot = {
    buildVersion: getBuildVersion(),
    installerEnabled: environment.INSTALLER_ENABLED,
    installerTokenConfigured: Boolean(environment.INSTALLER_BOOTSTRAP_TOKEN),
  } as const

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
  } catch {
    return {
      ...baseSnapshot,
      coreSeedAvailable: null,
      currentInstalledVersion: null,
      databaseAvailable: false,
      installerLocked: false,
      lifecycleSource: 'unavailable',
      lifecycleState: 'UNKNOWN',
      maintenanceReason: null,
      maintenanceActive: false,
      manifestHash: null,
      migrationsTableAvailable: false,
      previousVersion: null,
      recordExists: false,
      lastTransitionAt: null,
    }
  }

  const migrationsTableAvailable = await prismaMigrationsTableExists(prisma)

  if (!migrationsTableAvailable) {
    return {
      ...baseSnapshot,
      coreSeedAvailable: false,
      currentInstalledVersion: null,
      databaseAvailable: true,
      installerLocked: false,
      lifecycleSource: 'inferred',
      lifecycleState: 'NOT_INSTALLED',
      maintenanceReason: null,
      maintenanceActive: false,
      manifestHash: null,
      migrationsTableAvailable: false,
      previousVersion: null,
      recordExists: false,
      lastTransitionAt: null,
    }
  }

  const runtimeState = await prisma.systemRuntimeState.findUnique({
    where: {
      id: SYSTEM_RUNTIME_STATE_ID,
    },
  })

  if (runtimeState) {
    return {
      ...baseSnapshot,
      coreSeedAvailable: true,
      currentInstalledVersion: runtimeState.currentVersion ?? baseSnapshot.buildVersion,
      databaseAvailable: true,
      installerLocked:
        Boolean(runtimeState.installerLockedAt) || runtimeState.lifecycleState !== 'NOT_INSTALLED',
      lifecycleSource: 'persisted',
      lifecycleState: runtimeState.lifecycleState,
      maintenanceReason: runtimeState.maintenanceReason ?? null,
      maintenanceActive:
        runtimeState.lifecycleState === 'MAINTENANCE' ||
        runtimeState.lifecycleState === 'UPDATING',
      manifestHash: runtimeState.manifestHash ?? null,
      migrationsTableAvailable: true,
      previousVersion: runtimeState.previousVersion ?? null,
      recordExists: true,
      lastTransitionAt: runtimeState.lastTransitionAt ?? null,
    }
  }

  const coreSeedSnapshot = await inspectCoreSeedSnapshot(prisma)
  const coreSeedAvailable = hasCoreSeedData(coreSeedSnapshot)

  return {
    ...baseSnapshot,
    coreSeedAvailable,
    currentInstalledVersion: coreSeedAvailable ? baseSnapshot.buildVersion : null,
    databaseAvailable: true,
    installerLocked: coreSeedAvailable,
    lifecycleSource: 'inferred',
    lifecycleState: coreSeedAvailable ? 'INSTALLED' : 'NOT_INSTALLED',
    maintenanceReason: null,
    maintenanceActive: false,
    manifestHash: null,
    migrationsTableAvailable: true,
    previousVersion: null,
    recordExists: false,
    lastTransitionAt: null,
  }
}

export async function upsertSystemRuntimeState(
  prisma: SystemRuntimeMutationClient,
  input: UpsertSystemRuntimeStateInput,
) {
  const transitionTimestamp = new Date()

  return prisma.systemRuntimeState.upsert({
    where: {
      id: SYSTEM_RUNTIME_STATE_ID,
    },
    update: {
      currentVersion: resolveOptionalRuntimeUpdate(input.currentVersion),
      installationCompletedAt: resolveOptionalRuntimeUpdate(input.installationCompletedAt),
      installerLockedAt: resolveOptionalRuntimeUpdate(input.installerLockedAt),
      lastTransitionAt: transitionTimestamp,
      lifecycleState: input.lifecycleState,
      maintenanceActivatedAt: resolveOptionalRuntimeUpdate(input.maintenanceActivatedAt),
      maintenanceReason: resolveOptionalRuntimeUpdate(input.maintenanceReason),
      manifestHash: resolveOptionalRuntimeUpdate(input.manifestHash),
      previousVersion: resolveOptionalRuntimeUpdate(input.previousVersion),
      updatedByUserId: resolveOptionalRuntimeUpdate(input.updatedByUserId),
    },
    create: {
      currentVersion: input.currentVersion ?? null,
      id: SYSTEM_RUNTIME_STATE_ID,
      installationCompletedAt: input.installationCompletedAt ?? null,
      installerLockedAt: input.installerLockedAt ?? null,
      lastTransitionAt: transitionTimestamp,
      lifecycleState: input.lifecycleState,
      maintenanceActivatedAt: input.maintenanceActivatedAt ?? null,
      maintenanceReason: input.maintenanceReason ?? null,
      manifestHash: input.manifestHash ?? null,
      previousVersion: input.previousVersion ?? null,
      updatedByUserId: input.updatedByUserId ?? null,
    },
  })
}
