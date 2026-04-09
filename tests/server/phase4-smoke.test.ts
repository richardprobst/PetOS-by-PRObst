import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTutorAssistantScheduleDraft } from '../../features/assistant/domain'
import {
  tutorAssistantApiRequestSchema,
  tutorAssistantConfirmRequestSchema,
} from '../../features/assistant/schemas'
import { getAiModuleProviderContract } from '../../features/ai/provider-routing'

const pets = [{ id: 'pet_thor', name: 'Thor' }]
const services = [{ id: 'service_banho', name: 'Banho' }]

test('phase 4 smoke keeps the tutor assistant transcript-only at the API boundary', () => {
  const result = tutorAssistantApiRequestSchema.safeParse({
    input: {
      channel: 'VOICE',
      transcript: 'quero agendar banho para Thor amanha as 14h',
    },
    mode: 'INTERPRET',
  })

  assert.equal(result.success, true)
})

test('phase 4 smoke keeps scheduling confirmation explicit and server-validated', () => {
  const invalidConfirmation = tutorAssistantConfirmRequestSchema.safeParse({
    draft: {
      assistantSummary: 'Banho para Thor.',
      clientNotes: null,
      missingSlots: [],
      petId: 'pet_thor',
      petName: 'Thor',
      serviceIds: ['service_banho'],
      serviceNames: ['Banho'],
      sourceTranscript: 'quero agendar banho para Thor',
    },
  })

  assert.equal(invalidConfirmation.success, false)
})

test('phase 4 smoke keeps the first assistant cut bounded to portal queries and assisted scheduling', () => {
  const draft = buildTutorAssistantScheduleDraft({
    now: new Date('2026-04-09T09:00:00.000Z'),
    pets,
    services,
    transcript: 'Quero agendar banho para Thor amanha as 14h',
  })
  const contract = getAiModuleProviderContract('VIRTUAL_ASSISTANT')

  assert.deepEqual(draft.missingSlots, [])
  assert.equal(contract.supportedInferenceKeyPrefixes.includes('voice.'), true)
  assert.equal(contract.requiresHumanReview, false)
})
