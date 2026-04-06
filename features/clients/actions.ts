'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClientInputSchema, updateClientInputSchema } from '@/features/clients/schemas'
import { createClient, updateClient } from '@/features/clients/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { hasCheckedFormValue, getOptionalFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/clientes'

export async function saveClientAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'cliente.editar')
  enforceMutationRateLimit(actor, 'admin.clients.form')

  const clientId = getOptionalFormValue(formData, 'clientId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (clientId) {
      const input = updateClientInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        email: getOptionalFormValue(formData, 'email'),
        phone: getOptionalFormValue(formData, 'phone'),
        address: getOptionalFormValue(formData, 'address'),
        city: getOptionalFormValue(formData, 'city'),
        state: getOptionalFormValue(formData, 'state'),
        zipCode: getOptionalFormValue(formData, 'zipCode'),
        contactPreference: getOptionalFormValue(formData, 'contactPreference'),
        generalNotes: getOptionalFormValue(formData, 'generalNotes'),
        password: getOptionalFormValue(formData, 'password'),
        active: hasCheckedFormValue(formData, 'active'),
      })

      await updateClient(actor, clientId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createClientInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        email: getOptionalFormValue(formData, 'email'),
        phone: getOptionalFormValue(formData, 'phone'),
        address: getOptionalFormValue(formData, 'address'),
        city: getOptionalFormValue(formData, 'city'),
        state: getOptionalFormValue(formData, 'state'),
        zipCode: getOptionalFormValue(formData, 'zipCode'),
        contactPreference: getOptionalFormValue(formData, 'contactPreference'),
        generalNotes: getOptionalFormValue(formData, 'generalNotes'),
        password: getOptionalFormValue(formData, 'password'),
        active: hasCheckedFormValue(formData, 'active'),
      })

      await createClient(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
