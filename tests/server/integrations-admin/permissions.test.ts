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

const whiteLabelViewer: AuthenticatedUserData = {
  active: true,
  email: 'white-label@petos.app',
  id: 'white_label_viewer',
  name: 'White Label Viewer',
  permissions: ['white_label.visualizar'],
  profiles: ['Gerente'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const domainViewer: AuthenticatedUserData = {
  active: true,
  email: 'domain@petos.app',
  id: 'domain_viewer',
  name: 'Domain Viewer',
  permissions: ['dominio.visualizar'],
  profiles: ['Gerente'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

test('phase 5 integration permissions preserve legacy admin compatibility', () => {
  assert.equal(canReadIntegrationAdministration(legacyAdminActor), true)
  assert.equal(canEditIntegrationAdministration(legacyAdminActor), true)
  assert.equal(canEditIntegrationSecrets(legacyAdminActor), true)
  assert.equal(canTestIntegrationConnections(legacyAdminActor), true)
})

test('integration administration read is not granted by white label or domain visibility alone', () => {
  assert.equal(canReadIntegrationAdministration(whiteLabelViewer), false)
  assert.equal(canReadIntegrationAdministration(domainViewer), false)
})
