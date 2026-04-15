import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAssistantExperienceModeLabel,
  getConfigurationAiDriftLabel,
  getConfigurationImpactLevelLabel,
  getConfigurationMultiUnitStatusLabel,
} from '../../../features/configuration/domain'

test('configuration diagnostic label helpers humanize known governance states', () => {
  assert.equal(getConfigurationMultiUnitStatusLabel('RESOLVED'), 'Contexto resolvido')
  assert.equal(getConfigurationAiDriftLabel('ENV_DISABLED'), 'Runtime desabilitado')
  assert.equal(
    getAssistantExperienceModeLabel('TEXT_AND_VOICE_ASSISTED'),
    'Texto e voz assistidos',
  )
  assert.equal(getConfigurationImpactLevelLabel('CRITICAL'), 'Critico')
})

test('configuration diagnostic label helpers preserve unknown values fail-open for support', () => {
  assert.equal(getConfigurationMultiUnitStatusLabel('CUSTOM_STATUS'), 'CUSTOM_STATUS')
  assert.equal(getConfigurationAiDriftLabel('CUSTOM_DRIFT'), 'CUSTOM_DRIFT')
  assert.equal(getAssistantExperienceModeLabel('CUSTOM_MODE'), 'CUSTOM_MODE')
  assert.equal(getConfigurationImpactLevelLabel('CUSTOM_LEVEL'), 'CUSTOM_LEVEL')
})
