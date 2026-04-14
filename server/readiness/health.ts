import type { Environment } from '@/server/env'
import type { ReadinessCheck } from './database'
import { deriveReadinessStatus } from './database'
import type { SystemRuntimeSnapshot } from '@/server/system/runtime-state'

export interface OperationalHealthLifecycleSnapshot {
  currentInstalledVersion: string | null
  installerEnabled: boolean
  installerLocked: boolean
  maintenanceActive: boolean
  source: SystemRuntimeSnapshot['lifecycleSource']
  state: SystemRuntimeSnapshot['lifecycleState']
}

export interface OperationalHealthSnapshot {
  checks: ReadinessCheck[]
  failureStage: 'environment' | 'diagnostics' | null
  lifecycle: OperationalHealthLifecycleSnapshot | null
  service: string | null
  status: 'ok' | 'degraded'
}

interface CollectOperationalHealthSnapshotOptions {
  databaseCollector: () => Promise<ReadinessCheck[]>
  environmentLoader: () => Environment
  runtimeCollector: (environment: Environment) => Promise<SystemRuntimeSnapshot>
}

export function buildEnvironmentHealthCheck(): ReadinessCheck {
  return {
    message: 'Ambiente carregado com sucesso.',
    name: 'environment',
    status: 'ok',
  }
}

export function buildEnvironmentHealthFailureCheck(): ReadinessCheck {
  return {
    message: 'As variaveis de ambiente obrigatorias estao ausentes ou invalidas.',
    name: 'environment',
    status: 'fail',
  }
}

export function buildOperationalDiagnosticsFailureCheck(): ReadinessCheck {
  return {
    message:
      'O ambiente foi carregado, mas o diagnostico operacional nao conseguiu concluir runtime e readiness. Revise logs e bootstrap antes de tratar este host como saudavel.',
    name: 'runtime',
    status: 'fail',
  }
}

export function buildRuntimeReadinessCheck(
  runtime: SystemRuntimeSnapshot,
): ReadinessCheck {
  if (runtime.lifecycleState === 'INSTALLED') {
    return {
      message: `Runtime operacional na versao ${runtime.currentInstalledVersion ?? runtime.buildVersion}.`,
      name: 'runtime',
      status: 'ok',
    }
  }

  if (runtime.lifecycleState === 'NOT_INSTALLED') {
    return {
      message:
        'Runtime ainda nao instalado. Conclua o setup integrado antes de considerar este ambiente saudavel.',
      name: 'runtime',
      status: 'fail',
    }
  }

  if (runtime.lifecycleState === 'UNKNOWN') {
    return {
      message:
        'Nao foi possivel determinar o lifecycle do runtime porque o banco ou o estado persistido nao estao acessiveis.',
      name: 'runtime',
      status: 'fail',
    }
  }

  return {
    message: `Runtime retido em ${runtime.lifecycleState}. O trafego publico deve continuar bloqueado ate o operador concluir a operacao controlada.`,
    name: 'runtime',
    status: 'fail',
  }
}

function createLifecycleSnapshot(
  runtime: SystemRuntimeSnapshot,
): OperationalHealthLifecycleSnapshot {
  return {
    currentInstalledVersion: runtime.currentInstalledVersion,
    installerEnabled: runtime.installerEnabled,
    installerLocked: runtime.installerLocked,
    maintenanceActive: runtime.maintenanceActive,
    source: runtime.lifecycleSource,
    state: runtime.lifecycleState,
  }
}

export async function collectOperationalHealthSnapshot(
  options: CollectOperationalHealthSnapshotOptions,
): Promise<OperationalHealthSnapshot> {
  let environment: Environment

  try {
    environment = options.environmentLoader()
  } catch {
    return {
      checks: [buildEnvironmentHealthFailureCheck()],
      failureStage: 'environment',
      lifecycle: null,
      service: null,
      status: 'degraded',
    }
  }

  try {
    const runtime = await options.runtimeCollector(environment)
    const checks = [
      buildEnvironmentHealthCheck(),
      buildRuntimeReadinessCheck(runtime),
      ...(await options.databaseCollector()),
    ]

    return {
      checks,
      failureStage: null,
      lifecycle: createLifecycleSnapshot(runtime),
      service: environment.APP_NAME,
      status: deriveReadinessStatus(checks),
    }
  } catch {
    return {
      checks: [
        buildEnvironmentHealthCheck(),
        buildOperationalDiagnosticsFailureCheck(),
      ],
      failureStage: 'diagnostics',
      lifecycle: null,
      service: environment.APP_NAME,
      status: 'degraded',
    }
  }
}
