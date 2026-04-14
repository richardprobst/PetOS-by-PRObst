import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { getPhase3GovernanceSnapshot } from '../../features/phase3/governance'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { prisma } from '../../server/db/prisma'

const restorers: Array<() => void> = []

const operator: AuthenticatedUserData = {
  active: true,
  email: 'phase3.block5@petos.app',
  id: 'user_phase3_block5',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Phase 3 Block 5 Operator',
  permissions: ['sistema.update.operar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }

  delete process.env.AI_ENABLED
  delete process.env.AI_IMAGE_ANALYSIS_ENABLED
  delete process.env.AI_PREDICTIVE_INSIGHTS_ENABLED
  delete process.env.AI_IMAGE_ANALYSIS_BASE_QUOTA
  delete process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA
})

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

function installEmptyGovernancePrismaStubs() {
  replaceMethod(prisma as object, 'imageAnalysis', {
    count: async () => 0,
    findFirst: async () => null,
  })
  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    count: async () => 0,
    findFirst: async () => null,
  })
  replaceMethod(prisma as object, 'auditLog', {
    count: async () => 0,
    findFirst: async () => null,
  })
}

test('phase 3 block 5 smoke keeps an explicit regression script for the whole phase', () => {
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    scripts?: Record<string, string>
  }

  assert.equal(typeof packageJson.scripts?.['test:phase3'], 'string')
  assert.equal(typeof packageJson.scripts?.['test:phase3:block5'], 'string')
})

test('phase 3 block 5 smoke exposes a consolidated governance snapshot over blocks 1 to 4', async () => {
  installEmptyGovernancePrismaStubs()
  process.env.AI_ENABLED = 'true'
  process.env.AI_IMAGE_ANALYSIS_ENABLED = 'true'
  process.env.AI_PREDICTIVE_INSIGHTS_ENABLED = 'true'
  process.env.AI_IMAGE_ANALYSIS_BASE_QUOTA = '10'
  process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA = '5'

  const snapshot = await getPhase3GovernanceSnapshot(operator, {
    now: new Date('2026-04-09T16:00:00.000Z'),
  })

  assert.deepEqual(snapshot.phase.completedBlocks, [
    'BLOCK1',
    'BLOCK2',
    'BLOCK3',
    'BLOCK4',
  ])
  assert.equal(snapshot.phase.currentBlock, 'BLOCK5')
  assert.equal(snapshot.currentState.failClosed, true)
  assert.equal(snapshot.currentState.globalFlagStatus, 'ENABLED')
  assert.equal(snapshot.currentState.globalFlagStatusLabel, 'Habilitada')
})
