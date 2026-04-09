import assert from 'node:assert/strict'
import test from 'node:test'
import { getMultiUnitFoundationDiagnostics } from '../../../features/multiunit/admin-diagnostics'
import type { AuthenticatedUserData } from '../../../server/auth/types'

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'multiunit.local@petos.app',
  id: 'user_multiunit_local_diag',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Operador Local',
  permissions: ['sistema.update.operar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  email: 'multiunit.global@petos.app',
  id: 'user_multiunit_global_diag',
  permissions: [
    'sistema.update.operar',
    'multiunidade.global.visualizar',
  ],
}

const globalWriteActor: AuthenticatedUserData = {
  ...globalReadActor,
  email: 'multiunit.global.write@petos.app',
  id: 'user_multiunit_global_write_diag',
  permissions: [
    'sistema.update.operar',
    'multiunidade.global.visualizar',
    'multiunidade.global.editar',
  ],
}

test('getMultiUnitFoundationDiagnostics exposes a local-only administrative smoke snapshot', () => {
  const diagnostics = getMultiUnitFoundationDiagnostics(localActor)
  const probes = new Map(diagnostics.probes.map((probe) => [probe.key, probe]))

  assert.equal(diagnostics.session.status, 'RESOLVED')
  assert.equal(diagnostics.session.activeUnitId, 'unit_local')
  assert.equal(diagnostics.session.contextType, 'LOCAL')
  assert.equal(diagnostics.access.hasGlobalReadRole, false)
  assert.equal(diagnostics.ownershipBase?.kind, 'MASTER_RECORD_WITH_UNIT_LINK')
  assert.equal(diagnostics.ownershipBase?.primaryUnitId, 'unit_local')
  assert.equal(diagnostics.ownershipBase?.reassignmentAuditRequired, true)
  assert.equal(probes.get('SESSION_CONTEXT_READ')?.allowed, true)
  assert.equal(probes.get('SESSION_CONTEXT_READ')?.accessMode, 'LOCAL')
  assert.equal(probes.get('FOREIGN_UNIT_READ')?.allowed, false)
  assert.equal(
    probes.get('FOREIGN_UNIT_READ')?.reasonCode,
    'CROSS_UNIT_CONTEXT_FORBIDDEN',
  )
  assert.equal(probes.get('LINKED_OWNERSHIP_READ')?.allowed, false)
  assert.equal(probes.get('FOREIGN_STRUCTURAL_WRITE')?.allowed, false)
})

test('getMultiUnitFoundationDiagnostics exposes a global-read smoke snapshot without opening structural writes', () => {
  const diagnostics = getMultiUnitFoundationDiagnostics(globalReadActor)
  const probes = new Map(diagnostics.probes.map((probe) => [probe.key, probe]))

  assert.equal(diagnostics.session.status, 'RESOLVED')
  assert.equal(diagnostics.access.hasGlobalReadRole, true)
  assert.equal(diagnostics.access.hasGlobalWriteRole, false)
  assert.equal(probes.get('FOREIGN_UNIT_READ')?.allowed, true)
  assert.equal(probes.get('FOREIGN_UNIT_READ')?.accessMode, 'GLOBAL_AUTHORIZED')
  assert.equal(probes.get('LINKED_OWNERSHIP_READ')?.allowed, true)
  assert.equal(probes.get('FOREIGN_STRUCTURAL_WRITE')?.allowed, false)
  assert.equal(
    probes.get('FOREIGN_STRUCTURAL_WRITE')?.reasonCode,
    'STRUCTURAL_WRITE_FORBIDDEN',
  )
})

test('getMultiUnitFoundationDiagnostics reflects explicit global write when the actor already has that permission', () => {
  const diagnostics = getMultiUnitFoundationDiagnostics(globalWriteActor)
  const probes = new Map(diagnostics.probes.map((probe) => [probe.key, probe]))

  assert.equal(diagnostics.access.hasGlobalWriteRole, true)
  assert.equal(probes.get('FOREIGN_STRUCTURAL_WRITE')?.allowed, true)
  assert.equal(
    probes.get('FOREIGN_STRUCTURAL_WRITE')?.accessMode,
    'GLOBAL_AUTHORIZED',
  )
})
