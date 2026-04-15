import assert from 'node:assert/strict'
import test from 'node:test'
import { readAdminUnitScopeQuery } from '../../server/http/admin-contracts'
import { routeErrorResponse } from '../../server/http/responses'

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
