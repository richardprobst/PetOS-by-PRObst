import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { resolveScopedUnitId } from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { AppError } from '@/server/http/errors'
import { assertWaitlistWindow } from '@/features/appointments/domain'
import { createAppointmentInMutation } from '@/features/appointments/services'
import type {
  CancelWaitlistEntryInput,
  CreateWaitlistEntryInput,
  ListWaitlistEntriesQuery,
  PromoteWaitlistEntryInput,
} from '@/features/waitlist/schemas'

const waitlistEntryInclude = Prisma.validator<Prisma.WaitlistEntryInclude>()({
  client: {
    include: {
      user: true,
    },
  },
  pet: true,
  desiredService: true,
  preferredEmployee: {
    include: {
      user: true,
    },
  },
  promotedAppointment: {
    include: {
      operationalStatus: true,
    },
  },
  createdBy: true,
  canceledBy: true,
})

async function getWaitlistEntryOrThrow(actor: AuthenticatedUserData, waitlistEntryId: string) {
  const entry = await prisma.waitlistEntry.findUnique({
    where: {
      id: waitlistEntryId,
    },
    include: waitlistEntryInclude,
  })

  if (!entry) {
    throw new AppError('NOT_FOUND', 404, 'Waitlist entry not found.')
  }

  if (actor.unitId && entry.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this waitlist entry.')
  }

  return entry
}

async function loadWaitlistDependencies(
  actor: AuthenticatedUserData,
  input: CreateWaitlistEntryInput,
) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  const [clientRecord, petRecord, serviceRecord, preferredEmployee] = await Promise.all([
    prisma.client.findUnique({
      where: {
        userId: input.clientId,
      },
      include: {
        user: true,
      },
    }),
    prisma.pet.findUnique({
      where: {
        id: input.petId,
      },
    }),
    prisma.service.findUnique({
      where: {
        id: input.desiredServiceId,
      },
    }),
    input.preferredEmployeeUserId
      ? prisma.employee.findUnique({
          where: {
            userId: input.preferredEmployeeUserId,
          },
          include: {
            user: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (!clientRecord) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for waitlist entry.')
  }

  if (!petRecord || petRecord.clientId !== input.clientId) {
    throw new AppError('CONFLICT', 409, 'Pet must belong to the selected client for waitlist entry.')
  }

  if (!serviceRecord || !serviceRecord.active) {
    throw new AppError('CONFLICT', 409, 'Desired service is unavailable for waitlist entry.')
  }

  if (serviceRecord.unitId && serviceRecord.unitId !== unitId) {
    throw new AppError('CONFLICT', 409, 'Desired service belongs to another unit.')
  }

  if (clientRecord.user.unitId && clientRecord.user.unitId !== unitId) {
    throw new AppError('CONFLICT', 409, 'Client belongs to another unit.')
  }

  if (
    preferredEmployee &&
    (preferredEmployee.unitId !== unitId || !preferredEmployee.user.active)
  ) {
    throw new AppError('CONFLICT', 409, 'Preferred employee must be an active employee of the same unit.')
  }

  return {
    clientRecord,
    petRecord,
    preferredEmployee,
    serviceRecord,
    unitId,
  }
}

export async function listWaitlistEntries(
  actor: AuthenticatedUserData,
  query: ListWaitlistEntriesQuery,
) {
  const unitId = query.unitId ? resolveScopedUnitId(actor, query.unitId) : actor.unitId

  return prisma.waitlistEntry.findMany({
    where: {
      ...(unitId ? { unitId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.petId ? { petId: query.petId } : {}),
      ...(query.desiredServiceId ? { desiredServiceId: query.desiredServiceId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...((query.startFrom || query.startTo)
        ? {
            preferredStartAt: {
              ...(query.startFrom ? { gte: query.startFrom } : {}),
              ...(query.startTo ? { lte: query.startTo } : {}),
            },
          }
        : {}),
    },
    include: waitlistEntryInclude,
    orderBy: [{ preferredStartAt: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function createWaitlistEntry(
  actor: AuthenticatedUserData,
  input: CreateWaitlistEntryInput,
) {
  assertWaitlistWindow(input.preferredStartAt, input.preferredEndAt)
  const dependencies = await loadWaitlistDependencies(actor, input)

  const existingEntry = await prisma.waitlistEntry.findFirst({
    where: {
      unitId: dependencies.unitId,
      clientId: input.clientId,
      petId: input.petId,
      desiredServiceId: input.desiredServiceId,
      status: 'PENDING',
      preferredStartAt: {
        lt: input.preferredEndAt,
      },
      preferredEndAt: {
        gt: input.preferredStartAt,
      },
    },
  })

  if (existingEntry) {
    throw new AppError(
      'CONFLICT',
      409,
      'There is already a pending waitlist entry for this pet and service in the selected window.',
    )
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.waitlistEntry.create({
      data: {
        unitId: dependencies.unitId,
        clientId: input.clientId,
        petId: input.petId,
        desiredServiceId: input.desiredServiceId,
        preferredEmployeeUserId: input.preferredEmployeeUserId ?? null,
        createdByUserId: actor.id,
        preferredStartAt: input.preferredStartAt,
        preferredEndAt: input.preferredEndAt,
        requestedTransport: input.requestedTransport,
        notes: input.notes ?? null,
      },
      include: waitlistEntryInclude,
    })

    await writeAuditLog(tx, {
      unitId: dependencies.unitId,
      userId: actor.id,
      action: 'waitlist.create',
      entityName: 'WaitlistEntry',
      entityId: entry.id,
      details: {
        desiredServiceId: input.desiredServiceId,
        preferredEmployeeUserId: input.preferredEmployeeUserId ?? null,
        requestedTransport: input.requestedTransport,
      },
    })

    return entry
  })
}

export async function cancelWaitlistEntry(
  actor: AuthenticatedUserData,
  waitlistEntryId: string,
  input: CancelWaitlistEntryInput,
) {
  const entry = await getWaitlistEntryOrThrow(actor, waitlistEntryId)

  if (entry.status !== 'PENDING') {
    throw new AppError('CONFLICT', 409, 'Only pending waitlist entries can be canceled.')
  }

  return prisma.$transaction(async (tx) => {
    const canceledEntry = await tx.waitlistEntry.update({
      where: {
        id: waitlistEntryId,
      },
      data: {
        status: 'CANCELED',
        canceledByUserId: actor.id,
        cancellationReason: input.reason ?? null,
        statusChangedAt: new Date(),
      },
      include: waitlistEntryInclude,
    })

    await writeAuditLog(tx, {
      unitId: entry.unitId,
      userId: actor.id,
      action: 'waitlist.cancel',
      entityName: 'WaitlistEntry',
      entityId: waitlistEntryId,
      details: {
        reason: input.reason ?? null,
      },
    })

    return canceledEntry
  })
}

export async function promoteWaitlistEntry(
  actor: AuthenticatedUserData,
  waitlistEntryId: string,
  input: PromoteWaitlistEntryInput,
) {
  const entry = await getWaitlistEntryOrThrow(actor, waitlistEntryId)

  if (entry.status !== 'PENDING') {
    throw new AppError('CONFLICT', 409, 'Only pending waitlist entries can be promoted.')
  }

  return prisma.$transaction(async (tx) => {
    const appointment = await createAppointmentInMutation(tx, actor, {
      unitId: entry.unitId,
      clientId: entry.clientId,
      petId: entry.petId,
      startAt: input.startAt,
      endAt: input.endAt,
      clientNotes: input.clientNotes,
      internalNotes:
        [
          input.internalNotes,
          entry.notes ? `Waitlist: ${entry.notes}` : undefined,
          entry.requestedTransport ? 'Waitlist solicitou Taxi Dog.' : undefined,
        ]
          .filter(Boolean)
          .join('\n') || undefined,
      services: [
        {
          serviceId: entry.desiredServiceId,
          employeeUserId: input.employeeUserId ?? entry.preferredEmployeeUserId ?? undefined,
        },
      ],
    })

    const promotedEntry = await tx.waitlistEntry.update({
      where: {
        id: waitlistEntryId,
      },
      data: {
        status: 'PROMOTED',
        promotedAppointmentId: appointment.id,
        statusChangedAt: new Date(),
      },
      include: waitlistEntryInclude,
    })

    await writeAuditLog(tx, {
      unitId: entry.unitId,
      userId: actor.id,
      action: 'waitlist.promote',
      entityName: 'WaitlistEntry',
      entityId: waitlistEntryId,
      details: {
        promotedAppointmentId: appointment.id,
      },
    })

    return promotedEntry
  })
}
