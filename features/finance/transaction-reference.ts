import { Prisma, type IntegrationProvider } from '@prisma/client'
import { AppError } from '@/server/http/errors'
import { prisma } from '@/server/db/prisma'

type FinancialTransactionReferenceGuardClient = Prisma.TransactionClient | typeof prisma

export async function ensureFinancialTransactionExternalReferenceIsUnique(
  client: FinancialTransactionReferenceGuardClient,
  input: {
    conflictMessage?: string
    externalReference?: string | null
    integrationProvider?: IntegrationProvider | null
    transactionId?: string
  },
) {
  if (!input.externalReference || !input.integrationProvider) {
    return
  }

  const existingTransaction = await client.financialTransaction.findFirst({
    where: {
      externalReference: input.externalReference,
      integrationProvider: input.integrationProvider,
      ...(input.transactionId
        ? {
            id: {
              not: input.transactionId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (existingTransaction) {
    throw new AppError(
      'CONFLICT',
      409,
      input.conflictMessage ?? 'Another financial transaction already uses this provider reference.',
    )
  }
}
