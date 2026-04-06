'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  cancelPosSaleInputSchema,
  completePosSaleInputSchema,
  createPosSaleInputSchema,
} from '@/features/pos/schemas'
import {
  cancelPosSale,
  completePosSale,
  createPosSale,
} from '@/features/pos/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import {
  getOptionalFormValue,
  getRequiredFormValue,
  hasCheckedFormValue,
} from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/pdv'

function readStringFormArray(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === 'string' ? value.trim() : ''))
}

function parsePosSaleItemsFromForm(formData: FormData) {
  const productIds = readStringFormArray(formData, 'itemProductId')
  const quantities = readStringFormArray(formData, 'itemQuantity')
  const unitPrices = readStringFormArray(formData, 'itemUnitPrice')
  const discountAmounts = readStringFormArray(formData, 'itemDiscountAmount')
  const itemCount = Math.max(
    productIds.length,
    quantities.length,
    unitPrices.length,
    discountAmounts.length,
  )

  return Array.from({ length: itemCount }, (_, index) => ({
    discountAmount: discountAmounts[index],
    productId: productIds[index],
    quantity: quantities[index],
    unitPrice: unitPrices[index],
  })).filter((item) => item.productId)
}

export async function createPosSaleAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'pdv.operar')
  enforceMutationRateLimit(actor, 'admin.pos.sale.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createPosSaleInputSchema.parse({
      clientId: getOptionalFormValue(formData, 'clientId'),
      completeNow: hasCheckedFormValue(formData, 'completeNow'),
      externalReference: getOptionalFormValue(formData, 'externalReference'),
      integrationProvider: getOptionalFormValue(formData, 'integrationProvider'),
      issueFiscalDocument: hasCheckedFormValue(formData, 'issueFiscalDocument'),
      items: parsePosSaleItemsFromForm(formData),
      notes: getOptionalFormValue(formData, 'notes'),
      paymentMethod: getOptionalFormValue(formData, 'paymentMethod'),
      paymentStatus: getOptionalFormValue(formData, 'paymentStatus'),
    })

    await createPosSale(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function completePosSaleAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'pdv.operar')
  enforceMutationRateLimit(actor, 'admin.pos.sale.complete')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const saleId = getRequiredFormValue(formData, 'saleId')
    const input = completePosSaleInputSchema.parse({
      externalReference: getOptionalFormValue(formData, 'externalReference'),
      integrationProvider: getOptionalFormValue(formData, 'integrationProvider'),
      issueFiscalDocument: hasCheckedFormValue(formData, 'issueFiscalDocument'),
      paymentMethod: getRequiredFormValue(formData, 'paymentMethod'),
      paymentStatus: getOptionalFormValue(formData, 'paymentStatus'),
    })

    await completePosSale(actor, saleId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function cancelPosSaleAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'pdv.operar')
  enforceMutationRateLimit(actor, 'admin.pos.sale.cancel')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const saleId = getRequiredFormValue(formData, 'saleId')
    const input = cancelPosSaleInputSchema.parse({
      cancellationReason: getOptionalFormValue(formData, 'cancellationReason'),
    })

    await cancelPosSale(actor, saleId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
