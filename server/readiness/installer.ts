import type { PrismaClient } from '@prisma/client'
import type { Environment } from '@/server/env'
import { collectSystemRuntimeSnapshot, type SystemRuntimeSnapshot } from '@/server/system/runtime-state'
import {
  getPrismaRuntimeCapabilities,
  type PrismaRuntimeCapabilities,
} from '@/server/system/prisma-runtime'

export type InstallerPreflightCheckStatus = 'ok' | 'warn' | 'fail'
export type InstallerPreflightCheckName =
  | 'environment'
  | 'database'
  | 'migrations'
  | 'seed'
  | 'system'

export interface InstallerPreflightCheck {
  message: string
  name: InstallerPreflightCheckName
  status: InstallerPreflightCheckStatus
}

export interface InstallerPreflightSnapshot {
  canProceed: boolean
  checks: InstallerPreflightCheck[]
  runtime: SystemRuntimeSnapshot
  status: 'ready' | 'blocked'
}

type InstallerReadinessDatabaseClient = Pick<
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

function deriveInstallerPreflightStatus(checks: InstallerPreflightCheck[]) {
  return checks.some((check) => check.status === 'fail') ? 'blocked' : 'ready'
}

export async function collectInstallerPreflightSnapshot(
  prisma: InstallerReadinessDatabaseClient,
  environment: Environment,
  runtimeCapabilities: PrismaRuntimeCapabilities = getPrismaRuntimeCapabilities(),
): Promise<InstallerPreflightSnapshot> {
  const runtime = await collectSystemRuntimeSnapshot(prisma, environment)
  const checks: InstallerPreflightCheck[] = [
    {
      message: 'Ambiente carregado com sucesso para o modo instalador.',
      name: 'environment',
      status: 'ok',
    },
  ]

  if (!environment.INSTALLER_ENABLED) {
    checks.push({
      message: 'O modo instalador esta desabilitado neste ambiente.',
      name: 'system',
      status: 'fail',
    })
  } else if (!runtime.installerTokenConfigured) {
    checks.push({
      message: 'O token de bootstrap do instalador nao esta configurado.',
      name: 'system',
      status: 'fail',
    })
  } else {
    checks.push({
      message: 'O modo instalador esta habilitado e protegido por token de bootstrap.',
      name: 'system',
      status: 'ok',
    })
  }

  if (!runtime.databaseAvailable) {
    checks.push({
      message:
        'A conexao com o banco falhou. O instalador nao pode continuar ate o MySQL ficar acessivel.',
      name: 'database',
      status: 'fail',
    })

    return {
      canProceed: false,
      checks,
      runtime,
      status: 'blocked',
    }
  }

  checks.push({
    message: 'Conexao com o banco estabelecida para o preflight do instalador.',
    name: 'database',
    status: 'ok',
  })

  if (!runtime.migrationsTableAvailable) {
    if (runtimeCapabilities.canRunMigrateDeploy) {
      checks.push({
        message:
          'As migrations do Prisma ainda nao foram aplicadas. Este runtime consegue inicializar o schema durante o finalize do setup.',
        name: 'migrations',
        status: 'warn',
      })
    } else {
      checks.push({
        message:
          runtimeCapabilities.reason ??
          'Prisma migrations are still missing and this runtime cannot execute migrate deploy automatically.',
        name: 'migrations',
        status: 'fail',
      })
    }
  } else {
    checks.push({
      message: 'Tabela de migrations do Prisma detectada.',
      name: 'migrations',
      status: 'ok',
    })
  }

  if (runtime.recordExists && runtime.lifecycleState !== 'NOT_INSTALLED') {
    checks.push({
      message: `O runtime ja esta em ${runtime.lifecycleState}. Use repair ou update em vez do instalador inicial.`,
      name: 'system',
      status: 'fail',
    })
  } else if (!runtime.recordExists && runtime.coreSeedAvailable) {
    checks.push({
      message:
        'A seed base ja existe neste banco. Trate este ambiente como instalado e use repair ou update em vez do instalador inicial.',
      name: 'seed',
      status: 'fail',
    })
  } else {
    checks.push({
      message:
        'A seed base ainda nao existe. O instalador pode criar permissoes, configuracoes e o admin inicial com seguranca.',
      name: 'seed',
      status: 'warn',
    })
  }

  const status = deriveInstallerPreflightStatus(checks)

  return {
    canProceed: status === 'ready' && runtime.lifecycleState === 'NOT_INSTALLED',
    checks,
    runtime,
    status,
  }
}
