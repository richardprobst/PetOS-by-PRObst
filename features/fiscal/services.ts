import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import { assertActorCanAccessLocalUnitRecord, resolveScopedUnitId } from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import type {
  CreateFiscalDocumentInput,
  ListFiscalDocumentsQuery,
  UpdateFiscalDocumentStatusInput,
} from '@/features/fiscal/schemas'

const fiscalDocumentDetailsInclude = Prisma.validator<Prisma.FiscalDocumentInclude>()({
  appointment: {
    include: {
      pet: true,
      client: {
        include: {
          user: true,
        },
      },
    },
  },
  createdBy: true,
  financialTransaction: true,
  unit: true,
})

type FiscalScopeQuery = {
  unitId?: string | null
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

  return prisma.fiscalDocument.findMany({
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

  return prisma.$transaction(async (tx) => {
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

    return document
  })
}

export async function updateFiscalDocumentStatus(
  actor: AuthenticatedUserData,
  documentId: string,
  input: UpdateFiscalDocumentStatusInput,
) {
  const existingDocument = await getFiscalDocumentOrThrow(actor, documentId)

  return prisma.$transaction(async (tx) => {
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
        ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt } : {}),
        ...(input.lastError !== undefined ? { lastError: input.lastError } : {}),
        ...(input.status === 'CANCELED' ? { canceledAt: new Date() } : {}),
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

    return document
  })
}
