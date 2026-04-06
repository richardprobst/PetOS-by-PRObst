import type {
  UpdateExecutionStatus,
  UpdateRecoveryState,
} from '@prisma/client'
import type { ReadinessCheck } from '@/server/readiness/database'
import type { Environment } from '@/server/env'
import type { PrismaRuntimeCapabilities } from '@/server/system/prisma-runtime'
import type { ReleaseManifestLoadResult } from '@/server/system/release-manifest'
import type {
  EffectiveSystemLifecycleState,
  SystemRuntimeSnapshot,
} from '@/server/system/runtime-state'
import { compareSystemVersions, parseSystemVersion } from '@/server/system/version'

export type UpdatePreflightStatus = 'ok' | 'warning' | 'blocking'
export type UpdateType = 'none' | 'upgrade' | 'downgrade' | 'unknown'

export interface UpdatePreflightGate {
  code: string
  message: string
  status: UpdatePreflightStatus
}

export interface UpdateVersionSnapshot {
  buildVersion: string
  currentInstalledVersion: string | null
  currentVersionSource: 'missing' | 'persisted' | 'untrusted'
  manifestHash: string | null
  manifestVersion: string | null
  persistedManifestHash: string | null
}

export interface UpdateCompatibilitySnapshot {
  canProceedToExecution: boolean
  requiresBackup: boolean
  requiresMaintenance: boolean
  supported: boolean
  updateType: UpdateType
}

export interface UpdateRuntimeCapabilitySnapshot {
  canRunMigrateDeploy: boolean
  reason: string | null
}

export interface UpdatePreflightReport {
  compatibility: UpdateCompatibilitySnapshot
  gates: UpdatePreflightGate[]
  readiness: {
    checks: ReadinessCheck[]
    status: 'degraded' | 'ok'
  }
  runtime: Pick<
    SystemRuntimeSnapshot,
    | 'lifecycleState'
    | 'lifecycleSource'
    | 'lastTransitionAt'
    | 'maintenanceActive'
    | 'maintenanceReason'
    | 'recordExists'
  >
  runtimeCapabilities: UpdateRuntimeCapabilitySnapshot
  status: UpdatePreflightStatus
  versions: UpdateVersionSnapshot
}

export const updateExecutionStepDefinitions = [
  {
    code: 'PRECHECK_REVALIDATION',
    label: 'Revalidar preflight',
  },
  {
    code: 'ENTER_MAINTENANCE',
    label: 'Entrar em maintenance',
  },
  {
    code: 'APPLY_MIGRATIONS',
    label: 'Aplicar migrations',
  },
  {
    code: 'APPLY_SEED_POLICY',
    label: 'Aplicar seed policy',
  },
  {
    code: 'RUN_POST_UPDATE_TASKS',
    label: 'Executar tasks pos-update',
  },
  {
    code: 'FINALIZE_RUNTIME',
    label: 'Finalizar runtime',
  },
  {
    code: 'FINAL_VALIDATE',
    label: 'Validar resultado final',
  },
] as const

export type UpdateExecutionStepCode =
  (typeof updateExecutionStepDefinitions)[number]['code']

type BuildUpdatePreflightInput = {
  allowedLifecycleStates?: readonly EffectiveSystemLifecycleState[]
  buildVersion: string
  environment: Environment
  manifestResult: ReleaseManifestLoadResult
  prismaCapabilities: PrismaRuntimeCapabilities
  readinessChecks: ReadinessCheck[]
  readinessStatus: 'degraded' | 'ok'
  runtime: SystemRuntimeSnapshot
}

const defaultCompatibleLifecycleStates: EffectiveSystemLifecycleState[] = [
  'INSTALLED',
  'MAINTENANCE',
]

const retryableFailureSteps = new Set<UpdateExecutionStepCode>([
  'RUN_POST_UPDATE_TASKS',
])

function deriveCurrentVersionSource(
  runtime: SystemRuntimeSnapshot,
): UpdateVersionSnapshot['currentVersionSource'] {
  if (!runtime.currentInstalledVersion) {
    return 'missing'
  }

  return runtime.recordExists && runtime.lifecycleSource === 'persisted'
    ? 'persisted'
    : 'untrusted'
}

function deriveUpdateType(
  currentVersion: string | null,
  targetVersion: string | null,
): UpdateType {
  if (!currentVersion || !targetVersion) {
    return 'unknown'
  }

  const comparison = compareSystemVersions(targetVersion, currentVersion)

  if (comparison === 0) {
    return 'none'
  }

  return comparison > 0 ? 'upgrade' : 'downgrade'
}

function isSupportedSequentialUpgrade(fromVersion: string, toVersion: string) {
  const from = parseSystemVersion(fromVersion)
  const to = parseSystemVersion(toVersion)

  if (!from || !to) {
    return false
  }

  if (to.major !== from.major) {
    return false
  }

  if (to.minor === from.minor) {
    return to.patch >= from.patch
  }

  return to.minor - from.minor === 1 && to.patch >= 0
}

function isEnvironmentValuePresent(value: Environment[keyof Environment]) {
  if (value === undefined || value === null) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim() !== ''
  }

  return true
}

function pushGate(
  gates: UpdatePreflightGate[],
  code: string,
  status: UpdatePreflightStatus,
  message: string,
) {
  gates.push({ code, message, status })
}

export function getUpdateExecutionStatusTone(status: UpdateExecutionStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const
    case 'FAILED':
      return 'danger' as const
    case 'PREPARING':
      return 'warning' as const
    case 'RUNNING':
      return 'info' as const
  }
}

export function getUpdateRecoveryStateTone(state: UpdateRecoveryState) {
  switch (state) {
    case 'NONE':
      return 'success' as const
    case 'RETRY_AVAILABLE':
      return 'warning' as const
    case 'MANUAL_INTERVENTION_REQUIRED':
      return 'danger' as const
  }
}

export function getUpdateRecoveryStateLabel(state: UpdateRecoveryState) {
  switch (state) {
    case 'NONE':
      return 'Sem recovery pendente'
    case 'RETRY_AVAILABLE':
      return 'Retentativa permitida'
    case 'MANUAL_INTERVENTION_REQUIRED':
      return 'Intervencao manual obrigatoria'
  }
}

export function getUpdateExecutionStepLabel(code: UpdateExecutionStepCode) {
  return (
    updateExecutionStepDefinitions.find((step) => step.code === code)?.label ?? code
  )
}

export function resolveUpdateFailureRecoveryState(stepCode: UpdateExecutionStepCode) {
  return retryableFailureSteps.has(stepCode)
    ? ('RETRY_AVAILABLE' as const)
    : ('MANUAL_INTERVENTION_REQUIRED' as const)
}

export function canRetryFailedUpdateExecution(
  status: UpdateExecutionStatus,
  recoveryState: UpdateRecoveryState,
) {
  return status === 'FAILED' && recoveryState === 'RETRY_AVAILABLE'
}

export function buildUpdatePreflightReport(
  input: BuildUpdatePreflightInput,
): UpdatePreflightReport {
  const gates: UpdatePreflightGate[] = []
  const currentVersionSource = deriveCurrentVersionSource(input.runtime)
  const allowedLifecycleStates = new Set(
    input.allowedLifecycleStates ?? defaultCompatibleLifecycleStates,
  )
  const versions: UpdateVersionSnapshot = {
    buildVersion: input.buildVersion,
    currentInstalledVersion: input.runtime.currentInstalledVersion,
    currentVersionSource,
    manifestHash: input.manifestResult.ok ? input.manifestResult.hash : null,
    manifestVersion: input.manifestResult.ok ? input.manifestResult.manifest.version : null,
    persistedManifestHash: input.runtime.manifestHash,
  }

  if (!allowedLifecycleStates.has(input.runtime.lifecycleState)) {
    pushGate(
      gates,
      'runtime.lifecycle.incompatible',
      'blocking',
      `The updater preflight only supports environments currently in ${[...allowedLifecycleStates].join(', ')}. Current state: ${input.runtime.lifecycleState}.`,
    )
  } else {
    pushGate(
      gates,
      'runtime.lifecycle.compatible',
      'ok',
      `Runtime lifecycle ${input.runtime.lifecycleState} can be inspected safely for update planning.`,
    )
  }

  if (input.readinessStatus !== 'ok') {
    pushGate(
      gates,
      'runtime.readiness.degraded',
      'blocking',
      'The environment is degraded before the update starts. Resolve database, migrations or seed issues before planning execution.',
    )
  } else {
    pushGate(
      gates,
      'runtime.readiness.ok',
      'ok',
      'Database, migrations and base seed are healthy enough for update planning.',
    )
  }

  if (!input.prismaCapabilities.canRunMigrateDeploy) {
    pushGate(
      gates,
      'runtime.migrate.unavailable',
      'blocking',
      input.prismaCapabilities.reason ??
        'Prisma migrate deploy is not available in this runtime.',
    )
  } else {
    pushGate(
      gates,
      'runtime.migrate.available',
      'ok',
      'Runtime Prisma migrate deploy capability is available for controlled execution.',
    )
  }

  if (!input.manifestResult.ok) {
    pushGate(
      gates,
      'target.manifest.invalid',
      'blocking',
      `The embedded release manifest is invalid: ${input.manifestResult.error}`,
    )
  } else if (input.manifestResult.manifest.version !== input.buildVersion) {
    pushGate(
      gates,
      'target.version.mismatch',
      'blocking',
      `Build version ${input.buildVersion} does not match manifest version ${input.manifestResult.manifest.version}.`,
    )
  } else {
    pushGate(
      gates,
      'target.manifest.ok',
      'ok',
      `Embedded release manifest loaded successfully for target ${input.manifestResult.manifest.version}.`,
    )

    if (
      input.runtime.manifestHash &&
      input.runtime.currentInstalledVersion === input.manifestResult.manifest.version &&
      input.runtime.manifestHash !== input.manifestResult.hash
    ) {
      pushGate(
        gates,
        'target.manifest.drift',
        'blocking',
        'The persisted manifest hash does not match the embedded release manifest for the same version. Review the release artifact before proceeding.',
      )
    }
  }

  if (currentVersionSource === 'missing') {
    pushGate(
      gates,
      'current.version.missing',
      'blocking',
      'The currently installed version could not be determined from runtime state.',
    )
  } else if (currentVersionSource === 'untrusted') {
    pushGate(
      gates,
      'current.version.untrusted',
      'blocking',
      'The currently installed version is only inferred. Persisted runtime metadata is required before a controlled update can proceed.',
    )
  } else {
    pushGate(
      gates,
      'current.version.persisted',
      'ok',
      `Current installed version ${input.runtime.currentInstalledVersion} is persisted and can be used as the update source.`,
    )
  }

  const updateType = deriveUpdateType(
    input.runtime.currentInstalledVersion,
    input.manifestResult.ok ? input.manifestResult.manifest.version : null,
  )

  if (updateType === 'none') {
    pushGate(
      gates,
      'update.noop',
      'warning',
      'The current installed version already matches the target release. No update execution is needed.',
    )
  } else if (updateType === 'downgrade') {
    pushGate(
      gates,
      'update.downgrade.unsupported',
      'blocking',
      'Controlled downgrade is not supported by the updater core.',
    )
  } else if (
    updateType === 'upgrade' &&
    input.runtime.currentInstalledVersion &&
    input.manifestResult.ok
  ) {
    const sourceVersion = input.runtime.currentInstalledVersion
    const targetVersion = input.manifestResult.manifest.version

    if (
      compareSystemVersions(
        sourceVersion,
        input.manifestResult.manifest.minSupportedFrom,
      ) < 0
    ) {
      pushGate(
        gates,
        'update.source.unsupported',
        'blocking',
        `Source version ${sourceVersion} is below the minimum supported version ${input.manifestResult.manifest.minSupportedFrom}.`,
      )
    } else if (!isSupportedSequentialUpgrade(sourceVersion, targetVersion)) {
      pushGate(
        gates,
        'update.jump.unsupported',
        'blocking',
        `The jump from ${sourceVersion} to ${targetVersion} is not homologated for controlled execution.`,
      )
    } else {
      pushGate(
        gates,
        'update.path.supported',
        'ok',
        `Controlled upgrade path ${sourceVersion} -> ${targetVersion} is supported by the updater core.`,
      )
    }
  }

  if (input.manifestResult.ok) {
    for (const key of input.manifestResult.manifest.newRequiredEnvKeys) {
      if (!isEnvironmentValuePresent(input.environment[key])) {
        pushGate(
          gates,
          `env.${key}.missing`,
          'blocking',
          `The target release requires ${key}, but that key is missing in the current environment.`,
        )
      }
    }

    if (input.manifestResult.manifest.requiresMaintenance) {
      pushGate(
        gates,
        'update.maintenance.required',
        input.runtime.lifecycleState === 'MAINTENANCE' ? 'ok' : 'warning',
        input.runtime.lifecycleState === 'MAINTENANCE'
          ? 'Maintenance mode is already active for this environment.'
          : 'The target release requires an explicit maintenance window before execution.',
      )
    }

    if (input.manifestResult.manifest.requiresBackup) {
      pushGate(
        gates,
        'update.backup.required',
        'warning',
        'The target release requires a confirmed logical backup before execution.',
      )
    }
  }

  const status: UpdatePreflightStatus = gates.some(
    (gate) => gate.status === 'blocking',
  )
    ? 'blocking'
    : gates.some((gate) => gate.status === 'warning')
      ? 'warning'
      : 'ok'

  const compatibility: UpdateCompatibilitySnapshot = {
    canProceedToExecution: status !== 'blocking' && updateType === 'upgrade',
    requiresBackup: input.manifestResult.ok
      ? input.manifestResult.manifest.requiresBackup
      : false,
    requiresMaintenance: input.manifestResult.ok
      ? input.manifestResult.manifest.requiresMaintenance
      : false,
    supported: !gates.some(
      (gate) =>
        gate.code === 'update.downgrade.unsupported' ||
        gate.code === 'update.jump.unsupported' ||
        gate.code === 'update.source.unsupported' ||
        gate.code === 'target.version.mismatch' ||
        gate.code === 'target.manifest.invalid',
    ),
    updateType,
  }

  return {
    compatibility,
    gates,
    readiness: {
      checks: input.readinessChecks,
      status: input.readinessStatus,
    },
    runtime: {
      lastTransitionAt: input.runtime.lastTransitionAt,
      lifecycleSource: input.runtime.lifecycleSource,
      lifecycleState: input.runtime.lifecycleState,
      maintenanceActive: input.runtime.maintenanceActive,
      maintenanceReason: input.runtime.maintenanceReason,
      recordExists: input.runtime.recordExists,
    },
    runtimeCapabilities: {
      canRunMigrateDeploy: input.prismaCapabilities.canRunMigrateDeploy,
      reason: input.prismaCapabilities.reason ?? null,
    },
    status,
    versions,
  }
}
