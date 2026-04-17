import type { PrismaClient } from '@prisma/client'
import {
  phase2SeedPermissionNames,
  phase2SeedUnitSettingKeys,
} from '../foundation/phase2'

export type ReadinessCheckName = 'environment' | 'database' | 'migrations' | 'runtime' | 'seed'
export type ReadinessCheckStatus = 'ok' | 'fail'

export interface ReadinessCheck {
  message: string
  name: ReadinessCheckName
  status: ReadinessCheckStatus
}

export interface CoreSeedSnapshot {
  accessProfileCount: number
  operationalStatusCount: number
  phase2PermissionCount: number
  phase2SettingCount: number
  unitCount: number
}

export type ReadinessDatabaseClient = Pick<
  PrismaClient,
  '$queryRawUnsafe' | 'accessProfile' | 'operationalStatus' | 'permission' | 'unit' | 'unitSetting'
>

export async function prismaMigrationsTableExists(prisma: Pick<PrismaClient, '$queryRawUnsafe'>) {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, bigint | number | string>>>(
    "SELECT COUNT(*) AS migration_count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'",
  )

  if (rows.length === 0) {
    return false
  }

  const migrationCount = rows[0]?.migration_count

  if (typeof migrationCount === 'bigint') {
    return migrationCount > 0n
  }

  if (typeof migrationCount === 'number') {
    return migrationCount > 0
  }

  return rows.length > 0
}

export async function inspectCoreSeedSnapshot(
  prisma: Pick<
    PrismaClient,
    'accessProfile' | 'operationalStatus' | 'permission' | 'unit' | 'unitSetting'
  >,
): Promise<CoreSeedSnapshot> {
  const [
    unitCount,
    operationalStatusCount,
    accessProfileCount,
    phase2PermissionCount,
    phase2SettingCount,
  ] = await Promise.all([
    prisma.unit.count(),
    prisma.operationalStatus.count(),
    prisma.accessProfile.count(),
    prisma.permission.count({
      where: {
        name: {
          in: [...phase2SeedPermissionNames],
        },
      },
    }),
    prisma.unitSetting.count({
      where: {
        key: {
          in: [...phase2SeedUnitSettingKeys],
        },
      },
    }),
  ])

  return {
    accessProfileCount,
    operationalStatusCount,
    phase2PermissionCount,
    phase2SettingCount,
    unitCount,
  }
}

export function hasCoreSeedData(snapshot: CoreSeedSnapshot) {
  return (
    snapshot.unitCount > 0 &&
    snapshot.operationalStatusCount > 0 &&
    snapshot.accessProfileCount > 0 &&
    snapshot.phase2PermissionCount >= phase2SeedPermissionNames.length &&
    snapshot.phase2SettingCount >= phase2SeedUnitSettingKeys.length
  )
}

export function deriveReadinessStatus(checks: ReadinessCheck[]) {
  return checks.some((check) => check.status === 'fail') ? 'degraded' : 'ok'
}

export async function collectDatabaseReadinessChecks(
  prisma: ReadinessDatabaseClient,
): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = []

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    checks.push({
      message: 'Database connection established.',
      name: 'database',
      status: 'ok',
    })
  } catch {
    checks.push({
      message: 'Database is unreachable at DATABASE_URL.',
      name: 'database',
      status: 'fail',
    })
    return checks
  }

  let hasMigrationsTable = false

  try {
    hasMigrationsTable = await prismaMigrationsTableExists(prisma)
  } catch {
    checks.push({
      message: 'Could not inspect the Prisma migrations table after connecting to the database.',
      name: 'migrations',
      status: 'fail',
    })
    return checks
  }

  if (!hasMigrationsTable) {
    checks.push({
      message: 'Prisma migrations have not been applied yet.',
      name: 'migrations',
      status: 'fail',
    })
    return checks
  }

  checks.push({
    message: 'Prisma migrations table detected.',
    name: 'migrations',
    status: 'ok',
  })

  let seedSnapshot: CoreSeedSnapshot

  try {
    seedSnapshot = await inspectCoreSeedSnapshot(prisma)
  } catch {
    checks.push({
      message: 'Could not inspect core seed data after connecting to the database.',
      name: 'seed',
      status: 'fail',
    })
    return checks
  }

  if (!hasCoreSeedData(seedSnapshot)) {
    checks.push({
      message: 'Core or Phase 2 base seed data is missing. Run `npm run prisma:seed` after migrations.',
      name: 'seed',
      status: 'fail',
    })
    return checks
  }

  checks.push({
    message: `Core and Phase 2 base seed data detected (units=${seedSnapshot.unitCount}, statuses=${seedSnapshot.operationalStatusCount}, profiles=${seedSnapshot.accessProfileCount}, phase2Permissions=${seedSnapshot.phase2PermissionCount}, phase2Settings=${seedSnapshot.phase2SettingCount}).`,
    name: 'seed',
    status: 'ok',
  })

  return checks
}
