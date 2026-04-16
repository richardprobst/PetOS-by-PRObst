import {
  CreditOriginType,
  DepositPurpose,
  DepositStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { runSerializableTransaction } from '@/server/db/transactions'
import { AppError } from '@/server/http/errors'
import {
  assertActorCanAccessLocalUnitRecord,
  assertActorCanAccessOwnershipBinding,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { syncAppointmentFinancialStatus } from '@/features/appointments/financial'
import { operationalStatusIds } from '@/features/appointments/constants'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'
import {
  assertDepositStatusTransition,
  assertPrepaymentRequiresAppointment,
  assertRefundAmountWithinAvailableBalance,
  calculateRemainingRefundableAmount,
  deriveDepositStatusFromPaymentStatus,
  derivePaymentStatusFromDepositState,
  resolveDepositCreatePaymentStatus,
} from '@/features/finance/domain'
import { ensureFinancialTransactionExternalReferenceIsUnique } from '@/features/finance/transaction-reference'
import {
  loadUnitSettings,
  readNumericUnitSetting,
} from '@/server/settings/unit-settings'
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

const financeUserSelect = {
  active: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  phone: true,
  unitId: true,
  updatedAt: true,
  userType: true,
} as const

const financialTransactionDetailsInclude =
  Prisma.validator<Prisma.FinancialTransactionInclude>()({
    appointment: {
      include: {
        pet: true,
        client: {
          include: {
            user: {
              select: financeUserSelect,
            },
          },
        },
      },
    },
    createdBy: {
      select: financeUserSelect,
    },
    unit: true,
  })

const depositDetailsInclude = Prisma.validator<Prisma.DepositInclude>()({
  appointment: {
    include: {
      pet: true,
      client: {
        include: {
          user: {
            select: financeUserSelect,
          },
        },
      },
    },
  },
  client: {
    include: {
      user: {
        select: financeUserSelect,
      },
    },
  },
  createdBy: {
    select: financeUserSelect,
  },
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
          user: {
            select: financeUserSelect,
          },
        },
      },
    },
  },
  client: {
    include: {
      user: {
        select: financeUserSelect,
      },
    },
  },
  createdBy: {
    select: financeUserSelect,
  },
  financialTransaction: true,
  originDeposit: true,
  sourceFinancialTransaction: true,
  unit: true,
  clientCredits: true,
})

const clientCreditDetailsInclude = Prisma.validator<Prisma.ClientCreditInclude>()({
  client: {
    include: {
      user: {
        select: financeUserSelect,
      },
    },
  },
  createdBy: {
    select: financeUserSelect,
  },
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
      createdBy: {
        select: financeUserSelect,
      },
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

type FinanceOriginReference = {
  clientId?: string | null
  label: string
  unitId: string | null
}

export function resolveFinanceReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId ?? null)
}

export function assertActorCanReadFinanceRecordInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, options)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

async function getUnitFinancialDefaults(client: FinanceMutationClient, unitId: string) {
  const settings = await loadUnitSettings(client, unitId, [
    financialSettingKeys.creditValidityDays,
    financialSettingKeys.depositExpirationMinutes,
  ])

  return {
    creditValidityDays: readNumericUnitSetting(settings, financialSettingKeys.creditValidityDays, 180),
    depositExpirationMinutes: readNumericUnitSetting(
      settings,
      financialSettingKeys.depositExpirationMinutes,
      60,
    ),
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

  assertActorCanReadFinanceRecordInScope(actor, appointment.unitId)

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

  if (clientRecord.user.unitId) {
    assertActorCanAccessOwnershipBinding(
      actor,
      buildClientOwnershipBinding(clientRecord.user.unitId),
      {
        requestedUnitId: clientRecord.user.unitId,
      },
    )
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

  assertActorCanReadFinanceRecordInScope(actor, transaction.unitId)

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

  assertActorCanReadFinanceRecordInScope(actor, deposit.unitId)

  return deposit
}

async function getRefundOrThrow(actor: AuthenticatedUserData, refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: {
      id: refundId,
    },
    include: refundDetailsInclude,
  })

  if (!refund) {
    throw new AppError('NOT_FOUND', 404, 'Refund not found.')
  }

  assertActorCanReadFinanceRecordInScope(actor, refund.unitId)

  return refund
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

  assertActorCanReadFinanceRecordInScope(actor, credit.unitId)

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

function assertFinanceUnitConsistency(
  targetUnitId: string,
  origins: FinanceOriginReference[],
) {
  for (const origin of origins) {
    if (!origin.unitId) {
      continue
    }

    if (origin.unitId !== targetUnitId) {
      throw new AppError(
        'CONFLICT',
        409,
        `The selected ${origin.label} belongs to another unit and cannot be linked to this financial record.`,
      )
    }
  }
}

function assertFinanceClientConsistency(
  targetClientId: string,
  origins: Array<{ clientId?: string | null; label: string }>,
) {
  for (const origin of origins) {
    if (!origin.clientId) {
      continue
    }

    if (origin.clientId !== targetClientId) {
      throw new AppError(
        'CONFLICT',
        409,
        `The selected ${origin.label} belongs to another client and cannot be linked to this financial record.`,
      )
    }
  }
}

function assertClientCreditOriginConsistency(input: {
  originDepositId?: string | null
  originRefundId?: string | null
  originType: CreditOriginType
}) {
  const hasRefundOrigin = Boolean(input.originRefundId)
  const hasDepositOrigin = Boolean(input.originDepositId)

  if (hasRefundOrigin && hasDepositOrigin) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Client credit can reference either a refund or a deposit conversion origin, not both.',
    )
  }

  if (input.originType === CreditOriginType.REFUND) {
    if (!hasRefundOrigin) {
      throw new AppError(
        'UNPROCESSABLE_ENTITY',
        422,
        'Refund-origin credits require originRefundId.',
      )
    }

    return
  }

  if (input.originType === CreditOriginType.DEPOSIT_CONVERSION) {
    if (!hasDepositOrigin) {
      throw new AppError(
        'UNPROCESSABLE_ENTITY',
        422,
        'Deposit-conversion credits require originDepositId.',
      )
    }

    return
  }

  if (hasRefundOrigin || hasDepositOrigin) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Only refund and deposit-conversion credits can reference a financial origin.',
    )
  }
}

function assertClientCreditOriginAmountConsistency(input: {
  originType: CreditOriginType
  totalAmount: number
}, origins: {
  originDeposit?: { amount: Prisma.Decimal } | null
  originRefund?: { amount: Prisma.Decimal } | null
}) {
  const requestedAmount = new Prisma.Decimal(input.totalAmount)

  if (
    input.originType === CreditOriginType.REFUND &&
    origins.originRefund &&
    !requestedAmount.equals(origins.originRefund.amount)
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'Refund-origin client credits must match the full refund amount. Create a dedicated refund for partial or custom-value credits.',
    )
  }

  if (
    input.originType === CreditOriginType.DEPOSIT_CONVERSION &&
    origins.originDeposit &&
    !requestedAmount.equals(origins.originDeposit.amount)
  ) {
    throw new AppError(
      'CONFLICT',
      409,
      'Deposit-conversion client credits must match the full deposit amount. Create a dedicated refund first when only part of the deposit should become credit.',
    )
  }
}

async function ensureClientCreditOriginIsUnique(
  client: FinanceMutationClient,
  input: {
    originDepositId?: string | null
    originRefundId?: string | null
  },
) {
  if (input.originRefundId) {
    const existingCredit = await client.clientCredit.findFirst({
      where: {
        originRefundId: input.originRefundId,
      },
      select: {
        id: true,
      },
    })

    if (existingCredit) {
      throw new AppError(
        'CONFLICT',
        409,
        'This refund already has a registered client credit.',
      )
    }
  }

  if (input.originDepositId) {
    const existingCredit = await client.clientCredit.findFirst({
      where: {
        originDepositId: input.originDepositId,
      },
      select: {
        id: true,
      },
    })

    if (existingCredit) {
      throw new AppError(
        'CONFLICT',
        409,
        'This deposit already has a registered direct conversion credit.',
      )
    }
  }
}

async function ensureDepositExternalReferenceIsUnique(
  client: FinanceMutationClient,
  input: {
    depositId?: string
    externalReference?: string | null
  },
) {
  if (!input.externalReference) {
    return
  }

  const existingDeposit = await client.deposit.findFirst({
    where: {
      externalReference: input.externalReference,
      ...(input.depositId
        ? {
            id: {
              not: input.depositId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (existingDeposit) {
    throw new AppError(
      'CONFLICT',
      409,
      'Another deposit already uses this external reference.',
    )
  }
}

async function ensureRefundExternalReferenceIsUnique(
  client: FinanceMutationClient,
  input: {
    externalReference?: string | null
    refundId?: string
  },
) {
  if (!input.externalReference) {
    return
  }

  const existingRefund = await client.refund.findFirst({
    where: {
      externalReference: input.externalReference,
      ...(input.refundId
        ? {
            id: {
              not: input.refundId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (existingRefund) {
    throw new AppError(
      'CONFLICT',
      409,
      'Another refund already uses this external reference.',
    )
  }
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

function isNoShowProtectionTransaction(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false
  }

  return (metadata as Record<string, unknown>).category === 'NO_SHOW_PROTECTION'
}

async function syncAppointmentIfAffected(
  tx: Prisma.TransactionClient,
  appointmentIds: Array<string | null | undefined>,
  source?: {
    action: string
    actorUserId?: string | null
    details?: Record<string, unknown>
    entityId?: string | null
    entityName: string
  },
) {
  const uniqueAppointmentIds = Array.from(
    new Set(appointmentIds.filter((appointmentId): appointmentId is string => Boolean(appointmentId))),
  )

  for (const appointmentId of uniqueAppointmentIds) {
    await syncAppointmentFinancialStatus(tx, appointmentId, {
      source,
    })
  }
}

export async function listFinancialTransactions(
  actor: AuthenticatedUserData,
  query: ListFinancialTransactionsQuery,
) {
  const scopedUnitId = resolveFinanceReadUnitId(actor, query.unitId ?? null)

  return prisma.financialTransaction.findMany({
    where: {
      unitId: scopedUnitId,
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
  assertFinanceUnitConsistency(unitId, [
    {
      label: 'appointment',
      unitId: appointmentReference?.unitId ?? null,
    },
  ])

  return runSerializableTransaction(async (tx) => {
    await ensureFinancialTransactionExternalReferenceIsUnique(tx, {
      externalReference: input.externalReference,
      integrationProvider: input.integrationProvider ?? null,
    })

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

    await syncAppointmentIfAffected(tx, [transaction.appointmentId], {
      action: 'financial_transaction.create',
      actorUserId: actor.id,
      entityId: transaction.id,
      entityName: 'FinancialTransaction',
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'financial_transaction.create',
      entityName: 'FinancialTransaction',
      entityId: transaction.id,
      details: {
        amount: Number(transaction.amount),
        appointmentId: transaction.appointmentId,
        externalReference: transaction.externalReference,
        integrationProvider: transaction.integrationProvider,
        paymentStatus: transaction.paymentStatus,
        transactionType: transaction.transactionType,
      },
    })

    return transaction
  }, 'Another financial transaction changed before this transaction could be recorded.')
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
  assertFinanceUnitConsistency(unitId, [
    {
      label: 'current transaction',
      unitId: existingTransaction.unitId,
    },
    {
      label: 'appointment',
      unitId: appointmentReference?.unitId ?? null,
    },
  ])

  return runSerializableTransaction(async (tx) => {
    await ensureFinancialTransactionExternalReferenceIsUnique(tx, {
      externalReference: input.externalReference ?? existingTransaction.externalReference,
      integrationProvider: input.integrationProvider ?? existingTransaction.integrationProvider,
      transactionId,
    })

    const updatedTransaction = await tx.financialTransaction.updateMany({
      where: {
        id: transactionId,
        updatedAt: existingTransaction.updatedAt,
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
    })

    if (updatedTransaction.count !== 1) {
      throw new AppError(
        'CONFLICT',
        409,
        'The financial transaction changed before it could be updated.',
      )
    }

    const transaction = await tx.financialTransaction.findUniqueOrThrow({
      where: {
        id: transactionId,
      },
      include: financialTransactionDetailsInclude,
    })

    await syncAppointmentIfAffected(tx, [existingTransaction.appointmentId, transaction.appointmentId], {
      action: 'financial_transaction.update',
      actorUserId: actor.id,
      entityId: transaction.id,
      entityName: 'FinancialTransaction',
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'financial_transaction.update',
      entityName: 'FinancialTransaction',
      entityId: transactionId,
      details: {
        appointmentId: transaction.appointmentId,
        changedFields: Object.keys(input),
        externalReference: transaction.externalReference,
        integrationProvider: transaction.integrationProvider,
        paymentStatus: transaction.paymentStatus,
      },
    })

    return transaction
  }, 'The financial transaction changed before it could be updated.')
}

export async function listDeposits(actor: AuthenticatedUserData, query: ListDepositsQuery) {
  const scopedUnitId = resolveFinanceReadUnitId(actor, query.unitId ?? null)

  return prisma.deposit.findMany({
    where: {
      unitId: scopedUnitId,
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
  assertFinanceUnitConsistency(unitId, [
    {
      label: 'appointment',
      unitId: appointmentReference?.unitId ?? null,
    },
    {
      label: 'client',
      unitId: clientReference.unitId,
    },
  ])
  const depositStatus =
    input.status ??
    deriveDepositStatusFromPaymentStatus(input.paymentStatus ?? 'PENDING')
  const paymentStatus = resolveDepositCreatePaymentStatus(depositStatus, input.paymentStatus)

  return runSerializableTransaction(async (tx) => {
    await ensureDepositExternalReferenceIsUnique(tx, {
      externalReference: input.externalReference,
    })
    await ensureFinancialTransactionExternalReferenceIsUnique(tx, {
      externalReference: input.externalReference,
      integrationProvider: input.integrationProvider ?? null,
    })

    const defaults = await getUnitFinancialDefaults(tx, unitId)
    const occurredAt = new Date()
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

    await syncAppointmentIfAffected(tx, [deposit.appointmentId], {
      action: 'deposit.create',
      actorUserId: actor.id,
      entityId: deposit.id,
      entityName: 'Deposit',
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'deposit.create',
      entityName: 'Deposit',
      entityId: deposit.id,
      details: {
        amount: Number(deposit.amount),
        appointmentId: deposit.appointmentId,
        clientId: deposit.clientId,
        externalReference: deposit.externalReference,
        financialTransactionId: deposit.financialTransactionId,
        purpose: deposit.purpose,
        status: deposit.status,
      },
    })

    return deposit
  }, 'Another financial operation changed before this deposit could be recorded.')
}

export async function updateDepositStatus(
  actor: AuthenticatedUserData,
  depositId: string,
  input: UpdateDepositStatusInput,
) {
  return runSerializableTransaction(async (tx) => {
    const existingDeposit = await tx.deposit.findUnique({
      where: {
        id: depositId,
      },
      select: {
        appliedAt: true,
        appointmentId: true,
        expiresAt: true,
        financialTransaction: {
          select: {
            paymentStatus: true,
          },
        },
        financialTransactionId: true,
        id: true,
        receivedAt: true,
        status: true,
        unitId: true,
      },
    })

    if (!existingDeposit) {
      throw new AppError('NOT_FOUND', 404, 'Deposit not found.')
    }

    assertActorCanReadFinanceRecordInScope(actor, existingDeposit.unitId)
    assertDepositStatusTransition(existingDeposit.status, input.status)

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

      const updatedDeposit = await tx.deposit.updateMany({
        where: {
          id: depositId,
          status: existingDeposit.status,
        },
        data: {
          status: input.status,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          receivedAt: lifecycleDates.receivedAt,
          appliedAt: lifecycleDates.appliedAt,
          expiresAt: lifecycleDates.expiresAt,
        },
      })

      if (updatedDeposit.count !== 1) {
        throw new AppError(
          'CONFLICT',
          409,
          'The deposit changed before its status could be updated.',
        )
      }

      const deposit = await tx.deposit.findUniqueOrThrow({
        where: {
          id: depositId,
        },
        include: depositDetailsInclude,
      })

      await syncAppointmentIfAffected(tx, [deposit.appointmentId], {
        action: 'deposit.status.update',
        actorUserId: actor.id,
        entityId: deposit.id,
        entityName: 'Deposit',
      })

    await writeAuditLog(tx, {
      unitId: deposit.unitId,
      userId: actor.id,
      action: 'deposit.status.update',
      entityName: 'Deposit',
      entityId: deposit.id,
      details: {
        appointmentId: deposit.appointmentId,
        financialTransactionId: deposit.financialTransactionId,
        from: existingDeposit.status,
        to: deposit.status,
      },
    })

      return deposit
    }, 'The deposit changed before its status could be updated.')
}

export async function listRefunds(actor: AuthenticatedUserData, query: ListRefundsQuery) {
  const scopedUnitId = resolveFinanceReadUnitId(actor, query.unitId ?? null)

  return prisma.refund.findMany({
    where: {
      unitId: scopedUnitId,
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
  assertFinanceUnitConsistency(unitId, [
    {
      label: 'appointment',
      unitId: appointmentReference?.unitId ?? null,
    },
    {
      label: 'source transaction',
      unitId: sourceTransaction?.unitId ?? null,
    },
    {
      label: 'origin deposit',
      unitId: originDeposit?.unitId ?? null,
    },
    {
      label: 'client',
      unitId: clientReference.unitId,
    },
  ])

  assertFinanceClientConsistency(clientReference.id, [
    {
      label: 'appointment',
      clientId: appointmentReference?.clientId ?? null,
    },
    {
      label: 'source transaction',
      clientId: sourceTransaction?.appointment?.clientId ?? null,
    },
    {
      label: 'origin deposit',
      clientId: originDeposit?.clientId ?? null,
    },
  ])

  const sourceAmount = sourceTransaction
    ? Number(sourceTransaction.amount)
    : originDeposit
      ? Number(originDeposit.amount)
      : input.amount

  return prisma.$transaction(async (tx) => {
    await ensureRefundExternalReferenceIsUnique(tx, {
      externalReference: input.externalReference,
    })

    if (!input.createClientCredit) {
      await ensureFinancialTransactionExternalReferenceIsUnique(tx, {
        externalReference: input.externalReference,
        integrationProvider: input.integrationProvider ?? sourceTransaction?.integrationProvider ?? null,
      })
    }

    const alreadyRefundedAmount = await tx.refund.aggregate({
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

    await syncAppointmentIfAffected(
      tx,
      [refund.appointmentId, sourceTransaction?.appointmentId, originDeposit?.appointmentId],
      {
        action: 'refund.create',
        actorUserId: actor.id,
        entityId: refund.id,
        entityName: 'Refund',
      },
    )

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'refund.create',
      entityName: 'Refund',
      entityId: refund.id,
      details: {
        amount: Number(refund.amount),
        appointmentId: refund.appointmentId,
        createdClientCreditId: createdCreditId,
        externalReference: refund.externalReference,
        financialTransactionId: refund.financialTransactionId,
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
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  })
}

export async function listClientCredits(
  actor: AuthenticatedUserData,
  query: ListClientCreditsQuery,
) {
  const now = new Date()
  const scopedUnitId = resolveFinanceReadUnitId(actor, query.unitId ?? null)

  return prisma.clientCredit.findMany({
    where: {
      unitId: scopedUnitId,
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
  assertClientCreditOriginConsistency(input)

  const clientReference = await getClientReference(prisma, actor, input.clientId)
  const originRefund = input.originRefundId ? await getRefundOrThrow(actor, input.originRefundId) : null
  const originDeposit = input.originDepositId ? await getDepositOrThrow(actor, input.originDepositId) : null

  if (!clientReference) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for credit creation.')
  }

  const unitId = resolveFinanceUnitId(actor, input.unitId, null, clientReference.unitId)
  assertFinanceUnitConsistency(unitId, [
    {
      label: 'client',
      unitId: clientReference.unitId,
    },
    {
      label: 'origin refund',
      unitId: originRefund?.unitId ?? null,
    },
    {
      label: 'origin deposit',
      unitId: originDeposit?.unitId ?? null,
    },
  ])
  assertFinanceClientConsistency(clientReference.id, [
    {
      label: 'origin refund',
      clientId: originRefund?.clientId ?? null,
    },
    {
      label: 'origin deposit',
      clientId: originDeposit?.clientId ?? null,
    },
  ])
  assertClientCreditOriginAmountConsistency(input, {
    originDeposit,
    originRefund,
  })

  return runSerializableTransaction(async (tx) => {
    const defaults = await getUnitFinancialDefaults(tx, unitId)
    await ensureClientCreditOriginIsUnique(tx, input)

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
        originDepositId: credit.originDepositId,
        originRefundId: credit.originRefundId,
        originType: credit.originType,
      },
    })

    return credit
  }, 'The client credit origin changed before this credit could be created.')
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
  assertFinanceUnitConsistency(appointmentReference.unitId, [
    {
      label: 'client credit',
      unitId: existingCredit.unitId,
    },
  ])

  if (existingCredit.availableAmount.lt(input.amount)) {
    throw new AppError('CONFLICT', 409, 'Client credit does not have enough available balance.')
  }

  if (existingCredit.expiresAt && existingCredit.expiresAt <= new Date()) {
    throw new AppError('CONFLICT', 409, 'Client credit has already expired.')
  }

  return prisma.$transaction(async (tx) => {
    const reserveCreditResult = await tx.clientCredit.updateMany({
      where: {
        id: existingCredit.id,
        clientId: appointmentReference.clientId,
        unitId: appointmentReference.unitId,
        availableAmount: {
          gte: input.amount,
        },
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
      data: {
        availableAmount: {
          decrement: input.amount,
        },
      },
    })

    if (reserveCreditResult.count !== 1) {
      throw new AppError(
        'CONFLICT',
        409,
        'Client credit balance changed before this usage could be recorded.',
      )
    }

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

    await syncAppointmentIfAffected(tx, [appointmentReference.id], {
      action: 'client_credit.apply',
      actorUserId: actor.id,
      details: {
        financialTransactionId: transaction.id,
      },
      entityId: existingCredit.id,
      entityName: 'ClientCredit',
    })

    await writeAuditLog(tx, {
      unitId: appointmentReference.unitId,
      userId: actor.id,
      action: 'client_credit.apply',
      entityName: 'ClientCredit',
      entityId: existingCredit.id,
      details: {
        amount: input.amount,
        appointmentId: appointmentReference.id,
        financialTransactionId: transaction.id,
      },
    })

    return tx.clientCredit.findUniqueOrThrow({
      where: {
        id: existingCredit.id,
      },
      include: clientCreditDetailsInclude,
    })
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  })
}

export async function recordNoShowProtectionCharge(
  actor: AuthenticatedUserData,
  appointmentId: string,
  input: RecordNoShowChargeInput,
) {
  return runSerializableTransaction(async (tx) => {
    const appointmentReference = await getAppointmentReference(tx, actor, appointmentId)

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

    await ensureFinancialTransactionExternalReferenceIsUnique(tx, {
      externalReference: input.externalReference,
      integrationProvider: input.integrationProvider ?? null,
    })

    const existingRevenueTransactions = await tx.financialTransaction.findMany({
      where: {
        appointmentId,
        transactionType: 'REVENUE',
      },
      select: {
        metadata: true,
      },
    })

    if (existingRevenueTransactions.some((transaction) => isNoShowProtectionTransaction(transaction.metadata))) {
      throw new AppError(
        'CONFLICT',
        409,
        'This appointment already has a recorded no-show protection charge.',
      )
    }

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

    await syncAppointmentIfAffected(tx, [appointmentId], {
      action: 'appointment.no_show_charge',
      actorUserId: actor.id,
      entityId: transaction.id,
      entityName: 'FinancialTransaction',
    })

    await writeAuditLog(tx, {
      unitId: appointmentReference.unitId,
      userId: actor.id,
      action: 'appointment.no_show_charge',
      entityName: 'Appointment',
      entityId: appointmentId,
      details: {
        amount: Number(transaction.amount),
        externalReference: transaction.externalReference,
        financialTransactionId: transaction.id,
        paymentMethod: transaction.paymentMethod,
      },
    })

    return transaction
  }, 'The appointment changed before its no-show charge could be recorded.')
}
