import { createHmac, timingSafeEqual } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import { assertActorCanAccessLocalUnitRecord, resolveScopedUnitId } from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import { syncAppointmentFinancialStatus } from '@/features/appointments/financial'
import { derivePaymentStatusFromDepositState } from '@/features/finance/domain'
import type {
  ListIntegrationEventsQuery,
  NormalizedIntegrationEventInput,
} from '@/features/integrations/schemas'

const integrationEventDetailsInclude = Prisma.validator<Prisma.IntegrationEventInclude>()({
  executedBy: true,
  unit: true,
})

type ProviderName = 'FISCAL' | 'MERCADO_PAGO' | 'STRIPE'

export function resolveIntegrationEventReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId)
}

function sanitizeIntegrationHeaders(headers: Headers) {
  return {
    'content-type': headers.get('content-type'),
    'x-petos-signature': headers.get('x-petos-signature') ? '[present]' : null,
  }
}

function resolveProviderSecret(provider: ProviderName) {
  const environment = getEnv()

  switch (provider) {
    case 'STRIPE':
      return environment.STRIPE_WEBHOOK_SECRET
    case 'MERCADO_PAGO':
      return environment.MERCADO_PAGO_WEBHOOK_SECRET
    case 'FISCAL':
      return environment.FISCAL_API_TOKEN
  }
}

function buildIntegrationSignature(rawBody: string, secret: string) {
  return createHmac('sha256', secret).update(rawBody).digest('hex')
}

export function assertValidIntegrationSignature(
  provider: ProviderName,
  rawBody: string,
  receivedSignature: string | null,
) {
  const secret = resolveProviderSecret(provider)

  if (!secret) {
    throw new AppError(
      'INTERNAL_SERVER_ERROR',
      500,
      'Integration secret is not configured for the selected provider.',
    )
  }

  if (!receivedSignature) {
    throw new AppError('FORBIDDEN', 403, 'Missing integration signature.')
  }

  const normalizedReceivedSignature = receivedSignature.replace(/^sha256=/, '')
  const expectedSignature = buildIntegrationSignature(rawBody, secret)
  const receivedBuffer = Buffer.from(normalizedReceivedSignature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new AppError('FORBIDDEN', 403, 'Invalid integration signature.')
  }
}

async function processNormalizedIntegrationEvent(
  tx: Prisma.TransactionClient,
  input: NormalizedIntegrationEventInput,
  provider: ProviderName,
) {
  switch (input.resourceType) {
    case 'financial_transaction': {
      const transaction =
        (input.resourceId
          ? await tx.financialTransaction.findUnique({
              where: {
                id: input.resourceId,
              },
            })
          : null) ??
        (input.data.externalReference
          ? await tx.financialTransaction.findFirst({
              where: {
                integrationProvider: provider,
                externalReference: input.data.externalReference,
              },
            })
          : null)

      if (!transaction) {
        throw new AppError('NOT_FOUND', 404, 'Referenced financial transaction was not found.')
      }

      const updatedTransaction = await tx.financialTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          ...(input.data.paymentStatus !== undefined ? { paymentStatus: input.data.paymentStatus } : {}),
          ...(input.data.externalReference !== undefined
            ? { externalReference: input.data.externalReference }
            : {}),
          integrationProvider: provider,
        },
      })

      if (updatedTransaction.appointmentId) {
        await syncAppointmentFinancialStatus(tx, updatedTransaction.appointmentId)
      }

      return {
        entityId: updatedTransaction.id,
        entityName: 'FinancialTransaction',
        unitId: updatedTransaction.unitId,
      }
    }
    case 'deposit': {
      const deposit =
        (input.resourceId
          ? await tx.deposit.findUnique({
              where: {
                id: input.resourceId,
              },
            })
          : null) ??
        (input.data.externalReference
          ? await tx.deposit.findFirst({
              where: {
                externalReference: input.data.externalReference,
              },
            })
          : null)

      if (!deposit) {
        throw new AppError('NOT_FOUND', 404, 'Referenced deposit was not found.')
      }

      const nextDepositStatus = input.data.depositStatus ?? deposit.status
      const updatedDeposit = await tx.deposit.update({
        where: {
          id: deposit.id,
        },
        data: {
          ...(input.data.externalReference !== undefined
            ? { externalReference: input.data.externalReference }
            : {}),
          ...(input.data.depositStatus !== undefined ? { status: input.data.depositStatus } : {}),
        },
      })

      if (deposit.financialTransactionId) {
        await tx.financialTransaction.update({
          where: {
            id: deposit.financialTransactionId,
          },
          data: {
            paymentStatus:
              input.data.paymentStatus ?? derivePaymentStatusFromDepositState(nextDepositStatus),
            integrationProvider: provider,
            ...(input.data.externalReference !== undefined
              ? { externalReference: input.data.externalReference }
              : {}),
          },
        })
      }

      if (updatedDeposit.appointmentId) {
        await syncAppointmentFinancialStatus(tx, updatedDeposit.appointmentId)
      }

      return {
        entityId: updatedDeposit.id,
        entityName: 'Deposit',
        unitId: updatedDeposit.unitId,
      }
    }
    case 'refund': {
      const refund =
        (input.resourceId
          ? await tx.refund.findUnique({
              where: {
                id: input.resourceId,
              },
            })
          : null) ??
        (input.data.externalReference
          ? await tx.refund.findFirst({
              where: {
                externalReference: input.data.externalReference,
              },
            })
          : null)

      if (!refund) {
        throw new AppError('NOT_FOUND', 404, 'Referenced refund was not found.')
      }

      const updatedRefund = await tx.refund.update({
        where: {
          id: refund.id,
        },
        data: {
          ...(input.data.externalReference !== undefined
            ? { externalReference: input.data.externalReference }
            : {}),
          ...(input.data.refundStatus !== undefined ? { status: input.data.refundStatus } : {}),
          ...(input.data.refundStatus === 'COMPLETED' ? { processedAt: new Date() } : {}),
        },
      })

      if (refund.financialTransactionId && input.data.refundStatus === 'COMPLETED') {
        await tx.financialTransaction.update({
          where: {
            id: refund.financialTransactionId,
          },
          data: {
            paymentStatus: input.data.paymentStatus ?? 'PAID',
            integrationProvider: provider,
            ...(input.data.externalReference !== undefined
              ? { externalReference: input.data.externalReference }
              : {}),
          },
        })
      }

      if (updatedRefund.appointmentId) {
        await syncAppointmentFinancialStatus(tx, updatedRefund.appointmentId)
      }

      return {
        entityId: updatedRefund.id,
        entityName: 'Refund',
        unitId: updatedRefund.unitId,
      }
    }
    case 'fiscal_document': {
      const document =
        (input.resourceId
          ? await tx.fiscalDocument.findUnique({
              where: {
                id: input.resourceId,
              },
            })
          : null) ??
        (input.data.externalReference
          ? await tx.fiscalDocument.findFirst({
              where: {
                externalReference: input.data.externalReference,
              },
            })
          : null)

      if (!document) {
        throw new AppError('NOT_FOUND', 404, 'Referenced fiscal document was not found.')
      }

      const updatedDocument = await tx.fiscalDocument.update({
        where: {
          id: document.id,
        },
        data: {
          ...(input.data.externalReference !== undefined
            ? { externalReference: input.data.externalReference }
            : {}),
          ...(input.data.fiscalDocumentStatus !== undefined
            ? { status: input.data.fiscalDocumentStatus }
            : {}),
          ...(input.data.documentNumber !== undefined
            ? { documentNumber: input.data.documentNumber }
            : {}),
          ...(input.data.series !== undefined ? { series: input.data.series } : {}),
          ...(input.data.accessKey !== undefined ? { accessKey: input.data.accessKey } : {}),
          ...(input.data.issuedAt !== undefined ? { issuedAt: input.data.issuedAt } : {}),
          ...(input.data.errorMessage !== undefined ? { lastError: input.data.errorMessage } : {}),
        },
      })

      return {
        entityId: updatedDocument.id,
        entityName: 'FiscalDocument',
        unitId: updatedDocument.unitId,
      }
    }
  }
}

export async function listIntegrationEvents(
  actor: AuthenticatedUserData,
  query: ListIntegrationEventsQuery,
) {
  const unitId = resolveIntegrationEventReadUnitId(actor, query.unitId ?? null)

  return prisma.integrationEvent.findMany({
    where: {
      unitId,
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
    },
    include: integrationEventDetailsInclude,
    orderBy: {
      receivedAt: 'desc',
    },
  })
}

export async function ingestNormalizedIntegrationEvent(
  provider: ProviderName,
  input: NormalizedIntegrationEventInput,
  options: {
    headers: Headers
    rawBody: string
  },
) {
  assertValidIntegrationSignature(provider, options.rawBody, options.headers.get('x-petos-signature'))

  return prisma.$transaction(async (tx) => {
    const existingEvent = await tx.integrationEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId: input.externalEventId,
        },
      },
    })

    if (existingEvent?.status === 'PROCESSED' || existingEvent?.status === 'IGNORED') {
      return tx.integrationEvent.findUniqueOrThrow({
        where: {
          id: existingEvent.id,
        },
        include: integrationEventDetailsInclude,
      })
    }

    const event =
      existingEvent ??
      (await tx.integrationEvent.create({
        data: {
          unitId: input.unitId ?? null,
          provider,
          direction: 'INBOUND',
          eventType: input.eventType,
          externalEventId: input.externalEventId,
          resourceType: input.resourceType,
          resourceId: input.resourceId ?? null,
          status: 'RECEIVED',
          payload: input.data,
          headers: sanitizeIntegrationHeaders(options.headers),
        },
      }))

    try {
      const processedResource = await processNormalizedIntegrationEvent(tx, input, provider)

      const processedEvent = await tx.integrationEvent.update({
        where: {
          id: event.id,
        },
        data: {
          unitId: processedResource.unitId ?? event.unitId,
          resourceId: processedResource.entityId,
          resourceType: input.resourceType,
          status: 'PROCESSED',
          processedAt: new Date(),
          attemptCount: {
            increment: 1,
          },
        },
        include: integrationEventDetailsInclude,
      })

      await writeAuditLog(tx, {
        unitId: processedResource.unitId ?? event.unitId,
        action: 'integration_event.process',
        entityName: processedResource.entityName,
        entityId: processedResource.entityId,
        details: {
          eventId: processedEvent.id,
          eventType: processedEvent.eventType,
          provider: processedEvent.provider,
        },
      })

      return processedEvent
    } catch (error) {
      const appError =
        error instanceof AppError ? error : new AppError('INTERNAL_SERVER_ERROR', 500, 'Internal server error.')

      const failedEvent = await tx.integrationEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          lastError: appError.message,
          attemptCount: {
            increment: 1,
          },
        },
        include: integrationEventDetailsInclude,
      })

      throw Object.assign(appError, {
        integrationEvent: failedEvent,
      })
    }
  })
}

export async function reprocessIntegrationEvent(
  actor: AuthenticatedUserData,
  eventId: string,
) {
  const existingEvent = await prisma.integrationEvent.findUnique({
    where: {
      id: eventId,
    },
    include: integrationEventDetailsInclude,
  })

  if (!existingEvent) {
    throw new AppError('NOT_FOUND', 404, 'Integration event not found.')
  }

  if (existingEvent.unitId) {
    assertActorCanAccessLocalUnitRecord(actor, existingEvent.unitId, {
      requestedUnitId: existingEvent.unitId,
    })
  }

  const payload = existingEvent.payload as NormalizedIntegrationEventInput['data'] | null

  if (!payload || !existingEvent.resourceType) {
    throw new AppError('CONFLICT', 409, 'Integration event does not have a reprocessable payload.')
  }

  return prisma.$transaction(async (tx) => {
    const processedResource = await processNormalizedIntegrationEvent(
      tx,
      {
        data: payload,
        eventType: existingEvent.eventType,
        externalEventId: existingEvent.externalEventId ?? existingEvent.id,
        resourceId: existingEvent.resourceId ?? undefined,
        resourceType: existingEvent.resourceType as NormalizedIntegrationEventInput['resourceType'],
        unitId: existingEvent.unitId ?? undefined,
      },
      existingEvent.provider as ProviderName,
    )

    const event = await tx.integrationEvent.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        executedByUserId: actor.id,
        lastError: null,
        processedAt: new Date(),
        status: 'PROCESSED',
        attemptCount: {
          increment: 1,
        },
      },
      include: integrationEventDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: processedResource.unitId ?? event.unitId,
      userId: actor.id,
      action: 'integration_event.reprocess',
      entityName: processedResource.entityName,
      entityId: processedResource.entityId,
      details: {
        eventId: event.id,
        provider: event.provider,
      },
    })

    return event
  })
}
