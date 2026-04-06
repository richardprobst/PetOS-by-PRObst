import { AppError } from '@/server/http/errors'
import { intervalsOverlap } from '@/features/appointments/domain'

export function assertTeamShiftWindow(startAt: Date, endAt: Date) {
  if (endAt <= startAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Team shift end time must be later than the start time.',
    )
  }
}

export function assertTimeClockEntryCanBeOpened(hasOpenEntry: boolean) {
  if (hasOpenEntry) {
    throw new AppError(
      'CONFLICT',
      409,
      'This employee already has an open time clock entry.',
    )
  }
}

export function assertTimeClockEntryCanBeClosed(
  status: string,
  clockInAt: Date,
  clockOutAt: Date,
  breakMinutes: number,
) {
  if (status !== 'OPEN') {
    throw new AppError(
      'CONFLICT',
      409,
      'Only open time clock entries can be closed.',
    )
  }

  if (clockOutAt <= clockInAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Clock-out time must be later than clock-in time.',
    )
  }

  if (breakMinutes < 0) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Break minutes cannot be negative.',
    )
  }
}

export function calculateWorkedMinutes(clockInAt: Date, clockOutAt: Date, breakMinutes: number) {
  const grossMinutes = Math.floor((clockOutAt.getTime() - clockInAt.getTime()) / 60000)
  return Math.max(grossMinutes - breakMinutes, 0)
}

export function calculateOverlapMinutes(
  startAt: Date,
  endAt: Date,
  windowStartAt: Date,
  windowEndAt: Date,
) {
  if (!intervalsOverlap(startAt, endAt, windowStartAt, windowEndAt)) {
    return 0
  }

  const overlapStartAt = new Date(Math.max(startAt.getTime(), windowStartAt.getTime()))
  const overlapEndAt = new Date(Math.min(endAt.getTime(), windowEndAt.getTime()))
  return Math.floor((overlapEndAt.getTime() - overlapStartAt.getTime()) / 60000)
}

export function assertNoOverlappingTeamShift(hasOverlap: boolean) {
  if (hasOverlap) {
    throw new AppError(
      'CONFLICT',
      409,
      'This employee already has an overlapping active team shift.',
    )
  }
}

export function assertPayrollRunWindow(periodStartAt: Date, periodEndAt: Date) {
  if (periodEndAt <= periodStartAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Payroll period end must be later than the period start.',
    )
  }
}

export function assertNoOverlappingPayrollRun(hasOverlap: boolean) {
  if (hasOverlap) {
    throw new AppError(
      'CONFLICT',
      409,
      'There is already an overlapping payroll run for this unit and period.',
    )
  }
}

export function assertPayrollRunCanBeFinalized(status: string) {
  if (status !== 'DRAFT') {
    throw new AppError(
      'CONFLICT',
      409,
      'Only draft payroll runs can be finalized.',
    )
  }
}

export function countsTowardScheduledMinutes(shiftType: string, status: string) {
  if (status === 'CANCELED') {
    return false
  }

  return shiftType !== 'DAY_OFF'
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function calculatePayrollBaseAmount(args: {
  baseCompensationAmount: number
  payrollMode: string
  workedMinutes: number
}) {
  if (args.payrollMode === 'HOURLY') {
    return roundCurrency((args.baseCompensationAmount * args.workedMinutes) / 60)
  }

  if (args.payrollMode === 'MONTHLY') {
    return roundCurrency(args.baseCompensationAmount)
  }

  return 0
}

export function calculatePayrollEntrySnapshot(args: {
  baseCompensationAmount: number
  commissionAmount: number
  manualAdjustmentAmount?: number
  manualDeductionAmount?: number
  payrollMode: string
  scheduledMinutes: number
  workedMinutes: number
}) {
  const overtimeMinutes = Math.max(args.workedMinutes - args.scheduledMinutes, 0)
  const absenceMinutes = Math.max(args.scheduledMinutes - args.workedMinutes, 0)
  const manualAdjustmentAmount = args.manualAdjustmentAmount ?? 0
  const manualDeductionAmount = args.manualDeductionAmount ?? 0
  const baseAmount = calculatePayrollBaseAmount({
    baseCompensationAmount: args.baseCompensationAmount,
    payrollMode: args.payrollMode,
    workedMinutes: args.workedMinutes,
  })
  const grossAmount = roundCurrency(baseAmount + args.commissionAmount + manualAdjustmentAmount)
  const netAmount = roundCurrency(grossAmount - manualDeductionAmount)

  return {
    absenceMinutes,
    baseAmount,
    grossAmount,
    manualAdjustmentAmount,
    manualDeductionAmount,
    netAmount,
    overtimeMinutes,
  }
}
