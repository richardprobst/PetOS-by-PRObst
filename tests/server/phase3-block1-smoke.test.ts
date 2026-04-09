import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAiFoundationDiagnostics,
} from '../../features/ai/admin-diagnostics'
import { getMultiUnitFoundationDiagnostics } from '../../features/multiunit/admin-diagnostics'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { AppError } from '../../server/http/errors'

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const

const localDiagnosticsOperator: AuthenticatedUserData = {
  active: true,
  email: 'phase3.block1.local@petos.app',
  id: 'user_phase3_block1_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Phase 3 Local Operator',
  permissions: ['sistema.update.operar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadDiagnosticsOperator: AuthenticatedUserData = {
  ...localDiagnosticsOperator,
  email: 'phase3.block1.global@petos.app',
  id: 'user_phase3_block1_global',
  permissions: [
    'sistema.update.operar',
    'multiunidade.global.visualizar',
  ],
}

const unauthorizedInternalActor: AuthenticatedUserData = {
  ...localDiagnosticsOperator,
  email: 'phase3.block1.denied@petos.app',
  id: 'user_phase3_block1_denied',
  permissions: ['sistema.runtime.visualizar'],
}

function getBlock1FoundationSmokeSnapshot(actor: AuthenticatedUserData) {
  return {
    ai: getAiFoundationDiagnostics(actor, {
      environment: enabledEnvironment,
    }),
    multiunit: getMultiUnitFoundationDiagnostics(actor),
  }
}

test('phase 3 block 1 smoke keeps the internal diagnostics surface protected for actors without high permission', () => {
  assert.throws(
    () => getBlock1FoundationSmokeSnapshot(unauthorizedInternalActor),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message.includes('Missing high permission'),
  )
})

test('phase 3 block 1 smoke exposes a coherent protected payload for a local operator', () => {
  const snapshot = getBlock1FoundationSmokeSnapshot(localDiagnosticsOperator)
  const probes = new Map(snapshot.multiunit.probes.map((probe) => [probe.key, probe]))

  assert.deepEqual(Object.keys(snapshot).sort(), ['ai', 'multiunit'])
  assert.equal(snapshot.ai.flags.length, 3)
  assert.equal(snapshot.ai.modules.length, 2)
  assert.equal(snapshot.ai.lifecycleReference.accepted.status, 'ACCEPTED')
  assert.equal(snapshot.ai.permissionGate.requiredPermissions.length, 3)
  assert.equal(snapshot.multiunit.session.status, 'RESOLVED')
  assert.equal(snapshot.multiunit.session.contextType, 'LOCAL')
  assert.equal(snapshot.multiunit.ownershipBase?.kind, 'MASTER_RECORD_WITH_UNIT_LINK')
  assert.equal(probes.get('FOREIGN_UNIT_READ')?.allowed, false)
  assert.equal(
    probes.get('FOREIGN_UNIT_READ')?.reasonCode,
    'CROSS_UNIT_CONTEXT_FORBIDDEN',
  )
  assert.equal(probes.get('FOREIGN_STRUCTURAL_WRITE')?.allowed, false)
})

test('phase 3 block 1 smoke proves that a global-authorized actor can read cross-unit without opening cross-unit structural writes by default', () => {
  const snapshot = getBlock1FoundationSmokeSnapshot(globalReadDiagnosticsOperator)
  const probes = new Map(snapshot.multiunit.probes.map((probe) => [probe.key, probe]))

  assert.equal(snapshot.multiunit.access.hasGlobalReadRole, true)
  assert.equal(snapshot.multiunit.access.hasGlobalWriteRole, false)
  assert.equal(probes.get('FOREIGN_UNIT_READ')?.allowed, true)
  assert.equal(probes.get('LINKED_OWNERSHIP_READ')?.allowed, true)
  assert.equal(probes.get('FOREIGN_STRUCTURAL_WRITE')?.allowed, false)
  assert.equal(
    probes.get('FOREIGN_STRUCTURAL_WRITE')?.reasonCode,
    'STRUCTURAL_WRITE_FORBIDDEN',
  )
})
