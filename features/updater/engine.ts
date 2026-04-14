import type { Prisma, PrismaClient } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { assertPermission } from '@/server/authorization/access-control'
import { writeAuditLog } from '@/server/audit/logging'
import { prisma } from '@/server/db/prisma'
import { getEnv, type Environment } from '@/server/env'
import { AppError, mapUnknownToAppError } from '@/server/http/errors'
import {
  collectDatabaseReadinessChecks,
  deriveReadinessStatus,
} from '@/server/readiness/database'
import { getPrismaRuntimeCapabilities, runPrismaMigrateDeploy } from '@/server/system/prisma-runtime'
import {
  loadEmbeddedReleaseManifest,
  type ReleaseManifest,
  type ReleaseManifestLoadResult,
} from '@/server/system/release-manifest'
import {
  SYSTEM_RUNTIME_STATE_ID,
  collectSystemRuntimeSnapshot,
  upsertSystemRuntimeState,
} from '@/server/system/runtime-state'
import { bootstrapCorePetOS } from '@/server/system/bootstrap-core'
import {
  getUpdateExecutionStepLabel,
  resolveUpdateFailureRecoveryState,
  type UpdateExecutionStepCode,
} from './domain'
import { getUpdateExecutionDetails, getUpdatePreflight } from './services'
import {
  builtInUpdatePostTasks,
  executeRegisteredPostUpdateTask,
  type UpdatePostTaskDefinition,
} from './tasks'

const activeExecutionStatuses = ['PREPARING', 'RUNNING'] as const
const stepStatusCompleted = 'COMPLETED' as const
const stepStatusSkipped = 'SKIPPED' as const
const updateLockTtlMs = 15 * 60 * 1000

interface ExecuteUpdateInput {
  backupConfirmed: boolean
  executionId?: string
  mode: 'MANUAL' | 'RETRY'
}

interface StartUpdateExecutionInput {
  backupConfirmed: boolean
}

interface RetryUpdateExecutionInput extends StartUpdateExecutionInput {
  executionId: string
}

interface StepRunResult {
  payload?: Prisma.InputJsonValue
  status?: typeof stepStatusCompleted | typeof stepStatusSkipped
}

interface UpdateExecutionDependencies {
  buildVersion?: string
  environment?: Environment
  manifestResult?: ReleaseManifestLoadResult
  migrateRunner?: typeof runPrismaMigrateDeploy
  now?: () => Date
  postTaskRegistry?: Record<string, UpdatePostTaskDefinition>
  prismaCapabilities?: ReturnType<typeof getPrismaRuntimeCapabilities>
  prismaClient?: PrismaClient
  readinessCollector?: typeof collectDatabaseReadinessChecks
  runtimeCollector?: typeof collectSystemRuntimeSnapshot
  seedBootstrap?: typeof bootstrapCorePetOS
}

type UpdateTransactionClient = Prisma.TransactionClient

type ReleaseManifestSuccess = Extract<ReleaseManifestLoadResult, { ok: true }>

type UpdateExecutionContext = {
  actor: AuthenticatedUserData
  collectReadinessChecks: typeof collectDatabaseReadinessChecks
  collectRuntimeSnapshot: typeof collectSystemRuntimeSnapshot
  environment: Environment
  executionId: string
  lockTtlMs: number
  manifestHash: string
  migrateRunner: typeof runPrismaMigrateDeploy
  now: () => Date
  postTaskRegistry: Record<string, UpdatePostTaskDefinition>
  prismaCapabilities: ReturnType<typeof getPrismaRuntimeCapabilities>
  prismaClient: PrismaClient
  seedBootstrap: typeof bootstrapCorePetOS
  sourceManifestHash: string | null
  sourceVersion: string
  targetVersion: string
}

function getSystemActionUnitId(actor: AuthenticatedUserData) {
  return actor.unitId ?? null
}

function resolveLockExpiresAt(now: Date, ttlMs: number) {
  return new Date(now.getTime() + ttlMs)
}

function buildExecutionSteps(executionId: string) {
  return [
    {
      code: 'PRECHECK_REVALIDATION',
      executionId,
      label: getUpdateExecutionStepLabel('PRECHECK_REVALIDATION'),
      position: 10,
    },
    {
      code: 'ENTER_MAINTENANCE',
      executionId,
      label: getUpdateExecutionStepLabel('ENTER_MAINTENANCE'),
      position: 20,
    },
    {
      code: 'APPLY_MIGRATIONS',
      executionId,
      label: getUpdateExecutionStepLabel('APPLY_MIGRATIONS'),
      position: 30,
    },
    {
      code: 'APPLY_SEED_POLICY',
      executionId,
      label: getUpdateExecutionStepLabel('APPLY_SEED_POLICY'),
      position: 40,
    },
    {
      code: 'RUN_POST_UPDATE_TASKS',
      executionId,
      label: getUpdateExecutionStepLabel('RUN_POST_UPDATE_TASKS'),
      position: 50,
    },
    {
      code: 'FINALIZE_RUNTIME',
      executionId,
      label: getUpdateExecutionStepLabel('FINALIZE_RUNTIME'),
      position: 60,
    },
    {
      code: 'FINAL_VALIDATE',
      executionId,
      label: getUpdateExecutionStepLabel('FINAL_VALIDATE'),
      position: 70,
    },
  ] satisfies Array<{
    code: UpdateExecutionStepCode
    executionId: string
    label: string
    position: number
  }>
}

function buildPreflightBlockingError(report: Awaited<ReturnType<typeof getUpdatePreflight>>) {
  const blockingGates = report.gates.filter((gate) => gate.status !== 'ok')

  return new AppError(
    'CONFLICT',
    409,
    'O preflight do updater nao esta compativel com execucao controlada.',
    blockingGates,
  )
}

function buildExecutionLockError() {
  return new AppError(
    'CONFLICT',
    409,
    'Ja existe outra execucao de update em preparo ou em andamento neste ambiente.',
  )
}

function buildUpdateErrorSummary(error: unknown) {
  const appError = mapUnknownToAppError(error)
  return appError.message
}

async function expireStaleUpdateLocks(
  transaction: UpdateTransactionClient,
  now: Date,
) {
  const staleExecutions = await transaction.updateExecution.findMany({
    where: {
      lockExpiresAt: {
        lte: now,
      },
      status: {
        in: [...activeExecutionStatuses],
      },
    },
  })

  if (staleExecutions.length === 0) {
    return
  }

  for (const execution of staleExecutions) {
    await transaction.updateExecutionStep.updateMany({
      data: {
        durationMs: 0,
        errorSummary: 'O lock da execucao de update expirou antes da conclusao.',
        failedAt: now,
        status: 'FAILED',
      },
      where: {
        executionId: execution.id,
        status: 'RUNNING',
      },
    })

    await transaction.updateExecution.update({
      data: {
        failedAt: now,
        failureSummary: 'O lock da execucao de update expirou antes da conclusao.',
        lockExpiresAt: now,
        recoveryState: 'MANUAL_INTERVENTION_REQUIRED',
        status: 'FAILED',
      },
      where: {
        id: execution.id,
      },
    })

    await writeAuditLog(transaction, {
      action: 'system.update.execution_lock_expired',
      details: {
        executionId: execution.id,
        sourceVersion: execution.sourceVersion,
        targetVersion: execution.targetVersion,
      },
      entityId: execution.id,
      entityName: 'UpdateExecution',
      unitId: null,
      userId: null,
    })
  }

  await upsertSystemRuntimeState(transaction, {
    lifecycleState: 'UPDATE_FAILED',
    maintenanceActivatedAt: now,
    maintenanceReason: 'O lock de uma execucao de update expirou antes da conclusao.',
    updatedByUserId: null,
  })
}

async function assertNoActiveUpdateExecution(
  transaction: UpdateTransactionClient,
  now: Date,
) {
  const activeExecution = await transaction.updateExecution.findFirst({
    orderBy: {
      startedAt: 'desc',
    },
    where: {
      lockExpiresAt: {
        gt: now,
      },
      status: {
        in: [...activeExecutionStatuses],
      },
    },
  })

  if (activeExecution) {
    throw buildExecutionLockError()
  }
}

async function markStepRunning(
  context: UpdateExecutionContext,
  stepCode: UpdateExecutionStepCode,
  startedAt: Date,
) {
  await context.prismaClient.$transaction(async (transaction) => {
    await transaction.updateExecution.update({
      data: {
        lockExpiresAt: resolveLockExpiresAt(startedAt, context.lockTtlMs),
        status: 'RUNNING',
      },
      where: {
        id: context.executionId,
      },
    })

    await transaction.updateExecutionStep.update({
      data: {
        completedAt: null,
        durationMs: null,
        errorSummary: null,
        failedAt: null,
        startedAt,
        status: 'RUNNING',
      },
      where: {
        executionId_code: {
          code: stepCode,
          executionId: context.executionId,
        },
      },
    })
  })
}

async function markStepCompleted(
  context: UpdateExecutionContext,
  stepCode: UpdateExecutionStepCode,
  startedAt: Date,
  result: StepRunResult | undefined,
) {
  const finishedAt = context.now()
  const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime())

  await context.prismaClient.$transaction(async (transaction) => {
    await transaction.updateExecution.update({
      data: {
        lastSuccessfulStepCode:
          result?.status === stepStatusSkipped ? undefined : stepCode,
        lockExpiresAt: resolveLockExpiresAt(finishedAt, context.lockTtlMs),
      },
      where: {
        id: context.executionId,
      },
    })

    await transaction.updateExecutionStep.update({
      data: {
        completedAt: finishedAt,
        durationMs,
        payload: result?.payload,
        status: result?.status ?? stepStatusCompleted,
      },
      where: {
        executionId_code: {
          code: stepCode,
          executionId: context.executionId,
        },
      },
    })
  })
}

async function markExecutionFailed(
  context: UpdateExecutionContext,
  stepCode: UpdateExecutionStepCode,
  startedAt: Date,
  error: unknown,
) {
  const failedAt = context.now()
  const durationMs = Math.max(0, failedAt.getTime() - startedAt.getTime())
  const failureSummary = buildUpdateErrorSummary(error)
  const recoveryState = resolveUpdateFailureRecoveryState(stepCode)
  const currentVersion =
    stepCode === 'FINAL_VALIDATE' ? context.targetVersion : context.sourceVersion
  const manifestHash =
    stepCode === 'FINAL_VALIDATE'
      ? context.manifestHash
      : context.sourceManifestHash

  await context.prismaClient.$transaction(async (transaction) => {
    await transaction.updateExecutionStep.update({
      data: {
        durationMs,
        errorSummary: failureSummary,
        failedAt,
        status: 'FAILED',
      },
      where: {
        executionId_code: {
          code: stepCode,
          executionId: context.executionId,
        },
      },
    })

    await transaction.updateExecution.update({
      data: {
        failedAt,
        failureSummary,
        lastFailedStepCode: stepCode,
        lockExpiresAt: failedAt,
        recoveryState,
        status: 'FAILED',
      },
      where: {
        id: context.executionId,
      },
    })

    await upsertSystemRuntimeState(transaction, {
      currentVersion,
      lifecycleState: 'UPDATE_FAILED',
      maintenanceActivatedAt: failedAt,
      maintenanceReason: `Update ${context.sourceVersion} -> ${context.targetVersion} falhou em ${getUpdateExecutionStepLabel(stepCode)}.`,
      manifestHash,
      updatedByUserId: context.actor.id,
    })

    await writeAuditLog(transaction, {
      action: 'system.update.execution_failed',
      details: {
        executionId: context.executionId,
        recoveryState,
        sourceVersion: context.sourceVersion,
        stepCode,
        targetVersion: context.targetVersion,
      },
      entityId: context.executionId,
      entityName: 'UpdateExecution',
      unitId: getSystemActionUnitId(context.actor),
      userId: context.actor.id,
    })
  })
}

async function completeExecution(context: UpdateExecutionContext) {
  const completedAt = context.now()

  await context.prismaClient.$transaction(async (transaction) => {
    await transaction.updateExecution.update({
      data: {
        completedAt,
        completedByUserId: context.actor.id,
        lockExpiresAt: completedAt,
        recoveryState: 'NONE',
        status: 'COMPLETED',
      },
      where: {
        id: context.executionId,
      },
    })

    await writeAuditLog(transaction, {
      action: 'system.update.execution_completed',
      details: {
        executionId: context.executionId,
        sourceVersion: context.sourceVersion,
        targetVersion: context.targetVersion,
      },
      entityId: context.executionId,
      entityName: 'UpdateExecution',
      unitId: getSystemActionUnitId(context.actor),
      userId: context.actor.id,
    })
  })
}

async function runExecutionStep(
  context: UpdateExecutionContext,
  stepCode: UpdateExecutionStepCode,
  handler: () => Promise<StepRunResult | undefined>,
) {
  const startedAt = context.now()
  await markStepRunning(context, stepCode, startedAt)

  try {
    const result = await handler()
    await markStepCompleted(context, stepCode, startedAt, result)
    return result
  } catch (error) {
    await markExecutionFailed(context, stepCode, startedAt, error)
    throw mapUnknownToAppError(error)
  }
}

async function executeSeedPolicy(
  context: UpdateExecutionContext,
  manifest: ReleaseManifest,
) {
  switch (manifest.seedPolicy) {
    case 'none':
      return {
        payload: {
          seedPolicy: manifest.seedPolicy,
        },
        status: stepStatusSkipped,
      } satisfies StepRunResult
    case 'idempotent_bootstrap':
      await context.prismaClient.$transaction(async (transaction) => {
        await context.seedBootstrap(transaction, context.environment, {
          includeClientCommunicationPreferences: true,
          unit: {
            companyName: 'PetOS',
            unitName: 'Matriz',
            unitTimezone: context.environment.DEFAULT_TIMEZONE,
          },
        })
      })

      return {
        payload: {
          seedPolicy: manifest.seedPolicy,
        },
      } satisfies StepRunResult
    case 'manual_review':
      throw new AppError(
        'CONFLICT',
        409,
        'Esta release exige revisao manual da seed antes que o updater controlado possa continuar.',
      )
  }
}

async function executePostUpdateTasks(
  context: UpdateExecutionContext,
  manifestResult: ReleaseManifestSuccess,
) {
  if (manifestResult.manifest.postUpdateTasks.length === 0) {
    return {
      payload: {
        executedTasks: [],
      },
      status: stepStatusSkipped,
    } satisfies StepRunResult
  }

  const taskResults: Prisma.InputJsonValue[] = []

  for (const task of manifestResult.manifest.postUpdateTasks) {
    try {
      const payload = (await context.prismaClient.$transaction(async (transaction) =>
        executeRegisteredPostUpdateTask(
          task.id,
          {
            environment: context.environment,
            manifest: manifestResult.manifest,
            manifestHash: context.manifestHash,
            transaction,
          },
          context.postTaskRegistry,
        ),
      )) as Prisma.InputJsonValue

      taskResults.push({
        id: task.id,
        label: task.label,
        required: task.required,
        status: 'completed',
        payload,
      } satisfies Prisma.InputJsonObject)
    } catch (error) {
      if (task.required) {
        throw error
      }

      taskResults.push({
        errorSummary: buildUpdateErrorSummary(error),
        id: task.id,
        label: task.label,
        required: task.required,
        status: 'skipped',
      } satisfies Prisma.InputJsonObject)
    }
  }

  return {
    payload: {
      executedTasks: taskResults,
    } as Prisma.InputJsonObject,
  } satisfies StepRunResult
}

async function executeFinalValidation(
  context: UpdateExecutionContext,
) {
  const readinessChecks = await context.collectReadinessChecks(context.prismaClient)
  const readinessStatus = deriveReadinessStatus(readinessChecks)

  if (readinessStatus !== 'ok') {
    throw new AppError(
      'CONFLICT',
      409,
      'O ambiente ficou degradado depois da execucao do update.',
      readinessChecks,
    )
  }

  const runtime = await context.collectRuntimeSnapshot(
    context.prismaClient,
    context.environment,
  )

  if (runtime.lifecycleState !== 'INSTALLED') {
    throw new AppError(
      'CONFLICT',
      409,
      `O lifecycle do runtime ficou em ${runtime.lifecycleState} apos a finalizacao, mas o esperado era INSTALLED.`,
    )
  }

  if (runtime.currentInstalledVersion !== context.targetVersion) {
    throw new AppError(
      'CONFLICT',
      409,
      `A versao final do runtime ${runtime.currentInstalledVersion ?? 'null'} nao corresponde ao alvo ${context.targetVersion}.`,
    )
  }

  if (runtime.manifestHash !== context.manifestHash) {
    throw new AppError(
      'CONFLICT',
      409,
      'O hash de manifest persistido no runtime nao bate com o manifest embarcado apos a finalizacao.',
    )
  }

  return {
    payload: {
      lifecycleState: runtime.lifecycleState,
      readinessStatus,
      version: runtime.currentInstalledVersion,
    },
  } satisfies StepRunResult
}

async function acquireExecution(
  actor: AuthenticatedUserData,
  context: {
    mode: 'MANUAL' | 'RETRY'
    now: Date
    preflight: Awaited<ReturnType<typeof getUpdatePreflight>>
    prismaClient: PrismaClient
    retriedFromExecutionId?: string
    seedPolicy: ReleaseManifest['seedPolicy']
    sourceVersion: string
    targetVersion: string
  },
) {
  return context.prismaClient.$transaction(async (transaction) => {
    await expireStaleUpdateLocks(transaction, context.now)
    await assertNoActiveUpdateExecution(transaction, context.now)

    const transition = await transaction.systemRuntimeState.updateMany({
      data: {
        lastTransitionAt: context.now,
        lifecycleState: 'UPDATING',
        maintenanceActivatedAt: context.now,
        maintenanceReason: `Update controlado ${context.sourceVersion} -> ${context.targetVersion}`,
        updatedByUserId: actor.id,
      },
      where: {
        id: SYSTEM_RUNTIME_STATE_ID,
        lifecycleState: {
          in:
            context.mode === 'RETRY'
              ? ['UPDATE_FAILED']
              : ['INSTALLED', 'MAINTENANCE'],
        },
      },
    })

    if (transition.count !== 1) {
      throw new AppError(
        'CONFLICT',
        409,
        'O lifecycle do runtime mudou antes de o lock de update ser adquirido.',
      )
    }

    const execution = await transaction.updateExecution.create({
      data: {
        lockExpiresAt: resolveLockExpiresAt(context.now, updateLockTtlMs),
        manifestHash: context.preflight.versions.manifestHash ?? 'unknown',
        mode: context.mode,
        preflightSnapshot: context.preflight as unknown as Prisma.InputJsonValue,
        recoveryState: 'NONE',
        requiresBackup: context.preflight.compatibility.requiresBackup,
        requiresMaintenance: context.preflight.compatibility.requiresMaintenance,
        retriedFromExecutionId: context.retriedFromExecutionId ?? null,
        seedPolicy: context.seedPolicy,
        sourceVersion: context.sourceVersion,
        startedAt: context.now,
        startedByUserId: actor.id,
        targetVersion: context.targetVersion,
      },
    })

    await transaction.updateExecutionStep.createMany({
      data: buildExecutionSteps(execution.id),
    })

    await writeAuditLog(transaction, {
      action: 'system.update.execution_started',
      details: {
        executionId: execution.id,
        mode: context.mode,
        sourceVersion: context.sourceVersion,
        targetVersion: context.targetVersion,
      },
      entityId: execution.id,
      entityName: 'UpdateExecution',
      unitId: getSystemActionUnitId(actor),
      userId: actor.id,
    })

    return execution
  })
}

async function executeUpdateFlow(
  actor: AuthenticatedUserData,
  input: ExecuteUpdateInput,
  dependencies: UpdateExecutionDependencies = {},
) {
  assertPermission(actor, 'sistema.update.operar')

  const environment = dependencies.environment ?? getEnv()
  const prismaClient = dependencies.prismaClient ?? prisma
  const manifestResult =
    dependencies.manifestResult ?? loadEmbeddedReleaseManifest()
  const now = dependencies.now ?? (() => new Date())
  const prismaCapabilities =
    dependencies.prismaCapabilities ?? getPrismaRuntimeCapabilities()
  const migrateRunner = dependencies.migrateRunner ?? runPrismaMigrateDeploy
  const collectReadinessChecks =
    dependencies.readinessCollector ?? collectDatabaseReadinessChecks
  const collectRuntimeSnapshotFn =
    dependencies.runtimeCollector ?? collectSystemRuntimeSnapshot
  const seedBootstrap = dependencies.seedBootstrap ?? bootstrapCorePetOS
  const preflightReadinessChecks = await collectReadinessChecks(prismaClient)
  const preflightRuntime = await collectRuntimeSnapshotFn(prismaClient, environment)

  if (!manifestResult.ok) {
    throw new AppError(
      'CONFLICT',
      409,
      `O manifest embarcado da release esta invalido: ${manifestResult.error}`,
    )
  }

  const preflight = await getUpdatePreflight(actor, {
    allowedLifecycleStates:
      input.mode === 'RETRY' ? ['UPDATE_FAILED'] : ['INSTALLED', 'MAINTENANCE'],
    buildVersion: dependencies.buildVersion,
    environment,
    manifestResult,
    prismaCapabilities,
    prismaClient,
    readinessChecks: preflightReadinessChecks,
    runtime: preflightRuntime,
  })

  if (!preflight.compatibility.canProceedToExecution) {
    throw buildPreflightBlockingError(preflight)
  }

  if (preflight.compatibility.requiresBackup && !input.backupConfirmed) {
    throw new AppError(
      'CONFLICT',
      409,
      'Esta release exige confirmacao explicita de backup antes do inicio da execucao.',
    )
  }

  const sourceVersion = preflight.versions.currentInstalledVersion
  const targetVersion = manifestResult.manifest.version
  let retriedFromExecutionId: string | undefined
  if (input.mode === 'RETRY') {
    const previousExecution = await prismaClient.updateExecution.findUnique({
      where: {
        id: input.executionId ?? '',
      },
    })

    if (
      !previousExecution ||
      previousExecution.status !== 'FAILED' ||
      previousExecution.recoveryState !== 'RETRY_AVAILABLE'
    ) {
      throw new AppError(
        'CONFLICT',
        409,
        'Somente execucoes com falha marcadas explicitamente como reexecutaveis podem ser retentadas.',
      )
    }

    if (previousExecution.targetVersion !== targetVersion) {
      throw new AppError(
        'CONFLICT',
        409,
        'A execucao reexecutavel aponta para uma release diferente do manifest embarcado atual.',
      )
    }

    retriedFromExecutionId = previousExecution.id
  }

  if (!sourceVersion) {
    throw new AppError(
      'CONFLICT',
      409,
      'A versao de origem nao esta registrada e o update nao pode ser executado com seguranca.',
    )
  }

  const execution = await acquireExecution(actor, {
    mode: input.mode,
    now: now(),
    preflight,
    prismaClient,
    retriedFromExecutionId,
    seedPolicy: manifestResult.manifest.seedPolicy,
    sourceVersion,
    targetVersion,
  })

  const executionContext: UpdateExecutionContext = {
    actor,
    environment,
    executionId: execution.id,
    collectReadinessChecks,
    collectRuntimeSnapshot: collectRuntimeSnapshotFn,
    lockTtlMs: updateLockTtlMs,
    manifestHash: manifestResult.hash,
    migrateRunner,
    now,
    postTaskRegistry: dependencies.postTaskRegistry ?? builtInUpdatePostTasks,
    prismaCapabilities,
    prismaClient,
    seedBootstrap,
    sourceManifestHash: preflight.versions.persistedManifestHash,
    sourceVersion,
    targetVersion,
  }

  try {
    await runExecutionStep(
      executionContext,
      'PRECHECK_REVALIDATION',
      async () => ({
        payload: {
          gateCount: preflight.gates.length,
          preflightStatus: preflight.status,
        },
      }),
    )

    await runExecutionStep(
      executionContext,
      'ENTER_MAINTENANCE',
      async () => {
        const runtime = await executionContext.collectRuntimeSnapshot(
          prismaClient,
          environment,
        )

        if (runtime.lifecycleState !== 'UPDATING') {
          throw new AppError(
            'CONFLICT',
            409,
            `O lifecycle do runtime ficou em ${runtime.lifecycleState} depois do lock de update, mas o esperado era UPDATING.`,
          )
        }

        return {
          payload: {
            lifecycleState: runtime.lifecycleState,
            maintenanceReason: runtime.maintenanceReason,
          },
        }
      },
    )

    await runExecutionStep(
      executionContext,
      'APPLY_MIGRATIONS',
      async () => {
        await executionContext.migrateRunner(prismaCapabilities, {
          operation: 'update execution',
        })

        return {
          payload: {
            schemaPath: prismaCapabilities.schemaPath,
          },
        }
      },
    )

    await runExecutionStep(
      executionContext,
      'APPLY_SEED_POLICY',
      async () => executeSeedPolicy(executionContext, manifestResult.manifest),
    )

    await runExecutionStep(
      executionContext,
      'RUN_POST_UPDATE_TASKS',
      async () => executePostUpdateTasks(executionContext, manifestResult),
    )

    await runExecutionStep(
      executionContext,
      'FINALIZE_RUNTIME',
      async () => {
        const finalizedAt = now()

        await prismaClient.$transaction(async (transaction) => {
          await upsertSystemRuntimeState(transaction, {
            currentVersion: targetVersion,
            lifecycleState: 'INSTALLED',
            maintenanceActivatedAt: null,
            maintenanceReason: null,
            manifestHash: manifestResult.hash,
            previousVersion: sourceVersion,
            updatedByUserId: actor.id,
          })

          await transaction.updateExecution.update({
            data: {
              maintenanceExitedAt: finalizedAt,
            },
            where: {
              id: execution.id,
            },
          })
        })

        return {
          payload: {
            finalizedAt: finalizedAt.toISOString(),
            targetVersion,
          },
        }
      },
    )

    await runExecutionStep(
      executionContext,
      'FINAL_VALIDATE',
      async () => executeFinalValidation(executionContext),
    )

    await completeExecution(executionContext)
  } catch {
    return getUpdateExecutionDetails(actor, {
      executionId: execution.id,
      prismaClient,
    })
  }

  return getUpdateExecutionDetails(actor, {
    executionId: execution.id,
    prismaClient,
  })
}

export async function startUpdateExecution(
  actor: AuthenticatedUserData,
  input: StartUpdateExecutionInput,
  dependencies: UpdateExecutionDependencies = {},
) {
  return executeUpdateFlow(
    actor,
    {
      backupConfirmed: input.backupConfirmed,
      mode: 'MANUAL',
    },
    dependencies,
  )
}

export async function retryUpdateExecution(
  actor: AuthenticatedUserData,
  input: RetryUpdateExecutionInput,
  dependencies: UpdateExecutionDependencies = {},
) {
  return executeUpdateFlow(
    actor,
    {
      backupConfirmed: input.backupConfirmed,
      executionId: input.executionId,
      mode: 'RETRY',
    },
    dependencies,
  )
}
