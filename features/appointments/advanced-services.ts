import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { AppError } from '@/server/http/errors'
import {
  assertScheduleBlockWindow,
  normalizeBreedForCapacity,
} from '@/features/appointments/domain'
import type {
  CreateAppointmentCapacityRuleInput,
  CreateScheduleBlockInput,
  ListAppointmentCapacityRulesQuery,
  ListScheduleBlocksQuery,
  UpdateAppointmentCapacityRuleInput,
  UpdateScheduleBlockInput,
} from '@/features/appointments/schemas'

const appointmentCapacityRuleInclude = Prisma.validator<Prisma.AppointmentCapacityRuleInclude>()({
  employee: {
    include: {
      user: true,
    },
  },
  createdBy: true,
})

const scheduleBlockInclude = Prisma.validator<Prisma.ScheduleBlockInclude>()({
  employee: {
    include: {
      user: true,
    },
  },
  createdBy: true,
})

async function getCapacityRuleOrThrow(actor: AuthenticatedUserData, ruleId: string) {
  const rule = await prisma.appointmentCapacityRule.findUnique({
    where: {
      id: ruleId,
    },
    include: appointmentCapacityRuleInclude,
  })

  if (!rule) {
    throw new AppError('NOT_FOUND', 404, 'Appointment capacity rule not found.')
  }

  assertActorCanAccessLocalUnitRecord(actor, rule.unitId)

  return rule
}

async function getScheduleBlockOrThrow(actor: AuthenticatedUserData, blockId: string) {
  const block = await prisma.scheduleBlock.findUnique({
    where: {
      id: blockId,
    },
    include: scheduleBlockInclude,
  })

  if (!block) {
    throw new AppError('NOT_FOUND', 404, 'Schedule block not found.')
  }

  assertActorCanAccessLocalUnitRecord(actor, block.unitId)

  return block
}

async function assertEmployeeScope(unitId: string, employeeUserId: string | undefined | null) {
  if (!employeeUserId) {
    return
  }

  const employee = await prisma.employee.findUnique({
    where: {
      userId: employeeUserId,
    },
    include: {
      user: true,
    },
  })

  if (!employee || employee.unitId !== unitId || !employee.user.active) {
    throw new AppError('CONFLICT', 409, 'Selected employee must be active and belong to the same unit.')
  }
}

async function assertCapacityRuleUniqueness(
  unitId: string,
  employeeUserId: string | null | undefined,
  sizeCategory: string | null | undefined,
  breed: string | null | undefined,
  excludingRuleId?: string,
) {
  const existingRules = await prisma.appointmentCapacityRule.findMany({
    where: {
      unitId,
      active: true,
      ...(excludingRuleId ? { id: { not: excludingRuleId } } : {}),
    },
  })

  const normalizedBreed = normalizeBreedForCapacity(breed)
  const duplicateRule = existingRules.find((rule) => {
    return (
      rule.employeeUserId === (employeeUserId ?? null) &&
      rule.sizeCategory === (sizeCategory ?? null) &&
      normalizeBreedForCapacity(rule.breed) === normalizedBreed
    )
  })

  if (duplicateRule) {
    throw new AppError(
      'CONFLICT',
      409,
      'There is already a capacity rule for the same employee, size category, and breed combination.',
    )
  }
}

export async function listAppointmentCapacityRules(
  actor: AuthenticatedUserData,
  query: ListAppointmentCapacityRulesQuery,
) {
  const unitId = resolveScopedUnitId(actor, query.unitId ?? null)

  return prisma.appointmentCapacityRule.findMany({
    where: {
      unitId,
      ...(query.employeeUserId ? { employeeUserId: query.employeeUserId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    },
    include: appointmentCapacityRuleInclude,
    orderBy: [{ active: 'desc' }, { employeeUserId: 'asc' }, { updatedAt: 'desc' }],
  })
}

export async function createAppointmentCapacityRule(
  actor: AuthenticatedUserData,
  input: CreateAppointmentCapacityRuleInput,
) {
  const unitId = resolveScopedUnitId(actor, null)
  await assertEmployeeScope(unitId, input.employeeUserId)
  await assertCapacityRuleUniqueness(unitId, input.employeeUserId, input.sizeCategory, input.breed)

  return prisma.$transaction(async (tx) => {
    const rule = await tx.appointmentCapacityRule.create({
      data: {
        unitId,
        employeeUserId: input.employeeUserId ?? null,
        createdByUserId: actor.id,
        sizeCategory: input.sizeCategory ?? null,
        breed: input.breed ?? null,
        maxConcurrentAppointments: input.maxConcurrentAppointments,
        notes: input.notes ?? null,
      },
      include: appointmentCapacityRuleInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'appointment.capacity_rule.create',
      entityName: 'AppointmentCapacityRule',
      entityId: rule.id,
      details: {
        breed: input.breed ?? null,
        employeeUserId: input.employeeUserId ?? null,
        maxConcurrentAppointments: input.maxConcurrentAppointments,
        sizeCategory: input.sizeCategory ?? null,
      },
    })

    return rule
  })
}

export async function updateAppointmentCapacityRule(
  actor: AuthenticatedUserData,
  ruleId: string,
  input: UpdateAppointmentCapacityRuleInput,
) {
  const existingRule = await getCapacityRuleOrThrow(actor, ruleId)
  const nextEmployeeUserId =
    input.employeeUserId !== undefined ? input.employeeUserId : existingRule.employeeUserId
  const nextSizeCategory =
    input.sizeCategory !== undefined ? input.sizeCategory : existingRule.sizeCategory
  const nextBreed = input.breed !== undefined ? input.breed : existingRule.breed

  await assertEmployeeScope(existingRule.unitId, nextEmployeeUserId ?? null)
  await assertCapacityRuleUniqueness(
    existingRule.unitId,
    nextEmployeeUserId ?? null,
    nextSizeCategory ?? null,
    nextBreed ?? null,
    ruleId,
  )

  return prisma.$transaction(async (tx) => {
    const rule = await tx.appointmentCapacityRule.update({
      where: {
        id: ruleId,
      },
      data: {
        ...(input.employeeUserId !== undefined ? { employeeUserId: input.employeeUserId ?? null } : {}),
        ...(input.sizeCategory !== undefined ? { sizeCategory: input.sizeCategory ?? null } : {}),
        ...(input.breed !== undefined ? { breed: input.breed ?? null } : {}),
        ...(input.maxConcurrentAppointments !== undefined
          ? { maxConcurrentAppointments: input.maxConcurrentAppointments }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: appointmentCapacityRuleInclude,
    })

    await writeAuditLog(tx, {
      unitId: existingRule.unitId,
      userId: actor.id,
      action: 'appointment.capacity_rule.update',
      entityName: 'AppointmentCapacityRule',
      entityId: ruleId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return rule
  })
}

export async function listScheduleBlocks(
  actor: AuthenticatedUserData,
  query: ListScheduleBlocksQuery,
) {
  const unitId = resolveScopedUnitId(actor, query.unitId ?? null)

  return prisma.scheduleBlock.findMany({
    where: {
      unitId,
      ...(query.employeeUserId ? { employeeUserId: query.employeeUserId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
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
    include: scheduleBlockInclude,
    orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function createScheduleBlock(actor: AuthenticatedUserData, input: CreateScheduleBlockInput) {
  const unitId = resolveScopedUnitId(actor, null)
  assertScheduleBlockWindow(input.startAt, input.endAt)
  await assertEmployeeScope(unitId, input.employeeUserId)

  return prisma.$transaction(async (tx) => {
    const block = await tx.scheduleBlock.create({
      data: {
        unitId,
        employeeUserId: input.employeeUserId ?? null,
        createdByUserId: actor.id,
        blockType: input.blockType,
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        notes: input.notes ?? null,
      },
      include: scheduleBlockInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'appointment.schedule_block.create',
      entityName: 'ScheduleBlock',
      entityId: block.id,
      details: {
        blockType: input.blockType,
        employeeUserId: input.employeeUserId ?? null,
      },
    })

    return block
  })
}

export async function updateScheduleBlock(
  actor: AuthenticatedUserData,
  blockId: string,
  input: UpdateScheduleBlockInput,
) {
  const existingBlock = await getScheduleBlockOrThrow(actor, blockId)
  const nextEmployeeUserId =
    input.employeeUserId !== undefined ? input.employeeUserId : existingBlock.employeeUserId
  const nextStartAt = input.startAt ?? existingBlock.startAt
  const nextEndAt = input.endAt ?? existingBlock.endAt

  assertScheduleBlockWindow(nextStartAt, nextEndAt)
  await assertEmployeeScope(existingBlock.unitId, nextEmployeeUserId ?? null)

  return prisma.$transaction(async (tx) => {
    const block = await tx.scheduleBlock.update({
      where: {
        id: blockId,
      },
      data: {
        ...(input.employeeUserId !== undefined ? { employeeUserId: input.employeeUserId ?? null } : {}),
        ...(input.blockType !== undefined ? { blockType: input.blockType } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: scheduleBlockInclude,
    })

    await writeAuditLog(tx, {
      unitId: existingBlock.unitId,
      userId: actor.id,
      action: 'appointment.schedule_block.update',
      entityName: 'ScheduleBlock',
      entityId: blockId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return block
  })
}
