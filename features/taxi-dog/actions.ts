'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  changeTaxiDogRideStatusInputSchema,
  createTaxiDogRideInputSchema,
} from '@/features/taxi-dog/schemas'
import {
  changeTaxiDogRideStatus,
  upsertTaxiDogRide,
} from '@/features/taxi-dog/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue, getRequiredFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/agenda'

export async function upsertTaxiDogRideAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.taxi_dog.editar')
  enforceMutationRateLimit(actor, 'admin.taxi_dog.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const appointmentId = getRequiredFormValue(formData, 'appointmentId')
    const input = createTaxiDogRideInputSchema.parse({
      assignedDriverUserId: getOptionalFormValue(formData, 'assignedDriverUserId'),
      pickupAddress: getOptionalFormValue(formData, 'pickupAddress'),
      dropoffAddress: getOptionalFormValue(formData, 'dropoffAddress'),
      pickupWindowStartAt: getOptionalFormValue(formData, 'pickupWindowStartAt'),
      pickupWindowEndAt: getOptionalFormValue(formData, 'pickupWindowEndAt'),
      dropoffWindowStartAt: getOptionalFormValue(formData, 'dropoffWindowStartAt'),
      dropoffWindowEndAt: getOptionalFormValue(formData, 'dropoffWindowEndAt'),
      feeAmount: getOptionalFormValue(formData, 'feeAmount') ?? '0',
      notes: getOptionalFormValue(formData, 'notes'),
    })

    await upsertTaxiDogRide(actor, appointmentId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function updateTaxiDogRideStatusAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.taxi_dog.editar')
  enforceMutationRateLimit(actor, 'admin.taxi_dog.status')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const taxiDogRideId = getRequiredFormValue(formData, 'taxiDogRideId')
    const input = changeTaxiDogRideStatusInputSchema.parse({
      nextStatus: getRequiredFormValue(formData, 'nextStatus'),
    })

    await changeTaxiDogRideStatus(actor, taxiDogRideId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
