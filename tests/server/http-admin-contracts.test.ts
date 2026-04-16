import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { AppError } from '../../server/http/errors'
import {
  assertCanReadBrandingAdministration,
  assertCanReadConfigurationCenterSurface,
  assertCanReadConfigurationFoundationSurface,
  assertCanReadIntegrationAdministrationSurface,
  readAdminUnitScopeQuery,
} from '../../server/http/admin-contracts'
import { routeErrorResponse } from '../../server/http/responses'

const legacyPhase5Operator: AuthenticatedUserData = {
  active: true,
  email: 'operator@petos.app',
  id: 'user_phase5_operator',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Phase 5 Operator',
  permissions: ['configuracao.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const receptionistActor: AuthenticatedUserData = {
  ...legacyPhase5Operator,
  id: 'user_receptionist',
  permissions: ['agendamento.visualizar'],
  profiles: ['Recepcionista'],
}

test('readAdminUnitScopeQuery forwards a validated unit scope override for admin APIs', () => {
  const query = readAdminUnitScopeQuery(
    new Request('http://localhost:3000/api/admin/branding?unitId=unit_local'),
  )

  assert.deepEqual(query, {
    unitId: 'unit_local',
  })
})

test('readAdminUnitScopeQuery trims unit scope overrides before the service layer sees them', () => {
  const query = readAdminUnitScopeQuery(
    new Request('http://localhost:3000/api/admin/integrations?unitId=%20unit_branch%20'),
  )

  assert.deepEqual(query, {
    unitId: 'unit_branch',
  })
})

test('readAdminUnitScopeQuery leaves global admin reads explicit when no unit override is provided', () => {
  const query = readAdminUnitScopeQuery(
    new Request('http://localhost:3000/api/admin/settings/center'),
  )

  assert.deepEqual(query, {})
})

test('readAdminUnitScopeQuery maps blank unit overrides to the standard 400 route envelope', async () => {
  const request = new Request(
    'http://localhost:3000/api/admin/settings/center?unitId=%20%20%20',
  )

  let error: unknown

  try {
    readAdminUnitScopeQuery(request)
  } catch (caughtError) {
    error = caughtError
  }

  if (!error) {
    assert.fail('Expected an empty admin unit scope override to be rejected.')
  }

  const response = routeErrorResponse(error, { request })
  assert.equal(response.status, 400)

  const body = await response.json()
  assert.equal(body.error.code, 'BAD_REQUEST')
  assert.equal(body.error.message, 'Invalid request payload.')
})

test('phase 5 admin route guards accept legacy-compatible read access for branding, integrations and configuration', () => {
  assert.doesNotThrow(() => assertCanReadBrandingAdministration(legacyPhase5Operator))
  assert.doesNotThrow(() =>
    assertCanReadIntegrationAdministrationSurface(legacyPhase5Operator),
  )
  assert.doesNotThrow(() =>
    assertCanReadConfigurationFoundationSurface(legacyPhase5Operator),
  )
  assert.doesNotThrow(() =>
    assertCanReadConfigurationCenterSurface(legacyPhase5Operator),
  )
})

test('phase 5 admin route guards fail closed for internal users without the administrative compatibility permissions', () => {
  assert.throws(
    () => assertCanReadBrandingAdministration(receptionistActor),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message ===
        'Missing permission for the Phase 5 white label administration surface.',
  )

  assert.throws(
    () => assertCanReadIntegrationAdministrationSurface(receptionistActor),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message ===
        'Missing permission for the Phase 5 integrations administration surface.',
  )

  assert.throws(
    () => assertCanReadConfigurationFoundationSurface(receptionistActor),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message.includes('Missing permission for phase 5 configuration foundation.'),
  )

  assert.throws(
    () => assertCanReadConfigurationCenterSurface(receptionistActor),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message === 'Missing permission for the Phase 5 configuration center.',
  )
})
