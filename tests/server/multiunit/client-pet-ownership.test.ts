import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import {
  assertActorCanAccessOwnershipBinding,
  assertActorCanStructurallyWriteOwnershipBinding,
} from '../../../server/authorization/scope'
import { buildClientOwnershipBinding } from '../../../features/clients/ownership'
import { AppError } from '../../../server/http/errors'

const localActor: AuthenticatedUserData = {
  id: 'user_scope_local_client',
  name: 'Operador Local',
  email: 'local.client@petos.app',
  userType: 'ADMIN',
  unitId: 'unit_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  active: true,
  profiles: ['Administrador'],
  permissions: ['cliente.visualizar', 'cliente.editar'],
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  id: 'user_scope_global_read_client',
  permissions: [
    'cliente.visualizar',
    'multiunidade.global.visualizar',
  ],
}

const globalWriteActor: AuthenticatedUserData = {
  ...localActor,
  id: 'user_scope_global_write_client',
  permissions: [
    'cliente.visualizar',
    'multiunidade.global.visualizar',
    'multiunidade.global.editar',
  ],
}

test('local context allows reading client ownership in the same unit', () => {
  const ownership = buildClientOwnershipBinding('unit_local')

  assert.doesNotThrow(() =>
    assertActorCanAccessOwnershipBinding(localActor, ownership, {
      requestedUnitId: 'unit_local',
    }),
  )
})

test('local context blocks cross-unit reads for client/pet ownership', () => {
  const ownership = buildClientOwnershipBinding('unit_branch')

  assert.throws(
    () =>
      assertActorCanAccessOwnershipBinding(localActor, ownership, {
        requestedUnitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('global read allows reading client/pet ownership in another unit', () => {
  const ownership = buildClientOwnershipBinding('unit_branch')

  assert.doesNotThrow(() =>
    assertActorCanAccessOwnershipBinding(globalReadActor, ownership, {
      requestedUnitId: 'unit_branch',
    }),
  )
})

test('cross-unit structural writes remain blocked without global write permission', () => {
  const ownership = buildClientOwnershipBinding('unit_branch')

  assert.throws(
    () =>
      assertActorCanStructurallyWriteOwnershipBinding(
        globalReadActor,
        ownership,
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

test('global write allows structural updates for client/pet ownership across units', () => {
  const ownership = buildClientOwnershipBinding('unit_branch')

  assert.doesNotThrow(() =>
    assertActorCanStructurallyWriteOwnershipBinding(
      globalWriteActor,
      ownership,
      {
        requestedUnitId: 'unit_branch',
      },
    ),
  )
})
