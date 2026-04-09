import {
  PayrollRunStatus,
  Prisma,
  TeamShiftStatus,
  TimeClockEntryStatus,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { operationalStatusIds } from '@/features/appointments/constants'
import {
  assertNoOverlappingPayrollRun,
  assertNoOverlappingTeamShift,
  assertPayrollRunCanBeFinalized,
  assertPayrollRunWindow,
  assertTeamShiftWindow,
  assertTimeClockEntryCanBeClosed,
  assertTimeClockEntryCanBeOpened,
  calculateOverlapMinutes,
  calculatePayrollEntrySnapshot,
  countsTowardScheduledMinutes,
} from '@/features/team-operations/domain'
import { AppError } from '@/server/http/errors'
import type {
  CloseTimeClockEntryInput,
  CreatePayrollRunInput,
  CreateTeamShiftInput,
  ListPayrollRunsQuery,
  ListTeamShiftsQuery,
  ListTimeClockEntriesQuery,
  OpenTimeClockEntryInput,
  UpdatePayrollRunInput,
  UpdateTeamShiftInput,
  UpdateTimeClockEntryInput,
} from '@/features/team-operations/schemas'

const teamOperationsSettingKeys = {
  payrollPeriodDays: 'equipe.folha.periodo_dias_padrao',
  timeClockToleranceMinutes: 'equipe.ponto_tolerancia_minutos',
  workMinutes: 'equipe.jornada_padrao_minutos',
} as const

const employeeReferenceInclude = Prisma.validator<Prisma.EmployeeInclude>()({
  user: true,
})

const teamShiftDetailsInclude = Prisma.validator<Prisma.TeamShiftInclude>()({
  createdBy: true,
  employee: {
    include: employeeReferenceInclude,
  },
  unit: true,
})

const timeClockEntryDetailsInclude = Prisma.validator<Prisma.TimeClockEntryInclude>()({
  closedBy: true,
  employee: {
    include: employeeReferenceInclude,
  },
  openedBy: true,
  shift: {
    include: teamShiftDetailsInclude,
  },
  unit: true,
})

const payrollRunDetailsInclude = Prisma.validator<Prisma.PayrollRunInclude>()({
  createdBy: true,
  entries: {
    include: {
      employee: {
        include: employeeReferenceInclude,
      },
    },
    orderBy: {
      employee: {
        user: {
          name: 'asc',
        },
      },
    },
  },
  finalizedBy: true,
  unit: true,
})

type TeamOperationsClient = Prisma.TransactionClient | typeof prisma

type TeamOperationsDefaults = {
  defaultPayrollPeriodDays: number
  defaultShiftMinutes: number
  timeClockToleranceMinutes: number
}

type PayrollEntryOverrides = {
  manualAdjustmentAmount: number
  manualDeductionAmount: number
  notes: string | null
}

type TeamOperationsScopeQuery = {
  unitId?: string
}

export function resolveTeamOperationsReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId ?? null)
}

export function assertActorCanReadTeamOperationsRecordInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, options)
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : Number(value)
}

async function getEmployeeOrThrow(
  unitId: string,
  employeeUserId: string,
  client: TeamOperationsClient = prisma,
) {
  const employee = await client.employee.findUnique({
    where: {
      userId: employeeUserId,
    },
    include: employeeReferenceInclude,
  })

  if (!employee) {
    throw new AppError('NOT_FOUND', 404, 'Employee not found.')
  }

  if (employee.unitId !== unitId || !employee.user.active) {
    throw new AppError(
      'CONFLICT',
      409,
      'Selected employee must be active and belong to the same unit.',
    )
  }

  return employee
}

async function getTeamShiftOrThrow(actor: AuthenticatedUserData, shiftId: string) {
  const shift = await prisma.teamShift.findUnique({
    where: {
      id: shiftId,
    },
    include: teamShiftDetailsInclude,
  })

  if (!shift) {
    throw new AppError('NOT_FOUND', 404, 'Team shift not found.')
  }

  assertActorCanReadTeamOperationsRecordInScope(actor, shift.unitId)
  return shift
}

async function getTimeClockEntryOrThrow(actor: AuthenticatedUserData, entryId: string) {
  const entry = await prisma.timeClockEntry.findUnique({
    where: {
      id: entryId,
    },
    include: timeClockEntryDetailsInclude,
  })

  if (!entry) {
    throw new AppError('NOT_FOUND', 404, 'Time clock entry not found.')
  }

  assertActorCanReadTeamOperationsRecordInScope(actor, entry.unitId)
  return entry
}

async function getPayrollRunOrThrow(actor: AuthenticatedUserData, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: {
      id: runId,
    },
    include: payrollRunDetailsInclude,
  })

  if (!run) {
    throw new AppError('NOT_FOUND', 404, 'Payroll run not found.')
  }

  assertActorCanReadTeamOperationsRecordInScope(actor, run.unitId)
  return run
}

async function assertTeamShiftAssociation(args: {
  client?: TeamOperationsClient
  employeeUserId: string
  shiftId: string | null | undefined
  unitId: string
}) {
  if (!args.shiftId) {
    return null
  }

  const shift = await (args.client ?? prisma).teamShift.findUnique({
    where: {
      id: args.shiftId,
    },
    include: teamShiftDetailsInclude,
  })

  if (!shift) {
    throw new AppError('NOT_FOUND', 404, 'Referenced team shift not found.')
  }

  if (shift.unitId !== args.unitId || shift.employeeUserId !== args.employeeUserId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Referenced team shift must belong to the same unit and employee.',
    )
  }

  return shift
}

async function assertTeamShiftOverlap(args: {
  endAt: Date
  excludingShiftId?: string
  employeeUserId: string
  startAt: Date
  status: TeamShiftStatus
  unitId: string
}) {
  if (args.status === TeamShiftStatus.CANCELED) {
    return
  }

  const overlappingShift = await prisma.teamShift.findFirst({
    where: {
      unitId: args.unitId,
      employeeUserId: args.employeeUserId,
      status: {
        in: [TeamShiftStatus.PLANNED, TeamShiftStatus.CONFIRMED],
      },
      ...(args.excludingShiftId ? { id: { not: args.excludingShiftId } } : {}),
      startAt: {
        lt: args.endAt,
      },
      endAt: {
        gt: args.startAt,
      },
    },
    select: {
      id: true,
    },
  })

  assertNoOverlappingTeamShift(Boolean(overlappingShift))
}

async function assertPayrollRunOverlap(args: {
  excludingPayrollRunId?: string
  periodEndAt: Date
  periodStartAt: Date
  unitId: string
}) {
  const overlappingRun = await prisma.payrollRun.findFirst({
    where: {
      unitId: args.unitId,
      status: {
        not: PayrollRunStatus.CANCELED,
      },
      ...(args.excludingPayrollRunId ? { id: { not: args.excludingPayrollRunId } } : {}),
      periodStartAt: {
        lt: args.periodEndAt,
      },
      periodEndAt: {
        gt: args.periodStartAt,
      },
    },
    select: {
      id: true,
    },
  })

  assertNoOverlappingPayrollRun(Boolean(overlappingRun))
}

async function getOpenTimeClockEntriesCount(args: {
  client?: TeamOperationsClient
  employeeUserIds: string[]
  periodEndAt: Date
  unitId: string
}) {
  return (args.client ?? prisma).timeClockEntry.count({
    where: {
      unitId: args.unitId,
      employeeUserId: {
        in: args.employeeUserIds,
      },
      status: TimeClockEntryStatus.OPEN,
      clockInAt: {
        lt: args.periodEndAt,
      },
    },
  })
}

function calculateWorkedMinutesWithinWindow(args: {
  breakMinutes: number
  clockInAt: Date
  clockOutAt: Date
  periodEndAt: Date
  periodStartAt: Date
}) {
  const overlapMinutes = calculateOverlapMinutes(
    args.clockInAt,
    args.clockOutAt,
    args.periodStartAt,
    args.periodEndAt,
  )

  if (overlapMinutes === 0) {
    return 0
  }

  const totalDurationMinutes = Math.max(
    Math.floor((args.clockOutAt.getTime() - args.clockInAt.getTime()) / 60_000),
    0,
  )

  if (totalDurationMinutes === 0) {
    return 0
  }

  const proportionalBreakMinutes = Math.round(
    (args.breakMinutes * overlapMinutes) / totalDurationMinutes,
  )

  return Math.max(overlapMinutes - proportionalBreakMinutes, 0)
}

async function buildPayrollEntryInputs(args: {
  client: Prisma.TransactionClient
  employeeUserIds?: string[]
  overridesByEmployeeUserId?: Map<string, PayrollEntryOverrides>
  periodEndAt: Date
  periodStartAt: Date
  unitId: string
}) {
  const employeeFilter =
    args.employeeUserIds && args.employeeUserIds.length > 0
      ? {
          userId: {
            in: args.employeeUserIds,
          },
        }
      : {}

  const employees = await args.client.employee.findMany({
    where: {
      unitId: args.unitId,
      ...employeeFilter,
      user: {
        active: true,
      },
    },
    include: employeeReferenceInclude,
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })

  if (args.employeeUserIds && employees.length !== args.employeeUserIds.length) {
    throw new AppError(
      'CONFLICT',
      409,
      'One or more selected employees are inactive or belong to another unit.',
    )
  }

  const employeeIds = employees.map((employee) => employee.userId)

  const [teamShifts, timeClockEntries, appointmentServices] = await Promise.all([
    args.client.teamShift.findMany({
      where: {
        unitId: args.unitId,
        employeeUserId: {
          in: employeeIds,
        },
        status: {
          in: [TeamShiftStatus.PLANNED, TeamShiftStatus.CONFIRMED],
        },
        startAt: {
          lt: args.periodEndAt,
        },
        endAt: {
          gt: args.periodStartAt,
        },
      },
      select: {
        employeeUserId: true,
        endAt: true,
        shiftType: true,
        startAt: true,
        status: true,
      },
    }),
    args.client.timeClockEntry.findMany({
      where: {
        unitId: args.unitId,
        employeeUserId: {
          in: employeeIds,
        },
        status: {
          in: [TimeClockEntryStatus.CLOSED, TimeClockEntryStatus.ADJUSTED],
        },
        clockInAt: {
          lt: args.periodEndAt,
        },
        clockOutAt: {
          gt: args.periodStartAt,
        },
      },
      select: {
        breakMinutes: true,
        clockInAt: true,
        clockOutAt: true,
        employeeUserId: true,
      },
    }),
    args.client.appointmentService.findMany({
      where: {
        employeeUserId: {
          in: employeeIds,
        },
        appointment: {
          unitId: args.unitId,
          financialStatus: 'PAID',
          operationalStatusId: operationalStatusIds.completed,
          startAt: {
            lt: args.periodEndAt,
          },
          endAt: {
            gt: args.periodStartAt,
          },
        },
      },
      select: {
        calculatedCommissionAmount: true,
        employeeUserId: true,
      },
    }),
  ])

  const scheduledMinutesByEmployee = new Map<string, number>()
  const workedMinutesByEmployee = new Map<string, number>()
  const commissionAmountByEmployee = new Map<string, number>()

  for (const shift of teamShifts) {
    if (!countsTowardScheduledMinutes(shift.shiftType, shift.status)) {
      continue
    }

    const overlapMinutes = calculateOverlapMinutes(
      shift.startAt,
      shift.endAt,
      args.periodStartAt,
      args.periodEndAt,
    )

    if (overlapMinutes === 0) {
      continue
    }

    scheduledMinutesByEmployee.set(
      shift.employeeUserId,
      (scheduledMinutesByEmployee.get(shift.employeeUserId) ?? 0) + overlapMinutes,
    )
  }

  for (const entry of timeClockEntries) {
    if (!entry.clockOutAt) {
      continue
    }

    const workedMinutes = calculateWorkedMinutesWithinWindow({
      breakMinutes: entry.breakMinutes,
      clockInAt: entry.clockInAt,
      clockOutAt: entry.clockOutAt,
      periodEndAt: args.periodEndAt,
      periodStartAt: args.periodStartAt,
    })

    if (workedMinutes === 0) {
      continue
    }

    workedMinutesByEmployee.set(
      entry.employeeUserId,
      (workedMinutesByEmployee.get(entry.employeeUserId) ?? 0) + workedMinutes,
    )
  }

  for (const appointmentService of appointmentServices) {
    if (!appointmentService.employeeUserId) {
      continue
    }

    commissionAmountByEmployee.set(
      appointmentService.employeeUserId,
      (commissionAmountByEmployee.get(appointmentService.employeeUserId) ?? 0) +
        Number(appointmentService.calculatedCommissionAmount),
    )
  }

  return employees.map((employee) => {
    const baseCompensationAmount = toNumber(employee.baseCompensationAmount)
    const scheduledMinutes = scheduledMinutesByEmployee.get(employee.userId) ?? 0
    const workedMinutes = workedMinutesByEmployee.get(employee.userId) ?? 0
    const commissionAmount = commissionAmountByEmployee.get(employee.userId) ?? 0
    const overrides = args.overridesByEmployeeUserId?.get(employee.userId)
    const summary = calculatePayrollEntrySnapshot({
      baseCompensationAmount,
      commissionAmount,
      manualAdjustmentAmount: overrides?.manualAdjustmentAmount ?? 0,
      manualDeductionAmount: overrides?.manualDeductionAmount ?? 0,
      payrollMode: employee.payrollMode,
      scheduledMinutes,
      workedMinutes,
    })

    return {
      employee,
      entryData: {
        absenceMinutes: summary.absenceMinutes,
        baseCompensationAmount: summary.baseAmount,
        commissionAmount,
        grossAmount: summary.grossAmount,
        manualAdjustmentAmount: summary.manualAdjustmentAmount,
        manualDeductionAmount: summary.manualDeductionAmount,
        netAmount: summary.netAmount,
        notes: overrides?.notes ?? null,
        overtimeMinutes: summary.overtimeMinutes,
        payrollModeSnapshot: employee.payrollMode,
        scheduledMinutes,
        workedMinutes,
      },
    }
  })
}

export async function getTeamOperationsDefaults(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): Promise<TeamOperationsDefaults> {
  const unitId = resolveScopedUnitId(actor, requestedUnitId ?? null)
  const settings = await prisma.unitSetting.findMany({
    where: {
      unitId,
      key: {
        in: [
          teamOperationsSettingKeys.workMinutes,
          teamOperationsSettingKeys.timeClockToleranceMinutes,
          teamOperationsSettingKeys.payrollPeriodDays,
        ],
      },
    },
  })

  const defaultShiftMinutes =
    Number(
      settings.find((setting) => setting.key === teamOperationsSettingKeys.workMinutes)?.value,
    ) || 480
  const timeClockToleranceMinutes =
    Number(
      settings.find(
        (setting) => setting.key === teamOperationsSettingKeys.timeClockToleranceMinutes,
      )?.value,
    ) || 10
  const defaultPayrollPeriodDays =
    Number(
      settings.find((setting) => setting.key === teamOperationsSettingKeys.payrollPeriodDays)
        ?.value,
    ) || 30

  return {
    defaultPayrollPeriodDays,
    defaultShiftMinutes,
    timeClockToleranceMinutes,
  }
}

export async function listTeamShifts(actor: AuthenticatedUserData, query: ListTeamShiftsQuery) {
  const scopedUnitId = resolveTeamOperationsReadUnitId(actor, query.unitId ?? null)

  return prisma.teamShift.findMany({
    where: {
      unitId: scopedUnitId,
      ...(query.employeeUserId ? { employeeUserId: query.employeeUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...((query.startFrom || query.startTo)
        ? {
            ...(query.startFrom && query.startTo
              ? {
                  startAt: {
                    lt: query.startTo,
                  },
                  endAt: {
                    gt: query.startFrom,
                  },
                }
              : query.startFrom
                ? {
                    endAt: {
                      gt: query.startFrom,
                    },
                  }
                : {
                    startAt: {
                      lt: query.startTo,
                    },
                  }),
          }
        : {}),
    },
    include: teamShiftDetailsInclude,
    orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getTeamShiftDetails(
  actor: AuthenticatedUserData,
  shiftId: string,
  query: TeamOperationsScopeQuery = {},
) {
  const shift = await prisma.teamShift.findUnique({
    where: {
      id: shiftId,
    },
    include: teamShiftDetailsInclude,
  })

  if (!shift) {
    throw new AppError('NOT_FOUND', 404, 'Team shift not found.')
  }

  assertActorCanReadTeamOperationsRecordInScope(actor, shift.unitId, {
    requestedUnitId: query.unitId ?? null,
  })

  return shift
}

export async function createTeamShift(actor: AuthenticatedUserData, input: CreateTeamShiftInput) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  assertTeamShiftWindow(input.startAt, input.endAt)
  await getEmployeeOrThrow(unitId, input.employeeUserId)
  await assertTeamShiftOverlap({
    employeeUserId: input.employeeUserId,
    endAt: input.endAt,
    startAt: input.startAt,
    status: input.status,
    unitId,
  })

  return prisma.$transaction(async (tx) => {
    const shift = await tx.teamShift.create({
      data: {
        unitId,
        employeeUserId: input.employeeUserId,
        createdByUserId: actor.id,
        shiftType: input.shiftType,
        status: input.status,
        startAt: input.startAt,
        endAt: input.endAt,
        notes: input.notes ?? null,
      },
      include: teamShiftDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'team_shift.create',
      details: {
        employeeUserId: input.employeeUserId,
        endAt: input.endAt.toISOString(),
        shiftType: input.shiftType,
        startAt: input.startAt.toISOString(),
        status: input.status,
      },
      entityId: shift.id,
      entityName: 'TeamShift',
      unitId,
      userId: actor.id,
    })

    return shift
  })
}

export async function updateTeamShift(
  actor: AuthenticatedUserData,
  shiftId: string,
  input: UpdateTeamShiftInput,
) {
  const existingShift = await getTeamShiftOrThrow(actor, shiftId)
  const nextEmployeeUserId = input.employeeUserId ?? existingShift.employeeUserId
  const nextStartAt = input.startAt ?? existingShift.startAt
  const nextEndAt = input.endAt ?? existingShift.endAt
  const nextStatus = input.status ?? existingShift.status

  assertTeamShiftWindow(nextStartAt, nextEndAt)
  await getEmployeeOrThrow(existingShift.unitId, nextEmployeeUserId)
  await assertTeamShiftOverlap({
    employeeUserId: nextEmployeeUserId,
    endAt: nextEndAt,
    excludingShiftId: shiftId,
    startAt: nextStartAt,
    status: nextStatus,
    unitId: existingShift.unitId,
  })

  return prisma.$transaction(async (tx) => {
    const shift = await tx.teamShift.update({
      where: {
        id: shiftId,
      },
      data: {
        ...(input.employeeUserId !== undefined ? { employeeUserId: input.employeeUserId } : {}),
        ...(input.shiftType !== undefined ? { shiftType: input.shiftType } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: teamShiftDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'team_shift.update',
      details: {
        changedFields: Object.keys(input),
      },
      entityId: shiftId,
      entityName: 'TeamShift',
      unitId: existingShift.unitId,
      userId: actor.id,
    })

    return shift
  })
}

export async function listTimeClockEntries(
  actor: AuthenticatedUserData,
  query: ListTimeClockEntriesQuery,
) {
  const scopedUnitId = resolveTeamOperationsReadUnitId(actor, query.unitId ?? null)

  return prisma.timeClockEntry.findMany({
    where: {
      unitId: scopedUnitId,
      ...(query.employeeUserId ? { employeeUserId: query.employeeUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...((query.startFrom || query.startTo)
        ? {
            ...(query.startFrom && query.startTo
              ? {
                  clockInAt: {
                    lt: query.startTo,
                  },
                  OR: [
                    {
                      clockOutAt: null,
                    },
                    {
                      clockOutAt: {
                        gt: query.startFrom,
                      },
                    },
                  ],
                }
              : query.startFrom
                ? {
                    OR: [
                      {
                        clockOutAt: null,
                      },
                      {
                        clockOutAt: {
                          gt: query.startFrom,
                        },
                      },
                    ],
                  }
                : {
                    clockInAt: {
                      lt: query.startTo,
                    },
                  }),
          }
        : {}),
    },
    include: timeClockEntryDetailsInclude,
    orderBy: [{ status: 'asc' }, { clockInAt: 'desc' }],
  })
}

export async function getTimeClockEntryDetails(
  actor: AuthenticatedUserData,
  entryId: string,
  query: TeamOperationsScopeQuery = {},
) {
  const entry = await prisma.timeClockEntry.findUnique({
    where: {
      id: entryId,
    },
    include: timeClockEntryDetailsInclude,
  })

  if (!entry) {
    throw new AppError('NOT_FOUND', 404, 'Time clock entry not found.')
  }

  assertActorCanReadTeamOperationsRecordInScope(actor, entry.unitId, {
    requestedUnitId: query.unitId ?? null,
  })

  return entry
}

export async function openTimeClockEntry(
  actor: AuthenticatedUserData,
  input: OpenTimeClockEntryInput,
) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  await getEmployeeOrThrow(unitId, input.employeeUserId)
  await assertTeamShiftAssociation({
    employeeUserId: input.employeeUserId,
    shiftId: input.shiftId,
    unitId,
  })

  const openEntryCount = await prisma.timeClockEntry.count({
    where: {
      unitId,
      employeeUserId: input.employeeUserId,
      status: TimeClockEntryStatus.OPEN,
    },
  })

  assertTimeClockEntryCanBeOpened(openEntryCount > 0)

  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeClockEntry.create({
      data: {
        unitId,
        employeeUserId: input.employeeUserId,
        shiftId: input.shiftId ?? null,
        openedByUserId: actor.id,
        clockInAt: input.clockInAt ?? new Date(),
        notes: input.notes ?? null,
      },
      include: timeClockEntryDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'time_clock_entry.open',
      details: {
        clockInAt: entry.clockInAt.toISOString(),
        employeeUserId: input.employeeUserId,
        shiftId: input.shiftId ?? null,
      },
      entityId: entry.id,
      entityName: 'TimeClockEntry',
      unitId,
      userId: actor.id,
    })

    return entry
  })
}

export async function updateTimeClockEntry(
  actor: AuthenticatedUserData,
  entryId: string,
  input: UpdateTimeClockEntryInput,
) {
  const existingEntry = await getTimeClockEntryOrThrow(actor, entryId)

  if (existingEntry.status === TimeClockEntryStatus.VOIDED) {
    throw new AppError('CONFLICT', 409, 'Voided time clock entries cannot be changed.')
  }

  const nextShiftId =
    input.shiftId !== undefined ? input.shiftId ?? null : existingEntry.shiftId
  const nextClockInAt = input.clockInAt ?? existingEntry.clockInAt
  const nextClockOutAt = input.clockOutAt ?? existingEntry.clockOutAt
  const wantsVoid = input.status === 'VOIDED'
  const nextStatus = wantsVoid
    ? TimeClockEntryStatus.VOIDED
    : nextClockOutAt
      ? existingEntry.status === TimeClockEntryStatus.OPEN
        ? TimeClockEntryStatus.CLOSED
        : TimeClockEntryStatus.ADJUSTED
      : existingEntry.status

  if (nextShiftId) {
    await assertTeamShiftAssociation({
      employeeUserId: existingEntry.employeeUserId,
      shiftId: nextShiftId,
      unitId: existingEntry.unitId,
    })
  }

  if (!wantsVoid && nextClockOutAt && nextClockOutAt <= nextClockInAt) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Clock-out time must be later than clock-in time.',
    )
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeClockEntry.update({
      where: {
        id: entryId,
      },
      data: {
        ...(input.shiftId !== undefined ? { shiftId: input.shiftId ?? null } : {}),
        ...(input.clockInAt !== undefined ? { clockInAt: input.clockInAt } : {}),
        ...(input.clockOutAt !== undefined ? { clockOutAt: input.clockOutAt ?? null } : {}),
        ...(input.breakMinutes !== undefined ? { breakMinutes: input.breakMinutes } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        status: nextStatus,
      },
      include: timeClockEntryDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'time_clock_entry.update',
      details: {
        changedFields: Object.keys(input),
        nextStatus,
      },
      entityId: entryId,
      entityName: 'TimeClockEntry',
      unitId: existingEntry.unitId,
      userId: actor.id,
    })

    return entry
  })
}

export async function closeTimeClockEntry(
  actor: AuthenticatedUserData,
  entryId: string,
  input: CloseTimeClockEntryInput,
) {
  const existingEntry = await getTimeClockEntryOrThrow(actor, entryId)
  const clockOutAt = input.clockOutAt ?? new Date()
  assertTimeClockEntryCanBeClosed(
    existingEntry.status,
    existingEntry.clockInAt,
    clockOutAt,
    input.breakMinutes,
  )

  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeClockEntry.update({
      where: {
        id: entryId,
      },
      data: {
        breakMinutes: input.breakMinutes,
        closedByUserId: actor.id,
        clockOutAt,
        notes: input.notes ?? existingEntry.notes,
        status: TimeClockEntryStatus.CLOSED,
      },
      include: timeClockEntryDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'time_clock_entry.close',
      details: {
        breakMinutes: input.breakMinutes,
        clockOutAt: clockOutAt.toISOString(),
        workedMinutes: entry.clockOutAt
          ? Math.max(
              Math.floor((entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000) -
                entry.breakMinutes,
              0,
            )
          : 0,
      },
      entityId: entryId,
      entityName: 'TimeClockEntry',
      unitId: existingEntry.unitId,
      userId: actor.id,
    })

    return entry
  })
}

export async function listPayrollRuns(actor: AuthenticatedUserData, query: ListPayrollRunsQuery) {
  const scopedUnitId = resolveTeamOperationsReadUnitId(actor, query.unitId ?? null)

  return prisma.payrollRun.findMany({
    where: {
      unitId: scopedUnitId,
      ...(query.status ? { status: query.status } : {}),
      ...((query.periodStartFrom || query.periodEndTo)
        ? {
            ...(query.periodStartFrom && query.periodEndTo
              ? {
                  periodStartAt: {
                    lt: query.periodEndTo,
                  },
                  periodEndAt: {
                    gt: query.periodStartFrom,
                  },
                }
              : query.periodStartFrom
                ? {
                    periodEndAt: {
                      gt: query.periodStartFrom,
                    },
                  }
                : {
                    periodStartAt: {
                      lt: query.periodEndTo,
                    },
                  }),
          }
        : {}),
    },
    include: payrollRunDetailsInclude,
    orderBy: [{ periodStartAt: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getPayrollRunDetails(
  actor: AuthenticatedUserData,
  runId: string,
  query: TeamOperationsScopeQuery = {},
) {
  const run = await prisma.payrollRun.findUnique({
    where: {
      id: runId,
    },
    include: payrollRunDetailsInclude,
  })

  if (!run) {
    throw new AppError('NOT_FOUND', 404, 'Payroll run not found.')
  }

  assertActorCanReadTeamOperationsRecordInScope(actor, run.unitId, {
    requestedUnitId: query.unitId ?? null,
  })

  return run
}

export async function createPayrollRun(
  actor: AuthenticatedUserData,
  input: CreatePayrollRunInput,
) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  assertPayrollRunWindow(input.periodStartAt, input.periodEndAt)
  await assertPayrollRunOverlap({
    periodEndAt: input.periodEndAt,
    periodStartAt: input.periodStartAt,
    unitId,
  })

  return prisma.$transaction(async (tx) => {
    const payrollEntries = await buildPayrollEntryInputs({
      client: tx,
      employeeUserIds: input.employeeUserIds,
      periodEndAt: input.periodEndAt,
      periodStartAt: input.periodStartAt,
      unitId,
    })

    const run = await tx.payrollRun.create({
      data: {
        unitId,
        createdByUserId: actor.id,
        periodStartAt: input.periodStartAt,
        periodEndAt: input.periodEndAt,
        status: PayrollRunStatus.DRAFT,
        notes: input.notes ?? null,
      },
    })

    for (const payrollEntry of payrollEntries) {
      await tx.payrollRunEntry.create({
        data: {
          payrollRunId: run.id,
          employeeUserId: payrollEntry.employee.userId,
          ...payrollEntry.entryData,
        },
      })
    }

    await writeAuditLog(tx, {
      action: 'payroll_run.create',
      details: {
        employeeCount: payrollEntries.length,
        periodEndAt: input.periodEndAt.toISOString(),
        periodStartAt: input.periodStartAt.toISOString(),
      },
      entityId: run.id,
      entityName: 'PayrollRun',
      unitId,
      userId: actor.id,
    })

    return tx.payrollRun.findUniqueOrThrow({
      where: {
        id: run.id,
      },
      include: payrollRunDetailsInclude,
    })
  })
}

export async function updatePayrollRun(
  actor: AuthenticatedUserData,
  runId: string,
  input: UpdatePayrollRunInput,
) {
  const existingRun = await getPayrollRunOrThrow(actor, runId)

  if (existingRun.status !== PayrollRunStatus.DRAFT) {
    throw new AppError('CONFLICT', 409, 'Only draft payroll runs can be updated.')
  }

  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.update({
      where: {
        id: runId,
      },
      data: {
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: payrollRunDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'payroll_run.update',
      details: {
        changedFields: Object.keys(input),
      },
      entityId: runId,
      entityName: 'PayrollRun',
      unitId: existingRun.unitId,
      userId: actor.id,
    })

    return run
  })
}

export async function finalizePayrollRun(
  actor: AuthenticatedUserData,
  runId: string,
  input?: { notes?: string },
) {
  const existingRun = await getPayrollRunOrThrow(actor, runId)
  assertPayrollRunCanBeFinalized(existingRun.status)
  const employeeUserIds = existingRun.entries.map((entry) => entry.employeeUserId)

  return prisma.$transaction(async (tx) => {
    const openEntryCount = await getOpenTimeClockEntriesCount({
      client: tx,
      employeeUserIds,
      periodEndAt: existingRun.periodEndAt,
      unitId: existingRun.unitId,
    })

    if (openEntryCount > 0) {
      throw new AppError(
        'CONFLICT',
        409,
        'There are open time clock entries inside this payroll period. Close or void them before finalizing the payroll run.',
      )
    }

    const overridesByEmployeeUserId = new Map<string, PayrollEntryOverrides>(
      existingRun.entries.map((entry) => [
        entry.employeeUserId,
        {
          manualAdjustmentAmount: Number(entry.manualAdjustmentAmount),
          manualDeductionAmount: Number(entry.manualDeductionAmount),
          notes: entry.notes,
        },
      ]),
    )

    const latestSnapshots = await buildPayrollEntryInputs({
      client: tx,
      employeeUserIds,
      overridesByEmployeeUserId,
      periodEndAt: existingRun.periodEndAt,
      periodStartAt: existingRun.periodStartAt,
      unitId: existingRun.unitId,
    })

    for (const snapshot of latestSnapshots) {
      await tx.payrollRunEntry.update({
        where: {
          payrollRunId_employeeUserId: {
            payrollRunId: runId,
            employeeUserId: snapshot.employee.userId,
          },
        },
        data: snapshot.entryData,
      })
    }

    const run = await tx.payrollRun.update({
      where: {
        id: runId,
      },
      data: {
        finalizedAt: new Date(),
        finalizedByUserId: actor.id,
        notes: input?.notes ?? existingRun.notes,
        status: PayrollRunStatus.FINALIZED,
      },
      include: payrollRunDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'payroll_run.finalize',
      details: {
        employeeCount: existingRun.entries.length,
        periodEndAt: existingRun.periodEndAt.toISOString(),
        periodStartAt: existingRun.periodStartAt.toISOString(),
      },
      entityId: run.id,
      entityName: 'PayrollRun',
      unitId: existingRun.unitId,
      userId: actor.id,
    })

    return run
  })
}
