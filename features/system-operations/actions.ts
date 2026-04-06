'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  enterMaintenanceModeInputSchema,
  openRecoveryIncidentInputSchema,
  resolveRecoveryIncidentInputSchema,
} from '@/features/system-operations/schemas'
import {
  enterMaintenanceMode,
  leaveMaintenanceMode,
  openManualRecoveryIncident,
  resolveRecoveryIncident,
} from '@/features/system-operations/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getRequiredFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/sistema'

export async function enterMaintenanceModeAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'sistema.manutencao.operar')
  enforceMutationRateLimit(actor, 'admin.system.maintenance.enter')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = enterMaintenanceModeInputSchema.parse({
      reason: getRequiredFormValue(formData, 'reason'),
    })

    await enterMaintenanceMode(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function leaveMaintenanceModeAction() {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'sistema.manutencao.operar')
  enforceMutationRateLimit(actor, 'admin.system.maintenance.exit')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    await leaveMaintenanceMode(actor)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function openRecoveryIncidentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'sistema.reparo.operar')
  enforceMutationRateLimit(actor, 'admin.system.repair.open')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = openRecoveryIncidentInputSchema.parse({
      summary: getRequiredFormValue(formData, 'summary'),
      title: getRequiredFormValue(formData, 'title'),
    })

    await openManualRecoveryIncident(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function resolveRecoveryIncidentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'sistema.reparo.operar')
  enforceMutationRateLimit(actor, 'admin.system.repair.resolve')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = resolveRecoveryIncidentInputSchema.parse({
      incidentId: getRequiredFormValue(formData, 'incidentId'),
      resolutionSummary: getRequiredFormValue(formData, 'resolutionSummary'),
      targetLifecycleState: getRequiredFormValue(formData, 'targetLifecycleState'),
    })

    await resolveRecoveryIncident(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
