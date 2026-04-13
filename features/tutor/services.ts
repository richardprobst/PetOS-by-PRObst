import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { hashPassword } from '@/server/auth/password'
import { normalizeEmailAddress } from '@/server/auth/user-access'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { createAppointment } from '@/features/appointments/services'
import { listTutorDocuments, listTutorMediaAssets } from '@/features/documents/services'
import { listClientCredits, listDeposits, listRefunds } from '@/features/finance/services'
import {
  canTutorSubmitPreCheckIn,
  deriveTutorPortalAlerts,
  splitTutorAppointmentsByTimeline,
  summarizeTutorFinance,
} from '@/features/tutor/domain'
import type {
  CreateTutorAppointmentInput,
  CreateTutorWaitlistEntryInput,
  TutorPreCheckInPayload,
  UpdateTutorProfileInput,
  UpsertTutorPreCheckInInput,
} from '@/features/tutor/schemas'
import { cancelWaitlistEntry, createWaitlistEntry, listWaitlistEntries } from '@/features/waitlist/services'

const tutorAppointmentInclude = Prisma.validator<Prisma.AppointmentInclude>()({
  operationalStatus: true,
  pet: true,
  services: {
    include: {
      service: true,
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  reportCard: true,
  taxiDogRide: {
    include: {
      assignedDriver: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  tutorPreCheckIn: true,
  waitlistSource: {
    include: {
      desiredService: true,
      preferredEmployee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
})

const tutorClientDetailsInclude = Prisma.validator<Prisma.ClientInclude>()({
  user: {
    select: {
      id: true,
      unitId: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  pets: true,
  appointments: {
    include: tutorAppointmentInclude,
    orderBy: {
      startAt: 'desc',
    },
  },
})

const tutorPreCheckInDetailsInclude = Prisma.validator<Prisma.TutorPreCheckInInclude>()({
  appointment: {
    include: {
      operationalStatus: true,
      pet: true,
      taxiDogRide: {
        include: {
          assignedDriver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
})

type TutorAppointmentDetails = Prisma.AppointmentGetPayload<{
  include: typeof tutorAppointmentInclude
}>

type TutorClientDetails = Prisma.ClientGetPayload<{
  include: typeof tutorClientDetailsInclude
}>

type TutorPreCheckInDetails = Prisma.TutorPreCheckInGetPayload<{
  include: typeof tutorPreCheckInDetailsInclude
}>

type TutorNotificationDetails = Prisma.MessageLogGetPayload<{
  include: {
    template: true
    appointment: {
      include: {
        pet: true
        operationalStatus: true
      }
    }
  }
}>

const preCheckInWindowSettingKey = 'agenda.pre_check_in_antecedencia_horas'
const defaultPreCheckInWindowHours = 48

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : Number(value)
}

function resolveTutorScopedUnitId(
  tutor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(tutor, requestedUnitId ?? null)
}

function buildTutorClientDetailsInclude(unitId: string): Prisma.ClientInclude {
  return {
    ...tutorClientDetailsInclude,
    appointments: {
      include: tutorAppointmentInclude,
      orderBy: {
        startAt: 'desc',
      },
      where: {
        unitId,
      },
    },
  }
}

function sanitizeTutorUserSummary(
  user: {
    id: string
    name: string
  },
) {
  return {
    id: user.id,
    name: user.name,
  }
}

function sanitizeTutorAppointment(appointment: TutorAppointmentDetails) {
  return {
    id: appointment.id,
    unitId: appointment.unitId,
    clientId: appointment.clientId,
    petId: appointment.petId,
    operationalStatusId: appointment.operationalStatusId,
    financialStatus: appointment.financialStatus,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    clientNotes: appointment.clientNotes,
    estimatedTotalAmount: appointment.estimatedTotalAmount,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    operationalStatus: {
      id: appointment.operationalStatus.id,
      name: appointment.operationalStatus.name,
      description: appointment.operationalStatus.description,
      displayOrder: appointment.operationalStatus.displayOrder,
    },
    pet: {
      id: appointment.pet.id,
      name: appointment.pet.name,
      species: appointment.pet.species,
      breed: appointment.pet.breed,
    },
    services: appointment.services.map((serviceItem) => ({
      id: serviceItem.id,
      serviceId: serviceItem.serviceId,
      employeeUserId: serviceItem.employeeUserId,
      agreedUnitPrice: serviceItem.agreedUnitPrice,
      calculatedCommissionAmount: serviceItem.calculatedCommissionAmount,
      service: {
        id: serviceItem.service.id,
        name: serviceItem.service.name,
        description: serviceItem.service.description,
        basePrice: serviceItem.service.basePrice,
        estimatedDurationMinutes: serviceItem.service.estimatedDurationMinutes,
        active: serviceItem.service.active,
        unitId: serviceItem.service.unitId,
      },
      employee: serviceItem.employee
        ? {
            userId: serviceItem.employee.userId,
            unitId: serviceItem.employee.unitId,
            user: sanitizeTutorUserSummary(serviceItem.employee.user),
          }
        : null,
    })),
    reportCard: appointment.reportCard
      ? {
          id: appointment.reportCard.id,
          generatedAt: appointment.reportCard.generatedAt,
        }
      : null,
    taxiDogRide: appointment.taxiDogRide
      ? {
          id: appointment.taxiDogRide.id,
          status: appointment.taxiDogRide.status,
          pickupWindowStartAt: appointment.taxiDogRide.pickupWindowStartAt,
          pickupWindowEndAt: appointment.taxiDogRide.pickupWindowEndAt,
          dropoffWindowStartAt: appointment.taxiDogRide.dropoffWindowStartAt,
          dropoffWindowEndAt: appointment.taxiDogRide.dropoffWindowEndAt,
          feeAmount: appointment.taxiDogRide.feeAmount,
          assignedDriver: appointment.taxiDogRide.assignedDriver
            ? {
                userId: appointment.taxiDogRide.assignedDriver.userId,
                unitId: appointment.taxiDogRide.assignedDriver.unitId,
                user: sanitizeTutorUserSummary(appointment.taxiDogRide.assignedDriver.user),
              }
            : null,
        }
      : null,
    tutorPreCheckIn: appointment.tutorPreCheckIn
      ? {
          id: appointment.tutorPreCheckIn.id,
          contactPhone: appointment.tutorPreCheckIn.contactPhone,
          consentConfirmed: appointment.tutorPreCheckIn.consentConfirmed,
          notes: appointment.tutorPreCheckIn.notes,
          payload: appointment.tutorPreCheckIn.payload,
          submittedAt: appointment.tutorPreCheckIn.submittedAt,
          updatedAt: appointment.tutorPreCheckIn.updatedAt,
        }
      : null,
    waitlistSource: appointment.waitlistSource
      ? {
          id: appointment.waitlistSource.id,
          status: appointment.waitlistSource.status,
          preferredStartAt: appointment.waitlistSource.preferredStartAt,
          preferredEndAt: appointment.waitlistSource.preferredEndAt,
          requestedTransport: appointment.waitlistSource.requestedTransport,
          desiredService: {
            id: appointment.waitlistSource.desiredService.id,
            name: appointment.waitlistSource.desiredService.name,
          },
          preferredEmployee: appointment.waitlistSource.preferredEmployee
            ? {
                userId: appointment.waitlistSource.preferredEmployee.userId,
                user: sanitizeTutorUserSummary(
                  appointment.waitlistSource.preferredEmployee.user,
                ),
              }
            : null,
        }
      : null,
  }
}

function sanitizeTutorDashboard(client: TutorClientDetails) {
  return {
    user: {
      id: client.user.id,
      unitId: client.user.unitId,
      name: client.user.name,
      email: client.user.email,
      phone: client.user.phone,
    },
    address: client.address,
    city: client.city,
    state: client.state,
    zipCode: client.zipCode,
    contactPreference: client.contactPreference,
    generalNotes: client.generalNotes,
    pets: client.pets.map((pet) => ({
      id: pet.id,
      clientId: pet.clientId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate,
      weightKg: pet.weightKg,
      healthNotes: pet.healthNotes,
      allergies: pet.allergies,
      primaryPhotoUrl: pet.primaryPhotoUrl,
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    })),
    appointments: client.appointments.map(sanitizeTutorAppointment),
  }
}

function sanitizeTutorPreCheckIn(preCheckIn: TutorPreCheckInDetails) {
  return {
    id: preCheckIn.id,
    appointmentId: preCheckIn.appointmentId,
    contactPhone: preCheckIn.contactPhone,
    consentConfirmed: preCheckIn.consentConfirmed,
    notes: preCheckIn.notes,
    payload: preCheckIn.payload,
    submittedAt: preCheckIn.submittedAt,
    updatedAt: preCheckIn.updatedAt,
    appointment: {
      id: preCheckIn.appointment.id,
      unitId: preCheckIn.appointment.unitId,
      clientId: preCheckIn.appointment.clientId,
      petId: preCheckIn.appointment.petId,
      operationalStatusId: preCheckIn.appointment.operationalStatusId,
      financialStatus: preCheckIn.appointment.financialStatus,
      startAt: preCheckIn.appointment.startAt,
      endAt: preCheckIn.appointment.endAt,
      operationalStatus: {
        id: preCheckIn.appointment.operationalStatus.id,
        name: preCheckIn.appointment.operationalStatus.name,
      },
      pet: {
        id: preCheckIn.appointment.pet.id,
        name: preCheckIn.appointment.pet.name,
      },
      taxiDogRide: preCheckIn.appointment.taxiDogRide
        ? {
            id: preCheckIn.appointment.taxiDogRide.id,
            status: preCheckIn.appointment.taxiDogRide.status,
            pickupWindowStartAt: preCheckIn.appointment.taxiDogRide.pickupWindowStartAt,
            pickupWindowEndAt: preCheckIn.appointment.taxiDogRide.pickupWindowEndAt,
            dropoffWindowStartAt: preCheckIn.appointment.taxiDogRide.dropoffWindowStartAt,
            dropoffWindowEndAt: preCheckIn.appointment.taxiDogRide.dropoffWindowEndAt,
            feeAmount: preCheckIn.appointment.taxiDogRide.feeAmount,
            assignedDriver: preCheckIn.appointment.taxiDogRide.assignedDriver
              ? {
                  userId: preCheckIn.appointment.taxiDogRide.assignedDriver.userId,
                  user: sanitizeTutorUserSummary(
                    preCheckIn.appointment.taxiDogRide.assignedDriver.user,
                  ),
                }
              : null,
          }
        : null,
    },
  }
}

function sanitizeTutorNotification(notification: TutorNotificationDetails) {
  return {
    id: notification.id,
    channel: notification.channel,
    deliveryStatus: notification.deliveryStatus,
    messageContent: notification.messageContent,
    sentAt: notification.sentAt,
    template: notification.template
      ? {
          id: notification.template.id,
          name: notification.template.name,
          channel: notification.template.channel,
          subject: notification.template.subject,
        }
      : null,
    appointment: notification.appointment
      ? {
          id: notification.appointment.id,
          pet: {
            id: notification.appointment.pet.id,
            name: notification.appointment.pet.name,
          },
          operationalStatus: {
            id: notification.appointment.operationalStatus.id,
            name: notification.appointment.operationalStatus.name,
          },
        }
      : null,
  }
}

async function getTutorClientOrThrow(tutor: AuthenticatedUserData) {
  const scopedUnitId = resolveTutorScopedUnitId(tutor)
  const client = await prisma.client.findUnique({
    where: {
      userId: tutor.id,
    },
    include: buildTutorClientDetailsInclude(scopedUnitId),
  })

  if (!client) {
    throw new AppError('NOT_FOUND', 404, 'Tutor client profile not found.')
  }

  return client as unknown as TutorClientDetails
}

async function getTutorPreCheckInWindowHours(unitId: string | null | undefined) {
  if (!unitId) {
    return defaultPreCheckInWindowHours
  }

  const setting = await prisma.unitSetting.findUnique({
    where: {
      unitId_key: {
        key: preCheckInWindowSettingKey,
        unitId,
      },
    },
    select: {
      value: true,
    },
  })

  const parsedValue = Number(setting?.value)

  return Number.isFinite(parsedValue) ? parsedValue : defaultPreCheckInWindowHours
}

async function getTutorAppointmentForPreCheckInOrThrow(
  tutor: AuthenticatedUserData,
  appointmentId: string,
) {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: tutorAppointmentInclude,
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for tutor pre-check-in.')
  }

  if (appointment.clientId !== tutor.id) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to access this appointment.')
  }

  assertActorCanAccessLocalUnitRecord(tutor, appointment.unitId)

  return appointment
}

function assertTutorPreCheckInAvailability(
  appointment: Awaited<ReturnType<typeof getTutorAppointmentForPreCheckInOrThrow>>,
  preCheckInWindowHours: number,
) {
  if (!canTutorSubmitPreCheckIn(appointment, preCheckInWindowHours)) {
    throw new AppError(
      'CONFLICT',
      409,
      'Pre-check-in is unavailable for this appointment at the current stage.',
    )
  }
}

function buildTutorPreCheckInPayload(input: TutorPreCheckInPayload): Prisma.InputJsonValue {
  return {
    healthUpdates: input.healthUpdates ?? null,
    transportNotes: input.transportNotes ?? null,
  } satisfies Prisma.InputJsonObject
}

export async function getTutorDashboard(tutor: AuthenticatedUserData) {
  const client = await getTutorClientOrThrow(tutor)
  return sanitizeTutorDashboard(client)
}

export async function updateTutorProfile(
  tutor: AuthenticatedUserData,
  input: UpdateTutorProfileInput,
) {
  const scopedUnitId = resolveTutorScopedUnitId(tutor)
  await getTutorClientOrThrow(tutor)
  const passwordHash = input.password ? await hashPassword(input.password) : undefined

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: tutor.id,
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: normalizeEmailAddress(input.email) } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
    })

    await tx.client.update({
      where: {
        userId: tutor.id,
      },
      data: {
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.zipCode !== undefined ? { zipCode: input.zipCode } : {}),
        ...(input.contactPreference !== undefined ? { contactPreference: input.contactPreference } : {}),
        ...(input.generalNotes !== undefined ? { generalNotes: input.generalNotes } : {}),
      },
    })

    await writeAuditLog(tx, {
      unitId: scopedUnitId,
      userId: tutor.id,
      action: 'tutor.profile.update',
      entityName: 'Client',
      entityId: tutor.id,
      details: {
        changedFields: Object.keys(input),
      },
    })

    const client = await tx.client.findUniqueOrThrow({
      where: {
        userId: tutor.id,
      },
      include: buildTutorClientDetailsInclude(scopedUnitId),
    })

    return sanitizeTutorDashboard(client as unknown as TutorClientDetails)
  })
}

export async function createTutorAppointment(
  tutor: AuthenticatedUserData,
  input: CreateTutorAppointmentInput,
) {
  const client = await getTutorClientOrThrow(tutor)
  const pet = client.pets.find((entry) => entry.id === input.petId)

  if (!pet) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to schedule for this pet.')
  }

  const appointment = await createAppointment(tutor, {
    unitId: resolveTutorScopedUnitId(tutor, client.user.unitId ?? null),
    clientId: tutor.id,
    petId: input.petId,
    startAt: input.startAt,
    endAt: input.endAt,
    clientNotes: input.clientNotes,
    services: input.serviceIds.map((serviceId) => ({
      serviceId,
    })),
  })

  return sanitizeTutorAppointment(appointment as unknown as TutorAppointmentDetails)
}

export async function listTutorReportCards(tutor: AuthenticatedUserData) {
  const scopedUnitId = resolveTutorScopedUnitId(tutor)
  const reportCards = await prisma.reportCard.findMany({
    where: {
      appointment: {
        clientId: tutor.id,
        unitId: scopedUnitId,
      },
    },
    include: {
      appointment: {
        include: {
          pet: true,
          operationalStatus: true,
        },
      },
    },
    orderBy: {
      generatedAt: 'desc',
    },
  })

  return reportCards.map((reportCard) => ({
    id: reportCard.id,
    generatedAt: reportCard.generatedAt,
    updatedAt: reportCard.updatedAt,
    generalNotes: reportCard.generalNotes,
    petBehavior: reportCard.petBehavior,
    productsUsed: reportCard.productsUsed,
    nextReturnRecommendation: reportCard.nextReturnRecommendation,
    appointment: {
      id: reportCard.appointment.id,
      unitId: reportCard.appointment.unitId,
      pet: {
        id: reportCard.appointment.pet.id,
        name: reportCard.appointment.pet.name,
      },
      operationalStatus: {
        id: reportCard.appointment.operationalStatus.id,
        name: reportCard.appointment.operationalStatus.name,
      },
    },
  }))
}

export async function listTutorNotifications(tutor: AuthenticatedUserData) {
  await getTutorClientOrThrow(tutor)
  const scopedUnitId = resolveTutorScopedUnitId(tutor)

  const notifications = await prisma.messageLog.findMany({
    where: {
      OR: [
        {
          appointment: {
            clientId: tutor.id,
            unitId: scopedUnitId,
          },
        },
        {
          clientId: tutor.id,
          appointmentId: null,
          template: {
            unitId: scopedUnitId,
          },
        },
      ],
      deliveryStatus: {
        not: 'CANCELED',
      },
    },
    include: {
      template: true,
      appointment: {
        include: {
          pet: true,
          operationalStatus: true,
        },
      },
    },
    orderBy: {
      sentAt: 'desc',
    },
    take: 6,
  })

  return notifications.map((notification) =>
    sanitizeTutorNotification(notification as TutorNotificationDetails),
  )
}

export async function getTutorFinancialOverview(tutor: AuthenticatedUserData) {
  const [deposits, refunds, clientCredits] = await Promise.all([
    listDeposits(tutor, {
      clientId: tutor.id,
    }),
    listRefunds(tutor, {
      clientId: tutor.id,
    }),
    listClientCredits(tutor, {
      clientId: tutor.id,
      includeExpired: false,
    }),
  ])

  const sanitizedDeposits = deposits.map((deposit) => ({
    id: deposit.id,
    appointmentId: deposit.appointmentId,
    amount: deposit.amount,
    purpose: deposit.purpose,
    status: deposit.status,
    notes: deposit.notes,
    expiresAt: deposit.expiresAt,
    receivedAt: deposit.receivedAt,
    appliedAt: deposit.appliedAt,
    createdAt: deposit.createdAt,
    appointment: deposit.appointment
      ? {
          id: deposit.appointment.id,
          pet: {
            id: deposit.appointment.pet.id,
            name: deposit.appointment.pet.name,
          },
        }
      : null,
  }))
  const sanitizedRefunds = refunds.map((refund) => ({
    id: refund.id,
    appointmentId: refund.appointmentId,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status,
    processedAt: refund.processedAt,
    createdAt: refund.createdAt,
    appointment: refund.appointment
      ? {
          id: refund.appointment.id,
          pet: {
            id: refund.appointment.pet.id,
            name: refund.appointment.pet.name,
          },
        }
      : null,
  }))
  const sanitizedClientCredits = clientCredits.map((credit) => ({
    id: credit.id,
    originType: credit.originType,
    totalAmount: credit.totalAmount,
    availableAmount: credit.availableAmount,
    expiresAt: credit.expiresAt,
    notes: credit.notes,
    createdAt: credit.createdAt,
  }))

  return {
    clientCredits: sanitizedClientCredits,
    deposits: sanitizedDeposits,
    refunds: sanitizedRefunds,
    summary: summarizeTutorFinance({
      clientCredits: sanitizedClientCredits.map((credit) => ({
        availableAmount: toNumber(credit.availableAmount),
        expiresAt: credit.expiresAt,
      })),
      deposits: sanitizedDeposits.map((deposit) => ({
        amount: toNumber(deposit.amount),
        status: deposit.status,
      })),
      refunds: sanitizedRefunds.map((refund) => ({
        amount: toNumber(refund.amount),
        status: refund.status,
      })),
    }),
  }
}

export async function listTutorWaitlistEntries(tutor: AuthenticatedUserData) {
  const entries = await listWaitlistEntries(tutor, {
    clientId: tutor.id,
  })

  return entries.map((entry) => ({
    id: entry.id,
    unitId: entry.unitId,
    clientId: entry.clientId,
    petId: entry.petId,
    desiredServiceId: entry.desiredServiceId,
    status: entry.status,
    preferredStartAt: entry.preferredStartAt,
    preferredEndAt: entry.preferredEndAt,
    requestedTransport: entry.requestedTransport,
    notes: entry.notes,
    cancellationReason: entry.cancellationReason,
    createdAt: entry.createdAt,
    statusChangedAt: entry.statusChangedAt,
    pet: {
      id: entry.pet.id,
      name: entry.pet.name,
    },
    desiredService: {
      id: entry.desiredService.id,
      name: entry.desiredService.name,
    },
    promotedAppointment: entry.promotedAppointment
      ? {
          id: entry.promotedAppointment.id,
          startAt: entry.promotedAppointment.startAt,
          operationalStatus: {
            id: entry.promotedAppointment.operationalStatus.id,
            name: entry.promotedAppointment.operationalStatus.name,
          },
        }
      : null,
    preferredEmployee: entry.preferredEmployee
      ? {
          userId: entry.preferredEmployee.userId,
          user: sanitizeTutorUserSummary(entry.preferredEmployee.user),
        }
      : null,
  }))
}

export async function createTutorWaitlistEntry(
  tutor: AuthenticatedUserData,
  input: CreateTutorWaitlistEntryInput,
) {
  const client = await getTutorClientOrThrow(tutor)
  const pet = client.pets.find((entry) => entry.id === input.petId)

  if (!pet) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'Tutor is not allowed to create waitlist entries for this pet.',
    )
  }

  const waitlistEntry = await createWaitlistEntry(tutor, {
    clientId: tutor.id,
    desiredServiceId: input.desiredServiceId,
    notes: input.notes,
    petId: input.petId,
    preferredEndAt: input.preferredEndAt,
    preferredStartAt: input.preferredStartAt,
    requestedTransport: input.requestedTransport,
  })

  return {
    id: waitlistEntry.id,
    unitId: waitlistEntry.unitId,
    clientId: waitlistEntry.clientId,
    petId: waitlistEntry.petId,
    desiredServiceId: waitlistEntry.desiredServiceId,
    status: waitlistEntry.status,
    preferredStartAt: waitlistEntry.preferredStartAt,
    preferredEndAt: waitlistEntry.preferredEndAt,
    requestedTransport: waitlistEntry.requestedTransport,
    notes: waitlistEntry.notes,
    cancellationReason: waitlistEntry.cancellationReason,
    createdAt: waitlistEntry.createdAt,
    statusChangedAt: waitlistEntry.statusChangedAt,
    pet: {
      id: waitlistEntry.pet.id,
      name: waitlistEntry.pet.name,
    },
    desiredService: {
      id: waitlistEntry.desiredService.id,
      name: waitlistEntry.desiredService.name,
    },
    promotedAppointment: waitlistEntry.promotedAppointment
      ? {
          id: waitlistEntry.promotedAppointment.id,
          startAt: waitlistEntry.promotedAppointment.startAt,
          operationalStatus: {
            id: waitlistEntry.promotedAppointment.operationalStatus.id,
            name: waitlistEntry.promotedAppointment.operationalStatus.name,
          },
        }
      : null,
    preferredEmployee: waitlistEntry.preferredEmployee
      ? {
          userId: waitlistEntry.preferredEmployee.userId,
          user: sanitizeTutorUserSummary(waitlistEntry.preferredEmployee.user),
        }
      : null,
  }
}

export async function cancelTutorWaitlistEntry(
  tutor: AuthenticatedUserData,
  waitlistEntryId: string,
  input: {
    reason?: string
  },
) {
  const waitlistEntry = await prisma.waitlistEntry.findUnique({
    where: {
      id: waitlistEntryId,
    },
    select: {
      clientId: true,
      id: true,
      unitId: true,
    },
  })

  if (!waitlistEntry) {
    throw new AppError('NOT_FOUND', 404, 'Waitlist entry not found.')
  }

  if (waitlistEntry.clientId !== tutor.id) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to access this waitlist entry.')
  }

  assertActorCanAccessLocalUnitRecord(tutor, waitlistEntry.unitId)

  const canceledEntry = await cancelWaitlistEntry(tutor, waitlistEntry.id, {
    reason: input.reason,
  })

  return {
    id: canceledEntry.id,
    unitId: canceledEntry.unitId,
    clientId: canceledEntry.clientId,
    petId: canceledEntry.petId,
    desiredServiceId: canceledEntry.desiredServiceId,
    status: canceledEntry.status,
    preferredStartAt: canceledEntry.preferredStartAt,
    preferredEndAt: canceledEntry.preferredEndAt,
    requestedTransport: canceledEntry.requestedTransport,
    notes: canceledEntry.notes,
    cancellationReason: canceledEntry.cancellationReason,
    createdAt: canceledEntry.createdAt,
    statusChangedAt: canceledEntry.statusChangedAt,
    pet: {
      id: canceledEntry.pet.id,
      name: canceledEntry.pet.name,
    },
    desiredService: {
      id: canceledEntry.desiredService.id,
      name: canceledEntry.desiredService.name,
    },
    promotedAppointment: canceledEntry.promotedAppointment
      ? {
          id: canceledEntry.promotedAppointment.id,
          startAt: canceledEntry.promotedAppointment.startAt,
          operationalStatus: {
            id: canceledEntry.promotedAppointment.operationalStatus.id,
            name: canceledEntry.promotedAppointment.operationalStatus.name,
          },
        }
      : null,
    preferredEmployee: canceledEntry.preferredEmployee
      ? {
          userId: canceledEntry.preferredEmployee.userId,
          user: sanitizeTutorUserSummary(canceledEntry.preferredEmployee.user),
        }
      : null,
  }
}

export async function getTutorPreCheckInStatus(
  tutor: AuthenticatedUserData,
  appointmentId: string,
) {
  const appointment = await getTutorAppointmentForPreCheckInOrThrow(tutor, appointmentId)
  const preCheckInWindowHours = await getTutorPreCheckInWindowHours(appointment.unitId)

  return {
    appointment: sanitizeTutorAppointment(appointment as TutorAppointmentDetails),
    editable: canTutorSubmitPreCheckIn(appointment, preCheckInWindowHours),
    preCheckIn: appointment.tutorPreCheckIn
      ? {
          id: appointment.tutorPreCheckIn.id,
          contactPhone: appointment.tutorPreCheckIn.contactPhone,
          consentConfirmed: appointment.tutorPreCheckIn.consentConfirmed,
          notes: appointment.tutorPreCheckIn.notes,
          payload: appointment.tutorPreCheckIn.payload,
          submittedAt: appointment.tutorPreCheckIn.submittedAt,
          updatedAt: appointment.tutorPreCheckIn.updatedAt,
        }
      : null,
    preCheckInWindowHours,
  }
}

export async function upsertTutorPreCheckIn(
  tutor: AuthenticatedUserData,
  input: UpsertTutorPreCheckInInput,
) {
  const appointment = await getTutorAppointmentForPreCheckInOrThrow(tutor, input.appointmentId)
  const preCheckInWindowHours = await getTutorPreCheckInWindowHours(appointment.unitId)
  assertTutorPreCheckInAvailability(appointment, preCheckInWindowHours)

  return prisma.$transaction(async (tx) => {
    const preCheckIn = await tx.tutorPreCheckIn.upsert({
      where: {
        appointmentId: appointment.id,
      },
      update: {
        consentConfirmed: input.consentConfirmed,
        contactPhone: input.contactPhone,
        notes: input.notes ?? null,
        payload: buildTutorPreCheckInPayload(input),
        submittedAt: new Date(),
        submittedByUserId: tutor.id,
      },
      create: {
        appointmentId: appointment.id,
        consentConfirmed: input.consentConfirmed,
        contactPhone: input.contactPhone,
        notes: input.notes ?? null,
        payload: buildTutorPreCheckInPayload(input),
        submittedByUserId: tutor.id,
      },
      include: tutorPreCheckInDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: appointment.unitId,
      userId: tutor.id,
      action: 'tutor.pre_check_in.upsert',
      entityName: 'TutorPreCheckIn',
      entityId: preCheckIn.id,
      details: {
        appointmentId: appointment.id,
        consentConfirmed: preCheckIn.consentConfirmed,
      },
    })

    return sanitizeTutorPreCheckIn(preCheckIn as unknown as TutorPreCheckInDetails)
  })
}

export async function getTutorPortalOverview(tutor: AuthenticatedUserData) {
  const [dashboard, reportCards, notifications, documents, mediaAssets, finance, waitlistEntries] =
    await Promise.all([
      getTutorDashboard(tutor),
      listTutorReportCards(tutor),
      listTutorNotifications(tutor),
      listTutorDocuments(tutor),
      listTutorMediaAssets(tutor),
      getTutorFinancialOverview(tutor),
      listTutorWaitlistEntries(tutor),
    ])

  const preCheckInWindowHours = await getTutorPreCheckInWindowHours(
    resolveTutorScopedUnitId(tutor, dashboard.user.unitId ?? null),
  )
  const appointmentTimeline = splitTutorAppointmentsByTimeline(dashboard.appointments)
  const alerts = deriveTutorPortalAlerts({
    appointments: dashboard.appointments,
    documents,
    pendingDepositAmount: finance.summary.pendingDepositAmount,
    preCheckInWindowHours,
    tutorId: tutor.id,
    waitlistPendingCount: waitlistEntries.filter((entry) => entry.status === 'PENDING').length,
  })

  return {
    alerts,
    appointmentTimeline,
    dashboard,
    documents,
    finance,
    mediaAssets,
    notifications,
    preCheckInWindowHours,
    reportCards,
    waitlistEntries,
  }
}
