import { Prisma } from '@prisma/client'
import { AppError } from '@/server/http/errors'
import { prisma } from '@/server/db/prisma'

export function isSerializableTransactionConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
}

export async function runSerializableTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  conflictMessage: string,
) {
  try {
    return await prisma.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
  } catch (error) {
    if (isSerializableTransactionConflict(error)) {
      throw new AppError('CONFLICT', 409, conflictMessage)
    }

    throw error
  }
}
