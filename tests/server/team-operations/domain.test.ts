import assert from 'node:assert/strict'
import test from 'node:test'
import { AppError } from '../../../server/http/errors'
import {
  assertNoOverlappingPayrollRun,
  assertTeamShiftWindow,
  assertTimeClockEntryCanBeClosed,
  assertTimeClockEntryCanBeOpened,
  calculateOverlapMinutes,
  calculatePayrollBaseAmount,
  calculatePayrollEntrySnapshot,
  calculateWorkedMinutes,
  countsTowardScheduledMinutes,
} from '../../../features/team-operations/domain'

test('assertTeamShiftWindow rejects inverted team shifts', () => {
  const startAt = new Date('2026-04-03T09:00:00Z')
  const endAt = new Date('2026-04-03T08:00:00Z')

  assert.throws(
    () => assertTeamShiftWindow(startAt, endAt),
    (error) =>
      error instanceof AppError &&
      error.code === 'UNPROCESSABLE_ENTITY' &&
      error.message === 'Team shift end time must be later than the start time.',
  )
})

test('assertTimeClockEntryCanBeOpened blocks concurrent open entries', () => {
  assert.throws(
    () => assertTimeClockEntryCanBeOpened(true),
    (error) =>
      error instanceof AppError &&
      error.code === 'CONFLICT' &&
      error.message === 'This employee already has an open time clock entry.',
  )
})

test('assertTimeClockEntryCanBeClosed rejects inconsistent close payload', () => {
  assert.throws(
    () =>
      assertTimeClockEntryCanBeClosed(
        'OPEN',
        new Date('2026-04-03T09:00:00Z'),
        new Date('2026-04-03T08:00:00Z'),
        0,
      ),
    (error) =>
      error instanceof AppError &&
      error.code === 'UNPROCESSABLE_ENTITY' &&
      error.message === 'Clock-out time must be later than clock-in time.',
  )
})

test('calculateWorkedMinutes deducts break time from gross minutes', () => {
  assert.equal(
    calculateWorkedMinutes(
      new Date('2026-04-03T09:00:00Z'),
      new Date('2026-04-03T17:30:00Z'),
      30,
    ),
    480,
  )
})

test('calculateOverlapMinutes returns the overlapping slice in minutes', () => {
  assert.equal(
    calculateOverlapMinutes(
      new Date('2026-04-03T09:00:00Z'),
      new Date('2026-04-03T13:00:00Z'),
      new Date('2026-04-03T11:00:00Z'),
      new Date('2026-04-03T15:00:00Z'),
    ),
    120,
  )
})

test('countsTowardScheduledMinutes excludes canceled shifts and day off from scheduled workload', () => {
  assert.equal(countsTowardScheduledMinutes('WORK', 'CONFIRMED'), true)
  assert.equal(countsTowardScheduledMinutes('DAY_OFF', 'CONFIRMED'), false)
  assert.equal(countsTowardScheduledMinutes('WORK', 'CANCELED'), false)
})

test('calculatePayrollBaseAmount respects payroll mode', () => {
  assert.equal(
    calculatePayrollBaseAmount({
      baseCompensationAmount: 1800,
      payrollMode: 'MONTHLY',
      workedMinutes: 120,
    }),
    1800,
  )
  assert.equal(
    calculatePayrollBaseAmount({
      baseCompensationAmount: 30,
      payrollMode: 'HOURLY',
      workedMinutes: 150,
    }),
    75,
  )
  assert.equal(
    calculatePayrollBaseAmount({
      baseCompensationAmount: 900,
      payrollMode: 'COMMISSION_ONLY',
      workedMinutes: 300,
    }),
    0,
  )
})

test('calculatePayrollEntrySnapshot combines base, commission and manual adjustments', () => {
  assert.deepEqual(
    calculatePayrollEntrySnapshot({
      baseCompensationAmount: 1500,
      commissionAmount: 125,
      manualAdjustmentAmount: 50,
      manualDeductionAmount: 25,
      payrollMode: 'MONTHLY',
      scheduledMinutes: 480,
      workedMinutes: 510,
    }),
    {
      absenceMinutes: 0,
      baseAmount: 1500,
      grossAmount: 1675,
      manualAdjustmentAmount: 50,
      manualDeductionAmount: 25,
      netAmount: 1650,
      overtimeMinutes: 30,
    },
  )
})

test('assertNoOverlappingPayrollRun blocks overlapping draft/finalized windows', () => {
  assert.throws(
    () => assertNoOverlappingPayrollRun(true),
    (error) =>
      error instanceof AppError &&
      error.code === 'CONFLICT' &&
      error.message === 'There is already an overlapping payroll run for this unit and period.',
  )
})
