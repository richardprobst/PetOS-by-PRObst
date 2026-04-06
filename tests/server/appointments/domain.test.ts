import assert from 'node:assert/strict'
import test from 'node:test'
import { AppError } from '../../../server/http/errors'
import { operationalStatusIds } from '../../../features/appointments/constants'
import {
  assertAppointmentDurationIsCompatible,
  assertAppointmentIsNotInThePast,
  assertCapacityAvailability,
  assertCancellationWindow,
  assertOperationalStatusTransition,
  assertRescheduleWindow,
  assertScheduleBlockWindow,
  assertTaxiDogStatusTransition,
  assertTaxiDogWindow,
  assertWaitlistWindow,
  calculateAppointmentDurationMinutes,
  calculateAppointmentEndAt,
  derivePetSizeCategory,
  intervalsOverlap,
  isScheduleBlockingStatus,
  selectCapacityRule,
} from '../../../features/appointments/domain'

function assertThrowsAppError(action: () => void, expectedCode: AppError['code']) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.code, expectedCode)
    return true
  })
}

test('calculateAppointmentDurationMinutes sums all selected service durations', () => {
  assert.equal(calculateAppointmentDurationMinutes([30, 45, 15]), 90)
})

test('calculateAppointmentEndAt adds the total duration to the appointment start time', () => {
  const startAt = new Date('2026-04-01T10:00:00.000Z')

  assert.equal(
    calculateAppointmentEndAt(startAt, 90).toISOString(),
    '2026-04-01T11:30:00.000Z',
  )
})

test('intervalsOverlap detects scheduling collisions correctly', () => {
  const leftStartAt = new Date('2026-04-01T10:00:00.000Z')
  const leftEndAt = new Date('2026-04-01T11:00:00.000Z')

  assert.equal(
    intervalsOverlap(
      leftStartAt,
      leftEndAt,
      new Date('2026-04-01T10:30:00.000Z'),
      new Date('2026-04-01T11:15:00.000Z'),
    ),
    true,
  )

  assert.equal(
    intervalsOverlap(
      leftStartAt,
      leftEndAt,
      new Date('2026-04-01T11:00:00.000Z'),
      new Date('2026-04-01T12:00:00.000Z'),
    ),
    false,
  )
})

test('assertAppointmentIsNotInThePast rejects appointments created in the past', () => {
  assertThrowsAppError(
    () =>
      assertAppointmentIsNotInThePast(
        new Date('2026-04-01T09:59:59.000Z'),
        new Date('2026-04-01T10:00:00.000Z'),
      ),
    'UNPROCESSABLE_ENTITY',
  )
})

test('assertAppointmentDurationIsCompatible rejects end times shorter than service duration', () => {
  assertThrowsAppError(
    () =>
      assertAppointmentDurationIsCompatible(
        new Date('2026-04-01T10:00:00.000Z'),
        new Date('2026-04-01T10:20:00.000Z'),
        30,
      ),
    'UNPROCESSABLE_ENTITY',
  )
})

test('assertOperationalStatusTransition accepts only valid operational transitions', () => {
  assert.doesNotThrow(() =>
    assertOperationalStatusTransition(
      operationalStatusIds.confirmed,
      operationalStatusIds.checkIn,
    ),
  )

  assertThrowsAppError(
    () =>
      assertOperationalStatusTransition(
        operationalStatusIds.scheduled,
        operationalStatusIds.completed,
      ),
    'CONFLICT',
  )
})

test('assertCancellationWindow enforces the unit cancellation notice window', () => {
  assertThrowsAppError(
    () =>
      assertCancellationWindow(
        new Date('2026-04-02T09:00:00.000Z'),
        24,
        new Date('2026-04-01T10:00:00.000Z'),
      ),
    'CONFLICT',
  )
})

test('assertRescheduleWindow enforces the unit reschedule notice window', () => {
  assertThrowsAppError(
    () =>
      assertRescheduleWindow(
        new Date('2026-04-02T09:00:00.000Z'),
        24,
        new Date('2026-04-01T10:30:00.000Z'),
      ),
    'CONFLICT',
  )
})

test('isScheduleBlockingStatus keeps active operational stages blocking the schedule', () => {
  assert.equal(isScheduleBlockingStatus(operationalStatusIds.checkIn), true)
  assert.equal(isScheduleBlockingStatus(operationalStatusIds.completed), false)
})

test('derivePetSizeCategory maps weight bands to practical scheduling buckets', () => {
  assert.equal(derivePetSizeCategory(null), 'UNKNOWN')
  assert.equal(derivePetSizeCategory(4.5), 'SMALL')
  assert.equal(derivePetSizeCategory(18), 'MEDIUM')
  assert.equal(derivePetSizeCategory(32), 'LARGE')
  assert.equal(derivePetSizeCategory(48), 'GIANT')
})

test('selectCapacityRule prefers the most specific active rule for employee, breed and size', () => {
  const selectedRule = selectCapacityRule(
    [
      {
        active: true,
        breed: null,
        employeeUserId: null,
        maxConcurrentAppointments: 1,
        sizeCategory: null,
      },
      {
        active: true,
        breed: null,
        employeeUserId: 'employee-1',
        maxConcurrentAppointments: 2,
        sizeCategory: 'MEDIUM',
      },
      {
        active: true,
        breed: 'Poodle',
        employeeUserId: 'employee-1',
        maxConcurrentAppointments: 3,
        sizeCategory: 'MEDIUM',
      },
    ],
    'employee-1',
    'MEDIUM',
    'poodle',
  )

  assert.equal(selectedRule?.maxConcurrentAppointments, 3)
})

test('assertCapacityAvailability blocks capacity overflow for the selected employee', () => {
  assert.doesNotThrow(() => assertCapacityAvailability(1, 2, 'Ana'))

  assertThrowsAppError(() => assertCapacityAvailability(2, 2, 'Ana'), 'CONFLICT')
})

test('assertScheduleBlockWindow requires a positive block window', () => {
  assertThrowsAppError(
    () =>
      assertScheduleBlockWindow(
        new Date('2026-04-02T10:00:00.000Z'),
        new Date('2026-04-02T10:00:00.000Z'),
      ),
    'UNPROCESSABLE_ENTITY',
  )
})

test('assertWaitlistWindow requires a positive preferred availability window', () => {
  assertThrowsAppError(
    () =>
      assertWaitlistWindow(
        new Date('2026-04-02T10:00:00.000Z'),
        new Date('2026-04-02T09:45:00.000Z'),
      ),
    'UNPROCESSABLE_ENTITY',
  )
})

test('assertTaxiDogWindow accepts empty windows and rejects partial windows', () => {
  assert.doesNotThrow(() => assertTaxiDogWindow(undefined, undefined, 'Pickup window'))

  assertThrowsAppError(
    () => assertTaxiDogWindow(new Date('2026-04-02T08:00:00.000Z'), undefined, 'Pickup window'),
    'UNPROCESSABLE_ENTITY',
  )
})

test('assertTaxiDogStatusTransition enforces the operational transport flow', () => {
  assert.doesNotThrow(() => assertTaxiDogStatusTransition('REQUESTED', 'SCHEDULED'))

  assertThrowsAppError(
    () => assertTaxiDogStatusTransition('REQUESTED', 'COMPLETED'),
    'CONFLICT',
  )
})
