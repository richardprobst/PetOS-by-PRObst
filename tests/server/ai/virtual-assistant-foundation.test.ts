import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { startAiInferenceExecution } from '../../../features/ai/execution'
import { evaluateAiGating } from '../../../features/ai/gating'
import { getAiModuleProviderContract } from '../../../features/ai/provider-routing'
import { evaluateAiQuotaPolicy } from '../../../features/ai/policy'

function createVirtualAssistantRequest(
  overrides: Partial<ReturnType<typeof createAiInferenceRequest>> = {},
) {
  return createAiInferenceRequest({
    inferenceKey: 'voice.tutor.help.interpret.v1',
    module: 'VIRTUAL_ASSISTANT',
    origin: 'SERVER_ACTION',
    requestedAt: new Date('2026-04-09T18:00:00.000Z'),
    requestedByUserId: 'user_voice_assistant',
    requestId: 'req_voice_assistant',
    subject: {
      entityId: 'client_tutor',
      entityName: 'Tutor',
    },
    unitId: 'unit_tutor',
    ...overrides,
  })
}

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_VIRTUAL_ASSISTANT_BASE_QUOTA: '25',
  AI_VIRTUAL_ASSISTANT_ENABLED: 'true',
} as const

test('virtual assistant module stays provider-neutral and prefix-bound', () => {
  const contract = getAiModuleProviderContract('VIRTUAL_ASSISTANT')

  assert.equal(contract.consentRequired, false)
  assert.equal(contract.requiresHumanReview, false)
  assert.deepEqual(contract.supportedInferenceKeyPrefixes, ['voice.'])
  assert.deepEqual(contract.supportedConsentPurposes, [
    'VOICE_ASSISTANT_TUTOR',
    'INTERNAL_ADMIN_AUDIT',
  ])
})

test('virtual assistant gating remains fail-closed on missing or disabled module flag', () => {
  const request = createVirtualAssistantRequest()
  const disabled = evaluateAiGating(request, {
    ...enabledEnvironment,
    AI_VIRTUAL_ASSISTANT_ENABLED: 'false',
  })
  const missing = evaluateAiGating(request, {
    ...enabledEnvironment,
    AI_VIRTUAL_ASSISTANT_ENABLED: undefined,
  })

  assert.equal(disabled.decision.allowed, false)
  assert.equal(disabled.decision.reasonCode, 'DISABLED_BY_POLICY')
  assert.equal(missing.decision.allowed, false)
  assert.equal(missing.decision.reasonCode, 'MISSING_CONFIGURATION')
})

test('virtual assistant quota policy blocks conservatively when quota is exhausted or absent', () => {
  const request = createVirtualAssistantRequest()
  const exhausted = evaluateAiQuotaPolicy(request, enabledEnvironment, {
    moduleRequestedUnits: 2,
    moduleUsedUnits: 24,
  })
  const missing = evaluateAiQuotaPolicy(
    request,
    {
      ...enabledEnvironment,
      AI_VIRTUAL_ASSISTANT_BASE_QUOTA: undefined,
    },
    {
      moduleRequestedUnits: 1,
    },
  )

  assert.equal(exhausted.decision.allowed, false)
  assert.equal(exhausted.decision.reasonCode, 'QUOTA_EXCEEDED')
  assert.equal(exhausted.moduleQuota.key, 'ai.virtualAssistant.baseQuota')
  assert.equal(missing.decision.allowed, false)
  assert.equal(missing.decision.reasonCode, 'QUOTA_NOT_CONFIGURED')
})

test('virtual assistant execution keeps consent as not applicable in the bounded tutor scope', () => {
  const envelope = startAiInferenceExecution(createVirtualAssistantRequest(), {
    environment: enabledEnvironment,
    executionMode: 'IMMEDIATE',
  })

  assert.equal(envelope.status, 'ACCEPTED')
  assert.equal(envelope.consent.decisionStatus, 'NOT_APPLICABLE')
  assert.equal(envelope.consent.requirement, 'NOT_APPLICABLE')
  assert.equal(envelope.consent.reasonCode, 'NOT_APPLICABLE')
})
