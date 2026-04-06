'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createProductInputSchema,
  recordInventoryMovementInputSchema,
} from '@/features/inventory/schemas'
import {
  createProduct,
  recordInventoryMovement,
} from '@/features/inventory/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue, getRequiredFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/estoque'

export async function createProductAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'produto.editar')
  enforceMutationRateLimit(actor, 'admin.inventory.product.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createProductInputSchema.parse({
      active: getOptionalFormValue(formData, 'active'),
      barcode: getOptionalFormValue(formData, 'barcode'),
      costPrice: getOptionalFormValue(formData, 'costPrice'),
      description: getOptionalFormValue(formData, 'description'),
      minimumStockQuantity: getOptionalFormValue(formData, 'minimumStockQuantity'),
      name: getRequiredFormValue(formData, 'name'),
      salePrice: getRequiredFormValue(formData, 'salePrice'),
      sku: getOptionalFormValue(formData, 'sku'),
      trackInventory: getOptionalFormValue(formData, 'trackInventory'),
      unitOfMeasure: getOptionalFormValue(formData, 'unitOfMeasure'),
    })

    await createProduct(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function recordInventoryMovementAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'estoque.movimentar')
  enforceMutationRateLimit(actor, 'admin.inventory.movement.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = recordInventoryMovementInputSchema.parse({
      movementType: getRequiredFormValue(formData, 'movementType'),
      notes: getOptionalFormValue(formData, 'notes'),
      productId: getRequiredFormValue(formData, 'productId'),
      quantity: getRequiredFormValue(formData, 'quantity'),
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await recordInventoryMovement(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

