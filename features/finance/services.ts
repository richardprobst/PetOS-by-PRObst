import {
  CreditOriginType,
  DepositPurpose,
  DepositStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { resolveScopedUnitId } from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { syncAppointmentFinancialStatus } from '@/features/appointments/financial'
import { operationalStatusIds } from '@/features/appointments/constants'
import {
  assertDepositStatusTransition,
  assertPrepaymentRequiresAppointment,
  assertRefundAmountWithinAvailableBalance,
  calculateRemainingRefundableAmount,
  deriveDepositStatusFromPaymentStatus,
  derivePaymentStatusFromDepositState,
} from '@/features/finance/domain'
import type {
  CreateClientCreditInput,
  CreateDepositInput,
  CreateFinancialTransactionInput,
  CreateRefundInput,
  ListClientCreditsQuery,
  ListDepositsQuery,
  ListFinancialTransactionsQuery,
  ListRefundsQuery,
  RecordNoShowChargeInput,
  UpdateDepositStatusInput,
  UpdateFinancialTransactionInput,
  UseClientCreditInput,
} from '@/features/finance/schemas'

const financialSettingKeys = {
  creditValidityDays: 'financeiro.credito_validade_dias_padrao',
  depositExpirationMinutes: 'financeiro.deposito_expiracao_minutos_padrao',
} as const

const financialTransactionDetailsInclude =
  Prisma.validator<Prisma.FinancialTransactionInclude>()({
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
    unit: true,
  })

const depositDetailsInclude = Prisma.validator<Prisma.DepositInclude>()({
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
  client: {
    include: {
      user: true,
    },
  },
  createdBy: true,
  financialTransaction: true,
  unit: true,
  clientCredits: true,
  refunds: true,
})

const refundDetailsInclude = Prisma.validator<Prisma.RefundInclude>()({
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
  client: {
    include: {
      user: true,
    },
  },
  createdBy: true,
  financialTransaction: true,
  originDeposit: true,
  sourceFinancialTransaction: true,
  unit: true,
  clientCredits: true,
})

const clientCreditDetailsInclude = Prisma.validator<Prisma.ClientCreditInclude>()({
  client: {
    include: {
      user: true,
    },
  },
  createdBy: true,
  originDeposit: true,
  originRefund: true,
  unit: true,
  usages: {
    include: {
      appointment: {
        include: {
          pet: true,
        },
      },
      financialTransaction: true,
      createdBy: true,
    },
    orderBy: {
      usedAt: 'desc',
    },
  },
})

type FinanceMutationClient = Prisma.TransactionClient | typeof prisma

type AppointmentReference = {
  clientId: string
  estimatedTotalAmount: number
  id: string
  operationalStatusId: string
  unitId: string
}

type ClientReference = {
  id: string
  unitId: string | null
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

async function getUnitFinancialDefaults(client: FinanceMutationClient, unitId: string) {
  const settings = await client.unitSetting.findMany({
    where: {
      unitId,
      key: {
        in: [financialSettingKeys.creditValidityDays, financialSettingKeys.depositExpirationMinutes],
      },
    },
  })

  const readNumericSetting = (key: string, fallbackValue: number) => {
    const value = settings.find((setting) => setting.key === key)?.value
    const parsedValue = Number(value)

    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
  }

  return {
    creditValidityDays: readNumericSetting(financialSettingKeys.creditValidityDays, 180),
    depositExpirationMinutes: readNumericSetting(financialSettingKeys.depositExpirationMinutes, 60),
  }
}

async function getAppointmentReference(
  client: FinanceMutationClient,
  actor: AuthenticatedUserData,
  appointmentId: string | undefined,
): Promise<AppointmentReference | null> {
  if (!appointmentId) {
    return null
  }

  const appointment = await client.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    select: {
      clientId: true,
      estimatedTotalAmount: true,
      id: true,
      operationalStatusId: true,
      unitId: true,
    },
  })

  if (!appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for financial operation.')
  }

  if (actor.unitId && appointment.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to use this appointment.')
  }

  return {
    clientId: appointment.clientId,
    estimatedTotalAmount: Number(appointment.estimatedTotalAmount),
    id: appointment.id,
    operationalStatusId: appointment.operationalStatusId,
    unitId: appointment.unitId,
  }
}

async function getClientReference(
  client: FinanceMutationClient,
  actor: AuthenticatedUserData,
  clientId: string | undefined,
): Promise<ClientReference | null> {
  if (!clientId) {
    return null
  }

  const clientRecord = await client.client.findUnique({
    where: {
      userId: clientId,
    },
    include: {
      user: {
        select: {
          unitId: true,
        },
      },
    },
  })

  if (!clientRecord) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for financial operation.')
  }

  if (actor.unitId && clientRecord.user.unitId && actor.unitId !== clientRecord.user.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to use this client.')
  }

  return {
    id: clientRecord.userId,
    unitId: clientRecord.user.unitId,
  }
}

async function getFinancialTransactionOrThrow(
  actor: AuthenticatedUserData,
  transactionId: string,
) {
  const transaction = await prisma.financialTransaction.findUnique({
    where: {
      id: transactionId,
    },
    include: financialTransactionDetailsInclude,
  })

  if (!transaction) {
    throw new AppError('NOT_FOUND', 404, 'Financial transaction not found.')
  }

  if (actor.unitId && transaction.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this transaction.')
  }

  return transaction
}

async function getDepositOrThrow(actor: AuthenticatedUserData, depositId: string) {
  const deposit = await prisma.deposit.findUnique({
    where: {
      id: depositId,
    },
    include: depositDetailsInclude,
  })

  if (!deposit) {
    throw new AppError('NOT_FOUND', 404, 'Deposit not found.')
  }

  if (actor.unitId && deposit.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this deposit.')
  }

  return deposit
}

async function getClientCreditOrThrow(actor: AuthenticatedUserData, creditId: string) {
  const credit = await prisma.clientCredit.findUnique({
    where: {
      id: creditId,
    },
    include: clientCreditDetailsInclude,
  })

  if (!credit) {
    throw new AppError('NOT_FOUND', 404, 'Client credit not found.')
  }

  if (actor.unitId && credit.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this client credit.')
  }

  return credit
}

function resolveFinanceUnitId(
  actor: AuthenticatedUserData,
  explicitUnitId: string | undefined,
  appointmentUnitId: string | null,
  clientUnitId: string | null,
) {
  return resolveScopedUnitId(actor, explicitUnitId ?? appointmentUnitId ?? clientUnitId ?? null)
}

function createDepositDescription(purpose: DepositPurpose) {
  return purpose === DepositPurpose.PREPAYMENT ? 'Prepayment reservation' : 'Security deposit'
}

function normalizeDepositLifecycleDates(
  status: DepositStatus,
  occurredAt: Date,
  existingDates?: {
    appliedAt?: Date | null
    expiresAt?: Date | null
    receivedAt?: Date | null
  },
) {
  return {
    appliedAt:
      status === 'APPLIED' ? existingDates?.appliedAt ?? occurredAt : existingDates?.appliedAt ?? null,
    expiresAt:
      status === 'EXPIRED' ? existingDates?.expiresAt ?? occurredAt : existingDates?.expiresAt ?? null,
    receivedAt:
      ['CONFIRMED', 'APPLIED', 'FORFEITED', 'REFUNDED'].includes(status)
        ? existingDates?.receivedAt ?? occurredAt
        : existingDates?.receivedAt ?? null,
  }
}

async function syncAppointmentIfAffected(
  tx: Prisma.TransactionClient,
  appointmentIds: Array<string | null | undefined>,
) {
  const uniqueAppointmentIds = Array.from(
    new Set(appointmentIds.filter((appointmentId): appointmentId is string => Boolean(appointmentId))),
  )

  for (const appointmentId of uniqueAppointmentIds) {
    await syncAppointmentFinancialStatus(tx, appointmentId)
  }
}

export async function listFinancialTransactions(
  actor: AuthenticatedUserData,
  query: ListFinancialTransactionsQuery,
) {
  return prisma.financialTransaction.findMany({
    where: {
      ...(actor.unitId ? { unitId: actor.unitId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.transactionType ? { transactionType: query.transactionType } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    },
    include: financialTransactionDetailsInclude,
    orderBy: {
      occurredAt: 'desc',
    },
  })
}

export async function createFinancialTransaction(
  actor: AuthenticatedUserData,
  input: CreateFinancialTransactionInput,
) {
  const appointmentReference = await getAppointmentReference(prisma, actor, input.appointmentId)
  const unitId = resolveFinanceUnitId(actor, input.unitId, appointmentReference?.unitId ?? null, null)

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        unitId,
        appointmentId: appointmentReference?.id ?? null,
        createdByUserId: actor.id,
        transactionType: input.transactionType,
        description: input.description,
        amount: input.amount,
        paymentMethod: input.paymentMethod ?? null,
        paymentStatus: input.paymentStatus ?? 'PENDING',
        integrationProvider: input.integrationProvider ?? null,
        externalReference: input.externalReference,
        occurredAt: input.occurredAt ?? new Date(),
      },
      include: financialTransactionDetailsInclude,
    })

    await syncAppointmentIfAffected(tx, [transaction.appointmentId])

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'financial_transaction.create',
      entityName: 'FinancialTransaction',
      entityId: transaction.id,
      details: {
        amount: Number(transaction.amount),
        paymentStatus: transaction.paymentStatus,
        transactionType: transaction.transactionType,
      },
    })

    return transaction
  })
}

export async function updateFinancialTransaction(
  actor: AuthenticatedUserData,
  transactionId: string,
  input: UpdateFinancialTransactionInput,
) {
  const existingTransaction = await getFinancialTransactionOrThrow(actor, transactionId)
  const appointmentReference = await getAppointmentReference(
    prisma,
    actor,
    input.appointmentId ?? existingTransaction.appointmentId ?? undefined,
  )
  const unitId = resolveFinanceUnitId(
    actor,
    input.unitId,
    appointmentReference?.unitId ?? null,
    existingTransaction.unitId,
  )

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        unitId,
        ...(input.appointmentId !== undefined ? { appointmentId: input.appointmentId } : {}),
        ...(input.transactionType !== undefined ? { transactionType: input.transactionType } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
        ...(input.paymentStatus !== undefined ? { paymentStatus: input.paymentStatus } : {}),
        ...(input.integrationProvider !== undefined
          ? { integrationProvider: input.integrationProvider }
          : {}),
        ...(input.externalReference !== undefined
          ? { externalReference: input.externalReference }
          : {}),
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
      },
      include: financialTransactionDetailsInclude,
    })

    await syncAppointmentIfAffected(tx, [existingTransaction.appointmentId, transaction.appointmentId])

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'financial_transaction.update',
      entityName: 'FinancialTransaction',
      entityId: transactionId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return transaction
  })
}

export async function listDeposits(actor: AuthenticatedUserData, query: ListDepositsQuery) {
  return prisma.deposit.findMany({
    where: {
      ...(actor.unitId ? { unitId: actor.unitId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.purpose ? { purpose: query.purpose } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: depositDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function createDeposit(
  actor: AuthenticatedUserData,
  input: CreateDepositInput,
) {
  const appointmentReference = await getAppointmentReference(prisma, actor, input.appointmentId)
  const clientReference = await getClientReference(
    prisma,
    actor,
    input.clientId ?? appointmentReference?.clientId,
  )

  if (!clientReference) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Deposits require a valid client reference.')
  }

  if (appointmentReference && appointmentReference.clientId !== clientReference.id) {
    throw new AppError(
      'CONFLICT',
      409,
      'The selected deposit client does not match the appointment client.',
    )
  }

  assertPrepaymentRequiresAppointment(input.purpose, appointmentReference?.id)

  const unitId = resolveFinanceUnitId(
    actor,
    input.unitId,
    appointmentReference?.unitId ?? null,
    clientReference.unitId,
  )

  return prisma.$transaction(async (tx) => {
    const defaults = await getUnitFinancialDefaults(tx, unitId)
    const occurredAt = new Date()
    const depositStatus =
      input.status ??
      deriveDepositStatusFromPaymentStatus(input.paymentStatus ?? 'PENDING')
    const paymentStatus = derivePaymentStatusFromDepositState(
      depositStatus,
      input.paymentStatus ?? 'PENDING',
    )
    const lifecycleDates = normalizeDepositLifecycleDates(depositStatus, occurredAt)
    const expiresAt =
      input.expiresAt ??
      (depositStatus === 'PENDING'
        ? addMinutes(occurredAt, defaults.depositExpirationMinutes)
        : null)

    const transaction = await tx.financialTransaction.create({
      data: {
        unitId,
        appointmentId: appointmentReference?.id ?? null,
        createdByUserId: actor.id,
        transactionType: 'DEPOSIT',
        description: createDepositDescription(input.purpose),
        amount: input.amount,
        paymentMethod: input.paymentMethod ?? null,
        paymentStatus,
        integrationProvider: input.integrationProvider ?? null,
        externalReference: input.externalReference,
        occurredAt,
        metadata: {
          category: 'DEPOSIT',
          purpose: input.purpose,
        },
      },
    })

    const deposit = await tx.deposit.create({
      data: {
        unitId,
        clientId: clientReference.id,
        appointmentId: appointmentReference?.id ?? null,
        financialTransactionId: transaction.id,
        createdByUserId: actor.id,
        amount: input.amount,
        purpose: input.purpose,
        status: depositStatus,
        externalReference: input.externalReference,
        expiresAt,
        receivedAt: lifecycleDates.receivedAt,
        appliedAt: lifecycleDates.appliedAt,
        notes: input.notes,
      },
      include: depositDetailsInclude,
    })

    await syncAppointmentIfAffected(tx, [deposit.appointmentId])

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'deposit.create',
      entityName: 'Deposit',
      entityId: deposit.id,
      details: {
        amount: Number(deposit.amount),
        purpose: deposit.purpose,
        status: deposit.status,
      },
    })

    return deposit
  })
}

export async function updateDepositStatus(
  actor: AuthenticatedUserData,
  depositId: string,
  input: UpdateDepositStatusInput,
) {
  const existingDeposit = await getDepositOrThrow(actor, depositId)
  assertDepositStatusTransition(existingDeposit.status, input.status)

  return prisma.$transaction(async (tx) => {
    const nextPaymentStatus = derivePaymentStatusFromDepositState(
      input.status,
      existingDeposit.financialTransaction?.paymentStatus ?? 'PENDING',
    )
    const occurredAt = new Date()
    const lifecycleDates = normalizeDepositLifecycleDates(input.status, occurredAt, {
      appliedAt: existingDeposit.appliedAt,
      expiresAt: existingDeposit.expiresAt,
      receivedAt: existingDeposit.receivedAt,
    })

    if (existingDeposit.financialTransactionId) {
      await tx.financialTransaction.update({
        where: {
          id: existingDeposit.financialTransactionId,
        },
        data: {
          paymentStatus: nextPaymentStatus,
        },
      })
    }

    const deposit = await tx.deposit.update({
      where: {
        id: depositId,
      },
      data: {
        status: input.status,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        receivedAt: lifecycleDates.receivedAt,
        appliedAt: lifecycleDates.appliedAt,
        expiresAt: lifecycleDates.expiresAt,
      },
      include: depositDetailsInclude,
    })

    await syncAppointmentIfAffected(tx, [deposit.appointmentId])

    await writeAuditLog(tx, {
      unitId: deposit.unitId,
      userId: actor.id,
      action: 'deposit.status.update',
      entityName: 'Deposit',
      entityId: deposit.id,
      details: {
        from: existingDeposit.status,
        to: deposit.status,
      },
    })

    return deposit
  })
}

export async function listRefunds(actor: AuthenticatedUserData, query: ListRefundsQuery) {
  return prisma.refund.findMany({
    where: {
      ...(actor.unitId ? { unitId: actor.unitId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: refundDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function createRefund(actor: AuthenticatedUserData, input: CreateRefundInput) {
  const sourceTransaction = input.sourceFinancialTransactionId
    ? await getFinancialTransactionOrThrow(actor, input.sourceFinancialTransactionId)
    : null
  const originDeposit = input.originDepositId
    ? await getDepositOrThrow(actor, input.originDepositId)
    : null
  const appointmentReference = await getAppointmentReference(
    prisma,
    actor,
    input.appointmentId ?? sourceTransaction?.appointmentId ?? originDeposit?.appointmentId ?? undefined,
  )
  const clientReference = await getClientReference(
    prisma,
    actor,
    input.clientId ??
      sourceTransaction?.appointment?.clientId ??
      originDeposit?.clientId ??
      appointmentReference?.clientId,
  )

  if (!clientReference) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Refunds require a valid client reference.')
  }

  const unitId = resolveFinanceUnitId(
    actor,
    input.unitId,
    appointmentReference?.unitId ?? sourceTransaction?.unitId ?? originDeposit?.unitId ?? null,
    clientReference.unitId,
  )

  if (appointmentReference && appointmentReference.clientId !== clientReference.id) {
    throw new AppError(
      'CONFLICT',
      409,
      'The selected refund client does not match the appointment client.',
    )
  }

  const sourceAmount = sourceTransaction
    ? Number(sourceTransaction.amount)
    : originDeposit
      ? Number(originDeposit.amount)
      : input.amount

  const alreadyRefundedAmount = await prisma.refund.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      unitId,
      status: {
        in: ['PENDING', 'PROCESSING', 'COMPLETED'],
      },
      ...(sourceTransaction ? { sourceFinancialTransactionId: sourceTransaction.id } : {}),
      ...(originDeposit ? { originDepositId: originDeposit.id } : {}),
    },
  })

  assertRefundAmountWithinAvailableBalance(
    sourceAmount,
    Number(alreadyRefundedAmount._sum.amount ?? 0),
    input.amount,
  )
 
  return prisma.$transaction(async (tx) => {
    const defaults = await getUnitFinancialDefaults(tx, unitId)
    let refundTransactionId: string | null = null
    let createdCreditId: string | null = null

    if (!input.createClientCredit) {
      const refundTransaction = await tx.financialTransaction.create({
        data: {
          unitId,
          appointmentId:
            appointmentReference?.id ??
            sourceTransaction?.appointmentId ??
            originDeposit?.appointmentId ??
            null,
          createdByUserId: actor.id,
          transactionType: 'REFUND',
          description: `Refund - ${input.reason}`,
          amount: input.amount,
          paymentMethod: input.paymentMethod ?? null,
          paymentStatus: 'PAID',
          integrationProvider:
            input.integrationProvider ?? sourceTransaction?.integrationProvider ?? null,
          externalReference: input.externalReference,
          occurredAt: new Date(),
          metadata: {
            category: 'REFUND',
            originDepositId: originDeposit?.id ?? null,
            sourceFinancialTransactionId: sourceTransaction?.id ?? null,
          },
        },
      })

      refundTransactionId = refundTransaction.id
    }

    const refund = await tx.refund.create({
      data: {
        unitId,
        clientId: clientReference.id,
        appointmentId:
          appointmentReference?.id ??
          sourceTransaction?.appointmentId ??
          originDeposit?.appointmentId ??
          null,
        sourceFinancialTransactionId: sourceTransaction?.id ?? null,
        originDepositId: originDeposit?.id ?? null,
        financialTransactionId: refundTransactionId,
        createdByUserId: actor.id,
        amount: input.amount,
        status: RefundStatus.COMPLETED,
        reason: input.reason,
        externalReference: input.externalReference,
        processedAt: new Date(),
      },
      include: refundDetailsInclude,
    })

    if (input.createClientCredit) {
      const credit = await tx.clientCredit.create({
        data: {
          unitId,
          clientId: clientReference.id,
          originRefundId: refund.id,
          createdByUserId: actor.id,
          originType: CreditOriginType.REFUND,
          totalAmount: input.amount,
          availableAmount: input.amount,
          expiresAt: addDays(new Date(), defaults.creditValidityDays),
          notes: `Credit generated from refund ${refund.id}.`,
        },
      })

      createdCreditId = credit.id
    }

    if (sourceTransaction) {
      const remainingRefundableAmount = calculateRemainingRefundableAmount(
        sourceAmount,
        Number(alreadyRefundedAmount._sum.amount ?? 0) + input.amount,
      )

      if (remainingRefundableAmount === 0) {
        await tx.financialTransaction.update({
          where: {
            id: sourceTransaction.id,
          },
          data: {
            paymentStatus: 'REFUNDED',
          },
        })
      }
    }

    if (originDeposit) {
      const remainingRefundableAmount = calculateRemainingRefundableAmount(
        sourceAmount,
        Number(alreadyRefundedAmount._sum.amount ?? 0) + input.amount,
      )

      if (remainingRefundableAmount === 0) {
        await tx.deposit.update({
          where: {
            id: originDeposit.id,
          },
          data: {
            status: 'REFUNDED',
          },
        })

        if (originDeposit.financialTransactionId) {
          await tx.financialTransaction.update({
            where: {
              id: originDeposit.financialTransactionId,
            },
            data: {
              paymentStatus: 'REFUNDED',
            },
          })
        }
      }
    }

    await syncAppointmentIfAffected(tx, [
      refund.appointmentId,
      sourceTransaction?.appointmentId,
      originDeposit?.appointmentId,
    ])

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'refund.create',
      entityName: 'Refund',
      entityId: refund.id,
      details: {
        amount: Number(refund.amount),
        createdClientCreditId: createdCreditId,
        originDepositId: originDeposit?.id ?? null,
        sourceFinancialTransactionId: sourceTransaction?.id ?? null,
      },
    })

    return tx.refund.findUniqueOrThrow({
      where: {
        id: refund.id,
      },
      include: refundDetailsInclude,
    })
  })
}

export async function listClientCredits(
  actor: AuthenticatedUserData,
  query: ListClientCreditsQuery,
) {
  const now = new Date()

  return prisma.clientCredit.findMany({
    where: {
      ...(actor.unitId ? { unitId: actor.unitId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.includeExpired
        ? {}
        : {
            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: now,
                },
              },
            ],
          }),
    },
    include: clientCreditDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function createClientCredit(
  actor: AuthenticatedUserData,
  input: CreateClientCreditInput,
) {
  const clientReference = await getClientReference(prisma, actor, input.clientId)

  if (!clientReference) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for credit creation.')
  }

  const unitId = resolveFinanceUnitId(actor, input.unitId, null, clientReference.unitId)

  return prisma.$transaction(async (tx) => {
    const defaults = await getUnitFinancialDefaults(tx, unitId)
    const credit = await tx.clientCredit.create({
      data: {
        unitId,
        clientId: clientReference.id,
        originRefundId: input.originRefundId ?? null,
        originDepositId: input.originDepositId ?? null,
        createdByUserId: actor.id,
        originType: input.originType,
        totalAmount: input.totalAmount,
        availableAmount: input.totalAmount,
        expiresAt: input.expiresAt ?? addDays(new Date(), defaults.creditValidityDays),
        notes: input.notes,
      },
      include: clientCreditDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'client_credit.create',
      entityName: 'ClientCredit',
      entityId: credit.id,
      details: {
        amount: Number(credit.totalAmount),
        originType: credit.originType,
      },
    })

    return credit
  })
}

export async function applyClientCredit(
  actor: AuthenticatedUserData,
  input: UseClientCreditInput,
) {
  const [existingCredit, appointmentReference] = await Promise.all([
    getClientCreditOrThrow(actor, input.creditId),
    getAppointmentReference(prisma, actor, input.appointmentId),
  ])

  if (!appointmentReference) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for credit usage.')
  }

  if (existingCredit.clientId !== appointmentReference.clientId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Client credit can only be used on appointments from the same client.',
    )
  }

  if (existingCredit.availableAmount.lt(input.amount)) {
    throw new AppError('CONFLICT', 409, 'Client credit does not have enough available balance.')
  }

  if (existingCredit.expiresAt && existingCredit.expiresAt <= new Date()) {
    throw new AppError('CONFLICT', 409, 'Client credit has already expired.')
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        unitId: appointmentReference.unitId,
        appointmentId: appointmentReference.id,
        createdByUserId: actor.id,
        transactionType: 'REVENUE',
        description: input.description ?? 'Client credit usage',
        amount: input.amount,
        paymentMethod: 'CLIENT_CREDIT',
        paymentStatus: 'PAID',
        occurredAt: new Date(),
        metadata: {
          category: 'CLIENT_CREDIT_USAGE',
          creditId: existingCredit.id,
        },
      },
    })

    await tx.creditUsage.create({
      data: {
        creditId: existingCredit.id,
        appointmentId: appointmentReference.id,
        financialTransactionId: transaction.id,
        createdByUserId: actor.id,
        amount: input.amount,
      },
    })

    const nextAvailableAmount = Number(existingCredit.availableAmount) - input.amount

    await tx.clientCredit.update({
      where: {
        id: existingCredit.id,
      },
      data: {
        availableAmount: nextAvailableAmount,
      },
    })

    await syncAppointmentIfAffected(tx, [appointmentReference.id])

    await writeAuditLog(tx, {
      unitId: appointmentReference.unitId,
      userId: actor.id,
      action: 'client_credit.apply',
      entityName: 'ClientCredit',
      entityId: existingCredit.id,
      details: {
        amount: input.amount,
        appointmentId: appointmentReference.id,
      },
    })

    return tx.clientCredit.findUniqueOrThrow({
      where: {
        id: existingCredit.id,
      },
      include: clientCreditDetailsInclude,
    })
  })
}

export async function recordNoShowProtectionCharge(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: RecordNoShowChargeInput,
) {
  const appointmentReference = await getAppointmentReference(prisma, actor, appointmentId)

  if (!appointmentReference) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for no-show protection.')
  }

  if (appointmentReference.operationalStatusId !== operationalStatusIds.noShow) {
    throw new AppError(
      'CONFLICT',
      409,
      'No-show protection can only be recorded for appointments already marked as no-show.',
    )
  }

  const existingRevenueTransactions = await prisma.financialTransaction.findMany({
    where: {
      appointmentId,
      transactionType: 'REVENUE',
    },
    select: {
      metadata: true,
    },
  })

  if (
    existingRevenueTransactions.some((transaction) => {
      const metadata =
        transaction.metadata && typeof transaction.metadata === 'object'
          ? (transaction.metadata as Record<string, unknown>)
          : null

      return metadata?.category === 'NO_SHOW_PROTECTION'
    })
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'This appointment already has a recorded no-show protection charge.',
    )
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        unitId: appointmentReference.unitId,
        appointmentId,
        createdByUserId: actor.id,
        transactionType: 'REVENUE',
        description: input.description ?? 'No-show protection charge',
        amount: input.amount,
        paymentMethod: input.paymentMethod ?? null,
        paymentStatus: 'PAID',
        integrationProvider: input.integrationProvider ?? null,
        externalReference: input.externalReference,
        occurredAt: new Date(),
        metadata: {
          category: 'NO_SHOW_PROTECTION',
        },
      },
      include: financialTransactionDetailsInclude,
    })

    await syncAppointmentIfAffected(tx, [appointmentId])

    await writeAuditLog(tx, {
      unitId: appointmentReference.unitId,
      userId: actor.id,
      action: 'appointment.no_show_charge',
      entityName: 'Appointment',
      entityId: appointmentId,
      details: {
        amount: Number(transaction.amount),
        financialTransactionId: transaction.id,
      },
    })

    return transaction
  })
}
