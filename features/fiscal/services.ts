import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import { assertActorCanAccessLocalUnitRecord, resolveScopedUnitId } from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import { assertFiscalDocumentStatusTransition } from '@/features/fiscal/domain'
import type {
  CreateFiscalDocumentInput,
  ListFiscalDocumentsQuery,
  UpdateFiscalDocumentStatusInput,
} from '@/features/fiscal/schemas'

const fiscalUserSummarySelect = Prisma.validator<Prisma.UserSelect>()({
  active: true,
  email: true,
  id: true,
  name: true,
  unitId: true,
  userType: true,
})

const fiscalDocumentDetailsInclude = Prisma.validator<Prisma.FiscalDocumentInclude>()({
  appointment: {
    include: {
      pet: {
        select: {
          breed: true,
          id: true,
          name: true,
          species: true,
        },
      },
      client: {
        include: {
          user: {
            select: fiscalUserSummarySelect,
          },
        },
      },
    },
  },
  createdBy: {
    select: fiscalUserSummarySelect,
  },
  financialTransaction: {
    select: {
      amount: true,
      appointmentId: true,
      description: true,
      externalReference: true,
      id: true,
      integrationProvider: true,
      occurredAt: true,
      paymentMethod: true,
      paymentStatus: true,
      transactionType: true,
      unitId: true,
    },
  },
  unit: {
    select: {
      id: true,
      name: true,
    },
  },
})

type FiscalDocumentRecord = Prisma.FiscalDocumentGetPayload<{
  include: typeof fiscalDocumentDetailsInclude
}>
type FiscalUserSummary = NonNullable<FiscalDocumentRecord['createdBy']>

type FiscalMutationClient = Pick<
  Prisma.TransactionClient,
  'fiscalDocument' | 'integrationEvent'
> | Pick<typeof prisma, 'fiscalDocument' | 'integrationEvent'>

function isFiscalDocumentExternalReferenceConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

function rethrowFiscalPersistenceError(error: unknown): never {
  if (isFiscalDocumentExternalReferenceConflict(error)) {
    throw new AppError(
      'CONFLICT',
      409,
      'A fiscal document with this provider and external reference already exists.',
    )
  }

  throw error
}

async function assertFiscalDocumentExternalReferenceAvailable(
  client: FiscalMutationClient,
  options: {
    documentId?: string
    externalReference?: string | null
    providerName?: string | null
  },
) {
  if (!options.providerName || !options.externalReference) {
    return
  }

  const existingDocument = await client.fiscalDocument.findFirst({
    where: {
      providerName: options.providerName,
      externalReference: options.externalReference,
      ...(options.documentId
        ? {
            id: {
              not: options.documentId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (existingDocument) {
    throw new AppError(
      'CONFLICT',
      409,
      'A fiscal document with this provider and external reference already exists.',
    )
  }
}

type FiscalScopeQuery = {
  unitId?: string | null
}

function toFiscalUserSummary(
  user: FiscalUserSummary | null,
) {
  if (!user) {
    return null
  }

  return {
    active: user.active,
    email: user.email,
    id: user.id,
    name: user.name,
    unitId: user.unitId,
    userType: user.userType,
  }
}

export function toFiscalDocumentAdminSnapshot(document: FiscalDocumentRecord) {
  return {
    accessKey: document.accessKey,
    appointment: document.appointment
      ? {
          client: {
            user: toFiscalUserSummary(document.appointment.client.user),
            userId: document.appointment.client.userId,
          },
          clientId: document.appointment.clientId,
          id: document.appointment.id,
          pet: document.appointment.pet
            ? {
                breed: document.appointment.pet.breed,
                id: document.appointment.pet.id,
                name: document.appointment.pet.name,
                species: document.appointment.pet.species,
              }
            : null,
          petId: document.appointment.petId,
          startAt: document.appointment.startAt,
          unitId: document.appointment.unitId,
        }
      : null,
    appointmentId: document.appointmentId,
    canceledAt: document.canceledAt,
    createdAt: document.createdAt,
    createdBy: toFiscalUserSummary(document.createdBy),
    createdByUserId: document.createdByUserId,
    documentNumber: document.documentNumber,
    documentType: document.documentType,
    externalReference: document.externalReference,
    financialTransaction: document.financialTransaction
      ? {
          amount: document.financialTransaction.amount,
          appointmentId: document.financialTransaction.appointmentId,
          description: document.financialTransaction.description,
          externalReference: document.financialTransaction.externalReference,
          id: document.financialTransaction.id,
          integrationProvider: document.financialTransaction.integrationProvider,
          occurredAt: document.financialTransaction.occurredAt,
          paymentMethod: document.financialTransaction.paymentMethod,
          paymentStatus: document.financialTransaction.paymentStatus,
          transactionType: document.financialTransaction.transactionType,
          unitId: document.financialTransaction.unitId,
        }
      : null,
    financialTransactionId: document.financialTransactionId,
    id: document.id,
    issuedAt: document.issuedAt,
    lastError: document.lastError,
    metadata: document.metadata,
    providerName: document.providerName,
    series: document.series,
    status: document.status,
    unit: document.unit,
    unitId: document.unitId,
    updatedAt: document.updatedAt,
  }
}

export function resolveFiscalReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId)
}

export function assertActorCanReadFiscalDocumentInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: FiscalScopeQuery,
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, {
    requestedUnitId: options?.unitId,
  })
}

async function getFiscalDocumentOrThrow(actor: AuthenticatedUserData, documentId: string) {
  const document = await prisma.fiscalDocument.findUnique({
    where: {
      id: documentId,
    },
    include: fiscalDocumentDetailsInclude,
  })

  if (!document) {
    throw new AppError('NOT_FOUND', 404, 'Fiscal document not found.')
  }

  assertActorCanReadFiscalDocumentInScope(actor, document.unitId)

  return document
}

async function getFiscalScope(
  actor: AuthenticatedUserData,
  input: Pick<CreateFiscalDocumentInput, 'appointmentId' | 'financialTransactionId' | 'unitId'>,
) {
  const [appointment, financialTransaction] = await Promise.all([
    input.appointmentId
      ? prisma.appointment.findUnique({
          where: {
            id: input.appointmentId,
          },
          select: {
            id: true,
            unitId: true,
          },
        })
      : Promise.resolve(null),
    input.financialTransactionId
      ? prisma.financialTransaction.findUnique({
          where: {
            id: input.financialTransactionId,
          },
          select: {
            appointmentId: true,
            id: true,
            unitId: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (input.appointmentId && !appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for fiscal document.')
  }

  if (input.financialTransactionId && !financialTransaction) {
    throw new AppError('NOT_FOUND', 404, 'Financial transaction not found for fiscal document.')
  }

  if (appointment && financialTransaction) {
    if (appointment.unitId !== financialTransaction.unitId) {
      throw new AppError(
        'CONFLICT',
        409,
        'The selected appointment and financial transaction do not belong to the same unit.',
      )
    }

    if (
      financialTransaction.appointmentId &&
      financialTransaction.appointmentId !== appointment.id
    ) {
      throw new AppError(
        'CONFLICT',
        409,
        'The selected financial transaction does not belong to the provided appointment.',
      )
    }
  }

  if (input.unitId && appointment && input.unitId !== appointment.unitId) {
    throw new AppError(
      'CONFLICT',
      409,
      'The requested unit does not match the selected appointment.',
    )
  }

  if (input.unitId && financialTransaction && input.unitId !== financialTransaction.unitId) {
    throw new AppError(
      'CONFLICT',
      409,
      'The requested unit does not match the selected financial transaction.',
    )
  }

  const resolvedUnitId = resolveScopedUnitId(
    actor,
    input.unitId ?? appointment?.unitId ?? financialTransaction?.unitId ?? null,
  )

  return {
    appointmentId: appointment?.id ?? null,
    financialTransactionId: financialTransaction?.id ?? null,
    unitId: resolvedUnitId,
  }
}

export async function listFiscalDocuments(
  actor: AuthenticatedUserData,
  query: ListFiscalDocumentsQuery,
) {
  const unitId = resolveFiscalReadUnitId(actor, query.unitId ?? null)

  const documents = await prisma.fiscalDocument.findMany({
    where: {
      unitId,
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.financialTransactionId
        ? { financialTransactionId: query.financialTransactionId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: fiscalDocumentDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return documents.map(toFiscalDocumentAdminSnapshot)
}

export async function createFiscalDocument(
  actor: AuthenticatedUserData,
  input: CreateFiscalDocumentInput,
) {
  const environment = getEnv()

  if (!environment.FISCAL_PROVIDER || !environment.FISCAL_API_BASE_URL || !environment.FISCAL_API_TOKEN) {
    throw new AppError(
      'CONFLICT',
      409,
      'Fiscal integration is not configured for this environment.',
    )
  }

  const scope = await getFiscalScope(actor, input)

  try {
    return await prisma.$transaction(async (tx) => {
      await assertFiscalDocumentExternalReferenceAvailable(tx, {
        externalReference: input.externalReference,
        providerName: environment.FISCAL_PROVIDER,
      })

      const document = await tx.fiscalDocument.create({
        data: {
          unitId: scope.unitId,
          appointmentId: scope.appointmentId,
          financialTransactionId: scope.financialTransactionId,
          createdByUserId: actor.id,
          providerName: environment.FISCAL_PROVIDER,
          documentType: input.documentType,
          status: 'PENDING',
          externalReference: input.externalReference,
          metadata: {
            requestMode: 'queued',
          },
        },
        include: fiscalDocumentDetailsInclude,
      })

      await tx.integrationEvent.create({
        data: {
          unitId: scope.unitId,
          executedByUserId: actor.id,
          provider: 'FISCAL',
          direction: 'OUTBOUND',
          eventType: 'fiscal_document.issue.requested',
          externalEventId: `fiscal-document:${document.id}:issue-request`,
          resourceType: 'fiscal_document',
          resourceId: document.id,
          endpoint: environment.FISCAL_API_BASE_URL,
          status: 'PENDING',
          payload: {
            documentType: document.documentType,
            externalReference: document.externalReference,
          },
        },
      })

      await writeAuditLog(tx, {
        unitId: scope.unitId,
        userId: actor.id,
        action: 'fiscal_document.create',
        entityName: 'FiscalDocument',
        entityId: document.id,
        details: {
          documentType: document.documentType,
          financialTransactionId: document.financialTransactionId,
        },
      })

      return toFiscalDocumentAdminSnapshot(document)
    })
  } catch (error) {
    rethrowFiscalPersistenceError(error)
  }
}

export async function updateFiscalDocumentStatus(
  actor: AuthenticatedUserData,
  documentId: string,
  input: UpdateFiscalDocumentStatusInput,
) {
  const existingDocument = await getFiscalDocumentOrThrow(actor, documentId)
  assertFiscalDocumentStatusTransition(existingDocument.status, input.status)

  try {
    return await prisma.$transaction(async (tx) => {
      const nextExternalReference =
        input.externalReference !== undefined
          ? input.externalReference
          : existingDocument.externalReference

      await assertFiscalDocumentExternalReferenceAvailable(tx, {
        documentId,
        externalReference: nextExternalReference,
        providerName: existingDocument.providerName,
      })

      const document = await tx.fiscalDocument.update({
        where: {
          id: documentId,
        },
        data: {
          status: input.status,
          ...(input.externalReference !== undefined
            ? { externalReference: input.externalReference }
            : {}),
          ...(input.documentNumber !== undefined ? { documentNumber: input.documentNumber } : {}),
          ...(input.series !== undefined ? { series: input.series } : {}),
          ...(input.accessKey !== undefined ? { accessKey: input.accessKey } : {}),
          issuedAt:
            input.issuedAt !== undefined
              ? input.issuedAt
              : input.status === 'ISSUED'
                ? existingDocument.issuedAt ?? new Date()
                : existingDocument.issuedAt,
          lastError:
            input.lastError !== undefined
              ? input.lastError
              : input.status === 'PENDING' || input.status === 'ISSUED'
                ? null
                : existingDocument.lastError,
          canceledAt:
            input.status === 'CANCELED'
              ? existingDocument.canceledAt ?? new Date()
              : existingDocument.canceledAt,
        },
        include: fiscalDocumentDetailsInclude,
      })

      await writeAuditLog(tx, {
        unitId: document.unitId,
        userId: actor.id,
        action: 'fiscal_document.status.update',
        entityName: 'FiscalDocument',
        entityId: document.id,
        details: {
          from: existingDocument.status,
          to: document.status,
        },
      })

      return toFiscalDocumentAdminSnapshot(document)
    })
  } catch (error) {
    rethrowFiscalPersistenceError(error)
  }
}
