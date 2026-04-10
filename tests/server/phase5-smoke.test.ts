import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDefaultBrandRuntime } from '../../features/branding/domain'
import { getIntegrationCatalogEntry, maskSecretValue } from '../../features/integrations-admin/domain'
import { getConfigurationRegistryDefinition } from '../../features/configuration/domain'

test('phase 5 smoke keeps central configuration and white label registries available', () => {
  const runtime = buildDefaultBrandRuntime()
  const assistantSetting = getConfigurationRegistryDefinition('ai.virtual_assistant.desired_enabled')
  const publicBrandSetting = getConfigurationRegistryDefinition('branding.primary_domain')
  const stripeCatalog = getIntegrationCatalogEntry('STRIPE')

  assert.equal(runtime.identity.publicName, 'PetOS')
  assert.equal(assistantSetting?.scope, 'SYSTEM_GLOBAL')
  assert.equal(publicBrandSetting?.scope, 'PUBLIC_BRAND')
  assert.equal(stripeCatalog?.providerKey, 'STRIPE')
  assert.equal(maskSecretValue('sk_live_1234567890').includes('*'), true)
})
