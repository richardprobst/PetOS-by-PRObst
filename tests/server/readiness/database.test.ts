import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectDatabaseReadinessChecks,
  deriveReadinessStatus,
} from '../../../server/readiness/database'
import {
  phase2SeedPermissionNames,
  phase2SeedUnitSettingKeys,
} from '../../../server/foundation/phase2'

function createDatabaseStub(overrides?: {
  accessProfileCount?: number
  hasConnection?: boolean
  hasMigrations?: boolean
  operationalStatusCount?: number
  phase2PermissionCount?: number
  phase2SettingCount?: number
  unitCount?: number
}) {
  return {
    $queryRaw: async () => {
      if (overrides?.hasConnection === false) {
        throw new Error('database unavailable')
      }

      return [{ 1: 1 }]
    },
    $executeRawUnsafe: async () => {
      if (overrides?.hasMigrations === false) {
        throw Object.assign(new Error("Table '_prisma_migrations' doesn't exist"), {
          code: 'P2010',
          message:
            "Invalid `prisma.$executeRawUnsafe()` invocation:\n\nRaw query failed. Code: `1146`. Message: `Table 'petos._prisma_migrations' doesn't exist`",
          name: 'PrismaClientKnownRequestError',
        })
      }

      return 0
    },
    accessProfile: {
      count: async () => overrides?.accessProfileCount ?? 1,
    },
    permission: {
      count: async () => overrides?.phase2PermissionCount ?? phase2SeedPermissionNames.length,
    },
    operationalStatus: {
      count: async () => overrides?.operationalStatusCount ?? 7,
    },
    unit: {
      count: async () => overrides?.unitCount ?? 1,
    },
    unitSetting: {
      count: async () => overrides?.phase2SettingCount ?? phase2SeedUnitSettingKeys.length,
    },
  }
}

test('collectDatabaseReadinessChecks reports a healthy snapshot when database, migrations, and seed exist', async () => {
  const checks = await collectDatabaseReadinessChecks(
    createDatabaseStub() as unknown as Parameters<typeof collectDatabaseReadinessChecks>[0],
  )

  assert.deepEqual(checks, [
    {
      message: 'Database connection established.',
      name: 'database',
      status: 'ok',
    },
    {
      message: 'Prisma migrations table detected.',
      name: 'migrations',
      status: 'ok',
    },
    {
      message: `Core and Phase 2 base seed data detected (units=1, statuses=7, profiles=1, phase2Permissions=${phase2SeedPermissionNames.length}, phase2Settings=${phase2SeedUnitSettingKeys.length}).`,
      name: 'seed',
      status: 'ok',
    },
  ])
  assert.equal(deriveReadinessStatus(checks), 'ok')
})

test('collectDatabaseReadinessChecks stops on an unreachable database', async () => {
  const checks = await collectDatabaseReadinessChecks(
    createDatabaseStub({
      hasConnection: false,
    }) as unknown as Parameters<typeof collectDatabaseReadinessChecks>[0],
  )

  assert.deepEqual(checks, [
    {
      message: 'Database is unreachable at DATABASE_URL.',
      name: 'database',
      status: 'fail',
    },
  ])
  assert.equal(deriveReadinessStatus(checks), 'degraded')
})

test('collectDatabaseReadinessChecks flags missing seed data after successful connection', async () => {
  const checks = await collectDatabaseReadinessChecks(
    createDatabaseStub({
      unitCount: 0,
    }) as unknown as Parameters<typeof collectDatabaseReadinessChecks>[0],
  )

  assert.deepEqual(checks, [
    {
      message: 'Database connection established.',
      name: 'database',
      status: 'ok',
    },
    {
      message: 'Prisma migrations table detected.',
      name: 'migrations',
      status: 'ok',
    },
    {
      message: 'Core or Phase 2 base seed data is missing. Run `npm run prisma:seed` after migrations.',
      name: 'seed',
      status: 'fail',
    },
  ])
  assert.equal(deriveReadinessStatus(checks), 'degraded')
})

test('collectDatabaseReadinessChecks flags missing phase 2 foundation seed data after successful connection', async () => {
  const checks = await collectDatabaseReadinessChecks(
    createDatabaseStub({
      phase2PermissionCount: phase2SeedPermissionNames.length - 1,
    }) as unknown as Parameters<typeof collectDatabaseReadinessChecks>[0],
  )

  assert.deepEqual(checks, [
    {
      message: 'Database connection established.',
      name: 'database',
      status: 'ok',
    },
    {
      message: 'Prisma migrations table detected.',
      name: 'migrations',
      status: 'ok',
    },
    {
      message: 'Core or Phase 2 base seed data is missing. Run `npm run prisma:seed` after migrations.',
      name: 'seed',
      status: 'fail',
    },
  ])
  assert.equal(deriveReadinessStatus(checks), 'degraded')
})
