'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceInputSchema, updateServiceInputSchema } from '@/features/services/schemas'
import { createService, updateService } from '@/features/services/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { hasCheckedFormValue, getOptionalFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/servicos'

export async function saveServiceAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'servico.editar')
  enforceMutationRateLimit(actor, 'admin.services.form')

  const serviceId = getOptionalFormValue(formData, 'serviceId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (serviceId) {
      const input = updateServiceInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        description: getOptionalFormValue(formData, 'description'),
        basePrice: getOptionalFormValue(formData, 'basePrice'),
        estimatedDurationMinutes: getOptionalFormValue(formData, 'estimatedDurationMinutes'),
        active: hasCheckedFormValue(formData, 'active'),
      })

      await updateService(actor, serviceId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createServiceInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        description: getOptionalFormValue(formData, 'description'),
        basePrice: getOptionalFormValue(formData, 'basePrice'),
        estimatedDurationMinutes: getOptionalFormValue(formData, 'estimatedDurationMinutes'),
        active: hasCheckedFormValue(formData, 'active'),
      })

      await createService(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
