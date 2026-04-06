'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  closeTimeClockEntryInputSchema,
  createPayrollRunInputSchema,
  createTeamShiftInputSchema,
  openTimeClockEntryInputSchema,
} from '@/features/team-operations/schemas'
import {
  closeTimeClockEntry,
  createPayrollRun,
  createTeamShift,
  finalizePayrollRun,
  openTimeClockEntry,
  updateTeamShift,
} from '@/features/team-operations/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue, getRequiredFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

export async function createTeamShiftAction(formData: FormData) {
  const redirectPath = '/admin/escalas'
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'equipe.escala.editar')
  enforceMutationRateLimit(actor, 'admin.team-shifts.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createTeamShiftInputSchema.parse({
      employeeUserId: getRequiredFormValue(formData, 'employeeUserId'),
      endAt: getRequiredFormValue(formData, 'endAt'),
      notes: getOptionalFormValue(formData, 'notes'),
      shiftType: getOptionalFormValue(formData, 'shiftType'),
      startAt: getRequiredFormValue(formData, 'startAt'),
      status: getOptionalFormValue(formData, 'status'),
    })

    await createTeamShift(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function cancelTeamShiftAction(formData: FormData) {
  const redirectPath = '/admin/escalas'
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'equipe.escala.editar')
  enforceMutationRateLimit(actor, 'admin.team-shifts.cancel')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const shiftId = getRequiredFormValue(formData, 'shiftId')
    await updateTeamShift(actor, shiftId, {
      status: 'CANCELED',
    })
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function openTimeClockEntryAction(formData: FormData) {
  const redirectPath = '/admin/ponto'
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'equipe.ponto.editar')
  enforceMutationRateLimit(actor, 'admin.time-clock-entries.open')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = openTimeClockEntryInputSchema.parse({
      clockInAt: getOptionalFormValue(formData, 'clockInAt'),
      employeeUserId: getRequiredFormValue(formData, 'employeeUserId'),
      notes: getOptionalFormValue(formData, 'notes'),
      shiftId: getOptionalFormValue(formData, 'shiftId'),
    })

    await openTimeClockEntry(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function closeTimeClockEntryAction(formData: FormData) {
  const redirectPath = '/admin/ponto'
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'equipe.ponto.editar')
  enforceMutationRateLimit(actor, 'admin.time-clock-entries.close')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const entryId = getRequiredFormValue(formData, 'entryId')
    const input = closeTimeClockEntryInputSchema.parse({
      breakMinutes: getOptionalFormValue(formData, 'breakMinutes') ?? '0',
      clockOutAt: getOptionalFormValue(formData, 'clockOutAt'),
      notes: getOptionalFormValue(formData, 'notes'),
    })

    await closeTimeClockEntry(actor, entryId, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function createPayrollRunAction(formData: FormData) {
  const redirectPath = '/admin/folha'
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'equipe.folha.editar')
  enforceMutationRateLimit(actor, 'admin.payroll-runs.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createPayrollRunInputSchema.parse({
      notes: getOptionalFormValue(formData, 'notes'),
      periodEndAt: getRequiredFormValue(formData, 'periodEndAt'),
      periodStartAt: getRequiredFormValue(formData, 'periodStartAt'),
    })

    await createPayrollRun(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function finalizePayrollRunAction(formData: FormData) {
  const redirectPath = '/admin/folha'
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'equipe.folha.editar')
  enforceMutationRateLimit(actor, 'admin.payroll-runs.finalize')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const runId = getRequiredFormValue(formData, 'runId')

    await finalizePayrollRun(actor, runId, {
      notes: getOptionalFormValue(formData, 'notes'),
    })
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
