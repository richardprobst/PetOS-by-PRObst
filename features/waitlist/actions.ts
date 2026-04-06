'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  cancelWaitlistEntryInputSchema,
  createWaitlistEntryInputSchema,
  promoteWaitlistEntryInputSchema,
} from '@/features/waitlist/schemas'
import {
  cancelWaitlistEntry,
  createWaitlistEntry,
  promoteWaitlistEntry,
} from '@/features/waitlist/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import {
  getOptionalFormValue,
  getRequiredFormValue,
  hasCheckedFormValue,
} from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/agenda'

export async function createWaitlistEntryAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.waitlist.editar')
  enforceMutationRateLimit(actor, 'admin.waitlist.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createWaitlistEntryInputSchema.parse({
      clientId: getRequiredFormValue(formData, 'clientId'),
      petId: getRequiredFormValue(formData, 'petId'),
      desiredServiceId: getRequiredFormValue(formData, 'desiredServiceId'),
      preferredEmployeeUserId: getOptionalFormValue(formData, 'preferredEmployeeUserId'),
      preferredStartAt: getRequiredFormValue(formData, 'preferredStartAt'),
      preferredEndAt: getRequiredFormValue(formData, 'preferredEndAt'),
      requestedTransport: hasCheckedFormValue(formData, 'requestedTransport'),
      notes: getOptionalFormValue(formData, 'notes'),
    })

    await createWaitlistEntry(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function cancelWaitlistEntryAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.waitlist.editar')
  enforceMutationRateLimit(actor, 'admin.waitlist.cancel')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const waitlistEntryId = getRequiredFormValue(formData, 'waitlistEntryId')
    const input = cancelWaitlistEntryInputSchema.parse({
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await cancelWaitlistEntry(actor, waitlistEntryId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function promoteWaitlistEntryAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.waitlist.editar')
  assertPermission(actor, 'agendamento.criar')
  enforceMutationRateLimit(actor, 'admin.waitlist.promote')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const waitlistEntryId = getRequiredFormValue(formData, 'waitlistEntryId')
    const input = promoteWaitlistEntryInputSchema.parse({
      startAt: getRequiredFormValue(formData, 'startAt'),
      endAt: getOptionalFormValue(formData, 'endAt'),
      employeeUserId: getOptionalFormValue(formData, 'employeeUserId'),
      clientNotes: getOptionalFormValue(formData, 'clientNotes'),
      internalNotes: getOptionalFormValue(formData, 'internalNotes'),
    })

    await promoteWaitlistEntry(actor, waitlistEntryId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
