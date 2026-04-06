import assert from 'node:assert/strict'
import test from 'node:test'
import { operationalStatusIds } from '../../../features/appointments/constants'
import {
  canTutorSubmitPreCheckIn,
  deriveTutorPortalAlerts,
  splitTutorAppointmentsByTimeline,
  summarizeTutorFinance,
} from '../../../features/tutor/domain'

test('pre-check-in only opens for upcoming appointments inside the configured window', () => {
  const now = new Date('2026-04-02T12:00:00.000Z')

  assert.equal(
    canTutorSubmitPreCheckIn(
      {
        operationalStatusId: operationalStatusIds.scheduled,
        startAt: new Date('2026-04-03T10:00:00.000Z'),
        tutorPreCheckIn: null,
      },
      24,
      now,
    ),
    true,
  )

  assert.equal(
    canTutorSubmitPreCheckIn(
      {
        operationalStatusId: operationalStatusIds.scheduled,
        startAt: new Date('2026-04-05T12:00:00.000Z'),
        tutorPreCheckIn: null,
      },
      24,
      now,
    ),
    false,
  )

  assert.equal(
    canTutorSubmitPreCheckIn(
      {
        operationalStatusId: operationalStatusIds.checkIn,
        startAt: new Date('2026-04-03T10:00:00.000Z'),
        tutorPreCheckIn: { id: 'pre-check-in-1' },
      },
      24,
      now,
    ),
    false,
  )
})

test('finance summary keeps tutor view separated between deposits, credits and refunds', () => {
  const summary = summarizeTutorFinance({
    clientCredits: [
      {
        availableAmount: 80,
        expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      },
      {
        availableAmount: 50,
        expiresAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    ],
    deposits: [
      {
        amount: 30,
        status: 'PENDING',
      },
      {
        amount: 45,
        status: 'APPLIED',
      },
      {
        amount: 25,
        status: 'CONFIRMED',
      },
    ],
    now: new Date('2026-04-02T12:00:00.000Z'),
    refunds: [
      {
        amount: 10,
        status: 'PENDING',
      },
      {
        amount: 25,
        status: 'COMPLETED',
      },
    ],
  })

  assert.equal(summary.pendingDepositAmount, 55)
  assert.equal(summary.availableCreditAmount, 80)
  assert.equal(summary.completedRefundAmount, 25)
})

test('portal alerts surface pending signatures, pre-check-in, finance and waitlist without CRM behavior', () => {
  const alerts = deriveTutorPortalAlerts({
    appointments: [
      {
        operationalStatusId: operationalStatusIds.confirmed,
        startAt: new Date('2026-04-02T18:00:00.000Z'),
        taxiDogRide: {
          status: 'SCHEDULED',
        },
        tutorPreCheckIn: null,
      },
    ],
    documents: [
      {
        metadata: {
          requiresSignature: true,
        },
        signatures: [],
      },
    ],
    now: new Date('2026-04-02T12:00:00.000Z'),
    pendingDepositAmount: 30,
    preCheckInWindowHours: 24,
    tutorId: 'tutor-1',
    waitlistPendingCount: 1,
  })

  assert.deepEqual(
    alerts.map((alert) => alert.code),
    [
      'DOCUMENT_SIGNATURE_PENDING',
      'PRE_CHECK_IN_PENDING',
      'DEPOSIT_PENDING',
      'WAITLIST_PENDING',
      'TAXI_DOG_ACTIVE',
    ],
  )
})

test('portal timeline keeps upcoming and history partitions stable for tutor rendering', () => {
  const result = splitTutorAppointmentsByTimeline(
    [
      { id: 'late', startAt: new Date('2026-04-04T12:00:00.000Z') },
      { id: 'past', startAt: new Date('2026-04-01T12:00:00.000Z') },
      { id: 'soon', startAt: new Date('2026-04-03T12:00:00.000Z') },
    ],
    new Date('2026-04-02T12:00:00.000Z'),
  )

  assert.deepEqual(result.upcoming.map((appointment) => appointment.id), ['soon', 'late'])
  assert.deepEqual(result.history.map((appointment) => appointment.id), ['past'])
})
