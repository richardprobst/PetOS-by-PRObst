'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createPetInputSchema, updatePetInputSchema } from '@/features/pets/schemas'
import { createPet, updatePet } from '@/features/pets/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/pets'

export async function savePetAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'pet.editar')
  enforceMutationRateLimit(actor, 'admin.pets.form')

  const petId = getOptionalFormValue(formData, 'petId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (petId) {
      const input = updatePetInputSchema.parse({
        clientId: getOptionalFormValue(formData, 'clientId'),
        name: getOptionalFormValue(formData, 'name'),
        species: getOptionalFormValue(formData, 'species'),
        breed: getOptionalFormValue(formData, 'breed'),
        birthDate: getOptionalFormValue(formData, 'birthDate'),
        weightKg: getOptionalFormValue(formData, 'weightKg'),
        healthNotes: getOptionalFormValue(formData, 'healthNotes'),
        allergies: getOptionalFormValue(formData, 'allergies'),
        primaryPhotoUrl: getOptionalFormValue(formData, 'primaryPhotoUrl'),
      })

      await updatePet(actor, petId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createPetInputSchema.parse({
        clientId: getOptionalFormValue(formData, 'clientId'),
        name: getOptionalFormValue(formData, 'name'),
        species: getOptionalFormValue(formData, 'species'),
        breed: getOptionalFormValue(formData, 'breed'),
        birthDate: getOptionalFormValue(formData, 'birthDate'),
        weightKg: getOptionalFormValue(formData, 'weightKg'),
        healthNotes: getOptionalFormValue(formData, 'healthNotes'),
        allergies: getOptionalFormValue(formData, 'allergies'),
        primaryPhotoUrl: getOptionalFormValue(formData, 'primaryPhotoUrl'),
      })

      await createPet(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
