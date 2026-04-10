import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canApproveConfiguration,
  canPublishConfiguration,
  getConfigurationCenterSnapshot,
} from '../../../features/configuration/management'
import { canEditConfigurationFoundation } from '../../../features/configuration/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'

const adminActor: AuthenticatedUserData = {
  active: true,
  email: 'admin@petos.app',
  id: 'user_admin',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Admin',
  permissions: ['configuracao.central.visualizar', 'configuracao.publicar', 'configuracao.aprovar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

test('configuration center permission helpers expose publish and approval gates', () => {
  assert.equal(canPublishConfiguration(adminActor), true)
  assert.equal(canApproveConfiguration(adminActor), true)
  assert.equal(canEditConfigurationFoundation(adminActor), true)
  assert.equal(
    canPublishConfiguration({
      ...adminActor,
      permissions: ['configuracao.central.visualizar'],
      profiles: ['Recepcionista'],
    }),
    false,
  )
})

test('phase 5 compatibility keeps legacy admin profile authorized before RBAC reseed', () => {
  const legacyAdmin = {
    ...adminActor,
    permissions: [],
  }

  assert.equal(canEditConfigurationFoundation(legacyAdmin), true)
  assert.equal(canPublishConfiguration(legacyAdmin), true)
  assert.equal(canApproveConfiguration(legacyAdmin), true)
})

test('getConfigurationCenterSnapshot fails closed without read permission', async () => {
  await assert.rejects(
    () =>
      getConfigurationCenterSnapshot({
        ...adminActor,
        permissions: [],
        profiles: ['Recepcionista'],
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.code, 'FORBIDDEN')
      return true
    },
  )
})
