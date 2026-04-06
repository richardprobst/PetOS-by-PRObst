'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ManualMessageLaunchState } from '@/features/messages/action-state'
import {
  createManualMessageLaunchInputSchema,
  createMessageLogInputSchema,
  createMessageTemplateInputSchema,
  updateMessageTemplateInputSchema,
} from '@/features/messages/schemas'
import {
  launchManualMessage,
  createMessageLog,
  createMessageTemplate,
  updateMessageTemplate,
} from '@/features/messages/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue, hasCheckedFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/comunicacao'

export async function saveMessageTemplateAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'template_mensagem.editar')
  enforceMutationRateLimit(actor, 'admin.message-templates.form')

  const templateId = getOptionalFormValue(formData, 'templateId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (templateId) {
      const input = updateMessageTemplateInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        channel: getOptionalFormValue(formData, 'channel'),
        subject: getOptionalFormValue(formData, 'subject'),
        body: getOptionalFormValue(formData, 'body'),
        availableVariables: getOptionalFormValue(formData, 'availableVariables'),
        active: hasCheckedFormValue(formData, 'active'),
      })

      await updateMessageTemplate(actor, templateId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createMessageTemplateInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        channel: getOptionalFormValue(formData, 'channel'),
        subject: getOptionalFormValue(formData, 'subject'),
        body: getOptionalFormValue(formData, 'body'),
        availableVariables: getOptionalFormValue(formData, 'availableVariables'),
        active: hasCheckedFormValue(formData, 'active'),
      })

      await createMessageTemplate(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function createMessageLogAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'template_mensagem.editar')
  enforceMutationRateLimit(actor, 'admin.message-logs.form')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createMessageLogInputSchema.parse({
      appointmentId: getOptionalFormValue(formData, 'appointmentId'),
      clientId: getOptionalFormValue(formData, 'clientId'),
      templateId: getOptionalFormValue(formData, 'templateId'),
      channel: getOptionalFormValue(formData, 'channel'),
      messageContent: getOptionalFormValue(formData, 'messageContent'),
      deliveryStatus: getOptionalFormValue(formData, 'deliveryStatus'),
    })

    await createMessageLog(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(redirectPath, 'sent')
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function launchManualMessageAction(
  _previousState: ManualMessageLaunchState,
  formData: FormData,
): Promise<ManualMessageLaunchState> {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'template_mensagem.editar')
  enforceMutationRateLimit(actor, 'admin.message-logs.launch')

  try {
    const input = createManualMessageLaunchInputSchema.parse({
      appointmentId: getOptionalFormValue(formData, 'appointmentId'),
      clientId: getOptionalFormValue(formData, 'clientId'),
      templateId: getOptionalFormValue(formData, 'templateId'),
      channel: getOptionalFormValue(formData, 'channel'),
      messageContent: getOptionalFormValue(formData, 'messageContent'),
    })

    const result = await launchManualMessage(actor, input)
    revalidatePath(redirectPath)

    return {
      status: 'success',
      message: 'Envio manual registrado. O canal externo foi preparado para continuidade pela equipe.',
      launchUrl: result.launchUrl,
    }
  } catch (error) {
    return {
      status: 'error',
      message: getActionErrorMessage(error),
    }
  }
}
