import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import {
  assertPermission,
  getPrimaryProfile,
  hasAnyPermission,
  hasPermission,
  isInternalUser,
  isTutorUser,
  resolveAuthorizedHome,
} from '../../../server/authorization/access-control'
import { AppError } from '../../../server/http/errors'

const internalUser: AuthenticatedUserData = {
  id: 'user_internal',
  name: 'Admin PetOS',
  email: 'admin@petos.app',
  userType: 'ADMIN',
  unitId: 'unit_1',
  active: true,
  profiles: ['Administrador'],
  permissions: ['agendamento.visualizar', 'cliente.editar'],
}

const tutorUser: AuthenticatedUserData = {
  id: 'user_tutor',
  name: 'Tutor PetOS',
  email: 'tutor@petos.app',
  userType: 'CLIENT',
  unitId: null,
  active: true,
  profiles: ['Tutor'],
  permissions: ['portal_tutor.acessar'],
}

test('helpers distinguem usuário interno de tutor', () => {
  assert.equal(isInternalUser(internalUser), true)
  assert.equal(isTutorUser(internalUser), false)
  assert.equal(resolveAuthorizedHome(internalUser), '/admin')

  assert.equal(isInternalUser(tutorUser), false)
  assert.equal(isTutorUser(tutorUser), true)
  assert.equal(resolveAuthorizedHome(tutorUser), '/tutor')
})

test('helpers de permissão usam a lista concedida ao usuário', () => {
  assert.equal(hasPermission(internalUser, 'cliente.editar'), true)
  assert.equal(hasPermission(internalUser, 'financeiro.lancar'), false)
  assert.equal(hasAnyPermission(internalUser, ['financeiro.lancar', 'cliente.editar']), true)
  assert.equal(getPrimaryProfile(internalUser), 'Administrador')
})

test('assertPermission lança AppError quando a permissão não existe', () => {
  assert.throws(
    () => assertPermission(tutorUser, 'cliente.editar'),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'Missing permission: cliente.editar.',
  )
})
