'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  cancelTutorWaitlistEntryInputSchema,
  createTutorAppointmentInputSchema,
  createTutorWaitlistEntryInputSchema,
  upsertTutorPreCheckInInputSchema,
  updateTutorProfileInputSchema,
} from '@/features/tutor/schemas'
import {
  cancelTutorWaitlistEntry,
  createTutorAppointment,
  createTutorWaitlistEntry,
  updateTutorProfile,
  upsertTutorPreCheckIn,
} from '@/features/tutor/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireTutorAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import {
  getFormValueList,
  getOptionalFormValue,
  hasCheckedFormValue,
} from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/tutor'

export async function updateTutorProfileAction(formData: FormData) {
  const tutor = await requireTutorAreaUser(redirectPath)
  assertPermission(tutor, 'cliente.editar_proprio')
  enforceMutationRateLimit(tutor, 'tutor.profile.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = updateTutorProfileInputSchema.parse({
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
    })

    await updateTutorProfile(tutor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function createTutorAppointmentAction(formData: FormData) {
  const tutor = await requireTutorAreaUser(redirectPath)
  assertPermission(tutor, 'agendamento.criar_proprio')
  enforceMutationRateLimit(tutor, 'tutor.appointments.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createTutorAppointmentInputSchema.parse({
      petId: getOptionalFormValue(formData, 'petId'),
      serviceIds: getFormValueList(formData, 'serviceIds'),
      startAt: getOptionalFormValue(formData, 'startAt'),
      endAt: getOptionalFormValue(formData, 'endAt'),
      clientNotes: getOptionalFormValue(formData, 'clientNotes'),
    })

    await createTutorAppointment(tutor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'scheduled')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function saveTutorPreCheckInAction(formData: FormData) {
  const tutor = await requireTutorAreaUser(redirectPath)
  assertPermission(tutor, 'agendamento.pre_check_in.editar_proprio')
  enforceMutationRateLimit(tutor, 'tutor.pre-check-in.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = upsertTutorPreCheckInInputSchema.parse({
      appointmentId: getOptionalFormValue(formData, 'appointmentId'),
      consentConfirmed: hasCheckedFormValue(formData, 'consentConfirmed'),
      contactPhone: getOptionalFormValue(formData, 'contactPhone'),
      healthUpdates: getOptionalFormValue(formData, 'healthUpdates'),
      notes: getOptionalFormValue(formData, 'notes'),
      transportNotes: getOptionalFormValue(formData, 'transportNotes'),
    })

    await upsertTutorPreCheckIn(tutor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'saved')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function createTutorWaitlistEntryAction(formData: FormData) {
  const tutor = await requireTutorAreaUser(redirectPath)
  assertPermission(tutor, 'agenda.waitlist.editar_proprio')
  enforceMutationRateLimit(tutor, 'tutor.waitlist.create')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createTutorWaitlistEntryInputSchema.parse({
      desiredServiceId: getOptionalFormValue(formData, 'desiredServiceId'),
      notes: getOptionalFormValue(formData, 'notes'),
      petId: getOptionalFormValue(formData, 'petId'),
      preferredEndAt: getOptionalFormValue(formData, 'preferredEndAt'),
      preferredStartAt: getOptionalFormValue(formData, 'preferredStartAt'),
      requestedTransport: hasCheckedFormValue(formData, 'requestedTransport'),
    })

    await createTutorWaitlistEntry(tutor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function cancelTutorWaitlistEntryAction(formData: FormData) {
  const tutor = await requireTutorAreaUser(redirectPath)
  assertPermission(tutor, 'agenda.waitlist.editar_proprio')
  enforceMutationRateLimit(tutor, 'tutor.waitlist.cancel')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = cancelTutorWaitlistEntryInputSchema.parse({
      reason: getOptionalFormValue(formData, 'reason'),
      waitlistEntryId: getOptionalFormValue(formData, 'waitlistEntryId'),
    })

    await cancelTutorWaitlistEntry(tutor, input.waitlistEntryId, {
      reason: input.reason,
    })
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
