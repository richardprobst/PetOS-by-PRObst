import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { hashPassword } from '@/server/auth/password'
import { normalizeEmailAddress } from '@/server/auth/user-access'
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
          user: true,
        },
      },
    },
  },
  reportCard: true,
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
  tutorPreCheckIn: {
    include: {
      submittedBy: true,
    },
  },
  waitlistSource: {
    include: {
      desiredService: true,
      preferredEmployee: {
        include: {
          user: true,
        },
      },
    },
  },
})

const tutorClientDetailsInclude = Prisma.validator<Prisma.ClientInclude>()({
  user: true,
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
              user: true,
            },
          },
        },
      },
    },
  },
  submittedBy: true,
})

const preCheckInWindowSettingKey = 'agenda.pre_check_in_antecedencia_horas'
const defaultPreCheckInWindowHours = 48

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : Number(value)
}

async function getTutorClientOrThrow(tutor: AuthenticatedUserData) {
  const client = await prisma.client.findUnique({
    where: {
      userId: tutor.id,
    },
    include: tutorClientDetailsInclude,
  })

  if (!client) {
    throw new AppError('NOT_FOUND', 404, 'Tutor client profile not found.')
  }

  return client
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

  if (tutor.unitId && appointment.unitId !== tutor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to access this appointment.')
  }

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
  return getTutorClientOrThrow(tutor)
}

export async function updateTutorProfile(
  tutor: AuthenticatedUserData,
  input: UpdateTutorProfileInput,
) {
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

    const client = await tx.client.update({
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
      include: tutorClientDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: tutor.unitId,
      userId: tutor.id,
      action: 'tutor.profile.update',
      entityName: 'Client',
      entityId: tutor.id,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return client
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

  return createAppointment(tutor, {
    unitId: client.user.unitId ?? undefined,
    clientId: tutor.id,
    petId: input.petId,
    startAt: input.startAt,
    endAt: input.endAt,
    clientNotes: input.clientNotes,
    services: input.serviceIds.map((serviceId) => ({
      serviceId,
    })),
  })
}

export async function listTutorReportCards(tutor: AuthenticatedUserData) {
  return prisma.reportCard.findMany({
    where: {
      appointment: {
        clientId: tutor.id,
      },
    },
    include: {
      appointment: {
        include: {
          pet: true,
          operationalStatus: true,
        },
      },
      createdBy: true,
    },
    orderBy: {
      generatedAt: 'desc',
    },
  })
}

export async function listTutorNotifications(tutor: AuthenticatedUserData) {
  await getTutorClientOrThrow(tutor)

  return prisma.messageLog.findMany({
    where: {
      OR: [
        {
          clientId: tutor.id,
        },
        {
          appointment: {
            clientId: tutor.id,
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

  return {
    clientCredits,
    deposits,
    refunds,
    summary: summarizeTutorFinance({
      clientCredits: clientCredits.map((credit) => ({
        availableAmount: toNumber(credit.availableAmount),
        expiresAt: credit.expiresAt,
      })),
      deposits: deposits.map((deposit) => ({
        amount: toNumber(deposit.amount),
        status: deposit.status,
      })),
      refunds: refunds.map((refund) => ({
        amount: toNumber(refund.amount),
        status: refund.status,
      })),
    }),
  }
}

export async function listTutorWaitlistEntries(tutor: AuthenticatedUserData) {
  return listWaitlistEntries(tutor, {
    clientId: tutor.id,
  })
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

  return createWaitlistEntry(tutor, {
    clientId: tutor.id,
    desiredServiceId: input.desiredServiceId,
    notes: input.notes,
    petId: input.petId,
    preferredEndAt: input.preferredEndAt,
    preferredStartAt: input.preferredStartAt,
    requestedTransport: input.requestedTransport,
  })
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

  if (tutor.unitId && waitlistEntry.unitId !== tutor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to access this waitlist entry.')
  }

  return cancelWaitlistEntry(tutor, waitlistEntry.id, {
    reason: input.reason,
  })
}

export async function getTutorPreCheckInStatus(
  tutor: AuthenticatedUserData,
  appointmentId: string,
) {
  const appointment = await getTutorAppointmentForPreCheckInOrThrow(tutor, appointmentId)
  const preCheckInWindowHours = await getTutorPreCheckInWindowHours(appointment.unitId)

  return {
    appointment,
    editable: canTutorSubmitPreCheckIn(appointment, preCheckInWindowHours),
    preCheckIn: appointment.tutorPreCheckIn,
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

    return preCheckIn
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
    dashboard.user.unitId ?? tutor.unitId,
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
