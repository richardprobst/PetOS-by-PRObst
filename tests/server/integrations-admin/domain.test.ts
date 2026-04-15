import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getIntegrationConnectionStatusLabel,
  getIntegrationHealthStatusLabel,
  getIntegrationScopeSummary,
} from '../../../features/integrations-admin/domain'

test('integration admin label helpers humanize operational status and health', () => {
  assert.equal(getIntegrationConnectionStatusLabel('READY'), 'Pronta para uso')
  assert.equal(getIntegrationHealthStatusLabel('NOT_CONFIGURED'), 'Sem configuracao')
  assert.equal(getIntegrationScopeSummary('SYSTEM_GLOBAL'), 'Sistema global')
  assert.equal(getIntegrationScopeSummary('UNIT', 'Unidade Centro'), 'Unidade - Unidade Centro')
})
