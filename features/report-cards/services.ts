import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { writeAuditLog } from '@/server/audit/logging'
import { operationalStatusIds } from '@/features/appointments/constants'
import type {
  CreateReportCardInput,
  ListReportCardsQuery,
  UpdateReportCardInput,
} from '@/features/report-cards/schemas'

const reportCardDetailsInclude = Prisma.validator<Prisma.ReportCardInclude>()({
  appointment: {
    include: {
      pet: true,
      client: {
        include: {
          user: true,
        },
      },
      operationalStatus: true,
    },
  },
  createdBy: true,
})

async function getReportCardOrThrow(actor: AuthenticatedUserData, reportCardId: string) {
  const reportCard = await prisma.reportCard.findUnique({
    where: {
      id: reportCardId,
    },
    include: reportCardDetailsInclude,
  })

  if (!reportCard) {
    throw new AppError('NOT_FOUND', 404, 'Report card not found.')
  }

  if (actor.unitId && reportCard.appointment.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this report card.')
  }

  return reportCard
}

async function getAppointmentForReportCard(actor: AuthenticatedUserData, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      reportCard: true,
    },
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for report card.')
  }

  if (actor.unitId && appointment.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to use this appointment.')
  }

  if (
    appointment.operationalStatusId !== operationalStatusIds.readyForPickup &&
    appointment.operationalStatusId !== operationalStatusIds.completed
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'Report cards are only available after the appointment reaches the final service stages.',
    )
  }

  return appointment
}

export async function listReportCards(actor: AuthenticatedUserData, query: ListReportCardsQuery) {
  return prisma.reportCard.findMany({
    where: {
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.clientId ? { appointment: { clientId: query.clientId } } : {}),
      ...(actor.unitId ? { appointment: { unitId: actor.unitId } } : {}),
    },
    include: reportCardDetailsInclude,
    orderBy: {
      generatedAt: 'desc',
    },
  })
}

export async function createReportCard(actor: AuthenticatedUserData, input: CreateReportCardInput) {
  const appointment = await getAppointmentForReportCard(actor, input.appointmentId)

  if (appointment.reportCard) {
    throw new AppError('CONFLICT', 409, 'This appointment already has a report card.')
  }

  return prisma.$transaction(async (tx) => {
    const reportCard = await tx.reportCard.create({
      data: {
        appointmentId: appointment.id,
        createdByUserId: actor.id,
        generalNotes: input.generalNotes,
        petBehavior: input.petBehavior,
        productsUsed: input.productsUsed,
        nextReturnRecommendation: input.nextReturnRecommendation,
      },
      include: reportCardDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: appointment.unitId,
      userId: actor.id,
      action: 'report_card.create',
      entityName: 'ReportCard',
      entityId: reportCard.id,
      details: {
        appointmentId: appointment.id,
      },
    })

    return reportCard
  })
}

export async function updateReportCard(
  actor: AuthenticatedUserData,
  reportCardId: string,
  input: UpdateReportCardInput,
) {
  const existingReportCard = await getReportCardOrThrow(actor, reportCardId)

  return prisma.$transaction(async (tx) => {
    const reportCard = await tx.reportCard.update({
      where: {
        id: reportCardId,
      },
      data: {
        ...(input.generalNotes !== undefined ? { generalNotes: input.generalNotes } : {}),
        ...(input.petBehavior !== undefined ? { petBehavior: input.petBehavior } : {}),
        ...(input.productsUsed !== undefined ? { productsUsed: input.productsUsed } : {}),
        ...(input.nextReturnRecommendation !== undefined
          ? { nextReturnRecommendation: input.nextReturnRecommendation }
          : {}),
      },
      include: reportCardDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: existingReportCard.appointment.unitId,
      userId: actor.id,
      action: 'report_card.update',
      entityName: 'ReportCard',
      entityId: reportCardId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return reportCard
  })
}
