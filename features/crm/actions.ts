'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CrmRecipientLaunchState } from '@/features/crm/action-state'
import {
  createCrmCampaignInputSchema,
  prepareCrmCampaignExecutionInputSchema,
  updateCrmCampaignInputSchema,
  upsertClientCommunicationPreferenceInputSchema,
} from '@/features/crm/schemas'
import {
  createCrmCampaign,
  launchCrmCampaignRecipient,
  prepareCrmCampaignExecution,
  updateCrmCampaign,
  upsertClientCommunicationPreference,
} from '@/features/crm/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getFormValueList, getOptionalFormValue, hasCheckedFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/comunicacao'

function buildCampaignCriteriaInput(formData: FormData) {
  return {
    breeds: getOptionalFormValue(formData, 'breeds'),
    inactivityDays: getOptionalFormValue(formData, 'inactivityDays'),
    minimumCompletedAppointments: getOptionalFormValue(formData, 'minimumCompletedAppointments'),
    offerName: getOptionalFormValue(formData, 'offerName'),
    onlyClientsWithoutFutureAppointments: hasCheckedFormValue(
      formData,
      'onlyClientsWithoutFutureAppointments',
    ),
    petSizeCategories: getFormValueList(formData, 'petSizeCategories'),
    postServiceDelayHours: getOptionalFormValue(formData, 'postServiceDelayHours'),
    reviewDelayHours: getOptionalFormValue(formData, 'reviewDelayHours'),
  }
}

export async function saveClientCommunicationPreferenceAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'crm.preferencia_contato.editar')
  enforceMutationRateLimit(actor, 'admin.crm.communication-preference.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = upsertClientCommunicationPreferenceInputSchema.parse({
      clientId: getOptionalFormValue(formData, 'clientId'),
      emailOptIn: hasCheckedFormValue(formData, 'emailOptIn'),
      whatsappOptIn: hasCheckedFormValue(formData, 'whatsappOptIn'),
      marketingOptIn: hasCheckedFormValue(formData, 'marketingOptIn'),
      reviewOptIn: hasCheckedFormValue(formData, 'reviewOptIn'),
      postServiceOptIn: hasCheckedFormValue(formData, 'postServiceOptIn'),
      notes: getOptionalFormValue(formData, 'notes'),
      source: getOptionalFormValue(formData, 'source'),
    })

    await upsertClientCommunicationPreference(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function saveCrmCampaignAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'crm.campanha.editar')
  enforceMutationRateLimit(actor, 'admin.crm.campaign.form')
  const campaignId = getOptionalFormValue(formData, 'campaignId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (campaignId) {
      const input = updateCrmCampaignInputSchema.parse({
        channel: getOptionalFormValue(formData, 'channel'),
        criteria: buildCampaignCriteriaInput(formData),
        description: getOptionalFormValue(formData, 'description'),
        name: getOptionalFormValue(formData, 'name'),
        status: getOptionalFormValue(formData, 'status'),
        templateId: getOptionalFormValue(formData, 'templateId'),
        type: getOptionalFormValue(formData, 'type'),
      })

      await updateCrmCampaign(actor, campaignId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createCrmCampaignInputSchema.parse({
        channel: getOptionalFormValue(formData, 'channel'),
        criteria: buildCampaignCriteriaInput(formData),
        description: getOptionalFormValue(formData, 'description'),
        name: getOptionalFormValue(formData, 'name'),
        status: getOptionalFormValue(formData, 'status'),
        templateId: getOptionalFormValue(formData, 'templateId'),
        type: getOptionalFormValue(formData, 'type'),
      })

      await createCrmCampaign(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function prepareCrmCampaignExecutionAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'crm.campanha.executar')
  enforceMutationRateLimit(actor, 'admin.crm.campaign.prepare')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = prepareCrmCampaignExecutionInputSchema.parse({
      campaignId: getOptionalFormValue(formData, 'campaignId'),
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await prepareCrmCampaignExecution(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'scheduled')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function launchCrmRecipientAction(
  _previousState: CrmRecipientLaunchState,
  formData: FormData,
): Promise<CrmRecipientLaunchState> {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'crm.campanha.executar')
  enforceMutationRateLimit(actor, 'admin.crm.recipient.launch')

  try {
    const recipientId = getOptionalFormValue(formData, 'recipientId')

    if (!recipientId) {
      throw new Error('Missing CRM recipient id.')
    }

    const result = await launchCrmCampaignRecipient(actor, recipientId)
    revalidatePath(redirectPath)

    return {
      status: 'success',
      message: 'Contato preparado. O canal externo foi aberto para continuidade controlada pela equipe.',
      launchUrl: result.launchUrl,
    }
  } catch (error) {
    return {
      status: 'error',
      message: getActionErrorMessage(error),
    }
  }
}
