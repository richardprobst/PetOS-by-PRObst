import type { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { assertPermission } from '@/server/authorization/access-control'
import { writeAuditLog } from '@/server/audit/logging'
import { prisma } from '@/server/db/prisma'
import { getEnv, type Environment } from '@/server/env'
import { AppError } from '@/server/http/errors'
import {
  collectDatabaseReadinessChecks,
  deriveReadinessStatus,
} from '@/server/readiness/database'
import {
  isMaintenanceLifecycleState,
  isRepairLifecycleState,
} from '@/server/system/lifecycle'
import {
  collectSystemRuntimeSnapshot,
  upsertSystemRuntimeState,
} from '@/server/system/runtime-state'
import { getBuildVersion } from '@/server/system/version'
import type {
  EnterMaintenanceModeInput,
  OpenRecoveryIncidentInput,
  ResolveRecoveryIncidentInput,
} from './schemas'

type RuntimeSnapshot = Awaited<ReturnType<typeof collectSystemRuntimeSnapshot>>

type RuntimeBackfillInput = Parameters<typeof upsertSystemRuntimeState>[1]

function getSystemActionUnitId(actor: AuthenticatedUserData) {
  return actor.unitId ?? null
}

function buildRuntimeBackfillInput(runtime: RuntimeSnapshot): RuntimeBackfillInput {
  if (runtime.recordExists) {
    return {
      lifecycleState: runtime.lifecycleState === 'UNKNOWN' ? 'NOT_INSTALLED' : 'INSTALLED',
    }
  }

  return {
    currentVersion: runtime.currentInstalledVersion ?? getBuildVersion(),
    installerLockedAt: runtime.installerLocked ? new Date() : null,
    lifecycleState: runtime.lifecycleState === 'UNKNOWN' ? 'NOT_INSTALLED' : 'INSTALLED',
  }
}

async function createRecoveryIncident(
  client: Prisma.TransactionClient,
  actor: AuthenticatedUserData,
  incident: {
    details?: Prisma.InputJsonValue
    lifecycleState: 'INSTALL_FAILED' | 'UPDATE_FAILED' | 'REPAIR'
    summary: string
    title: string
  },
) {
  return client.recoveryIncident.create({
    data: {
      details: incident.details,
      lifecycleState: incident.lifecycleState,
      openedByUserId: actor.id,
      summary: incident.summary,
      title: incident.title,
    },
  })
}

export async function getSystemOperationsOverview(
  actor: AuthenticatedUserData,
  environment: Environment = getEnv(),
) {
  assertPermission(actor, 'sistema.runtime.visualizar')

  const [runtime, recoveryIncidents] = await Promise.all([
    collectSystemRuntimeSnapshot(prisma, environment),
    prisma.recoveryIncident.findMany({
      select: {
        id: true,
        lifecycleState: true,
        openedAt: true,
        status: true,
        summary: true,
        title: true,
      },
      orderBy: {
        openedAt: 'desc',
      },
      take: 8,
    }),
  ])

  return {
    recoveryIncidents,
    runtime,
  }
}

export async function enterMaintenanceMode(
  actor: AuthenticatedUserData,
  input: EnterMaintenanceModeInput,
  environment: Environment = getEnv(),
) {
  assertPermission(actor, 'sistema.manutencao.operar')
  const runtime = await collectSystemRuntimeSnapshot(prisma, environment)

  if (!runtime.databaseAvailable || runtime.lifecycleState === 'UNKNOWN') {
    throw new AppError(
      'CONFLICT',
      409,
      'O runtime ainda nao consegue confirmar banco e ciclo de vida para entrar em manutencao.',
    )
  }

  if (isMaintenanceLifecycleState(runtime.lifecycleState)) {
    throw new AppError('CONFLICT', 409, 'O sistema ja esta em manutencao ou update controlado.')
  }

  if (isRepairLifecycleState(runtime.lifecycleState)) {
    throw new AppError(
      'CONFLICT',
      409,
      'Resolva o estado de repair atual antes de abrir uma nova janela de manutencao.',
    )
  }

  const transitionAt = new Date()
  const runtimeBackfill = buildRuntimeBackfillInput(runtime)

  await prisma.$transaction(async (transaction) => {
    await upsertSystemRuntimeState(transaction, {
      ...runtimeBackfill,
      lifecycleState: 'MAINTENANCE',
      maintenanceActivatedAt: transitionAt,
      maintenanceReason: input.reason,
      updatedByUserId: actor.id,
    })

    await writeAuditLog(transaction, {
      action: 'system.maintenance.enter',
      details: {
        maintenanceReason: input.reason,
        transitionAt: transitionAt.toISOString(),
      },
      entityId: 'default',
      entityName: 'SystemRuntimeState',
      unitId: getSystemActionUnitId(actor),
      userId: actor.id,
    })
  })
}

export async function leaveMaintenanceMode(
  actor: AuthenticatedUserData,
  environment: Environment = getEnv(),
) {
  assertPermission(actor, 'sistema.manutencao.operar')
  const runtime = await collectSystemRuntimeSnapshot(prisma, environment)

  if (runtime.lifecycleState !== 'MAINTENANCE') {
    throw new AppError('CONFLICT', 409, 'O sistema nao esta em manutencao manual no momento.')
  }

  const runtimeBackfill = buildRuntimeBackfillInput(runtime)

  await prisma.$transaction(async (transaction) => {
    await upsertSystemRuntimeState(transaction, {
      ...runtimeBackfill,
      currentVersion: runtime.currentInstalledVersion ?? getBuildVersion(),
      lifecycleState: 'INSTALLED',
      maintenanceActivatedAt: null,
      maintenanceReason: null,
      updatedByUserId: actor.id,
    })

    await writeAuditLog(transaction, {
      action: 'system.maintenance.exit',
      details: {
        previousReason: runtime.maintenanceReason,
      },
      entityId: 'default',
      entityName: 'SystemRuntimeState',
      unitId: getSystemActionUnitId(actor),
      userId: actor.id,
    })
  })
}

export async function openManualRecoveryIncident(
  actor: AuthenticatedUserData,
  input: OpenRecoveryIncidentInput,
  environment: Environment = getEnv(),
) {
  assertPermission(actor, 'sistema.reparo.operar')
  const runtime = await collectSystemRuntimeSnapshot(prisma, environment)

  if (!runtime.databaseAvailable || runtime.lifecycleState === 'UNKNOWN') {
    throw new AppError(
      'CONFLICT',
      409,
      'O runtime ainda nao consegue confirmar banco e ciclo de vida para abrir um incidente manual.',
    )
  }

  const existingOpenIncident = await prisma.recoveryIncident.findFirst({
    orderBy: {
      openedAt: 'desc',
    },
    where: {
      status: 'OPEN',
    },
  })

  if (existingOpenIncident) {
    throw new AppError(
      'CONFLICT',
      409,
      'Ja existe um incidente de repair em aberto. Resolva-o antes de abrir outro.',
    )
  }

  const runtimeBackfill = buildRuntimeBackfillInput(runtime)

  await prisma.$transaction(async (transaction) => {
    const incident = await createRecoveryIncident(transaction, actor, {
      details: {
        source: 'manual',
      },
      lifecycleState: 'REPAIR',
      summary: input.summary,
      title: input.title,
    })

    await upsertSystemRuntimeState(transaction, {
      ...runtimeBackfill,
      lifecycleState: 'REPAIR',
      maintenanceActivatedAt: new Date(),
      maintenanceReason: input.title,
      updatedByUserId: actor.id,
    })

    await writeAuditLog(transaction, {
      action: 'system.repair.open',
      details: {
        incidentId: incident.id,
        summary: input.summary,
        title: input.title,
      },
      entityId: incident.id,
      entityName: 'RecoveryIncident',
      unitId: getSystemActionUnitId(actor),
      userId: actor.id,
    })
  })
}

export async function resolveRecoveryIncident(
  actor: AuthenticatedUserData,
  input: ResolveRecoveryIncidentInput,
  environment: Environment = getEnv(),
) {
  assertPermission(actor, 'sistema.reparo.operar')
  const runtime = await collectSystemRuntimeSnapshot(prisma, environment)
  const incident = await prisma.recoveryIncident.findUnique({
    where: {
      id: input.incidentId,
    },
  })

  if (!incident || incident.status !== 'OPEN') {
    throw new AppError('NOT_FOUND', 404, 'Incidente de repair nao encontrado ou ja resolvido.')
  }

  if (
    input.targetLifecycleState === 'NOT_INSTALLED' &&
    incident.lifecycleState !== 'INSTALL_FAILED'
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'Somente incidentes de falha de instalacao podem voltar explicitamente para NOT_INSTALLED.',
    )
  }

  if (input.targetLifecycleState === 'INSTALLED') {
    const readinessChecks = await collectDatabaseReadinessChecks(prisma)

    if (deriveReadinessStatus(readinessChecks) !== 'ok') {
      throw new AppError(
        'CONFLICT',
        409,
        'O banco, migrations ou seed ainda nao estao saudaveis o suficiente para sair do modo de repair.',
        readinessChecks,
      )
    }
  }

  const resolvedAt = new Date()
  const runtimeBackfill = buildRuntimeBackfillInput(runtime)

  await prisma.$transaction(async (transaction) => {
    await transaction.recoveryIncident.update({
      where: {
        id: incident.id,
      },
      data: {
        details: {
          ...((incident.details as Record<string, unknown> | null) ?? {}),
          resolution: {
            resolvedAt: resolvedAt.toISOString(),
            resolvedByUserId: actor.id,
            summary: input.resolutionSummary,
            targetLifecycleState: input.targetLifecycleState,
          },
        },
        resolvedAt,
        resolvedByUserId: actor.id,
        status: 'RESOLVED',
      },
    })

    await upsertSystemRuntimeState(transaction, {
      ...runtimeBackfill,
      currentVersion:
        input.targetLifecycleState === 'INSTALLED'
          ? runtime.currentInstalledVersion ?? getBuildVersion()
          : null,
      installationCompletedAt:
        input.targetLifecycleState === 'INSTALLED' && incident.lifecycleState === 'INSTALL_FAILED'
          ? resolvedAt
          : undefined,
      installerLockedAt:
        input.targetLifecycleState === 'INSTALLED'
          ? runtime.installerLocked
            ? undefined
            : resolvedAt
          : null,
      lifecycleState: input.targetLifecycleState,
      maintenanceActivatedAt: null,
      maintenanceReason: null,
      previousVersion: runtime.currentInstalledVersion,
      updatedByUserId: actor.id,
    })

    await writeAuditLog(transaction, {
      action: 'system.repair.resolve',
      details: {
        incidentId: incident.id,
        resolutionSummary: input.resolutionSummary,
        targetLifecycleState: input.targetLifecycleState,
      },
      entityId: incident.id,
      entityName: 'RecoveryIncident',
      unitId: getSystemActionUnitId(actor),
      userId: actor.id,
    })
  })
}
