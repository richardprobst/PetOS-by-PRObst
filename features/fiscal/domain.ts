import type { FiscalDocumentStatus } from '@prisma/client'
import { AppError } from '@/server/http/errors'

const allowedFiscalDocumentTransitions: Record<FiscalDocumentStatus, FiscalDocumentStatus[]> = {
  PENDING: ['ISSUED', 'FAILED', 'CANCELED'],
  ISSUED: ['CANCELED'],
  FAILED: ['PENDING', 'CANCELED'],
  CANCELED: [],
}

export function assertFiscalDocumentStatusTransition(
  currentStatus: FiscalDocumentStatus,
  nextStatus: FiscalDocumentStatus,
) {
  if (currentStatus === nextStatus) {
    return
  }

  const allowedTransitions = allowedFiscalDocumentTransitions[currentStatus] ?? []

  if (!allowedTransitions.includes(nextStatus)) {
    throw new AppError(
      'CONFLICT',
      409,
      `Invalid fiscal document status transition from ${currentStatus} to ${nextStatus}.`,
    )
  }
}
