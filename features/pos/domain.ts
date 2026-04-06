import { PaymentStatus, PosSaleStatus } from '@prisma/client'
import { AppError } from '@/server/http/errors'

export interface PosSaleLineInput {
  discountAmount: number
  quantity: number
  unitPrice: number
}

const allowedCompletionPaymentStatuses = new Set<PaymentStatus>([
  'PENDING',
  'AUTHORIZED',
  'PARTIAL',
  'PAID',
])

export function calculatePosSaleLineTotal(input: PosSaleLineInput) {
  if (input.quantity <= 0) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Sale item quantity must be greater than zero.')
  }

  if (input.unitPrice < 0) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Sale item unit price cannot be negative.')
  }

  if (input.discountAmount < 0) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'Sale item discount cannot be negative.')
  }

  const grossAmount = Number((input.quantity * input.unitPrice).toFixed(2))

  if (input.discountAmount > grossAmount) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Sale item discount cannot exceed the gross line amount.',
    )
  }

  return {
    grossAmount,
    totalAmount: Number((grossAmount - input.discountAmount).toFixed(2)),
  }
}

export function calculatePosSaleTotals(items: PosSaleLineInput[]) {
  if (items.length === 0) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'A POS sale requires at least one item.')
  }

  const totals = items.reduce(
    (accumulator, item) => {
      const line = calculatePosSaleLineTotal(item)

      return {
        discountAmount: Number((accumulator.discountAmount + item.discountAmount).toFixed(2)),
        subtotalAmount: Number((accumulator.subtotalAmount + line.grossAmount).toFixed(2)),
        totalAmount: Number((accumulator.totalAmount + line.totalAmount).toFixed(2)),
      }
    },
    {
      discountAmount: 0,
      subtotalAmount: 0,
      totalAmount: 0,
    },
  )

  return totals
}

export function assertPosSaleCanBeCompleted(status: PosSaleStatus) {
  if (status !== 'OPEN') {
    throw new AppError('CONFLICT', 409, 'Only open POS sales can be completed.')
  }
}

export function assertPosSaleCanBeCanceled(status: PosSaleStatus) {
  if (status !== 'OPEN') {
    throw new AppError('CONFLICT', 409, 'Only open POS sales can be canceled.')
  }
}

export function assertSupportedPosCompletionPaymentStatus(paymentStatus: PaymentStatus) {
  if (!allowedCompletionPaymentStatuses.has(paymentStatus)) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `Payment status ${paymentStatus} cannot be used to complete a POS sale.`,
    )
  }
}

export function shouldIssueFiscalDocumentForPosSale(
  issueFiscalDocument: boolean,
  paymentStatus: PaymentStatus,
) {
  return issueFiscalDocument && paymentStatus === 'PAID'
}
