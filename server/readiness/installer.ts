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
  | '$queryRawUnsafe'
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
      message: 'Environment parsed successfully for installer mode.',
      name: 'environment',
      status: 'ok',
    },
  ]

  if (!environment.INSTALLER_ENABLED) {
    checks.push({
      message: 'Installer mode is disabled in the environment.',
      name: 'system',
      status: 'fail',
    })
  } else if (!runtime.installerTokenConfigured) {
    checks.push({
      message: 'Installer bootstrap token is not configured.',
      name: 'system',
      status: 'fail',
    })
  } else {
    checks.push({
      message: 'Installer mode is enabled and protected by a bootstrap token.',
      name: 'system',
      status: 'ok',
    })
  }

  if (!runtime.databaseAvailable) {
    checks.push({
      message: 'Database connection failed. The installer cannot continue until MySQL is reachable.',
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
    message: 'Database connection established for installer preflight.',
    name: 'database',
    status: 'ok',
  })

  if (!runtime.migrationsTableAvailable) {
    if (runtimeCapabilities.canRunMigrateDeploy) {
      checks.push({
        message:
          'Prisma migrations have not been applied yet. The installer can initialize the schema during finalize for this runtime.',
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
      message: 'Prisma migrations table detected.',
      name: 'migrations',
      status: 'ok',
    })
  }

  if (runtime.recordExists && runtime.lifecycleState !== 'NOT_INSTALLED') {
    checks.push({
      message: `System runtime state is already ${runtime.lifecycleState}. Use repair or update flows instead of the initial installer.`,
      name: 'system',
      status: 'fail',
    })
  } else if (!runtime.recordExists && runtime.coreSeedAvailable) {
    checks.push({
      message:
        'Core seed data already exists in this database. Treat this environment as installed and use repair or update flows instead of the initial installer.',
      name: 'seed',
      status: 'fail',
    })
  } else {
    checks.push({
      message:
        'Core seed data is not present yet. The installer can initialize permissions, settings, and the initial admin safely.',
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
