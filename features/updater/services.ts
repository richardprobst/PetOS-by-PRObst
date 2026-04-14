import type { Prisma, PrismaClient } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { assertPermission } from '@/server/authorization/access-control'
import { prisma } from '@/server/db/prisma'
import { getEnv, type Environment } from '@/server/env'
import {
  collectDatabaseReadinessChecks,
  deriveReadinessStatus,
  type ReadinessCheck,
} from '@/server/readiness/database'
import {
  getPrismaRuntimeCapabilities,
  type PrismaRuntimeCapabilities,
} from '@/server/system/prisma-runtime'
import {
  loadEmbeddedReleaseManifest,
  type ReleaseManifestLoadResult,
} from '@/server/system/release-manifest'
import {
  collectSystemRuntimeSnapshot,
  type EffectiveSystemLifecycleState,
  type SystemRuntimeSnapshot,
} from '@/server/system/runtime-state'
import { getBuildVersion } from '@/server/system/version'
import {
  buildUpdatePreflightReport,
  canRetryFailedUpdateExecution,
  type UpdateExecutionStepCode,
} from './domain'

type UpdatePreflightDatabaseClient = Pick<
  PrismaClient,
  | '$queryRaw'
  | '$executeRawUnsafe'
  | 'accessProfile'
  | 'operationalStatus'
  | 'permission'
  | 'systemRuntimeState'
  | 'unit'
  | 'unitSetting'
>

type UpdateExecutionDatabaseClient = Pick<
  PrismaClient,
  | 'updateExecution'
  | 'updateExecutionStep'
>

const updateExecutionInclude = {
  completedByUser: {
    select: {
      email: true,
      id: true,
      name: true,
    },
  },
  startedByUser: {
    select: {
      email: true,
      id: true,
      name: true,
    },
  },
  steps: {
    orderBy: {
      position: 'asc',
    },
  },
} as const

type UpdateExecutionRecord = Prisma.UpdateExecutionGetPayload<{
  include: typeof updateExecutionInclude
}>

interface GetUpdatePreflightOptions {
  allowedLifecycleStates?: readonly EffectiveSystemLifecycleState[]
  buildVersion?: string
  environment?: Environment
  manifestResult?: ReleaseManifestLoadResult
  prismaCapabilities?: PrismaRuntimeCapabilities
  prismaClient?: UpdatePreflightDatabaseClient
  readinessChecks?: ReadinessCheck[]
  runtime?: SystemRuntimeSnapshot
}

interface ListUpdateExecutionsOptions {
  limit?: number
  prismaClient?: UpdateExecutionDatabaseClient
}

interface GetUpdateExecutionDetailsOptions {
  executionId: string
  prismaClient?: UpdateExecutionDatabaseClient
}

function mapUpdateExecution(record: NonNullable<UpdateExecutionRecord>) {
  return {
    completedAt: record.completedAt,
    completedByUser: record.completedByUser,
    failureSummary: record.failureSummary,
    failedAt: record.failedAt,
    id: record.id,
    lastFailedStepCode: record.lastFailedStepCode as UpdateExecutionStepCode | null,
    lastSuccessfulStepCode: record.lastSuccessfulStepCode as UpdateExecutionStepCode | null,
    lockExpiresAt: record.lockExpiresAt,
    maintenanceEnteredAt: record.maintenanceEnteredAt,
    maintenanceExitedAt: record.maintenanceExitedAt,
    manifestHash: record.manifestHash,
    mode: record.mode,
    preflightSnapshot: record.preflightSnapshot,
    recoveryState: record.recoveryState,
    requiresBackup: record.requiresBackup,
    requiresMaintenance: record.requiresMaintenance,
    retriedFromExecutionId: record.retriedFromExecutionId,
    retryCount: record.retryCount,
    seedPolicy: record.seedPolicy,
    sourceVersion: record.sourceVersion,
    startedAt: record.startedAt,
    startedByUser: record.startedByUser,
    status: record.status,
    steps: record.steps.map((step) => ({
      code: step.code as UpdateExecutionStepCode,
      completedAt: step.completedAt,
      durationMs: step.durationMs,
      errorSummary: step.errorSummary,
      failedAt: step.failedAt,
      id: step.id,
      label: step.label,
      payload: step.payload,
      position: step.position,
      startedAt: step.startedAt,
      status: step.status,
    })),
    targetVersion: record.targetVersion,
    canRetry: canRetryFailedUpdateExecution(record.status, record.recoveryState),
  }
}

export async function getUpdatePreflight(
  actor: AuthenticatedUserData,
  options: GetUpdatePreflightOptions = {},
) {
  assertPermission(actor, 'sistema.update.operar')

  const environment = options.environment ?? getEnv()
  const prismaClient = options.prismaClient ?? prisma
  const buildVersion = options.buildVersion ?? getBuildVersion()
  const manifestResult = options.manifestResult ?? loadEmbeddedReleaseManifest()
  const prismaCapabilities =
    options.prismaCapabilities ?? getPrismaRuntimeCapabilities()
  const runtime =
    options.runtime ?? (await collectSystemRuntimeSnapshot(prismaClient, environment))
  const readinessChecks =
    options.readinessChecks ?? (await collectDatabaseReadinessChecks(prismaClient))

  return buildUpdatePreflightReport({
    allowedLifecycleStates: options.allowedLifecycleStates,
    buildVersion,
    environment,
    manifestResult,
    prismaCapabilities,
    readinessChecks,
    readinessStatus: deriveReadinessStatus(readinessChecks),
    runtime,
  })
}

export async function listUpdateExecutions(
  actor: AuthenticatedUserData,
  options: ListUpdateExecutionsOptions = {},
) {
  assertPermission(actor, 'sistema.update.operar')

  const prismaClient = options.prismaClient ?? prisma
  const limit = Math.max(1, Math.min(options.limit ?? 5, 20))
  const records = await prismaClient.updateExecution.findMany({
    include: updateExecutionInclude,
    orderBy: {
      startedAt: 'desc',
    },
    take: limit,
  })

  return records.map((record) => mapUpdateExecution(record))
}

export async function getUpdateExecutionDetails(
  actor: AuthenticatedUserData,
  options: GetUpdateExecutionDetailsOptions,
) {
  assertPermission(actor, 'sistema.update.operar')

  const prismaClient = options.prismaClient ?? prisma
  const record = await prismaClient.updateExecution.findUnique({
    include: updateExecutionInclude,
    where: {
      id: options.executionId,
    },
  })

  return record ? mapUpdateExecution(record) : null
}
