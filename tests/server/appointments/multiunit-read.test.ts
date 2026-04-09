import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'
import {
  assertActorCanReadAppointmentInScope,
  resolveAppointmentReadUnitId,
} from '../../../features/appointments/services'

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'appointments.local@petos.app',
  id: 'user_appointments_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Appointments Local Operator',
  permissions: ['agendamento.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  email: 'appointments.global@petos.app',
  id: 'user_appointments_global',
  permissions: ['agendamento.visualizar', 'multiunidade.global.visualizar'],
}

const globalReadActorWithSessionOverride: AuthenticatedUserData = {
  ...globalReadActor,
  email: 'appointments.global.session@petos.app',
  id: 'user_appointments_global_session',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
}

test('appointment reads preserve the single-unit default when no cross-unit context is requested', () => {
  assert.equal(resolveAppointmentReadUnitId(localActor), 'unit_local')
})

test('appointment reads block local actors from switching to another unit', () => {
  assert.throws(
    () => resolveAppointmentReadUnitId(localActor, 'unit_branch'),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('appointment reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveAppointmentReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('appointment reads allow same-unit access in local scope', () => {
  assert.doesNotThrow(() =>
    assertActorCanReadAppointmentInScope(localActor, 'unit_local', {
      requestedUnitId: 'unit_local',
    }),
  )
})

test('appointment reads block foreign records when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadAppointmentInScope(globalReadActor, 'unit_branch', {
        requestedUnitId: 'unit_local',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message ===
        'User is not allowed to access this record in the current unit context.',
  )
})

test('appointment reads allow foreign records only when the actor is globally authorized in that unit context', () => {
  assert.doesNotThrow(() =>
    assertActorCanReadAppointmentInScope(
      globalReadActorWithSessionOverride,
      'unit_branch',
      {
        requestedUnitId: 'unit_branch',
      },
    ),
  )
})
