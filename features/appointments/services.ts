import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import {
  assertActorCanAccessOwnershipBinding,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { recalculateAppointmentServiceCommissions } from '@/features/appointments/financial'
import { operationalStatusIds } from '@/features/appointments/constants'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'
import {
  assertCapacityAvailability,
  assertAppointmentDurationIsCompatible,
  assertAppointmentIsNotInThePast,
  assertCancellationWindow,
  assertOperationalStatusTransition,
  assertRescheduleWindow,
  calculateAppointmentDurationMinutes,
  calculateAppointmentEndAt,
  calculateAppointmentEstimatedTotalAmount,
  derivePetSizeCategory,
  selectCapacityRule,
} from '@/features/appointments/domain'
import type {
  AppointmentCheckInInput,
  AppointmentServiceItemInput,
  AppointmentScopeQuery,
  CancelAppointmentInput,
  ChangeAppointmentStatusInput,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from '@/features/appointments/schemas'
import { upsertTaxiDogRideInMutation } from '@/features/taxi-dog/services'

const appointmentDetailsInclude = Prisma.validator<Prisma.AppointmentInclude>()({
  unit: true,
  client: {
    include: {
      user: true,
    },
  },
  pet: true,
  operationalStatus: true,
  services: {
    include: {
      service: true,
      employee: {
        include: {
          user: true,
        },
      },
    },
  },
  statusHistory: {
    include: {
      status: true,
      changedBy: true,
    },
    orderBy: {
      changedAt: 'asc',
    },
  },
  checkIn: {
    include: {
      performedBy: true,
    },
  },
  taxiDogRide: {
    include: {
      assignedDriver: {
        include: {
          user: true,
        },
      },
      createdBy: true,
    },
  },
})

type AppointmentWithDetails = Prisma.AppointmentGetPayload<{
  include: typeof appointmentDetailsInclude
}>

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

type AppointmentMutationClient = Prisma.TransactionClient | typeof prisma

const unitSettingKeys = {
  cancellationWindowHours: 'agenda.cancelamento_antecedencia_horas',
  rescheduleWindowHours: 'agenda.reagendamento_antecedencia_horas',
} as const

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : Number(value)
}

async function getCapacityRulesForEmployees(
  client: AppointmentMutationClient,
  unitId: string,
  employeeIds: string[],
) {
  if (employeeIds.length === 0) {
    return []
  }

  return client.appointmentCapacityRule.findMany({
    where: {
      unitId,
      active: true,
      OR: [{ employeeUserId: null }, { employeeUserId: { in: employeeIds } }],
    },
    include: appointmentCapacityRuleInclude,
    orderBy: [{ employeeUserId: 'desc' }, { updatedAt: 'desc' }],
  })
}

async function assertScheduleBlockAvailability(
  client: AppointmentMutationClient,
  unitId: string,
  employeeIds: string[],
  startAt: Date,
  endAt: Date,
) {
  const scheduleBlocks = await client.scheduleBlock.findMany({
    where: {
      unitId,
      active: true,
      startAt: {
        lt: endAt,
      },
      endAt: {
        gt: startAt,
      },
      ...(employeeIds.length > 0
        ? {
            OR: [{ employeeUserId: null }, { employeeUserId: { in: employeeIds } }],
          }
        : {
            employeeUserId: null,
          }),
    },
    include: scheduleBlockInclude,
    orderBy: {
      startAt: 'asc',
    },
  })

  if (scheduleBlocks.length === 0) {
    return
  }

  const block = scheduleBlocks[0]
  const label = block.employee?.user.name
    ? `${block.title} (${block.employee.user.name})`
    : block.title

  throw new AppError(
    'CONFLICT',
    409,
    `The selected time range overlaps an agenda block: ${label}.`,
  )
}

async function assertEmployeeCapacityAvailability(
  client: AppointmentMutationClient,
  unitId: string,
  employees: Array<{ userId: string; user: { name: string } }>,
  startAt: Date,
  endAt: Date,
  pet: { breed: string | null; weightKg: Prisma.Decimal | null },
  excludingAppointmentId?: string,
) {
  if (employees.length === 0) {
    return
  }

  const employeeIds = employees.map((employee) => employee.userId)
  const [capacityRules, conflictingAssignments] = await Promise.all([
    getCapacityRulesForEmployees(client, unitId, employeeIds),
    client.appointmentService.findMany({
      where: {
        employeeUserId: {
          in: employeeIds,
        },
        ...(excludingAppointmentId ? { appointmentId: { not: excludingAppointmentId } } : {}),
        appointment: {
          operationalStatusId: {
            notIn: [operationalStatusIds.canceled, operationalStatusIds.noShow],
          },
          startAt: {
            lt: endAt,
          },
          endAt: {
            gt: startAt,
          },
        },
      },
      select: {
        appointmentId: true,
        employeeUserId: true,
      },
      distinct: ['appointmentId', 'employeeUserId'],
    }),
  ])

  const overlapCountByEmployee = conflictingAssignments.reduce<Map<string, number>>((counts, assignment) => {
    if (!assignment.employeeUserId) {
      return counts
    }

    counts.set(assignment.employeeUserId, (counts.get(assignment.employeeUserId) ?? 0) + 1)
    return counts
  }, new Map())

  const petSizeCategory = derivePetSizeCategory(toNumber(pet.weightKg))

  for (const employee of employees) {
    const selectedRule = selectCapacityRule(
      capacityRules,
      employee.userId,
      petSizeCategory,
      pet.breed,
    )
    const allowedCapacity = selectedRule?.maxConcurrentAppointments ?? 1
    const overlapCount = overlapCountByEmployee.get(employee.userId) ?? 0

    assertCapacityAvailability(overlapCount, allowedCapacity, employee.user.name)
  }
}


async function getUnitRuleSettings(client: AppointmentMutationClient, unitId: string) {
  const settings = await client.unitSetting.findMany({
    where: {
      unitId,
      key: {
        in: [unitSettingKeys.cancellationWindowHours, unitSettingKeys.rescheduleWindowHours],
      },
    },
  })

  const findSettingValue = (key: string, fallbackValue: number) => {
    const value = settings.find((setting) => setting.key === key)?.value

    if (!value) {
      return fallbackValue
    }

    const parsedValue = Number(value)

    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  }

  return {
    cancellationWindowHours: findSettingValue(unitSettingKeys.cancellationWindowHours, 24),
    rescheduleWindowHours: findSettingValue(unitSettingKeys.rescheduleWindowHours, 24),
  }
}

async function getOperationalStatusOrThrow(client: AppointmentMutationClient, statusId: string) {
  const status = await client.operationalStatus.findUnique({
    where: {
      id: statusId,
    },
  })

  if (!status) {
    throw new AppError('NOT_FOUND', 404, `Operational status ${statusId} was not found.`)
  }

  return status
}

async function loadAppointmentDependencies(
  client: AppointmentMutationClient,
  actor: AuthenticatedUserData,
  unitId: string,
  clientId: string,
  petId: string,
  serviceItems: AppointmentServiceItemInput[],
) {
  const serviceIds = Array.from(new Set(serviceItems.map((serviceItem) => serviceItem.serviceId)))
  const employeeIds = Array.from(
    new Set(
      serviceItems
        .map((serviceItem) => serviceItem.employeeUserId)
        .filter((employeeUserId): employeeUserId is string => Boolean(employeeUserId)),
    ),
  )

  const [clientRecord, petRecord, services, employees] = await Promise.all([
    client.client.findUnique({
      where: {
        userId: clientId,
      },
      include: {
        user: true,
      },
    }),
    client.pet.findUnique({
      where: {
        id: petId,
      },
    }),
    client.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
    }),
    employeeIds.length
      ? client.employee.findMany({
          where: {
            userId: {
              in: employeeIds,
            },
          },
          include: {
            user: true,
          },
        })
      : Promise.resolve([]),
  ])

  if (!clientRecord) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for appointment.')
  }

  if (clientRecord.user.unitId) {
    assertActorCanAccessOwnershipBinding(
      actor,
      buildClientOwnershipBinding(clientRecord.user.unitId),
      {
        requestedUnitId: clientRecord.user.unitId,
      },
    )
  }

  if (clientRecord.user.unitId && clientRecord.user.unitId !== unitId) {
    throw new AppError('CONFLICT', 409, 'Client belongs to another unit.')
  }

  if (!petRecord) {
    throw new AppError('NOT_FOUND', 404, 'Pet not found for appointment.')
  }

  if (petRecord.clientId !== clientId) {
    throw new AppError('CONFLICT', 409, 'Selected pet does not belong to the selected client.')
  }

  if (services.length !== serviceIds.length) {
    throw new AppError('NOT_FOUND', 404, 'One or more services were not found.')
  }

  for (const service of services) {
    if (!service.active) {
      throw new AppError('CONFLICT', 409, `Service ${service.name} is inactive.`)
    }

    if (service.unitId && service.unitId !== unitId) {
      throw new AppError('CONFLICT', 409, `Service ${service.name} belongs to another unit.`)
    }
  }

  if (employees.length !== employeeIds.length) {
    throw new AppError('NOT_FOUND', 404, 'One or more employees were not found.')
  }

  for (const employee of employees) {
    if (employee.unitId !== unitId) {
      throw new AppError('CONFLICT', 409, 'Employee belongs to another unit.')
    }

    if (!employee.user.active) {
      throw new AppError('CONFLICT', 409, `Employee ${employee.user.name} is inactive.`)
    }
  }

  return {
    clientRecord,
    petRecord,
    services,
    employees,
  }
}

async function assertScheduleAvailability(
  client: AppointmentMutationClient,
  unitId: string,
  employees: Array<{ userId: string; user: { name: string } }>,
  startAt: Date,
  endAt: Date,
  pet: { breed: string | null; weightKg: Prisma.Decimal | null },
  excludingAppointmentId?: string,
) {
  const employeeIds = employees.map((employee) => employee.userId)

  await assertScheduleBlockAvailability(client, unitId, employeeIds, startAt, endAt)
  await assertEmployeeCapacityAvailability(
    client,
    unitId,
    employees,
    startAt,
    endAt,
    pet,
    excludingAppointmentId,
  )
}

async function createStatusHistoryEntry(
  client: AppointmentMutationClient,
  appointmentId: string,
  statusId: string,
  actor: AuthenticatedUserData,
) {
  await client.appointmentStatusHistory.create({
    data: {
      appointmentId,
      statusId,
      changedByUserId: actor.id,
    },
  })
}

function buildAppointmentServiceCreateData(
  serviceItems: AppointmentServiceItemInput[],
  services: Array<{ id: string; basePrice: Prisma.Decimal }>,
) {
  return serviceItems.map((serviceItem) => {
    const service = services.find((entry) => entry.id === serviceItem.serviceId)

    if (!service) {
      throw new AppError('NOT_FOUND', 404, 'Service not found during appointment assembly.')
    }

    return {
      serviceId: service.id,
      employeeUserId: serviceItem.employeeUserId ?? null,
      agreedUnitPrice: serviceItem.agreedUnitPrice ?? Number(service.basePrice),
      calculatedCommissionAmount: 0,
    }
  })
}

function calculateEstimatedTotalAmount(
  serviceItems: AppointmentServiceItemInput[],
  services: Array<{ id: string; basePrice: Prisma.Decimal }>,
  taxiDogFeeAmount = 0,
) {
  return calculateAppointmentEstimatedTotalAmount(
    buildAppointmentServiceCreateData(serviceItems, services).map((item) => item.agreedUnitPrice),
    taxiDogFeeAmount,
  )
}

function buildAppointmentReadOwnership(unitId: string) {
  return {
    kind: 'LOCAL_RECORD' as const,
    primaryUnitId: unitId,
    linkedUnitIds: [] as string[],
    reassignmentAuditRequired: true as const,
  }
}

export function resolveAppointmentReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId ?? null)
}

export function assertActorCanReadAppointmentInScope(
  actor: AuthenticatedUserData,
  appointmentUnitId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  assertActorCanAccessOwnershipBinding(
    actor,
    buildAppointmentReadOwnership(appointmentUnitId),
    options,
  )
}

async function getAppointmentOrThrow(actor: AuthenticatedUserData, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: appointmentDetailsInclude,
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found.')
  }

  assertActorCanReadAppointmentInScope(actor, appointment.unitId)

  return appointment
}

async function getAppointmentForReadOrThrow(
  actor: AuthenticatedUserData,
  appointmentId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: appointmentDetailsInclude,
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found.')
  }

  assertActorCanReadAppointmentInScope(actor, appointment.unitId, options)

  return appointment
}

function assertAppointmentCanBeEdited(appointment: AppointmentWithDetails) {
  if (
    appointment.operationalStatusId === operationalStatusIds.completed ||
    appointment.operationalStatusId === operationalStatusIds.canceled ||
    appointment.operationalStatusId === operationalStatusIds.noShow
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'Appointments in a terminal status cannot be edited.',
    )
  }
}

export async function listAppointments(actor: AuthenticatedUserData, query: ListAppointmentsQuery) {
  const scopedUnitId = resolveAppointmentReadUnitId(actor, query.unitId ?? null)

  return prisma.appointment.findMany({
    where: {
      ...(scopedUnitId ? { unitId: scopedUnitId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.petId ? { petId: query.petId } : {}),
      ...(query.operationalStatusId ? { operationalStatusId: query.operationalStatusId } : {}),
      ...(query.startFrom || query.startTo
        ? {
            startAt: {
              ...(query.startFrom ? { gte: query.startFrom } : {}),
              ...(query.startTo ? { lte: query.startTo } : {}),
            },
          }
        : {}),
    },
    include: appointmentDetailsInclude,
    orderBy: {
      startAt: 'asc',
    },
  })
}

export async function getAppointmentById(
  actor: AuthenticatedUserData,
  appointmentId: string,
  query: AppointmentScopeQuery = {},
) {
  return getAppointmentForReadOrThrow(actor, appointmentId, {
    requestedUnitId: query.unitId ?? null,
  })
}

export async function createAppointmentInMutation(
  tx: AppointmentMutationClient,
  actor: AuthenticatedUserData,
  input: CreateAppointmentInput,
) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  assertAppointmentIsNotInThePast(input.startAt)

  const scheduledStatus = await getOperationalStatusOrThrow(tx, operationalStatusIds.scheduled)
  const dependencies = await loadAppointmentDependencies(
    tx,
    actor,
    unitId,
    input.clientId,
    input.petId,
    input.services,
  )

  const totalDurationMinutes = calculateAppointmentDurationMinutes(
    dependencies.services.map((service) => service.estimatedDurationMinutes),
  )

  const endAt = input.endAt ?? calculateAppointmentEndAt(input.startAt, totalDurationMinutes)

  assertAppointmentDurationIsCompatible(input.startAt, endAt, totalDurationMinutes)

  await assertScheduleAvailability(
    tx,
    unitId,
    dependencies.employees,
    input.startAt,
    endAt,
    dependencies.petRecord,
  )

  const appointment = await tx.appointment.create({
    data: {
      unitId,
      clientId: input.clientId,
      petId: input.petId,
      operationalStatusId: scheduledStatus.id,
      startAt: input.startAt,
      endAt,
      clientNotes: input.clientNotes,
      internalNotes: input.internalNotes,
      estimatedTotalAmount: calculateEstimatedTotalAmount(
        input.services,
        dependencies.services,
        input.taxiDog?.feeAmount ?? 0,
      ),
      services: {
        create: buildAppointmentServiceCreateData(input.services, dependencies.services),
      },
    },
    include: appointmentDetailsInclude,
  })

  if (input.taxiDog) {
    await upsertTaxiDogRideInMutation(tx, actor, appointment, input.taxiDog)
  }

  await createStatusHistoryEntry(tx, appointment.id, scheduledStatus.id, actor)
  await recalculateAppointmentServiceCommissions(tx, appointment.id)

  await writeAuditLog(tx, {
    unitId,
    userId: actor.id,
    action: 'appointment.create',
    entityName: 'Appointment',
    entityId: appointment.id,
    details: {
      serviceCount: input.services.length,
      taxiDogRequested: Boolean(input.taxiDog),
    },
  })

  return tx.appointment.findUniqueOrThrow({
    where: {
      id: appointment.id,
    },
    include: appointmentDetailsInclude,
  })
}

export async function createAppointment(actor: AuthenticatedUserData, input: CreateAppointmentInput) {
  return prisma.$transaction((tx) => createAppointmentInMutation(tx, actor, input))
}

export async function updateAppointment(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: UpdateAppointmentInput,
) {
  const existingAppointment = await getAppointmentOrThrow(actor, appointmentId)
  assertAppointmentCanBeEdited(existingAppointment)

  const nextUnitId = resolveScopedUnitId(actor, input.unitId ?? existingAppointment.unitId)
  const nextClientId = input.clientId ?? existingAppointment.clientId
  const nextPetId = input.petId ?? existingAppointment.petId
  const nextServiceItems =
    input.services ??
    existingAppointment.services.map((serviceItem) => ({
      serviceId: serviceItem.serviceId,
      employeeUserId: serviceItem.employeeUserId ?? undefined,
      agreedUnitPrice: Number(serviceItem.agreedUnitPrice),
    }))
  const nextStartAt = input.startAt ?? existingAppointment.startAt

  return prisma.$transaction(async (tx) => {
    const dependencies = await loadAppointmentDependencies(
      tx,
      actor,
      nextUnitId,
      nextClientId,
      nextPetId,
      nextServiceItems,
    )
    const totalDurationMinutes = calculateAppointmentDurationMinutes(
      dependencies.services.map((service) => service.estimatedDurationMinutes),
    )
    const nextEndAt = input.endAt ?? calculateAppointmentEndAt(nextStartAt, totalDurationMinutes)

    assertAppointmentIsNotInThePast(nextStartAt)
    assertAppointmentDurationIsCompatible(nextStartAt, nextEndAt, totalDurationMinutes)

    await assertScheduleAvailability(
      tx,
      nextUnitId,
      dependencies.employees,
      nextStartAt,
      nextEndAt,
      dependencies.petRecord,
      appointmentId,
    )

    await tx.appointmentService.deleteMany({
      where: {
        appointmentId,
      },
    })

    await tx.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        unitId: nextUnitId,
        clientId: nextClientId,
        petId: nextPetId,
        startAt: nextStartAt,
        endAt: nextEndAt,
        ...(input.clientNotes !== undefined ? { clientNotes: input.clientNotes } : {}),
        ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
        estimatedTotalAmount: calculateEstimatedTotalAmount(
          nextServiceItems,
          dependencies.services,
          toNumber(existingAppointment.taxiDogRide?.feeAmount),
        ),
        services: {
          create: buildAppointmentServiceCreateData(nextServiceItems, dependencies.services),
        },
      },
    })

    await recalculateAppointmentServiceCommissions(tx, appointmentId)

    await writeAuditLog(tx, {
      unitId: nextUnitId,
      userId: actor.id,
      action: 'appointment.update',
      entityName: 'Appointment',
      entityId: appointmentId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return tx.appointment.findUniqueOrThrow({
      where: {
        id: appointmentId,
      },
      include: appointmentDetailsInclude,
    })
  })
}

export async function changeAppointmentStatus(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: ChangeAppointmentStatusInput,
) {
  const appointment = await getAppointmentOrThrow(actor, appointmentId)

  assertOperationalStatusTransition(appointment.operationalStatusId, input.nextStatusId)

  return prisma.$transaction(async (tx) => {
    await getOperationalStatusOrThrow(tx, input.nextStatusId)

    await tx.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        operationalStatusId: input.nextStatusId,
      },
    })

    await createStatusHistoryEntry(tx, appointmentId, input.nextStatusId, actor)
    await recalculateAppointmentServiceCommissions(tx, appointmentId)

    await writeAuditLog(tx, {
      unitId: appointment.unitId,
      userId: actor.id,
      action: 'appointment.status.change',
      entityName: 'Appointment',
      entityId: appointmentId,
      details: {
        from: appointment.operationalStatusId,
        to: input.nextStatusId,
      },
    })

    return tx.appointment.findUniqueOrThrow({
      where: {
        id: appointmentId,
      },
      include: appointmentDetailsInclude,
    })
  })
}

export async function cancelAppointment(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: CancelAppointmentInput,
) {
  const appointment = await getAppointmentOrThrow(actor, appointmentId)
  const settings = await getUnitRuleSettings(prisma, appointment.unitId)
  assertAppointmentCanBeEdited(appointment)
  assertCancellationWindow(appointment.startAt, settings.cancellationWindowHours)

  return prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        operationalStatusId: operationalStatusIds.canceled,
      },
    })

    await createStatusHistoryEntry(tx, appointmentId, operationalStatusIds.canceled, actor)
    await recalculateAppointmentServiceCommissions(tx, appointmentId)

    await writeAuditLog(tx, {
      unitId: appointment.unitId,
      userId: actor.id,
      action: 'appointment.cancel',
      entityName: 'Appointment',
      entityId: appointmentId,
      details: {
        reason: input.reason ?? null,
      },
    })

    return tx.appointment.findUniqueOrThrow({
      where: {
        id: appointmentId,
      },
      include: appointmentDetailsInclude,
    })
  })
}

export async function rescheduleAppointment(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: RescheduleAppointmentInput,
) {
  const appointment = await getAppointmentOrThrow(actor, appointmentId)
  const settings = await getUnitRuleSettings(prisma, appointment.unitId)
  assertAppointmentCanBeEdited(appointment)
  assertRescheduleWindow(appointment.startAt, settings.rescheduleWindowHours)

  return updateAppointment(actor, appointmentId, {
    startAt: input.startAt,
    endAt: input.endAt,
    services: input.services,
    internalNotes:
      input.reason && appointment.internalNotes
        ? `${appointment.internalNotes}\nReagendamento: ${input.reason}`
        : input.reason ?? appointment.internalNotes ?? undefined,
  })
}

export async function checkInAppointment(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: AppointmentCheckInInput,
) {
  const appointment = await getAppointmentOrThrow(actor, appointmentId)

  if (appointment.operationalStatusId !== operationalStatusIds.confirmed) {
    throw new AppError(
      'CONFLICT',
      409,
      'Check-in is only allowed for confirmed appointments.',
    )
  }

  if (appointment.checkIn) {
    throw new AppError('CONFLICT', 409, 'This appointment already has a check-in record.')
  }

  return prisma.$transaction(async (tx) => {
    await tx.appointmentCheckIn.create({
      data: {
        appointmentId,
        performedByUserId: actor.id,
        checklistSnapshot: input.checklist,
        notes: input.notes,
      },
    })

    await tx.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        operationalStatusId: operationalStatusIds.checkIn,
      },
    })

    await createStatusHistoryEntry(tx, appointmentId, operationalStatusIds.checkIn, actor)
    await recalculateAppointmentServiceCommissions(tx, appointmentId)

    await writeAuditLog(tx, {
      unitId: appointment.unitId,
      userId: actor.id,
      action: 'appointment.check_in',
      entityName: 'Appointment',
      entityId: appointmentId,
      details: {
        checklistItems: input.checklist.length,
      },
    })

    return tx.appointment.findUniqueOrThrow({
      where: {
        id: appointmentId,
      },
      include: appointmentDetailsInclude,
    })
  })
}
