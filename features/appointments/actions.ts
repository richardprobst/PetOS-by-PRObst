'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  appointmentCheckInInputSchema,
  cancelAppointmentInputSchema,
  changeAppointmentStatusInputSchema,
  createAppointmentInputSchema,
} from '@/features/appointments/schemas'
import {
  cancelAppointment,
  changeAppointmentStatus,
  checkInAppointment,
  createAppointment,
} from '@/features/appointments/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getFormValueList, getOptionalFormValue, getRequiredFormValue, hasCheckedFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/agenda'

function buildAppointmentServices(formData: FormData) {
  const serviceIds = getFormValueList(formData, 'serviceIds')
  const employeeUserId = getOptionalFormValue(formData, 'employeeUserId')

  return serviceIds.map((serviceId) => ({
    serviceId,
    employeeUserId,
  }))
}

function buildTaxiDogPayload(formData: FormData) {
  if (!hasCheckedFormValue(formData, 'taxiDogEnabled')) {
    return undefined
  }

  return {
    assignedDriverUserId: getOptionalFormValue(formData, 'taxiDogDriverUserId'),
    pickupAddress: getOptionalFormValue(formData, 'taxiDogPickupAddress'),
    dropoffAddress: getOptionalFormValue(formData, 'taxiDogDropoffAddress'),
    pickupWindowStartAt: getOptionalFormValue(formData, 'taxiDogPickupWindowStartAt'),
    pickupWindowEndAt: getOptionalFormValue(formData, 'taxiDogPickupWindowEndAt'),
    dropoffWindowStartAt: getOptionalFormValue(formData, 'taxiDogDropoffWindowStartAt'),
    dropoffWindowEndAt: getOptionalFormValue(formData, 'taxiDogDropoffWindowEndAt'),
    feeAmount: getOptionalFormValue(formData, 'taxiDogFeeAmount') ?? '0',
    notes: getOptionalFormValue(formData, 'taxiDogNotes'),
  }
}

export async function createAppointmentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agendamento.criar')
  enforceMutationRateLimit(actor, 'admin.appointments.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createAppointmentInputSchema.parse({
      clientId: getRequiredFormValue(formData, 'clientId'),
      petId: getRequiredFormValue(formData, 'petId'),
      startAt: getRequiredFormValue(formData, 'startAt'),
      endAt: getOptionalFormValue(formData, 'endAt'),
      clientNotes: getOptionalFormValue(formData, 'clientNotes'),
      internalNotes: getOptionalFormValue(formData, 'internalNotes'),
      services: buildAppointmentServices(formData),
      taxiDog: buildTaxiDogPayload(formData),
    })

    await createAppointment(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'scheduled')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agendamento.atualizar_status')
  enforceMutationRateLimit(actor, 'admin.appointments.status.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const appointmentId = getRequiredFormValue(formData, 'appointmentId')
    const input = changeAppointmentStatusInputSchema.parse({
      nextStatusId: getRequiredFormValue(formData, 'nextStatusId'),
    })

    await changeAppointmentStatus(actor, appointmentId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function cancelAppointmentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agendamento.cancelar')
  enforceMutationRateLimit(actor, 'admin.appointments.cancel.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const appointmentId = getRequiredFormValue(formData, 'appointmentId')
    const input = cancelAppointmentInputSchema.parse({
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await cancelAppointment(actor, appointmentId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function checkInAppointmentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'checkin.executar')
  enforceMutationRateLimit(actor, 'admin.appointments.checkin.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const appointmentId = getRequiredFormValue(formData, 'appointmentId')
    const checklist = [
      {
        key: 'health_reviewed',
        label: 'Saúde e observações conferidas',
        checked: hasCheckedFormValue(formData, 'checklistHealth'),
      },
      {
        key: 'preferences_reviewed',
        label: 'Preferências do atendimento revisadas',
        checked: hasCheckedFormValue(formData, 'checklistPreferences'),
      },
      {
        key: 'handoff_confirmed',
        label: 'Contato e retirada confirmados',
        checked: hasCheckedFormValue(formData, 'checklistHandoff'),
      },
    ].filter((item) => item.checked)

    const input = appointmentCheckInInputSchema.parse({
      checklist,
      notes: getOptionalFormValue(formData, 'notes'),
    })

    await checkInAppointment(actor, appointmentId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
