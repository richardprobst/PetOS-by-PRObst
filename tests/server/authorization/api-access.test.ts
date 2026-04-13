import assert from 'node:assert/strict'
import test from 'node:test'
import {
  requireAuthenticatedApiUser,
} from '../../../server/authorization/api-access'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'
import type { SystemRuntimeSnapshot } from '../../../server/system/runtime-state'

const internalActor: AuthenticatedUserData = {
  active: true,
  email: 'admin@petos.app',
  id: 'user_internal',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Administrador',
  permissions: ['cliente.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const tutorActor: AuthenticatedUserData = {
  active: true,
  email: 'tutor@petos.app',
  id: 'user_tutor',
  name: 'Tutor',
  permissions: ['portal_tutor.acessar'],
  profiles: ['Tutor'],
  unitId: null,
  userType: 'CLIENT',
}

const runtimeSnapshot: SystemRuntimeSnapshot = {
  buildVersion: 'test-build',
  coreSeedAvailable: true,
  currentInstalledVersion: 'test-build',
  databaseAvailable: true,
  installerEnabled: false,
  installerLocked: true,
  installerTokenConfigured: false,
  lastTransitionAt: null,
  lifecycleSource: 'persisted',
  lifecycleState: 'INSTALLED',
  maintenanceActive: false,
  maintenanceReason: null,
  manifestHash: null,
  migrationsTableAvailable: true,
  previousVersion: null,
  recordExists: true,
}

test('requireAuthenticatedApiUser enforces runtime access for internal users', async () => {
  let capturedSurface: 'internal' | 'tutor' | null = null

  const actor = await requireAuthenticatedApiUser({
    assertRuntimeAccess: async (surface: 'internal' | 'tutor') => {
      capturedSurface = surface
      return runtimeSnapshot
    },
    getCurrentUser: async () => internalActor,
  })

  assert.equal(actor.id, internalActor.id)
  assert.equal(capturedSurface, 'internal')
})

test('requireAuthenticatedApiUser enforces runtime access for tutors', async () => {
  let capturedSurface: 'internal' | 'tutor' | null = null

  const actor = await requireAuthenticatedApiUser({
    assertRuntimeAccess: async (surface: 'internal' | 'tutor') => {
      capturedSurface = surface
      return runtimeSnapshot
    },
    getCurrentUser: async () => tutorActor,
  })

  assert.equal(actor.id, tutorActor.id)
  assert.equal(capturedSurface, 'tutor')
})

test('requireAuthenticatedApiUser rejects inactive users before route logic runs', async () => {
  await assert.rejects(
    () =>
      requireAuthenticatedApiUser({
        assertRuntimeAccess: async () => {
          throw new Error('runtime guard should not execute for inactive users')
        },
        getCurrentUser: async () => ({
          ...internalActor,
          active: false,
        }),
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message === 'Inactive users cannot access this resource.',
  )
})

test('requireAuthenticatedApiUser rejects anonymous requests', async () => {
  await assert.rejects(
    () =>
      requireAuthenticatedApiUser({
        getCurrentUser: async () => null,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 401 &&
      error.message === 'Authentication required.',
  )
})
