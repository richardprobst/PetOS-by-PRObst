import type {
  UpdateExecutionMode,
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
  title: string
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
    label: 'Entrar em manutencao',
  },
  {
    code: 'APPLY_MIGRATIONS',
    label: 'Aplicar migrations',
  },
  {
    code: 'APPLY_SEED_POLICY',
    label: 'Aplicar politica de seed',
  },
  {
    code: 'RUN_POST_UPDATE_TASKS',
    label: 'Executar tarefas pos-update',
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
  gates.push({ code, message, status, title: resolveUpdateGateTitle(code) })
}

function resolveUpdateGateTitle(code: string) {
  if (code.startsWith('env.') && code.endsWith('.missing')) {
    return `Variavel obrigatoria ausente: ${code.slice(4, -('.missing'.length))}`
  }

  const labels: Record<string, string> = {
    'current.version.missing': 'Versao atual nao registrada',
    'current.version.persisted': 'Versao atual persistida',
    'current.version.untrusted': 'Versao atual apenas inferida',
    'runtime.lifecycle.compatible': 'Lifecycle compativel com planejamento',
    'runtime.lifecycle.incompatible': 'Lifecycle atual bloqueia o updater',
    'runtime.migrate.available': 'Runtime com migrate deploy',
    'runtime.migrate.unavailable': 'Runtime sem migrate deploy',
    'runtime.readiness.degraded': 'Readiness degradada antes do update',
    'runtime.readiness.ok': 'Readiness valida para planejamento',
    'target.manifest.drift': 'Manifest persistido diverge do build',
    'target.manifest.invalid': 'Manifest embarcado invalido',
    'target.manifest.ok': 'Manifest embarcado consistente',
    'target.version.mismatch': 'Versao do build diverge do manifest',
    'update.backup.required': 'Backup logico exigido',
    'update.downgrade.unsupported': 'Downgrade nao suportado',
    'update.jump.unsupported': 'Salto de versao nao homologado',
    'update.maintenance.required': 'Janela de manutencao exigida',
    'update.noop': 'Nenhum update aplicavel',
    'update.path.supported': 'Caminho de update suportado',
    'update.source.unsupported': 'Versao de origem fora da janela suportada',
  }

  return labels[code] ?? code
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

export function getUpdateExecutionStatusLabel(status: UpdateExecutionStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'Concluida'
    case 'FAILED':
      return 'Falhou'
    case 'PREPARING':
      return 'Preparando'
    case 'RUNNING':
      return 'Em execucao'
  }
}

export function getUpdateTypeLabel(type: UpdateType) {
  switch (type) {
    case 'downgrade':
      return 'Downgrade'
    case 'none':
      return 'Sem update'
    case 'unknown':
      return 'Indeterminado'
    case 'upgrade':
      return 'Upgrade'
  }
}

export function getUpdateExecutionModeLabel(mode: UpdateExecutionMode) {
  switch (mode) {
    case 'MANUAL':
      return 'Manual'
    case 'RETRY':
      return 'Retentativa'
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
      `O preflight do updater so suporta ambientes atualmente em ${[...allowedLifecycleStates].join(', ')}. Estado atual: ${input.runtime.lifecycleState}.`,
    )
  } else {
    pushGate(
      gates,
      'runtime.lifecycle.compatible',
      'ok',
      `O lifecycle ${input.runtime.lifecycleState} permite planejar o update com seguranca.`,
    )
  }

  if (input.readinessStatus !== 'ok') {
    pushGate(
      gates,
      'runtime.readiness.degraded',
      'blocking',
      'O ambiente ja esta degradado antes do update. Resolva banco, migrations ou seed antes de planejar a execucao.',
    )
  } else {
    pushGate(
      gates,
      'runtime.readiness.ok',
      'ok',
      'Banco, migrations e seed base estao saudaveis o suficiente para planejar o update.',
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
      'O runtime atual consegue executar `prisma migrate deploy` de forma controlada.',
    )
  }

  if (!input.manifestResult.ok) {
    pushGate(
      gates,
      'target.manifest.invalid',
      'blocking',
      `O manifest embarcado da release esta invalido: ${input.manifestResult.error}`,
    )
  } else if (input.manifestResult.manifest.version !== input.buildVersion) {
    pushGate(
      gates,
      'target.version.mismatch',
      'blocking',
      `A versao do build ${input.buildVersion} diverge da versao ${input.manifestResult.manifest.version} declarada no manifest.`,
    )
  } else {
    pushGate(
      gates,
      'target.manifest.ok',
      'ok',
      `O manifest embarcado foi carregado com sucesso para o alvo ${input.manifestResult.manifest.version}.`,
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
        'O hash de manifest persistido nao bate com o manifest embarcado para a mesma versao. Revise o artefato antes de seguir.',
      )
    }
  }

  if (currentVersionSource === 'missing') {
    pushGate(
      gates,
      'current.version.missing',
      'blocking',
      'A versao atualmente instalada nao pode ser determinada a partir do runtime state.',
    )
  } else if (currentVersionSource === 'untrusted') {
    pushGate(
      gates,
      'current.version.untrusted',
      'blocking',
      'A versao atualmente instalada esta apenas inferida. O update controlado exige metadata persistida de runtime.',
    )
  } else {
    pushGate(
      gates,
      'current.version.persisted',
      'ok',
      `A versao instalada ${input.runtime.currentInstalledVersion} esta persistida e pode ser usada como origem do update.`,
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
      'A versao instalada ja corresponde a release alvo. Nenhuma execucao de update e necessaria.',
    )
  } else if (updateType === 'downgrade') {
    pushGate(
      gates,
      'update.downgrade.unsupported',
      'blocking',
      'O updater core nao suporta downgrade controlado.',
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
        `A versao de origem ${sourceVersion} esta abaixo da minima suportada ${input.manifestResult.manifest.minSupportedFrom}.`,
      )
    } else if (!isSupportedSequentialUpgrade(sourceVersion, targetVersion)) {
      pushGate(
        gates,
        'update.jump.unsupported',
        'blocking',
        `O salto de ${sourceVersion} para ${targetVersion} ainda nao esta homologado para execucao controlada.`,
      )
    } else {
      pushGate(
        gates,
        'update.path.supported',
        'ok',
        `O caminho controlado ${sourceVersion} -> ${targetVersion} e suportado pelo updater core.`,
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
          `A release alvo exige ${key}, mas essa variavel esta ausente no ambiente atual.`,
        )
      }
    }

    if (input.manifestResult.manifest.requiresMaintenance) {
      pushGate(
        gates,
        'update.maintenance.required',
        input.runtime.lifecycleState === 'MAINTENANCE' ? 'ok' : 'warning',
        input.runtime.lifecycleState === 'MAINTENANCE'
          ? 'A manutencao ja esta ativa neste ambiente.'
          : 'A release alvo exige uma janela explicita de manutencao antes da execucao.',
      )
    }

    if (input.manifestResult.manifest.requiresBackup) {
      pushGate(
        gates,
        'update.backup.required',
        'warning',
        'A release alvo exige confirmacao de backup logico antes da execucao.',
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
