import { AppError } from '@/server/http/errors'
import {
  allowedOperationalTransitions,
  allowedTaxiDogStatusTransitions,
  petSizeCategories,
  scheduleBlockingStatusIds,
} from '@/features/appointments/constants'

export function calculateAppointmentDurationMinutes(durationMinutes: number[]) {
  return durationMinutes.reduce((total, value) => total + value, 0)
}

export function calculateAppointmentEndAt(startAt: Date, totalDurationMinutes: number) {
  return new Date(startAt.getTime() + totalDurationMinutes * 60 * 1000)
}

export function intervalsOverlap(
  leftStartAt: Date,
  leftEndAt: Date,
  rightStartAt: Date,
  rightEndAt: Date,
) {
  return leftStartAt < rightEndAt && leftEndAt > rightStartAt
}

export function assertAppointmentIsNotInThePast(startAt: Date, now = new Date()) {
  if (startAt < now) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Appointments cannot be created in the past.')
  }
}

export function assertAppointmentDurationIsCompatible(
  startAt: Date,
  endAt: Date,
  minimumDurationMinutes: number,
) {
  const minimumEndAt = calculateAppointmentEndAt(startAt, minimumDurationMinutes)

  if (endAt < minimumEndAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Appointment end time must cover the estimated duration of the selected services.',
    )
  }
}

export function assertOperationalStatusTransition(currentStatusId: string, nextStatusId: string) {
  const allowedTransitions = allowedOperationalTransitions[currentStatusId] ?? []

  if (!allowedTransitions.includes(nextStatusId)) {
    throw new AppError(
      'CONFLICT',
      409,
      `Invalid operational status transition from ${currentStatusId} to ${nextStatusId}.`,
    )
  }
}

export function assertCancellationWindow(startAt: Date, windowHours: number, now = new Date()) {
  const minimumNoticeMilliseconds = windowHours * 60 * 60 * 1000

  if (startAt.getTime() - now.getTime() < minimumNoticeMilliseconds) {
    throw new AppError(
      'CONFLICT',
      409,
      'Cancellation is outside the allowed notice window for this unit.',
    )
  }
}

export function assertRescheduleWindow(startAt: Date, windowHours: number, now = new Date()) {
  const minimumNoticeMilliseconds = windowHours * 60 * 60 * 1000

  if (startAt.getTime() - now.getTime() < minimumNoticeMilliseconds) {
    throw new AppError(
      'CONFLICT',
      409,
      'Rescheduling is outside the allowed notice window for this unit.',
    )
  }
}

export function isScheduleBlockingStatus(statusId: string) {
  return scheduleBlockingStatusIds.includes(statusId as (typeof scheduleBlockingStatusIds)[number])
}

export function calculateAppointmentEstimatedTotalAmount(
  serviceAmounts: number[],
  taxiDogFeeAmount = 0,
) {
  return serviceAmounts.reduce((total, amount) => total + amount, 0) + taxiDogFeeAmount
}

export function derivePetSizeCategory(weightKg: number | null | undefined) {
  if (!Number.isFinite(weightKg) || weightKg === undefined || weightKg === null || weightKg <= 0) {
    return 'UNKNOWN' as const
  }

  if (weightKg <= 10) {
    return 'SMALL' as const
  }

  if (weightKg <= 20) {
    return 'MEDIUM' as const
  }

  if (weightKg <= 40) {
    return 'LARGE' as const
  }

  return 'GIANT' as const
}

export function normalizeBreedForCapacity(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized === '' ? null : normalized
}

export interface CapacityRuleSnapshot {
  active: boolean
  breed: string | null
  employeeUserId: string | null
  maxConcurrentAppointments: number
  sizeCategory: (typeof petSizeCategories)[number] | null
}

export function selectCapacityRule(
  rules: CapacityRuleSnapshot[],
  employeeUserId: string,
  petSizeCategory: (typeof petSizeCategories)[number],
  petBreed: string | null,
) {
  const normalizedBreed = normalizeBreedForCapacity(petBreed)

  const matchingRules = rules.filter((rule) => {
    if (!rule.active) {
      return false
    }

    if (rule.employeeUserId && rule.employeeUserId !== employeeUserId) {
      return false
    }

    if (rule.sizeCategory && rule.sizeCategory !== petSizeCategory) {
      return false
    }

    if (rule.breed && normalizeBreedForCapacity(rule.breed) !== normalizedBreed) {
      return false
    }

    return true
  })

  matchingRules.sort((left, right) => {
    const leftScore =
      (left.employeeUserId ? 4 : 0) + (left.breed ? 2 : 0) + (left.sizeCategory ? 1 : 0)
    const rightScore =
      (right.employeeUserId ? 4 : 0) + (right.breed ? 2 : 0) + (right.sizeCategory ? 1 : 0)

    return rightScore - leftScore
  })

  return matchingRules[0] ?? null
}

export function assertCapacityAvailability(overlapCount: number, allowedCapacity: number, employeeName: string) {
  if (overlapCount >= allowedCapacity) {
    throw new AppError(
      'CONFLICT',
      409,
      `Capacity exceeded for ${employeeName} in the selected time range.`,
    )
  }
}

export function assertScheduleBlockWindow(startAt: Date, endAt: Date) {
  if (endAt <= startAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Schedule block end time must be later than the start time.',
    )
  }
}

export function assertWaitlistWindow(startAt: Date, endAt: Date) {
  if (endAt <= startAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Waitlist preferred end time must be later than the preferred start time.',
    )
  }
}

export function assertTaxiDogWindow(startAt: Date | null | undefined, endAt: Date | null | undefined, label: string) {
  if (!startAt && !endAt) {
    return
  }

  if (!startAt || !endAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `${label} requires both start and end time when provided.`,
    )
  }

  if (endAt <= startAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `${label} end time must be later than the start time.`,
    )
  }
}

export function assertTaxiDogStatusTransition(currentStatus: string, nextStatus: string) {
  const allowedTransitions = allowedTaxiDogStatusTransitions[currentStatus] ?? []

  if (!allowedTransitions.includes(nextStatus)) {
    throw new AppError(
      'CONFLICT',
      409,
      `Invalid Taxi Dog status transition from ${currentStatus} to ${nextStatus}.`,
    )
  }
}
