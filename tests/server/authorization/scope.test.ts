import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import {
  assertActorCanAccessOwnershipBinding,
  assertActorCanAccessUnit,
  assertActorCanStructurallyWriteOwnershipBinding,
  resolveActorUnitSessionContext,
  resolveScopedUnitId,
} from '../../../server/authorization/scope'
import { AppError } from '../../../server/http/errors'

const localActor: AuthenticatedUserData = {
  id: 'user_scope_local',
  name: 'Operador Local',
  email: 'scope.local@petos.app',
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
  id: 'user_scope_global_read',
  permissions: ['cliente.visualizar', 'multiunidade.global.visualizar'],
}

const noUnitActor: AuthenticatedUserData = {
  ...localActor,
  id: 'user_scope_without_unit',
  unitId: null,
  multiUnitContext: {
    activeUnitId: null,
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
}

test('resolveScopedUnitId preserves the existing single-unit path when no cross-unit context is requested', () => {
  assert.equal(resolveScopedUnitId(localActor), 'unit_local')
})

test('resolveActorUnitSessionContext exposes the server-side unit session snapshot without UI dependency', () => {
  const context = resolveActorUnitSessionContext(localActor)

  assert.equal(context.status, 'RESOLVED')
  assert.equal(context.activeUnitId, 'unit_local')
  assert.equal(context.contextType, 'LOCAL')
})

test('assertActorCanAccessUnit blocks access when no valid unit context exists', () => {
  assert.throws(
    () => assertActorCanAccessUnit(noUnitActor),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'UNPROCESSABLE_ENTITY' &&
      error.message === 'A target unit is required for this operation.',
  )
})

test('assertActorCanAccessUnit blocks cross-unit reads for local actors', () => {
  assert.throws(
    () => assertActorCanAccessUnit(localActor, 'unit_branch'),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('assertActorCanAccessOwnershipBinding allows global reads when the selected unit is linked and explicitly authorized', () => {
  assert.doesNotThrow(() =>
    assertActorCanAccessOwnershipBinding(
      globalReadActor,
      {
        kind: 'MASTER_RECORD_WITH_UNIT_LINK',
        linkedUnitIds: ['unit_branch'],
        primaryUnitId: 'unit_local',
        reassignmentAuditRequired: true,
      },
      {
        requestedUnitId: 'unit_branch',
      },
    ),
  )
})

test('assertActorCanStructurallyWriteOwnershipBinding blocks cross-unit structural writes without explicit global write access', () => {
  assert.throws(
    () =>
      assertActorCanStructurallyWriteOwnershipBinding(
        globalReadActor,
        {
          kind: 'MASTER_RECORD_WITH_UNIT_LINK',
          linkedUnitIds: ['unit_branch'],
          primaryUnitId: 'unit_local',
          reassignmentAuditRequired: true,
        },
        {
          requestedUnitId: 'unit_branch',
        },
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message ===
        'User is not allowed to perform a structural cross-unit update.',
  )
})
