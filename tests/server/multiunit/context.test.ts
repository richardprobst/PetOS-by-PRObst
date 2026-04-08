import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import {
  createMultiUnitOwnershipBinding,
  evaluateMultiUnitScope,
  resolveMultiUnitSessionContext,
} from '../../../features/multiunit/context'

const localActor: AuthenticatedUserData = {
  id: 'user_local',
  name: 'Operador Local',
  email: 'local@petos.app',
  userType: 'ADMIN',
  unitId: 'unit_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  active: true,
  profiles: ['Administrador'],
  permissions: ['cliente.visualizar'],
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  id: 'user_global_read',
  email: 'global.read@petos.app',
  permissions: ['cliente.visualizar', 'multiunidade.global.visualizar'],
}

const globalWriteActor: AuthenticatedUserData = {
  ...globalReadActor,
  id: 'user_global_write',
  email: 'global.write@petos.app',
  permissions: [
    'cliente.visualizar',
    'multiunidade.global.visualizar',
    'multiunidade.global.editar',
  ],
}

const noUnitActor: AuthenticatedUserData = {
  ...localActor,
  id: 'user_without_unit',
  email: 'without.unit@petos.app',
  unitId: null,
  multiUnitContext: {
    activeUnitId: null,
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
}

test('resolveMultiUnitSessionContext resolves the local unit context safely by default', () => {
  const context = resolveMultiUnitSessionContext(localActor)

  assert.equal(context.status, 'RESOLVED')
  assert.equal(context.activeUnitId, 'unit_local')
  assert.equal(context.contextType, 'LOCAL')
  assert.equal(context.crossUnitAccess, false)
})

test('resolveMultiUnitSessionContext fails closed when no active unit can be determined', () => {
  const context = resolveMultiUnitSessionContext(noUnitActor)

  assert.equal(context.status, 'UNRESOLVED')
  assert.equal(context.activeUnitId, null)
  assert.equal(context.contextType, null)
})

test('evaluateMultiUnitScope allows local reads when the binding belongs to the current unit context', () => {
  const decision = evaluateMultiUnitScope({
    actor: localActor,
    operation: 'READ',
    ownership: createMultiUnitOwnershipBinding({
      kind: 'MASTER_RECORD_WITH_UNIT_LINK',
      linkedUnitIds: ['unit_branch'],
      primaryUnitId: 'unit_local',
      reassignmentAuditRequired: true,
    }),
  })

  assert.equal(decision.allowed, true)
  assert.equal(decision.accessMode, 'LOCAL')
  assert.equal(decision.reasonCode, 'ALLOWED_LOCAL_SCOPE')
})

test('evaluateMultiUnitScope blocks cross-unit reads for local-only actors', () => {
  const decision = evaluateMultiUnitScope({
    actor: localActor,
    operation: 'READ',
    requestedUnitId: 'unit_branch',
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.reasonCode, 'CROSS_UNIT_CONTEXT_FORBIDDEN')
  assert.equal(decision.accessMode, 'BLOCKED')
})

test('evaluateMultiUnitScope allows global reads for actors with explicit global permission', () => {
  const decision = evaluateMultiUnitScope({
    actor: globalReadActor,
    operation: 'READ',
    ownership: createMultiUnitOwnershipBinding({
      kind: 'MASTER_RECORD_WITH_UNIT_LINK',
      linkedUnitIds: ['unit_branch'],
      primaryUnitId: 'unit_local',
      reassignmentAuditRequired: true,
    }),
    requestedUnitId: 'unit_branch',
  })

  assert.equal(decision.allowed, true)
  assert.equal(decision.accessMode, 'GLOBAL_AUTHORIZED')
  assert.equal(decision.reasonCode, 'ALLOWED_GLOBAL_SCOPE')
  assert.equal(decision.context.contextType, 'GLOBAL_AUTHORIZED')
})

test('evaluateMultiUnitScope blocks structural cross-unit writes without explicit global write permission', () => {
  const decision = evaluateMultiUnitScope({
    actor: globalReadActor,
    operation: 'STRUCTURAL_WRITE',
    ownership: createMultiUnitOwnershipBinding({
      kind: 'MASTER_RECORD_WITH_UNIT_LINK',
      linkedUnitIds: ['unit_branch'],
      primaryUnitId: 'unit_local',
      reassignmentAuditRequired: true,
    }),
    requestedUnitId: 'unit_branch',
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.reasonCode, 'STRUCTURAL_WRITE_FORBIDDEN')
})

test('evaluateMultiUnitScope allows structural cross-unit writes only with explicit global write permission', () => {
  const decision = evaluateMultiUnitScope({
    actor: globalWriteActor,
    operation: 'STRUCTURAL_WRITE',
    ownership: createMultiUnitOwnershipBinding({
      kind: 'MASTER_RECORD_WITH_UNIT_LINK',
      linkedUnitIds: ['unit_branch'],
      primaryUnitId: 'unit_local',
      reassignmentAuditRequired: true,
    }),
    requestedUnitId: 'unit_branch',
  })

  assert.equal(decision.allowed, true)
  assert.equal(decision.accessMode, 'GLOBAL_AUTHORIZED')
  assert.equal(decision.reasonCode, 'ALLOWED_GLOBAL_SCOPE')
})
