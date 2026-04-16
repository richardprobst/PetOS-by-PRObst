import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { CreditOriginType, DepositPurpose, Prisma } from '@prisma/client'
import { operationalStatusIds } from '../../../features/appointments/constants'
import {
  applyClientCredit,
  createClientCredit,
  createDeposit,
  createFinancialTransaction,
  createRefund,
  listClientCredits,
  listFinancialTransactions,
  listRefunds,
  recordNoShowProtectionCharge,
  updateDepositStatus,
  updateFinancialTransaction,
} from '../../../features/finance/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const globalFinanceActor: AuthenticatedUserData = {
  active: true,
  email: 'finance@petos.app',
  id: 'user_finance_global',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  name: 'Finance Global',
  permissions: ['multiunidade.global.visualizar'],
  profiles: ['Gerente'],
  unitId: 'unit_home',
  userType: 'ADMIN',
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('createFinancialTransaction rejects cross-unit appointment reassignment', async () => {
  replaceMethod(prisma as object, 'appointment', {
    findUnique: async () => ({
      clientId: 'client_1',
      estimatedTotalAmount: 120,
      id: 'appointment_1',
      operationalStatusId: operationalStatusIds.confirmed,
      unitId: 'unit_local',
    }),
  })

  await assert.rejects(
    () =>
      createFinancialTransaction(globalFinanceActor, {
        amount: 120,
        appointmentId: 'appointment_1',
        description: 'Pagamento principal',
        transactionType: 'REVENUE',
        unitId: 'unit_remote',
      }),
    /belongs to another unit/,
  )
})

test('createFinancialTransaction uses serializable isolation for provider reference guards', async () => {
  let receivedOptions: { isolationLevel?: Prisma.TransactionIsolationLevel } | undefined
  const createdTransactions: Array<Record<string, unknown>> = []

  replaceMethod(prisma as object, '$transaction', async (
    callback: (tx: unknown) => Promise<unknown>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ) => {
    receivedOptions = options

    return callback({
      auditLog: {
        create: async () => null,
      },
      financialTransaction: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdTransactions.push(data)

          return {
          amount: new Prisma.Decimal(120),
          appointmentId: null,
          id: 'tx_1',
          paymentStatus: 'PENDING',
          transactionType: 'REVENUE',
          }
        },
        findFirst: async () => null,
      },
    })
  })

  await createFinancialTransaction(globalFinanceActor, {
    amount: 120,
    description: 'Pagamento principal',
    externalReference: 'gateway_ref_1',
    integrationProvider: 'STRIPE',
    transactionType: 'REVENUE',
  })

  assert.equal(receivedOptions?.isolationLevel, Prisma.TransactionIsolationLevel.Serializable)
  assert.equal('revenuePosSaleId' in (createdTransactions[0] ?? {}), false)
})

test('createDeposit rejects cross-unit client and appointment combinations', async () => {
  replaceMethod(prisma as object, 'appointment', {
    findUnique: async () => ({
      clientId: 'client_1',
      estimatedTotalAmount: 80,
      id: 'appointment_1',
      operationalStatusId: operationalStatusIds.confirmed,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, 'client', {
    findUnique: async () => ({
      user: {
        unitId: 'unit_local',
      },
      userId: 'client_1',
    }),
  })

  await assert.rejects(
    () =>
      createDeposit(globalFinanceActor, {
        amount: 50,
        appointmentId: 'appointment_1',
        purpose: DepositPurpose.SECURITY,
        unitId: 'unit_remote',
      }),
    /belongs to another unit/,
  )
})

test('createDeposit uses serializable isolation for external reference guards', async () => {
  let receivedOptions: { isolationLevel?: Prisma.TransactionIsolationLevel } | undefined

  replaceMethod(prisma as object, 'client', {
    findUnique: async () => ({
      user: {
        unitId: 'unit_local',
      },
      userId: 'client_1',
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (
    callback: (tx: unknown) => Promise<unknown>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ) => {
    receivedOptions = options

    return callback({
      auditLog: {
        create: async () => null,
      },
      deposit: {
        create: async () => ({
          amount: new Prisma.Decimal(50),
          appointmentId: null,
          id: 'deposit_1',
          purpose: DepositPurpose.SECURITY,
          status: 'PENDING',
          unitId: 'unit_local',
        }),
        findFirst: async () => null,
      },
      financialTransaction: {
        create: async () => ({
          id: 'tx_1',
        }),
        findFirst: async () => null,
      },
      unitSetting: {
        findMany: async () => [],
      },
    })
  })

  await createDeposit(globalFinanceActor, {
    amount: 50,
    clientId: 'client_1',
    externalReference: 'deposit_ref_1',
    integrationProvider: 'STRIPE',
    purpose: DepositPurpose.SECURITY,
  })

  assert.equal(receivedOptions?.isolationLevel, Prisma.TransactionIsolationLevel.Serializable)
})

test('createRefund rejects cross-unit origin references before writing', async () => {
  replaceMethod(prisma as object, 'deposit', {
    findUnique: async () => ({
      amount: new Prisma.Decimal(50),
      appointmentId: null,
      clientId: 'client_1',
      clientCredits: [],
      createdBy: null,
      createdByUserId: 'admin_1',
      financialTransaction: null,
      financialTransactionId: null,
      id: 'deposit_1',
      notes: null,
      originDeposit: null,
      purpose: DepositPurpose.SECURITY,
      refunds: [],
      status: 'CONFIRMED',
      unit: null,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, 'client', {
    findUnique: async () => ({
      user: {
        unitId: 'unit_local',
      },
      userId: 'client_1',
    }),
  })

  await assert.rejects(
    () =>
      createRefund(globalFinanceActor, {
        amount: 20,
        createClientCredit: false,
        originDepositId: 'deposit_1',
        reason: 'Estorno de sinal',
        unitId: 'unit_remote',
      }),
    /belongs to another unit/,
  )
})

test('updateFinancialTransaction rejects stale writes when the transaction changes first', async () => {
  const transactionUpdatedAt = new Date('2026-04-13T12:00:00.000Z')

  replaceMethod(prisma as object, 'financialTransaction', {
    findUnique: async () => ({
      amount: new Prisma.Decimal(120),
      appointment: null,
      appointmentId: null,
      createdBy: null,
      createdByUserId: 'admin_1',
      description: 'Pagamento principal',
      externalReference: null,
      id: 'tx_1',
      integrationProvider: null,
      metadata: null,
      occurredAt: new Date('2026-04-13T10:00:00.000Z'),
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING',
      transactionType: 'REVENUE',
      unit: null,
      unitId: 'unit_local',
      updatedAt: transactionUpdatedAt,
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      financialTransaction: {
        findFirst: async () => null,
        updateMany: async () => ({
          count: 0,
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      updateFinancialTransaction(globalFinanceActor, 'tx_1', {
        description: 'Pagamento atualizado',
      }),
    /changed before it could be updated/,
  )
})

test('createClientCredit rejects origin refund from another client', async () => {
  replaceMethod(prisma as object, 'client', {
    findUnique: async () => ({
      user: {
        unitId: 'unit_local',
      },
      userId: 'client_1',
    }),
  })
  replaceMethod(prisma as object, 'refund', {
    findUnique: async () => ({
      amount: new Prisma.Decimal(30),
      appointment: null,
      appointmentId: null,
      client: null,
      clientCredits: [],
      clientId: 'client_2',
      createdBy: null,
      createdByUserId: 'admin_1',
      externalReference: null,
      financialTransaction: null,
      financialTransactionId: null,
      id: 'refund_1',
      originDeposit: null,
      originDepositId: null,
      processedAt: new Date('2026-04-13T12:00:00.000Z'),
      reason: 'Credito manual',
      sourceFinancialTransaction: null,
      sourceFinancialTransactionId: null,
      status: 'COMPLETED',
      unit: null,
      unitId: 'unit_local',
    }),
  })

  await assert.rejects(
    () =>
      createClientCredit(globalFinanceActor, {
        clientId: 'client_1',
        originRefundId: 'refund_1',
        originType: CreditOriginType.REFUND,
        totalAmount: 30,
        unitId: 'unit_local',
      }),
    /belongs to another client/,
  )
})

test('createClientCredit rejects refund-origin duplicates inside the transaction', async () => {
  replaceMethod(prisma as object, 'client', {
    findUnique: async () => ({
      user: {
        unitId: 'unit_local',
      },
      userId: 'client_1',
    }),
  })
  replaceMethod(prisma as object, 'refund', {
    findUnique: async () => ({
      amount: new Prisma.Decimal(30),
      appointment: null,
      appointmentId: null,
      client: null,
      clientCredits: [],
      clientId: 'client_1',
      createdBy: null,
      createdByUserId: 'admin_1',
      externalReference: null,
      financialTransaction: null,
      financialTransactionId: null,
      id: 'refund_1',
      originDeposit: null,
      originDepositId: null,
      processedAt: new Date('2026-04-13T12:00:00.000Z'),
      reason: 'Credito de reembolso',
      sourceFinancialTransaction: null,
      sourceFinancialTransactionId: null,
      status: 'COMPLETED',
      unit: null,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      clientCredit: {
        findFirst: async ({ where }: { where: { originRefundId?: string } }) =>
          where.originRefundId === 'refund_1'
            ? {
                id: 'credit_existing',
              }
            : null,
      },
      unitSetting: {
        findMany: async () => [],
      },
    }),
  )

  await assert.rejects(
    () =>
      createClientCredit(globalFinanceActor, {
        clientId: 'client_1',
        originRefundId: 'refund_1',
        originType: CreditOriginType.REFUND,
        totalAmount: 30,
        unitId: 'unit_local',
      }),
    /already has a registered client credit/,
  )
})

test('createClientCredit rejects deposit-origin duplicates inside the transaction', async () => {
  replaceMethod(prisma as object, 'client', {
    findUnique: async () => ({
      user: {
        unitId: 'unit_local',
      },
      userId: 'client_1',
    }),
  })
  replaceMethod(prisma as object, 'deposit', {
    findUnique: async () => ({
      amount: new Prisma.Decimal(45),
      appointment: null,
      appointmentId: null,
      client: null,
      clientCredits: [],
      clientId: 'client_1',
      createdBy: null,
      createdByUserId: 'admin_1',
      financialTransaction: null,
      financialTransactionId: null,
      id: 'deposit_1',
      notes: null,
      purpose: DepositPurpose.PREPAYMENT,
      refunds: [],
      status: 'CONFIRMED',
      unit: null,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      clientCredit: {
        findFirst: async ({ where }: { where: { originDepositId?: string } }) =>
          where.originDepositId === 'deposit_1'
            ? {
                id: 'credit_existing',
              }
            : null,
      },
      unitSetting: {
        findMany: async () => [],
      },
    }),
  )

  await assert.rejects(
    () =>
      createClientCredit(globalFinanceActor, {
        clientId: 'client_1',
        originDepositId: 'deposit_1',
        originType: CreditOriginType.DEPOSIT_CONVERSION,
        totalAmount: 45,
        unitId: 'unit_local',
      }),
    /already has a registered direct conversion credit/,
  )
})

test('createClientCredit rejects origin-type mismatches before writing', async () => {
  await assert.rejects(
    () =>
      createClientCredit(globalFinanceActor, {
        clientId: 'client_1',
        originRefundId: 'refund_1',
        originType: CreditOriginType.MANUAL_ADJUSTMENT,
        totalAmount: 30,
        unitId: 'unit_local',
      }),
    /Only refund and deposit-conversion credits can reference a financial origin/,
  )
})

test('updateDepositStatus rejects stale transitions when the deposit changes first', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      deposit: {
        findUnique: async () => ({
          appliedAt: null,
          appointmentId: null,
          expiresAt: null,
          financialTransaction: null,
          financialTransactionId: null,
          id: 'deposit_1',
          receivedAt: null,
          status: 'PENDING',
          unitId: 'unit_local',
        }),
        updateMany: async () => ({
          count: 0,
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      updateDepositStatus(globalFinanceActor, 'deposit_1', {
        status: 'CONFIRMED',
      }),
    /changed before its status could be updated/,
  )
})

test('applyClientCredit fails closed when the balance changes before reservation', async () => {
  replaceMethod(prisma as object, 'clientCredit', {
    findUnique: async () => ({
      availableAmount: new Prisma.Decimal(40),
      client: null,
      clientId: 'client_1',
      createdBy: null,
      createdByUserId: 'admin_1',
      expiresAt: null,
      id: 'credit_1',
      notes: null,
      originDeposit: null,
      originDepositId: null,
      originRefund: null,
      originRefundId: null,
      originType: CreditOriginType.REFUND,
      totalAmount: new Prisma.Decimal(40),
      unit: null,
      unitId: 'unit_local',
      usages: [],
    }),
  })
  replaceMethod(prisma as object, 'appointment', {
    findUnique: async () => ({
      clientId: 'client_1',
      estimatedTotalAmount: 120,
      id: 'appointment_1',
      operationalStatusId: operationalStatusIds.confirmed,
      unitId: 'unit_local',
    }),
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      clientCredit: {
        updateMany: async () => ({
          count: 0,
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      applyClientCredit(globalFinanceActor, {
        amount: 25,
        appointmentId: 'appointment_1',
        creditId: 'credit_1',
      }),
    /balance changed before this usage could be recorded/,
  )
})

test('recordNoShowProtectionCharge rechecks duplicates inside the transaction', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointment: {
        findUnique: async () => ({
          clientId: 'client_1',
          estimatedTotalAmount: 90,
          id: 'appointment_1',
          operationalStatusId: operationalStatusIds.noShow,
          unitId: 'unit_local',
        }),
      },
      financialTransaction: {
        findFirst: async () => null,
        findMany: async () => [
          {
            metadata: {
              category: 'NO_SHOW_PROTECTION',
            },
          },
        ],
      },
    }),
  )

  await assert.rejects(
    () =>
      recordNoShowProtectionCharge(globalFinanceActor, 'appointment_1', {
        amount: 30,
      }),
    /already has a recorded no-show protection charge/,
  )
})

test('recordNoShowProtectionCharge rechecks the appointment status inside the transaction', async () => {
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      appointment: {
        findUnique: async () => ({
          clientId: 'client_1',
          estimatedTotalAmount: 90,
          id: 'appointment_1',
          operationalStatusId: operationalStatusIds.confirmed,
          unitId: 'unit_local',
        }),
      },
    }),
  )

  await assert.rejects(
    () =>
      recordNoShowProtectionCharge(globalFinanceActor, 'appointment_1', {
        amount: 30,
      }),
    /only be recorded for appointments already marked as no-show/,
  )
})

test('finance list queries request sanitized nested user projections', async () => {
  const calls: Array<Record<string, unknown>> = []

  replaceMethod(prisma as object, 'financialTransaction', {
    findMany: async (args: Record<string, unknown>) => {
      calls.push(args)
      return []
    },
  })
  replaceMethod(prisma as object, 'refund', {
    findMany: async (args: Record<string, unknown>) => {
      calls.push(args)
      return []
    },
  })
  replaceMethod(prisma as object, 'clientCredit', {
    findMany: async (args: Record<string, unknown>) => {
      calls.push(args)
      return []
    },
  })

  await listFinancialTransactions(globalFinanceActor, {})
  await listRefunds(globalFinanceActor, {})
  await listClientCredits(globalFinanceActor, { includeExpired: false })

  const [transactionsArgs, refundsArgs, clientCreditsArgs] = calls as [
    {
      include: {
        appointment: { include: { client: { include: { user: { select: Record<string, boolean> } } } } }
        createdBy: { select: Record<string, boolean> }
      }
    },
    {
      include: {
        appointment: { include: { client: { include: { user: { select: Record<string, boolean> } } } } }
        client: { include: { user: { select: Record<string, boolean> } } }
        createdBy: { select: Record<string, boolean> }
      }
    },
    {
      include: {
        client: { include: { user: { select: Record<string, boolean> } } }
        createdBy: { select: Record<string, boolean> }
        usages: { include: { createdBy: { select: Record<string, boolean> } } }
      }
    },
  ]

  assert.equal(transactionsArgs.include.createdBy.select.passwordHash, undefined)
  assert.equal(
    transactionsArgs.include.appointment.include.client.include.user.select.passwordHash,
    undefined,
  )
  assert.equal(refundsArgs.include.createdBy.select.passwordHash, undefined)
  assert.equal(refundsArgs.include.client.include.user.select.passwordHash, undefined)
  assert.equal(
    refundsArgs.include.appointment.include.client.include.user.select.passwordHash,
    undefined,
  )
  assert.equal(clientCreditsArgs.include.createdBy.select.passwordHash, undefined)
  assert.equal(clientCreditsArgs.include.client.include.user.select.passwordHash, undefined)
  assert.equal(clientCreditsArgs.include.usages.include.createdBy.select.passwordHash, undefined)
  assert.equal(clientCreditsArgs.include.usages.include.createdBy.select.email, true)
})
