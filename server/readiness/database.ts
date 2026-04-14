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
  '$executeRawUnsafe' | '$queryRaw' | 'accessProfile' | 'operationalStatus' | 'permission' | 'unit' | 'unitSetting'
>

function isMissingMigrationsTableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : null

  if (code !== 'P2010') {
    return false
  }

  return error.message.includes('_prisma_migrations') && error.message.includes("doesn't exist")
}

export async function prismaMigrationsTableExists(prisma: Pick<PrismaClient, '$executeRawUnsafe'>) {
  try {
    await prisma.$executeRawUnsafe('SELECT 1 FROM `_prisma_migrations` LIMIT 1')
    return true
  } catch (error) {
    if (isMissingMigrationsTableError(error)) {
      return false
    }

    throw error
  }
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
    await prisma.$queryRaw`SELECT 1`
    checks.push({
      message: 'Conexao com o banco estabelecida.',
      name: 'database',
      status: 'ok',
    })
  } catch {
    checks.push({
      message: 'Nao foi possivel acessar o banco configurado em DATABASE_URL.',
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
      message:
        'A conexao com o banco abriu, mas nao foi possivel inspecionar a tabela de migrations do Prisma.',
      name: 'migrations',
      status: 'fail',
    })
    return checks
  }

  if (!hasMigrationsTable) {
    checks.push({
      message: 'As migrations do Prisma ainda nao foram aplicadas.',
      name: 'migrations',
      status: 'fail',
    })
    return checks
  }

  checks.push({
    message: 'Tabela de migrations do Prisma detectada.',
    name: 'migrations',
    status: 'ok',
  })

  let seedSnapshot: CoreSeedSnapshot

  try {
    seedSnapshot = await inspectCoreSeedSnapshot(prisma)
  } catch {
    checks.push({
      message:
        'A conexao com o banco abriu, mas nao foi possivel inspecionar a seed base do sistema.',
      name: 'seed',
      status: 'fail',
    })
    return checks
  }

  if (!hasCoreSeedData(seedSnapshot)) {
    checks.push({
      message:
        'A seed base do core/Fase 2 ainda nao esta completa. Rode `npm run prisma:seed` depois das migrations.',
      name: 'seed',
      status: 'fail',
    })
    return checks
  }

  checks.push({
    message: `Seed base do core/Fase 2 detectada (unidades=${seedSnapshot.unitCount}, status=${seedSnapshot.operationalStatusCount}, perfis=${seedSnapshot.accessProfileCount}, permissoesFase2=${seedSnapshot.phase2PermissionCount}, configuracoesFase2=${seedSnapshot.phase2SettingCount}).`,
    name: 'seed',
    status: 'ok',
  })

  return checks
}
