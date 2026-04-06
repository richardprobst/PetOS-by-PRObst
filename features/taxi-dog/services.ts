import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { resolveScopedUnitId } from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { AppError } from '@/server/http/errors'
import {
  assertTaxiDogStatusTransition,
  assertTaxiDogWindow,
  calculateAppointmentEstimatedTotalAmount,
} from '@/features/appointments/domain'
import { operationalStatusIds } from '@/features/appointments/constants'
import type {
  ChangeTaxiDogRideStatusInput,
  CreateTaxiDogRideInput,
  ListTaxiDogRidesQuery,
} from '@/features/taxi-dog/schemas'

const taxiDogRideInclude = Prisma.validator<Prisma.TaxiDogRideInclude>()({
  appointment: {
    include: {
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
    },
  },
  assignedDriver: {
    include: {
      user: true,
    },
  },
  createdBy: true,
})

type TaxiDogMutationClient = Prisma.TransactionClient | typeof prisma

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : Number(value)
}

async function getTaxiDogRideOrThrow(actor: AuthenticatedUserData, rideId: string) {
  const ride = await prisma.taxiDogRide.findUnique({
    where: {
      id: rideId,
    },
    include: taxiDogRideInclude,
  })

  if (!ride) {
    throw new AppError('NOT_FOUND', 404, 'Taxi Dog ride not found.')
  }

  if (actor.unitId && ride.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this Taxi Dog ride.')
  }

  return ride
}

async function getAppointmentSnapshot(actor: AuthenticatedUserData, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      client: {
        include: {
          user: true,
        },
      },
      pet: true,
      services: true,
      taxiDogRide: true,
    },
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for Taxi Dog.')
  }

  if (actor.unitId && appointment.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this appointment.')
  }

  if (
    appointment.operationalStatusId === operationalStatusIds.completed ||
    appointment.operationalStatusId === operationalStatusIds.canceled ||
    appointment.operationalStatusId === operationalStatusIds.noShow
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'Taxi Dog can only be updated while the appointment remains operational.',
    )
  }

  return appointment
}

async function assertDriverValidity(
  client: TaxiDogMutationClient,
  unitId: string,
  driverUserId: string | undefined,
) {
  if (!driverUserId) {
    return
  }

  const driver = await client.employee.findUnique({
    where: {
      userId: driverUserId,
    },
    include: {
      user: true,
    },
  })

  if (!driver || driver.unitId !== unitId || !driver.user.active) {
    throw new AppError('CONFLICT', 409, 'Taxi Dog driver must be an active employee of the same unit.')
  }
}

async function syncAppointmentEstimatedTotalAmount(
  client: TaxiDogMutationClient,
  appointmentId: string,
  taxiDogFeeAmount: number,
) {
  const appointment = await client.appointment.findUniqueOrThrow({
    where: {
      id: appointmentId,
    },
    include: {
      services: true,
    },
  })

  const serviceAmounts = appointment.services.map((serviceItem) => toNumber(serviceItem.agreedUnitPrice))
  const totalAmount = calculateAppointmentEstimatedTotalAmount(serviceAmounts, taxiDogFeeAmount)

  await client.appointment.update({
    where: {
      id: appointmentId,
    },
    data: {
      estimatedTotalAmount: totalAmount,
    },
  })
}

export async function listTaxiDogRides(actor: AuthenticatedUserData, query: ListTaxiDogRidesQuery) {
  const unitId = query.appointmentId ? undefined : resolveScopedUnitId(actor, actor.unitId ?? null)

  return prisma.taxiDogRide.findMany({
    where: {
      ...(unitId ? { unitId } : actor.unitId ? { unitId: actor.unitId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.assignedDriverUserId ? { assignedDriverUserId: query.assignedDriverUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...((query.startFrom || query.startTo)
        ? {
            OR: [
              {
                pickupWindowStartAt: {
                  ...(query.startFrom ? { gte: query.startFrom } : {}),
                  ...(query.startTo ? { lte: query.startTo } : {}),
                },
              },
              {
                dropoffWindowStartAt: {
                  ...(query.startFrom ? { gte: query.startFrom } : {}),
                  ...(query.startTo ? { lte: query.startTo } : {}),
                },
              },
            ],
          }
        : {}),
    },
    include: taxiDogRideInclude,
    orderBy: [{ pickupWindowStartAt: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function upsertTaxiDogRide(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: CreateTaxiDogRideInput,
) {
  const appointment = await getAppointmentSnapshot(actor, appointmentId)
  await assertDriverValidity(prisma, appointment.unitId, input.assignedDriverUserId)
  assertTaxiDogWindow(input.pickupWindowStartAt, input.pickupWindowEndAt, 'Pickup window')
  assertTaxiDogWindow(input.dropoffWindowStartAt, input.dropoffWindowEndAt, 'Dropoff window')

  return prisma.$transaction((tx) =>
    upsertTaxiDogRideInMutation(tx, actor, { id: appointmentId, unitId: appointment.unitId }, input),
  )
}

export async function upsertTaxiDogRideInMutation(
  client: TaxiDogMutationClient,
  actor: AuthenticatedUserData,
  appointment: {
    id: string
    unitId: string
  },
  input: CreateTaxiDogRideInput,
) {
  await assertDriverValidity(client, appointment.unitId, input.assignedDriverUserId)
  assertTaxiDogWindow(input.pickupWindowStartAt, input.pickupWindowEndAt, 'Pickup window')
  assertTaxiDogWindow(input.dropoffWindowStartAt, input.dropoffWindowEndAt, 'Dropoff window')

  const ride = await client.taxiDogRide.upsert({
    where: {
      appointmentId: appointment.id,
    },
    update: {
      assignedDriverUserId: input.assignedDriverUserId ?? null,
      pickupAddress: input.pickupAddress ?? null,
      dropoffAddress: input.dropoffAddress ?? null,
      pickupWindowStartAt: input.pickupWindowStartAt ?? null,
      pickupWindowEndAt: input.pickupWindowEndAt ?? null,
      dropoffWindowStartAt: input.dropoffWindowStartAt ?? null,
      dropoffWindowEndAt: input.dropoffWindowEndAt ?? null,
      feeAmount: input.feeAmount,
      notes: input.notes ?? null,
    },
    create: {
      unitId: appointment.unitId,
      appointmentId: appointment.id,
      assignedDriverUserId: input.assignedDriverUserId ?? null,
      createdByUserId: actor.id,
      pickupAddress: input.pickupAddress ?? null,
      dropoffAddress: input.dropoffAddress ?? null,
      pickupWindowStartAt: input.pickupWindowStartAt ?? null,
      pickupWindowEndAt: input.pickupWindowEndAt ?? null,
      dropoffWindowStartAt: input.dropoffWindowStartAt ?? null,
      dropoffWindowEndAt: input.dropoffWindowEndAt ?? null,
      feeAmount: input.feeAmount,
      notes: input.notes ?? null,
    },
    include: taxiDogRideInclude,
  })

  await syncAppointmentEstimatedTotalAmount(client, appointment.id, input.feeAmount)

  await writeAuditLog(client, {
    unitId: appointment.unitId,
    userId: actor.id,
    action: 'taxi_dog.upsert',
    entityName: 'TaxiDogRide',
    entityId: ride.id,
    details: {
      appointmentId: appointment.id,
      assignedDriverUserId: input.assignedDriverUserId ?? null,
      feeAmount: input.feeAmount,
    },
  })

  return ride
}

export async function changeTaxiDogRideStatus(
  actor: AuthenticatedUserData,
  rideId: string,
  input: ChangeTaxiDogRideStatusInput,
) {
  const ride = await getTaxiDogRideOrThrow(actor, rideId)
  assertTaxiDogStatusTransition(ride.status, input.nextStatus)

  return prisma.$transaction(async (tx) => {
    const updatedRide = await tx.taxiDogRide.update({
      where: {
        id: rideId,
      },
      data: {
        status: input.nextStatus,
      },
      include: taxiDogRideInclude,
    })

    await writeAuditLog(tx, {
      unitId: ride.unitId,
      userId: actor.id,
      action: 'taxi_dog.status.change',
      entityName: 'TaxiDogRide',
      entityId: rideId,
      details: {
        from: ride.status,
        to: input.nextStatus,
      },
    })

    return updatedRide
  })
}
