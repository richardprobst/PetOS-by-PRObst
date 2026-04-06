'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createFinancialTransactionInputSchema,
  updateFinancialTransactionInputSchema,
} from '@/features/finance/schemas'
import {
  createFinancialTransaction,
  updateFinancialTransaction,
} from '@/features/finance/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/financeiro'

export async function saveFinancialTransactionAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'financeiro.lancar')
  enforceMutationRateLimit(actor, 'admin.financial-transactions.form')

  const transactionId = getOptionalFormValue(formData, 'transactionId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (transactionId) {
      const input = updateFinancialTransactionInputSchema.parse({
        appointmentId: getOptionalFormValue(formData, 'appointmentId'),
        transactionType: getOptionalFormValue(formData, 'transactionType'),
        description: getOptionalFormValue(formData, 'description'),
        amount: getOptionalFormValue(formData, 'amount'),
        paymentMethod: getOptionalFormValue(formData, 'paymentMethod'),
        paymentStatus: getOptionalFormValue(formData, 'paymentStatus'),
        externalReference: getOptionalFormValue(formData, 'externalReference'),
        occurredAt: getOptionalFormValue(formData, 'occurredAt'),
      })

      await updateFinancialTransaction(actor, transactionId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createFinancialTransactionInputSchema.parse({
        appointmentId: getOptionalFormValue(formData, 'appointmentId'),
        transactionType: getOptionalFormValue(formData, 'transactionType'),
        description: getOptionalFormValue(formData, 'description'),
        amount: getOptionalFormValue(formData, 'amount'),
        paymentMethod: getOptionalFormValue(formData, 'paymentMethod'),
        paymentStatus: getOptionalFormValue(formData, 'paymentStatus'),
        externalReference: getOptionalFormValue(formData, 'externalReference'),
        occurredAt: getOptionalFormValue(formData, 'occurredAt'),
      })

      await createFinancialTransaction(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
