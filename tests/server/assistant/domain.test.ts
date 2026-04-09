import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTutorAssistantHelpReply,
  buildTutorAssistantScheduleDraft,
  interpretTutorAssistantTranscript,
} from '../../../features/assistant/domain'

const pets = [
  { id: 'pet_thor', name: 'Thor' },
  { id: 'pet_luna', name: 'Luna' },
]

const services = [
  { id: 'service_banho', name: 'Banho' },
  { id: 'service_tosa_higienica', name: 'Tosa Higienica' },
]

test('interpretTutorAssistantTranscript detects the bounded tutor intents', () => {
  assert.equal(
    interpretTutorAssistantTranscript('Quais sao meus proximos agendamentos?'),
    'QUERY_UPCOMING_APPOINTMENTS',
  )
  assert.equal(
    interpretTutorAssistantTranscript('Como esta meu financeiro e meu credito?'),
    'QUERY_FINANCE_SUMMARY',
  )
  assert.equal(
    interpretTutorAssistantTranscript('Mostre meus report cards mais recentes'),
    'QUERY_REPORT_CARDS',
  )
  assert.equal(
    interpretTutorAssistantTranscript('Quero agendar banho para Thor amanha as 14h'),
    'SCHEDULE_APPOINTMENT',
  )
  assert.equal(interpretTutorAssistantTranscript('Ajuda'), 'HELP')
  assert.equal(
    interpretTutorAssistantTranscript('Conta uma curiosidade aleatoria'),
    'UNKNOWN',
  )
})

test('buildTutorAssistantScheduleDraft resolves a complete assisted appointment draft from transcript text', () => {
  const draft = buildTutorAssistantScheduleDraft({
    now: new Date('2026-04-09T09:00:00.000Z'),
    pets,
    services,
    transcript: 'Quero agendar banho para Thor amanha as 14h',
  })

  assert.equal(draft.petId, 'pet_thor')
  assert.deepEqual(draft.serviceIds, ['service_banho'])
  assert.equal(draft.startAt?.getFullYear(), 2026)
  assert.equal(draft.startAt?.getMonth(), 3)
  assert.equal(draft.startAt?.getDate(), 10)
  assert.equal(draft.startAt?.getHours(), 14)
  assert.equal(draft.startAt?.getMinutes(), 0)
  assert.deepEqual(draft.missingSlots, [])
})

test('buildTutorAssistantScheduleDraft resolves weekday and time-of-day references conservatively', () => {
  const draft = buildTutorAssistantScheduleDraft({
    now: new Date('2026-04-09T09:00:00.000Z'),
    pets,
    services,
    transcript: 'Quero agendar banho para Thor segunda de manha',
  })

  assert.equal(draft.petId, 'pet_thor')
  assert.deepEqual(draft.serviceIds, ['service_banho'])
  assert.equal(draft.startAt?.getFullYear(), 2026)
  assert.equal(draft.startAt?.getMonth(), 3)
  assert.equal(draft.startAt?.getDate(), 13)
  assert.equal(draft.startAt?.getHours(), 9)
  assert.equal(draft.startAt?.getMinutes(), 0)
  assert.deepEqual(draft.missingSlots, [])
})

test('buildTutorAssistantScheduleDraft keeps missing slots explicit when the tutor request is incomplete', () => {
  const draft = buildTutorAssistantScheduleDraft({
    now: new Date('2026-04-09T09:00:00.000Z'),
    pets,
    services,
    transcript: 'Quero marcar para depois',
  })

  assert.equal(draft.petId, null)
  assert.deepEqual(draft.serviceIds, [])
  assert.equal(draft.startAt, null)
  assert.deepEqual(draft.missingSlots, ['PET', 'SERVICE', 'DATE', 'TIME'])
})

test('buildTutorAssistantHelpReply keeps the scope restricted to portal queries and assisted scheduling', () => {
  const reply = buildTutorAssistantHelpReply()

  assert.match(reply, /consultas/i)
  assert.match(reply, /agendamento assistido/i)
  assert.match(reply, /report cards/i)
  assert.doesNotMatch(reply, /automa/i)
})
