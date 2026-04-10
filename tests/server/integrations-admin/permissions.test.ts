import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canEditIntegrationAdministration,
  canEditIntegrationSecrets,
  canReadIntegrationAdministration,
  canTestIntegrationConnections,
} from '../../../features/integrations-admin/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'

const legacyAdminActor: AuthenticatedUserData = {
  active: true,
  email: 'admin@petos.app',
  id: 'legacy_admin',
  name: 'Administrador',
  permissions: [],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

test('phase 5 integration permissions preserve legacy admin compatibility', () => {
  assert.equal(canReadIntegrationAdministration(legacyAdminActor), true)
  assert.equal(canEditIntegrationAdministration(legacyAdminActor), true)
  assert.equal(canEditIntegrationSecrets(legacyAdminActor), true)
  assert.equal(canTestIntegrationConnections(legacyAdminActor), true)
})
