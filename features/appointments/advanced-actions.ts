'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createAppointmentCapacityRuleInputSchema,
  createScheduleBlockInputSchema,
  updateAppointmentCapacityRuleInputSchema,
  updateScheduleBlockInputSchema,
} from '@/features/appointments/schemas'
import {
  createAppointmentCapacityRule,
  createScheduleBlock,
  updateAppointmentCapacityRule,
  updateScheduleBlock,
} from '@/features/appointments/advanced-services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue, getRequiredFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/agenda'

export async function createAppointmentCapacityRuleAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.capacidade.editar')
  enforceMutationRateLimit(actor, 'admin.appointments.capacity_rule.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createAppointmentCapacityRuleInputSchema.parse({
      employeeUserId: getOptionalFormValue(formData, 'employeeUserId'),
      sizeCategory: getOptionalFormValue(formData, 'sizeCategory'),
      breed: getOptionalFormValue(formData, 'breed'),
      maxConcurrentAppointments: getRequiredFormValue(formData, 'maxConcurrentAppointments'),
      notes: getOptionalFormValue(formData, 'notes'),
    })

    await createAppointmentCapacityRule(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function deactivateAppointmentCapacityRuleAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.capacidade.editar')
  enforceMutationRateLimit(actor, 'admin.appointments.capacity_rule.deactivate')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const ruleId = getRequiredFormValue(formData, 'ruleId')
    await updateAppointmentCapacityRule(
      actor,
      ruleId,
      updateAppointmentCapacityRuleInputSchema.parse({
        active: false,
      }),
    )
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function createScheduleBlockAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.bloqueio.editar')
  enforceMutationRateLimit(actor, 'admin.appointments.schedule_block.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createScheduleBlockInputSchema.parse({
      employeeUserId: getOptionalFormValue(formData, 'employeeUserId'),
      blockType: getRequiredFormValue(formData, 'blockType'),
      title: getRequiredFormValue(formData, 'title'),
      startAt: getRequiredFormValue(formData, 'startAt'),
      endAt: getRequiredFormValue(formData, 'endAt'),
      notes: getOptionalFormValue(formData, 'notes'),
    })

    await createScheduleBlock(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function deactivateScheduleBlockAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'agenda.bloqueio.editar')
  enforceMutationRateLimit(actor, 'admin.appointments.schedule_block.deactivate')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const blockId = getRequiredFormValue(formData, 'blockId')
    await updateScheduleBlock(
      actor,
      blockId,
      updateScheduleBlockInputSchema.parse({
        active: false,
      }),
    )
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
