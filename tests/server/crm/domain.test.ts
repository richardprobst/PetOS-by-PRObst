import assert from 'node:assert/strict'
import test from 'node:test'
import { PetSizeCategory } from '@prisma/client'
import {
  buildCrmRecipientSourceKey,
  canExecuteCrmContact,
  deriveClientInactivityDays,
  matchesCrmCampaignCriteria,
  shouldPreparePostServiceTrigger,
  shouldPrepareReviewBooster,
} from '../../../features/crm/domain'

test('deriveClientInactivityDays returns null when the client has no completed visit', () => {
  assert.equal(deriveClientInactivityDays(null, new Date('2026-04-03T12:00:00.000Z')), null)
})

test('canExecuteCrmContact respects channel opt-in and campaign consent type', () => {
  const preference = {
    emailOptIn: true,
    whatsappOptIn: false,
    marketingOptIn: true,
    reviewOptIn: true,
    postServiceOptIn: false,
  }

  assert.equal(canExecuteCrmContact(preference, 'SEGMENTED_CAMPAIGN', 'EMAIL'), true)
  assert.equal(canExecuteCrmContact(preference, 'SEGMENTED_CAMPAIGN', 'WHATSAPP'), false)
  assert.equal(canExecuteCrmContact(preference, 'POST_SERVICE_TRIGGER', 'EMAIL'), false)
})

test('matchesCrmCampaignCriteria filters by inactivity, future appointment and pet profile', () => {
  const now = new Date('2026-04-03T12:00:00.000Z')
  const profile = {
    breeds: ['Shih Tzu'],
    completedAppointmentCount: 3,
    hasFutureAppointment: false,
    lastCompletedAt: new Date('2026-01-01T12:00:00.000Z'),
    petSizeCategories: ['SMALL'] as PetSizeCategory[],
  }

  assert.equal(
    matchesCrmCampaignCriteria(
      profile,
      {
        inactivityDays: 60,
        minimumCompletedAppointments: 2,
        onlyClientsWithoutFutureAppointments: true,
        petSizeCategories: ['SMALL'],
        breeds: ['Shih Tzu'],
      },
      now,
    ),
    true,
  )

  assert.equal(
    matchesCrmCampaignCriteria(
      {
        ...profile,
        hasFutureAppointment: true,
      },
      {
        onlyClientsWithoutFutureAppointments: true,
      },
      now,
    ),
    false,
  )
})

test('review and post-service triggers respect delay window and prior preparation', () => {
  const now = new Date('2026-04-03T12:00:00.000Z')
  const completedAt = new Date('2026-04-02T08:00:00.000Z')

  assert.equal(
    shouldPrepareReviewBooster({
      alreadyPrepared: false,
      completedAt,
      delayHours: 24,
      now,
    }),
    true,
  )
  assert.equal(
    shouldPreparePostServiceTrigger({
      alreadyPrepared: true,
      completedAt,
      delayHours: 4,
      now,
    }),
    false,
  )
})

test('buildCrmRecipientSourceKey keeps deterministic keys by campaign target', () => {
  assert.equal(
    buildCrmRecipientSourceKey({
      campaignType: 'PROFILE_OFFER',
      clientId: 'client-1',
    }),
    'profile_offer:client:client-1',
  )

  assert.equal(
    buildCrmRecipientSourceKey({
      appointmentId: 'appt-1',
      campaignType: 'REVIEW_BOOSTER',
      clientId: 'client-1',
    }),
    'review_booster:appointment:appt-1',
  )
})
